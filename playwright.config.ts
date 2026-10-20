import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3227",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
        (existsSync(chrome) ? chrome : undefined),
    },
  },
  webServer: {
    command: "npm start -- --hostname 127.0.0.1 --port 3227",
    url: "http://127.0.0.1:3227/api/state",
    reuseExistingServer: false,
    timeout: 60000,
    env: { HAKPULIH_DATA_DIR: "/private/tmp/hakpulih-e2e-data" },
  },
});
