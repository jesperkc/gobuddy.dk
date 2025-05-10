import { test, expect } from "@playwright/test";
import { SignupRequestData } from "../src/routes/signup";

// Define the actual structure of the captured Supabase request
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
    interests: string[];
    newsletter: boolean;
  };
  code_challenge?: string | null;
  code_challenge_method?: string | null;
  gotrue_meta_security?: Record<string, unknown>;
}

// Extend the Window interface
interface CustomWindow extends Window {
  __TEST_SIGNUP_OBJECT__?: SignupRequestData;
  __CAPTURED_SIGNUP_ARGS__?: SupabaseSignupRequest;
  supabase?: {
    auth: {
      signUp: (data: SignupRequestData) => Promise<{
        data: { user: { id: string }; session: null };
        error: null;
      }>;
    };
  };
}

test.describe("GoBuddy Signup Flow", () => {
  test("should navigate through the entire signup process", async ({ page }) => {
    // Set up route interception for the Supabase auth API
    await page.route("**/auth/v1/signup**", async (route) => {
      // Get the request data
      const requestData = route.request().postDataJSON();

      // Store the request data for later verification
      await page.evaluate((data) => {
        (window as CustomWindow).__CAPTURED_SIGNUP_ARGS__ = data;
      }, requestData);

      // Mock a successful response
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: { id: "mock-user-id" },
            session: null,
          },
          error: null,
        }),
      });
    });

    // Step 1: Landing page
    await page.goto("/");
    await expect(page).toHaveTitle(/GoBuddy/);

    // Verify landing page content
    await expect(page.locator("h1")).toContainText("Mød dine nye bedste venner");

    // Click "Start nu" button to begin the signup process
    await page.getByText("Start nu").click();

    // Step 2: Details page
    await expect(page.locator("h1")).toContainText("Fortæl os mere om dig");

    // Fill in name and age
    const testName = "Test Bruger";
    const testAge = "30";
    await page.getByLabel("Hvad er dit navn?").fill(testName);
    await page.getByLabel("Hvad er din alder?").fill(testAge);

    // Click "Videre" button
    await page.getByRole("button", { name: "Videre" }).click();

    // Step 3: Interests page
    await expect(page.locator("h1")).toContainText("Hvad er dine interesser?");

    // Select at least one interest
    const testInterests = ["Technology", "Music"];
    await page.getByText(testInterests[0]).click();
    await page.getByText(testInterests[1]).click();

    // Click "Videre" button
    await page.getByRole("button", { name: "Videre" }).click();

    // Step 4: Location page
    await expect(page.locator("h1")).toContainText("Hvor i verden er du?");

    // Search for a location
    await page.getByPlaceholder("Søg efter din by").fill("Copenhagen");

    // Wait for search results and select the first one
    await page.waitForSelector(".search-container button");
    await page.locator(".search-container button").first().click();

    // Click "Videre" button
    await page.getByRole("button", { name: "Videre" }).click();

    // Step 5: Signup page
    await expect(page.locator("h1")).toContainText("Opret din konto");

    // Generate a random email to avoid conflicts
    const randomEmail = `test${Math.floor(Math.random() * 10000)}@example.com`;
    const testPassword = "Password123!";

    // Fill in email and password
    await page.getByLabel("Email").fill(randomEmail);
    await page.getByLabel("Adgangskode").fill(testPassword);

    // Check newsletter checkbox
    await page.getByLabel("Modtag vores nyhedsbrev").check();

    // Verify that all required fields are filled
    await expect(page.getByLabel("Email")).toHaveValue(randomEmail);
    await expect(page.getByLabel("Adgangskode")).toHaveValue(testPassword);

    // Click the "Opret konto" button to submit the form
    await Promise.all([
      // Wait for the request to be sent
      page.waitForRequest("**/auth/v1/signup**"),
      // Click the button
      page.getByRole("button", { name: "Opret konto" }).click(),
    ]);

    // Wait for the navigation or state change
    await page.waitForTimeout(1000);

    // Verify that the signupObject contains the correct values
    const signupObject = await page.evaluate(() => (window as CustomWindow).__TEST_SIGNUP_OBJECT__);

    // Ensure signupObject exists
    expect(signupObject).toBeDefined();

    // Get the captured arguments passed to the mocked supabase.auth.signUp function
    const capturedArgs = await page.evaluate(() => (window as CustomWindow).__CAPTURED_SIGNUP_ARGS__);

    // Verify that supabase.auth.signUp was called with the correct arguments
    expect(capturedArgs).toBeDefined();
    expect(signupObject).toBeDefined();

    if (capturedArgs && signupObject) {
      // Instead of comparing the entire objects, check specific fields
      expect(capturedArgs.email).toBe(signupObject.email);
      expect(capturedArgs.password).toBe(signupObject.password);

      // Check the data fields
      const capturedData = capturedArgs.data;
      const expectedData = signupObject.options.data;

      expect(capturedData.first_name).toBe(expectedData.first_name);
      expect(capturedData.age).toBe(expectedData.age);
      expect(capturedData.interests).toEqual(expectedData.interests);
      expect(capturedData.newsletter).toBe(expectedData.newsletter);
      expect(capturedData.city).toBe(expectedData.city);
      expect(capturedData.country).toBe(expectedData.country);
      expect(capturedData.country_code).toBe(expectedData.country_code);
      expect(capturedData.postcode).toBe(expectedData.postcode);
      expect(capturedData.latitude).toBe(expectedData.latitude);
      expect(capturedData.longitude).toBe(expectedData.longitude);
      expect(capturedData.coordinates).toBe(expectedData.coordinates);
    }

    // We've already verified the data above, so we don't need this block anymore
  });
});
