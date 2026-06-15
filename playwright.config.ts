import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

// Expose .env / .env.test to the Playwright Node process (Vite only loads them
// for the app itself). The real-account test needs VITE_SUPABASE_URL and the
// service-role SB_SECRET_KEY for cleanup. Don't override vars already set (CI).
const fileEnv = loadEnv("test", process.cwd(), "");
for (const [key, value] of Object.entries(fileEnv)) {
  if (!(key in process.env)) process.env[key] = value;
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3002",
    reuseExistingServer: !process.env.CI,
  },
});
