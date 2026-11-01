import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../util.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "kokoro_synth.py");
const modelDir = () => process.env.KOKORO_DIR ?? "/root/kokoro";

// The approved teaching pace, matched to the intro video. Do not change without sign off.
const SPEED = 0.95;

/** Kokoro ONNX, the approved offline voice, as "kokoro:<voice>", e.g. kokoro:af_heart. */
export const kokoro = {
  name: "kokoro",
  available: () => existsSync(path.join(modelDir(), "kokoro-v1.0.onnx")) && existsSync(path.join(modelDir(), "voices-v1.0.bin")),
  missing: "set KOKORO_DIR to a folder with kokoro-v1.0.onnx and voices-v1.0.bin",
  async synth(voice, text, outWav) {
    if (!process.env.KOKORO_DIR) process.env.KOKORO_DIR = modelDir();
    await run("python3", [SCRIPT, voice, String(SPEED), outWav], {input: text});
  },
};
