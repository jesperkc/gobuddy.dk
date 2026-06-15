import { test, expect, Page } from "@playwright/test";

// Shape of the request body the Supabase auth client POSTs to /auth/v1/signup.
interface SupabaseSignupRequest {
  email: string;
  password: string;
  data: {
    first_name: string;
    age: number;
    coordinates: string | null;
    postcode: string;
    city: string;
    country: string;
    country_code: string;
    longitude?: number;
    latitude?: number;
    interests: { interest_id: string; description: string }[];
    newsletter: boolean;
  };
}

interface CustomWindow extends Window {
  __CAPTURED_SIGNUP_ARGS__?: SupabaseSignupRequest;
}

// Fixed interest list returned in place of the live Supabase query, so the flow
// is deterministic and doesn't depend on DB contents.
const INTERESTS = [
  { interest_id: "11111111-1111-1111-1111-111111111111", interest_da: "Løb", interest_en: "Running", category: "sport", icon: "run", onboarding: true, custom: false, custom_added_by: null, slug: "loeb", created_at: "2024-01-01T00:00:00Z" },
  { interest_id: "22222222-2222-2222-2222-222222222222", interest_da: "Cykling", interest_en: "Cycling", category: "sport", icon: "bike", onboarding: true, custom: false, custom_added_by: null, slug: "cykling", created_at: "2024-01-01T00:00:00Z" },
  { interest_id: "33333333-3333-3333-3333-333333333333", interest_da: "Tennis", interest_en: "Tennis", category: "sport", icon: "tennis", onboarding: true, custom: false, custom_added_by: null, slug: "tennis", created_at: "2024-01-01T00:00:00Z" },
];

const CORS = { "access-control-allow-origin": "*", "content-type": "application/json" };

/**
 * Stub the two external reads the onboarding flow makes — the Supabase
 * `interests` query and Nominatim geocoding — so the suite is hermetic and
 * never flaky in CI. The real calls are exercised by the separate
 * signup-create-account spec.
 */
async function mockExternalReads(page: Page) {
  await page.route("**/rest/v1/interests**", (route) =>
    route.fulfill({ status: 200, headers: CORS, body: JSON.stringify(INTERESTS) })
  );
  await page.route("**nominatim.openstreetmap.org/search**", (route) =>
    route.fulfill({
      status: 200,
      headers: CORS,
      body: JSON.stringify([
        {
          display_name: "København, Danmark",
          lat: "55.6867243",
          lon: "12.5700724",
          address: { city: "København", postcode: "1000", country: "Danmark", country_code: "dk" },
        },
      ]),
    })
  );
}

test.beforeEach(async ({ page }) => {
  await mockExternalReads(page);
});

