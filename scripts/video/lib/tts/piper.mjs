import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { VIDEO_DIR, log, run } from "../util.mjs";

const MODELS = path.join(VIDEO_DIR, "models");
const bin = () => process.env.PIPER_BIN ?? path.join(VIDEO_DIR, ".venv", "bin", "piper");

/** Download a voice such as en_GB-alan-medium from the rhasspy/piper-voices repository. */
async function ensureModel(voice) {
  const onnx = path.join(MODELS, `${voice}.onnx`);
  if (existsSync(onnx) && existsSync(`${onnx}.json`)) return onnx;
  const [locale, name, quality] = voice.split("-");
  const lang = locale.split("_")[0];
  const base = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${lang}/${locale}/${name}/${quality}/${voice}`;
  await mkdir(MODELS, { recursive: true });
  for (const ext of [".onnx", ".onnx.json"]) {
    log(`downloading piper voice ${voice}${ext}`);
    const res = await fetch(base + ext);
    if (!res.ok) throw new Error(`piper voice download failed (${res.status}) for ${voice}${ext}`);
    await writeFile(path.join(MODELS, voice + ext), Buffer.from(await res.arrayBuffer()));
  }
  return onnx;
}

/** Piper, the free offline voice, as "piper:<voice>". Install with scripts/video/setup.sh. */
export const piper = {
  name: "piper",
  available: () => existsSync(bin()),
  missing: "run scripts/video/setup.sh to install piper",
  async synth(voice, text, outWav) {
    const model = await ensureModel(voice);
    await run(bin(), ["-m", model, "-f", outWav, "--sentence-silence", "0.25"], { input: text });
  },
};
