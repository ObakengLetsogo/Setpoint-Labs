import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { ROOT, log, run } from "./util.mjs";

async function up(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Use VIDEO_BASE_URL if set, otherwise serve a production build on a private port so the
 * recording has no dev overlays. Builds first when there is no build or --build was passed.
 */
export async function ensureServer({ build = false } = {}) {
  if (process.env.VIDEO_BASE_URL) return { url: process.env.VIDEO_BASE_URL.replace(/\/$/, ""), stop: () => {} };
  if (build || !existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    log("building the app (next build)");
    await run("npx", ["next", "build"], { quiet: false });
  }
  const port = process.env.VIDEO_PORT ?? "4317";
  const url = `http://127.0.0.1:${port}`;
  if (await up(url)) return { url, stop: () => {} };
  log(`starting next on ${url}`);
  const child = spawn("npx", ["next", "start", "-p", port, "-H", "127.0.0.1"], { cwd: ROOT, stdio: "ignore", detached: true });
  const stop = () => {
    try {
      process.kill(-child.pid);
    } catch {}
  };
  process.on("exit", stop);
  for (let i = 0; i < 120; i++) {
    if (await up(url)) return { url, stop };
    await new Promise((r) => setTimeout(r, 500));
  }
  stop();
  throw new Error("next start did not come up");
}
