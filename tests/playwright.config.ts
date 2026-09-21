import { defineConfig, devices } from "@playwright/test";
import { DEVICE } from "./device";

export default defineConfig({
  testDir: "./ui",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:8080",
    ...DEVICE,
  },
  projects: [
    {
      name: "chromium",
      use: { ...DEVICE },
    },
    { name: "webkit", use: { ...devices["iPhone 13"], defaultBrowserType: "webkit" } },
  ],
  webServer: {
    command: "npx http-server ../dist -p 8080 -c-1 --silent",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
