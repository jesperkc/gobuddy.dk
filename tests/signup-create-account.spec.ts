import { test, expect, Page } from "@playwright/test";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// This test exercises the REAL signup path (no mocking of /auth/v1/signup), so
// an actual user is created in Supabase. It then deletes that user with the
// service-role key so the test leaves no residue. Skipped automatically when
// the required credentials aren't available (e.g. CI without secrets).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SB_SECRET_KEY;
// Supabase rejects throwaway domains like example.com (email_address_invalid),
// so use a real, owned domain. Override with E2E_SIGNUP_DOMAIN if needed.
const SIGNUP_DOMAIN = process.env.E2E_SIGNUP_DOMAIN || "strangeklitgaard.dk";

function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL as string, SERVICE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Cascade-delete a user, mirroring the admin-delete-user Edge Function
 * (supabase/functions/admin-delete-user/index.ts): related rows first, then the
 * auth.users record.
 */
async function deleteUser(id: string) {
  const admin = adminClient();
  await admin.from("messages").delete().or(`sender_id.eq.${id},receiver_id.eq.${id}`);
  await admin.from("user_interests").delete().eq("profile_id", id);
  await admin.from("user_roles").delete().eq("user_id", id);
  await admin.from("profiles").delete().eq("profile_id", id);
  await admin.auth.admin.deleteUser(id);
}

/** Walk the onboarding flow up to (but not including) the signup submit. */
async function walkToSignup(page: Page, email: string, password: string) {
  await page.goto("/details");
  await page.getByLabel("Hvad er dit navn?").fill("E2E Bruger");
  await page.getByLabel("Hvad er din alder?").fill("30");
  await page.getByRole("button", { name: "Videre" }).click();

  await expect(page.locator("h1")).toContainText("Hvad er dine interesser?");
  await page.waitForSelector("button[data-state]");
  await page.locator("button[data-state]").first().click();
  await page.getByRole("button", { name: "Videre" }).click();

  await expect(page.locator("h1")).toContainText("Hvor i verden er du?");
  await page.getByPlaceholder("Søg efter din by").fill("Copenhagen");
  await page.waitForSelector(".search-container button");
  await page.locator(".search-container button").first().click();
  await page.getByRole("button", { name: "Videre" }).click();

  await expect(page.locator("h1")).toContainText("Opret din konto");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Adgangskode", { exact: true }).fill(password);
  await page.getByLabel("Bekræft adgangskode").fill(password);
}

test.describe("GoBuddy real account creation", () => {
  test("creates a real Supabase account and deletes it afterwards", async ({ page }) => {
    test.skip(!SUPABASE_URL || !SERVICE_KEY, "Requires VITE_SUPABASE_URL and SB_SECRET_KEY");

    const email = `gobuddy-e2e-${Date.now()}@${SIGNUP_DOMAIN}`;
    const password = "Password123!";

    // Forward the signup request to the real backend, but capture the id of the
    // user it creates so we can verify and clean it up.
    let createdUserId: string | undefined;
    let rateLimited = false;
    await page.route("**/auth/v1/signup**", async (route) => {
      const response = await route.fetch();
      const text = await response.text();
      // Confirmation emails are rate-limited (~few/hour); skip rather than fail.
      if (response.status() === 429) rateLimited = true;
      try {
        const parsed = JSON.parse(text);
        // GoTrue returns the User object at the top level when confirmation is
        // required, or nested under `user` when a session is issued.
        createdUserId = parsed.user?.id ?? parsed.id;
      } catch {
        // leave createdUserId undefined; assertions below will fail loudly
      }
      await route.fulfill({ response, body: text });
    });

    try {
      await walkToSignup(page, email, password);

      await Promise.all([
        page.waitForResponse("**/auth/v1/signup**"),
        page.getByRole("button", { name: "Opret konto" }).click(),
      ]);

      test.skip(rateLimited, "Supabase email send rate limit hit (over_email_send_rate_limit)");

      // A successful real signup navigates to the email-confirmation step.
      await expect(page).toHaveURL(/\/confirmemail/);
      expect(createdUserId, "signup response should contain a user id").toBeTruthy();

      // The account really exists in Supabase auth.
      const { data, error } = await adminClient().auth.admin.getUserById(createdUserId as string);
      expect(error).toBeNull();
      expect(data.user?.email).toBe(email);
    } finally {
      if (createdUserId) await deleteUser(createdUserId);
    }

    // And it's gone after cleanup.
    const { data } = await adminClient().auth.admin.getUserById(createdUserId as string);
    expect(data.user).toBeNull();
  });
});
