import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { log } from "./util.mjs";

// Software WebGL in the sandbox; GPU compositing makes every capture wait about 25 s, so it stays off.
const ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu-compositing"];
const EPOCH = new Date("2026-01-01T09:00:00Z");

async function browser() {
  const { chromium } = await import("playwright");
  return chromium.launch({ args: ARGS });
}

/** Expand "tap" into press down and up, and resolve each action's time to a frame index. */
export function scheduleActions(timeline, fps) {
  const out = [];
  for (const s of timeline) {
    for (const a of s.actions ?? []) {
      let at = a.at ?? 0;
      if (at === "end") at = s.duration - 0.15;
      else if (typeof at === "string" && at.endsWith("%")) at = s.leadIn + (Number.parseFloat(at) / 100) * s.speech;
      const frame = Math.round((s.start + at) * fps);
      if (a.call === "tap") {
        out.push({ frame, call: "press", args: [a.args[0], true] });
        out.push({ frame: frame + Math.round(0.35 * fps), call: "press", args: [a.args[0], false] });
      } else out.push({ frame, call: a.call, args: a.args ?? [] });
    }
  }
  return out.sort((x, y) => x.frame - y.frame);
}

/** Capture the intro and outro title cards as stills. */
export async function captureCards(base, lessonId, size, dir) {
  const b = await browser();
  try {
    const page = await (await b.newContext({ viewport: size, deviceScaleFactor: 1, serviceWorkers: "block" })).newPage();
    const files = {};
    for (const card of ["intro", "outro"]) {
      await page.goto(`${base}/record/${lessonId}?hideChrome=1&card=${card}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      files[card] = path.join(dir, `${card}.png`);
      await page.screenshot({ path: files[card] });
    }
    return files;
  } finally {
    await b.close();
  }
}

/**
 * Drive /record on a fake clock: per frame, advance timers by one frame, render exactly once, capture.
 * Returns the frame directory with 000000.jpg onwards. With `only` (a Set of frame numbers) it renders and
 * captures just those frames for a quick preview; timers still run every frame so the logic stays exact.
 */
export async function recordFrames({ base, lessonId, size, fps, totalSeconds, actions, dir, onProgress, only }) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const b = await browser();
  try {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 1, serviceWorkers: "block" });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    page.on("pageerror", (e) => log("page error:", e.message));
    await page.clock.install({ time: EPOCH });
    await page.goto(`${base}/record/${lessonId}?hideChrome=1&manual=1`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.setpointLabs?.getState().ready && window.__recordAdvance, null, { timeout: 120000 });
    await page.evaluate(() => document.fonts.ready);
    // Let the model, environment map and shaders settle on real time before freezing the clock.
    for (let i = 0; i < 6; i++) await page.evaluate((t) => window.__recordAdvance(t), i / fps);
    await page.waitForTimeout(3000);
    await page.clock.pauseAt(new Date(EPOCH.getTime() + 3600_000));
    await page.evaluate(() => {
      const api = window.setpointLabs;
      api.setReduceMotion(false);
      api.resetView();
    });

    const total = Math.ceil(totalSeconds * fps);
    let next = 0;
    let elapsedMs = 0;
    const t0 = Date.now();
    for (let f = 0; f < total; f++) {
      const due = [];
      while (next < actions.length && actions[next].frame <= f) due.push(actions[next++]);
      if (due.length) {
        await page.evaluate((list) => {
          for (const a of list) {
            const fn = window.setpointLabs[a.call];
            if (typeof fn !== "function") throw new Error(`setpointLabs.${a.call} is not a function`);
            fn(...a.args);
          }
        }, due);
      }
      const target = Math.round(((f + 1) * 1000) / fps);
      await page.clock.runFor(target - elapsedMs);
      elapsedMs = target;
      if (only && !only.has(f) && !only.has(f + 1)) continue;
      await page.evaluate((t) => window.__recordAdvance(t), 10 + f / fps);
      if (only && !only.has(f)) continue;
      const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
      await writeFile(path.join(dir, `${String(f).padStart(6, "0")}.jpg`), Buffer.from(shot.data, "base64"));
      if (onProgress && (f % fps === 0 || f === total - 1)) onProgress(f + 1, total, (Date.now() - t0) / (f + 1));
    }
    return { dir, frames: total };
  } finally {
    await b.close();
  }
}
