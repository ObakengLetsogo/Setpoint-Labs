import { writeFile } from "node:fs/promises";

const escapeXml = (s) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

/** Azure Speech neural voices, e.g. en-ZA-LukeNeural. Needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION. */
export const azure = {
  name: "azure",
  available: () => Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION),
  missing: "set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION",
  async synth(voice, text, outWav) {
    const lang = voice.split("-").slice(0, 2).join("-");
    const rate = process.env.AZURE_SPEECH_RATE ?? "-4%";
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`;
    const res = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "riff-48khz-16bit-mono-pcm",
        "User-Agent": "setpoint-labs-video",
      },
      body: ssml,
    });
    if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
    await writeFile(outWav, Buffer.from(await res.arrayBuffer()));
  },
};
