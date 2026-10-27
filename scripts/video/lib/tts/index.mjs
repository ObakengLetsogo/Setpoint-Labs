import { existsSync } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { CACHE, hash, log, toWav } from "../util.mjs";
import { azure } from "./azure.mjs";
import { elevenlabs } from "./elevenlabs.mjs";
import { piper } from "./piper.mjs";

const PROVIDERS = { azure, elevenlabs, piper };

export function parseVoice(spec) {
  const i = spec.indexOf(":");
  const provider = PROVIDERS[spec.slice(0, i)];
  if (i < 0 || !provider) throw new Error(`Unknown voice "${spec}". Use azure:<name>, elevenlabs:<voiceId> or piper:<model>.`);
  return { spec, provider, voice: spec.slice(i + 1) };
}

/**
 * Voice precedence: --voice flag, VIDEO_VOICE env, the lesson spec, the course in config.json, then the default.
 * Azure voices fall back to the configured fallback voice, and everything falls back to the offline Piper voice.
 */
export function voiceChain(config, { cli, spec, course }) {
  const v = config.voice;
  const chosen = cli ?? process.env.VIDEO_VOICE ?? spec ?? v.courses?.[course] ?? v.default;
  const chain = [chosen];
  if (chosen.startsWith("azure:") && v.fallback) chain.push(v.fallback);
  if (v.offline) chain.push(v.offline);
  return [...new Set(chain)].map(parseVoice);
}

async function synthCached(voice, text) {
  const dir = path.join(CACHE, "tts");
  await mkdir(dir, { recursive: true });
  const out = path.join(dir, `${hash(voice.spec, text)}.wav`);
  if (existsSync(out)) return out;
  const raw = `${out}.raw.wav`;
  await voice.provider.synth(voice.voice, text, raw);
  await toWav(raw, `${out}.tmp.wav`);
  await rename(`${out}.tmp.wav`, out);
  return out;
}

/** Pick the first voice in the chain that works, then voice every scene with it so a video never mixes voices. */
export async function narrate(chain, texts) {
  for (const voice of chain) {
    if (!voice.provider.available()) {
      log(`skipping ${voice.spec}: ${voice.provider.missing}`);
      continue;
    }
    try {
      const first = await synthCached(voice, texts[0]);
      const rest = [];
      for (const t of texts.slice(1)) rest.push(await synthCached(voice, t));
      log(`voice: ${voice.spec}`);
      return { voice: voice.spec, files: [first, ...rest] };
    } catch (e) {
      log(`voice ${voice.spec} failed: ${e.message.split("\n")[0]}`);
    }
  }
  throw new Error("No narration voice worked. Add Azure keys or run scripts/video/setup.sh for the offline voice.");
}
