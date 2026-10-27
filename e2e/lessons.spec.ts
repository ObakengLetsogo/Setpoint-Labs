import { expect, test, type Page } from "@playwright/test";

type Api = NonNullable<Window["setpointLabs"]>;

async function open(page: Page, lessonId: string) {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.setpointLabs), null, { timeout: 60_000 });
  await page.evaluate((id) => {
    const api = window.setpointLabs!;
    api.setReduceMotion(true);
    api.load(id);
  }, lessonId);
  // Lesson content arrives from /api/lessons after an access check; wait for its program.
  await expect(page.locator("#run")).toBeVisible({ timeout: 30_000 });
}

const call = <K extends keyof Api>(page: Page, name: K, ...args: Parameters<Extract<Api[K], (...a: never[]) => unknown>>) =>
  page.evaluate(({ name, args }) => (window.setpointLabs![name] as (...a: unknown[]) => unknown)(...args), { name, args: args as unknown[] });

const tag = (page: Page, name: string) => page.evaluate((n) => Boolean(window.setpointLabs!.getState().memory[n]), name);

/** Give the scan loop (100 ms) time to see an input change. */
const scans = (page: Page, n = 4) => page.waitForTimeout(n * 110);

test.describe("lesson 1: contacts and coils", () => {
  test("motor runs only while Start is held", async ({ page }) => {
    await open(page, "foundations-1");
    await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: /contacts and coils/i })).toBeVisible();
    await call(page, "play");
    await call(page, "press", "start", true);
    await scans(page);
    await expect.poll(() => tag(page, "Motor_Run"), { timeout: 15_000 }).toBe(true);
    await call(page, "press", "start", false);
    await scans(page);
    await expect.poll(() => tag(page, "Motor_Run"), { timeout: 15_000 }).toBe(false);
  });
});

test.describe("lesson 2: the seal-in circuit", () => {
  test("a tap on Start keeps the motor running until Stop", async ({ page }) => {
    await open(page, "foundations-2");
    await call(page, "play");
    await call(page, "press", "start", true);
    await scans(page, 2);
    await call(page, "press", "start", false);
    await scans(page);
    await expect.poll(() => tag(page, "Motor_Run"), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => tag(page, "Run_Seal"), { timeout: 15_000 }).toBe(true);

    await call(page, "press", "stop", true);
    await scans(page, 2);
    await call(page, "press", "stop", false);
    await scans(page);
    await expect.poll(() => tag(page, "Motor_Run"), { timeout: 15_000 }).toBe(false);
  });

  test("passing the checkpoint marks the lab done and survives a reload", async ({ page }) => {
    await open(page, "foundations-2");
    await call(page, "play");
    await call(page, "press", "start", true);
    await scans(page, 2);
    await call(page, "press", "start", false);
    await scans(page);
    const done = page.locator('#labs button[title$="The seal-in circuit · done by you"]');
    await expect(done).toHaveCount(1);

    await page.reload();
    await page.waitForFunction(() => Boolean(window.setpointLabs), null, { timeout: 60_000 });
    await expect(done).toHaveCount(1);
    expect(await page.evaluate(() => window.setpointLabs!.getState().lessonId)).toBe("foundations-2");
  });
});

test.describe("lesson 3: overload protection", () => {
  test("an overload trip stops the motor and lights the fault lamp", async ({ page }) => {
    await open(page, "foundations-3");
    await call(page, "play");
    await call(page, "press", "start", true);
    await scans(page, 2);
    await call(page, "press", "start", false);
    await scans(page);
    await expect.poll(() => tag(page, "Motor_Run"), { timeout: 15_000 }).toBe(true);

    await call(page, "setInput", "Overload_OK", false);
    await scans(page);
    await expect.poll(() => tag(page, "Motor_Run"), { timeout: 15_000 }).toBe(false);
    await expect.poll(() => tag(page, "Fault_Lamp"), { timeout: 15_000 }).toBe(true);

    // The motor must not restart until the overload is reset.
    await call(page, "press", "start", true);
    await scans(page, 2);
    await call(page, "press", "start", false);
    await scans(page, 6);
    expect(await tag(page, "Motor_Run")).toBe(false);

    await call(page, "setInput", "Overload_OK", true);
    await call(page, "press", "start", true);
    await scans(page, 2);
    await call(page, "press", "start", false);
    await scans(page);
    await expect.poll(() => tag(page, "Motor_Run"), { timeout: 15_000 }).toBe(true);
  });
});

test.describe("access", () => {
  test("a paid lesson asks a visitor to sign in and never sends its content", async ({ page }) => {
    const res = await page.request.get("/api/lessons/m-lift");
    expect(res.status()).toBe(401);
    await page.goto("/");
    await page.waitForFunction(() => Boolean(window.setpointLabs), null, { timeout: 60_000 });
    await page.evaluate(() => window.setpointLabs!.load("m-lift"));
    await expect(page.getByRole("link", { name: "Sign in" }).last()).toBeVisible();
    await expect(page.locator("#run")).toHaveCount(0);
  });
});
