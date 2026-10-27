import { writeFile } from "node:fs/promises";
import { toWav } from "../util.mjs";

/**
 * ElevenLabs, as "elevenlabs:<voiceId>". Use a stock library voice only, never a cloned person.
 * Needs ELEVENLABS_API_KEY; ELEVENLABS_MODEL defaults to eleven_multilingual_v2.
 */
export const elevenlabs = {
  name: "elevenlabs",
  available: () => Boolean(process.env.ELEVENLABS_API_KEY),
  missing: "set ELEVENLABS_API_KEY",
  async synth(voice, text, outWav) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2" }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const mp3 = `${outWav}.mp3`;
    await writeFile(mp3, Buffer.from(await res.arrayBuffer()));
    await toWav(mp3, outWav);
  },
};
