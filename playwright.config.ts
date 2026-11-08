import { defineConfig, devices } from "@playwright/test";

const smokeBaseUrl = process.env.SMOKE_BASE_URL;

const viewport = { width: 1024, height: 768 };
const e2e = { testDir: "tests/e2e" };
const baseURL = "http://localhost:5173";

export default defineConfig({
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  projects: [
    {
      name: "chromium",
      ...e2e,
      use: {
        ...devices["Desktop Chrome"],
        viewport,
        baseURL,
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    {
      name: "firefox",
      ...e2e,
      use: { ...devices["Desktop Firefox"], viewport, baseURL },
    },
    {
      name: "webkit",
      ...e2e,
      use: { ...devices["Desktop Safari"], viewport, baseURL },
    },
    {
      name: "smoke",
      testDir: "tests/smoke",
      use: { baseURL: smokeBaseUrl ?? "http://localhost:5173" },
    },
  ],
  webServer: smokeBaseUrl
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: true,
      },
});
