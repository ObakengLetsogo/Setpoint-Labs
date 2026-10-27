import { defineConfig } from "@playwright/test";

const PORT = 4318;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "block",
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu-compositing"] },
  },
  webServer: {
    // Set E2E_SKIP_BUILD=1 to reuse an existing production build.
    // The app builds as a standalone server, which needs its static files and public folder beside it.
    command: `${process.env.E2E_SKIP_BUILD ? "" : "npm run build && "}cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/ && PORT=${PORT} HOSTNAME=127.0.0.1 node .next/standalone/server.js`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