test.describe("GoBuddy Signup Flow", () => {
  test("should complete the full signup flow", async ({ page }) => {
    // Mock the auth signup so no real account is created; capture the payload.
    await page.route("**/auth/v1/signup**", async (route) => {
      const requestData = route.request().postDataJSON();
      await page.evaluate((data) => {
        (window as unknown as CustomWindow).__CAPTURED_SIGNUP_ARGS__ = data;
      }, requestData);
      await route.fulfill({
        status: 200,
        headers: CORS,
        body: JSON.stringify({ user: { id: "mock-user-id" }, session: null }),
      });
    });

    // Step 1: Landing page
    await page.goto("/");
    await expect(page).toHaveTitle(/GoBuddy/);
    await expect(page.locator("h1")).toContainText("Mød dine nye");
    // Two links read "Kom i gang" / "Kom i gang gratis"; target the nav one exactly.
    await page.getByRole("link", { name: "Kom i gang", exact: true }).click();

    // Step 2: Details
    await expect(page.locator("h1")).toContainText("Fortæl os mere om dig");
    const testName = "Test Bruger";
    const testAge = "30";
    await page.getByLabel("Hvad er dit navn?").fill(testName);
    await page.getByLabel("Hvad er din alder?").fill(testAge);
    await page.getByRole("button", { name: "Videre" }).click();

    // Step 3: Interests (stubbed list)
    await expect(page.locator("h1")).toContainText("Hvad er dine interesser?");
    await expect(page.getByRole("button", { name: "Videre" })).toBeDisabled();
    // Radix Toggle renders a <button data-state="on|off">.
    await page.waitForSelector("button[data-state]");
    const toggles = page.locator("button[data-state]");
    await toggles.nth(0).click();
    await toggles.nth(1).click();
    await expect(page.getByRole("button", { name: "Videre" })).toBeEnabled();
    await page.getByRole("button", { name: "Videre" }).click();

    // Step 4: Location (stubbed geocoding)
    await expect(page.locator("h1")).toContainText("Hvor i verden er du?");
    await expect(page.getByRole("button", { name: "Videre" })).toBeDisabled();
    await page.getByPlaceholder("Søg efter din by").fill("Copenhagen");
    await page.waitForSelector(".search-container button");
    await page.locator(".search-container button").first().click();
    await expect(page.getByRole("button", { name: "Videre" })).toBeEnabled();
    await page.getByRole("button", { name: "Videre" }).click();

    // Step 5: Signup
    await expect(page.locator("h1")).toContainText("Opret din konto");
    const randomEmail = `test${Math.floor(Math.random() * 100000)}@example.com`;
    const testPassword = "Password123!";
    await page.getByLabel("Email").fill(randomEmail);
    await page.getByLabel("Adgangskode", { exact: true }).fill(testPassword);
    await page.getByLabel("Bekræft adgangskode").fill(testPassword);
    await page.getByLabel("Modtag vores nyhedsbrev").check();

    await Promise.all([
      page.waitForResponse("**/auth/v1/signup**"),
      page.getByRole("button", { name: "Opret konto" }).click(),
    ]);

    // Verify the actual POST body the app sent to Supabase matches what we
    // entered. (Don't read __TEST_SIGNUP_OBJECT__ here — a successful signup
    // calls reset(), which clears the store and the window object.)
    const capturedArgs = await page.evaluate(
      () => (window as unknown as CustomWindow).__CAPTURED_SIGNUP_ARGS__
    );

    expect(capturedArgs).toBeDefined();
    if (capturedArgs) {
      const captured = capturedArgs.data;
      expect(capturedArgs.email).toBe(randomEmail);
      expect(capturedArgs.password).toBe(testPassword);
      expect(captured.first_name).toBe(testName);
      expect(captured.age).toBe(Number(testAge));
      expect(captured.newsletter).toBe(true);
      expect(captured.interests).toEqual([
        { interest_id: INTERESTS[0].interest_id, description: "" },
        { interest_id: INTERESTS[1].interest_id, description: "" },
      ]);
      expect(captured.city).toBe("København");
      expect(captured.country).toBe("Danmark");
      expect(captured.country_code).toBe("dk");
      expect(captured.coordinates).toBe("POINT(55.6867243 12.5700724)");
    }
  });

  test("should block account creation with a password under 8 characters", async ({ page }) => {
    let signupRequested = false;
    await page.route("**/auth/v1/signup**", async (route) => {
      signupRequested = true;
      await route.abort();
    });

    await page.goto("/signup");
    await expect(page.locator("h1")).toContainText("Opret din konto");

    await page.getByLabel("Email").fill("short@example.com");
    const password = page.getByLabel("Adgangskode", { exact: true });
    await password.fill("short");
    await page.getByLabel("Bekræft adgangskode").fill("short");
    await page.getByRole("button", { name: "Opret konto" }).click();

    // The password Input has minLength=8, so the browser's native constraint
    // validation blocks the submit: no signup request fires and we stay on /signup.
    await expect(password).toHaveJSProperty("validity.valid", false);
    expect(signupRequested).toBe(false);
    expect(new URL(page.url()).pathname).toBe("/signup");
  });

  test("should reject mismatched passwords", async ({ page }) => {
    let signupRequested = false;
    await page.route("**/auth/v1/signup**", async (route) => {
      signupRequested = true;
      await route.abort();
    });

    await page.goto("/signup");
    await expect(page.locator("h1")).toContainText("Opret din konto");

    await page.getByLabel("Email").fill("mismatch@example.com");
    await page.getByLabel("Adgangskode", { exact: true }).fill("Password123!");
    await page.getByLabel("Bekræft adgangskode").fill("Different123!");
    await page.getByRole("button", { name: "Opret konto" }).click();

    await expect(page.getByText("Adgangskoderne matcher ikke")).toBeVisible();
    expect(signupRequested).toBe(false);
  });

  test("should keep Videre disabled until required input is given", async ({ page }) => {
    // Interests: disabled until at least one interest is selected.
    await page.goto("/details");
    await page.getByLabel("Hvad er dit navn?").fill("Guard Test");
    await page.getByLabel("Hvad er din alder?").fill("25");
    await page.getByRole("button", { name: "Videre" }).click();

    await expect(page.locator("h1")).toContainText("Hvad er dine interesser?");
    await expect(page.getByRole("button", { name: "Videre" })).toBeDisabled();
    await page.waitForSelector("button[data-state]");
    await page.locator("button[data-state]").first().click();
    await expect(page.getByRole("button", { name: "Videre" })).toBeEnabled();
    await page.getByRole("button", { name: "Videre" }).click();

    // Location: disabled until coordinates are set (no search result selected).
    await expect(page.locator("h1")).toContainText("Hvor i verden er du?");
    await expect(page.getByRole("button", { name: "Videre" })).toBeDisabled();
  });
});
