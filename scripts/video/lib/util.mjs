import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VIDEO_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ROOT = path.resolve(VIDEO_DIR, "..", "..");
export const CACHE = path.join(ROOT, ".video-cache");

export const log = (...a) => console.log("[video]", ...a);

export function hash(...parts) {
  return createHash("sha1").update(parts.join("\u0000")).digest("hex").slice(0, 16);
}

/** Run a command, resolve with stdout, reject with stderr tail on failure. */
export function run(cmd, args, { input, quiet = true, cwd = ROOT } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => {
      err += d;
      if (!quiet) process.stderr.write(d);
    });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`))));
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

export async function duration(file) {
  const out = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
  return Number.parseFloat(out.trim());
}

/** Convert any audio file to 48 kHz mono 16 bit WAV, the format every later step expects. */
export function toWav(input, output) {
  return run("ffmpeg", ["-y", "-v", "error", "-i", input, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", output]);
}
