import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { VIDEO_DIR, run } from "./util.mjs";

const ff = (args, cwd) => run("ffmpeg", ["-y", "-v", "error", ...args], { cwd });

/** Place each scene's narration at its absolute start time on one 48 kHz mono track. */
export async function buildVoiceTrack(clips, totalSeconds, out) {
  const inputs = clips.flatMap((c) => ["-i", c.file]);
  const delays = clips.map((c, i) => `[${i}]adelay=${Math.round(c.at * 1000)}:all=1[d${i}]`);
  const mix = `${clips.map((_, i) => `[d${i}]`).join("")}amix=inputs=${clips.length}:duration=longest:normalize=0,apad=whole_dur=${totalSeconds.toFixed(3)},atrim=0:${totalSeconds.toFixed(3)}[a]`;
  await ff([...inputs, "-filter_complex", [...delays, mix].join(";"), "-map", "[a]", "-ar", "48000", "-ac", "1", out]);
}

/**
 * Background music: scripts/video/assets/music.(mp3|wav|m4a) if present (royalty free only),
 * otherwise a soft generated A major pad that never competes with the voice.
 */
export async function buildMusic(totalSeconds, out) {
  const own = ["mp3", "wav", "m4a"].map((e) => path.join(VIDEO_DIR, "assets", `music.${e}`)).find((f) => existsSync(f));
  const d = totalSeconds.toFixed(3);
  if (own) {
    await ff(["-stream_loop", "-1", "-i", own, "-t", d, "-af", `afade=t=in:d=2,afade=t=out:st=${Math.max(0, totalSeconds - 3)}:d=3`, "-ar", "48000", "-ac", "2", out]);
    return;
  }
  const notes = [110, 164.81, 220, 277.18, 329.63, 415.3];
  const voices = notes.map((f, i) => `${(0.16 / (1 + i * 0.35)).toFixed(3)}*sin(2*PI*${f}*t)*(0.75+0.25*sin(2*PI*${(0.05 + i * 0.013).toFixed(3)}*t+${i}))`);
  const expr = voices.join("+");
  await ff([
    "-f", "lavfi", "-i", `aevalsrc=exprs='${expr}|${expr}':s=48000:d=${d}`,
    "-af", `lowpass=f=1400,aecho=0.8:0.6:180|320:0.35|0.25,afade=t=in:d=2.5,afade=t=out:st=${Math.max(0, totalSeconds - 3)}:d=3`,
    "-ac", "2", out,
  ]);
}

/**
 * One pass: intro still, recorded frames, outro still, burned captions, voice over ducked music.
 * H.264 CRF 20 veryfast, AAC 192k.
 */
export async function assemble({ work, framesDir, fps, intro, outro, introSeconds, outroSeconds, mainSeconds, voice, music, ass, musicDb, background, out }) {
  const bg = `0x${background.replace("#", "")}`;
  const filter = [
    `[0]format=yuv420p,fade=t=in:st=0:d=0.6:color=${bg},fade=t=out:st=${introSeconds - 0.45}:d=0.45:color=${bg}[v0]`,
    `[1]format=yuv420p,fade=t=in:st=0:d=0.4:color=${bg},fade=t=out:st=${(mainSeconds - 0.45).toFixed(3)}:d=0.45:color=${bg}[v1]`,
    `[2]format=yuv420p,fade=t=in:st=0:d=0.45:color=${bg},fade=t=out:st=${outroSeconds - 0.8}:d=0.8:color=${bg}[v2]`,
    `[v0][v1][v2]concat=n=3:v=1:a=0,ass=${path.basename(ass)}[v]`,
    `[3]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo,asplit=2[vo][sc]`,
    `[4]volume=${musicDb}dB[m]`,
    `[m][sc]sidechaincompress=threshold=0.015:ratio=12:attack=20:release=450[duck]`,
    `[vo][duck]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]`,
  ].join(";");
  const filterFile = path.join(work, "filter.txt");
  await writeFile(filterFile, filter);
  await ff(
    [
      "-loop", "1", "-framerate", String(fps), "-t", String(introSeconds), "-i", intro,
      "-framerate", String(fps), "-i", path.join(framesDir, "%06d.jpg"),
      "-loop", "1", "-framerate", String(fps), "-t", String(outroSeconds), "-i", outro,
      "-i", voice,
      "-i", music,
      "-filter_complex_script", filterFile,
      "-map", "[v]", "-map", "[a]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(fps),
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
      "-movflags", "+faststart",
      out,
    ],
    work,
  );
}
