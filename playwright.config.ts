import { defineConfig } from "@playwright/test";

const smokeBaseUrl = process.env.SMOKE_BASE_URL;

export default defineConfig({
  projects: [
    {
      name: "e2e",
      testDir: "tests/e2e",
      use: { baseURL: "http://localhost:5173" },
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
