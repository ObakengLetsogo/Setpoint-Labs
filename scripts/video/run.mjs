#!/usr/bin/env node
/**
 * Lesson video pipeline. Usage:
 *   npm run video -- <lessonId> [--format landscape|portrait|both] [--voice azure:en-ZA-LukeNeural] [--build]
 *   npm run video -- <lessonId> --preview 5,20,40   stills at those lesson seconds in .video-cache/work/<id>/<format>/preview
 * Writes videos/<lessonId>.mp4 and .srt (landscape) and videos/<lessonId>.portrait.mp4 and .srt (portrait).
 */
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { assemble, buildMusic, buildVoiceTrack } from "./lib/assemble.mjs";
import { buildCues, toAss, toSrt } from "./lib/captions.mjs";
import { captureCards, recordFrames, scheduleActions } from "./lib/record.mjs";
import { ensureServer } from "./lib/server.mjs";
import { narrate, voiceChain } from "./lib/tts/index.mjs";
import { CACHE, ROOT, VIDEO_DIR, duration, log } from "./lib/util.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    format: { type: "string", default: "both" },
    voice: { type: "string" },
    build: { type: "boolean", default: false },
    "audio-only": { type: "boolean", default: false },
    preview: { type: "string" },
  },
});

const lessonId = positionals[0];
if (!lessonId) {
  console.error("usage: npm run video -- <lessonId> [--format landscape|portrait|both] [--voice provider:name] [--build]");
  process.exit(1);
}

const config = JSON.parse(await readFile(path.join(VIDEO_DIR, "config.json"), "utf8"));
const specFile = path.join(VIDEO_DIR, "lessons", `${lessonId}.json`);
if (!existsSync(specFile)) throw new Error(`No video spec at ${path.relative(ROOT, specFile)}`);
const spec = JSON.parse(await readFile(specFile, "utf8"));
if (!Array.isArray(spec.scenes) || spec.scenes.length === 0) throw new Error("spec.scenes must be a non empty array");

// 1. Narration, one clip per scene, all in the same voice.
const chain = voiceChain(config, { cli: values.voice, spec: spec.voice, course: spec.course });
const { voice, files } = await narrate(chain, spec.scenes.map((s) => s.narration));

// 2. Timeline: each scene lasts lead in + its narration + a short pause.
let t = 0;
const timeline = [];
for (const [i, s] of spec.scenes.entries()) {
  const speech = await duration(files[i]);
  const leadIn = s.leadIn ?? config.sceneLeadIn;
  const d = leadIn + speech + (s.pauseAfter ?? config.pauseAfter);
  timeline.push({ ...s, start: t, leadIn, speech, duration: d, audio: files[i] });
  t += d;
}
const mainSeconds = t;
const { fps, introSeconds, outroSeconds } = config;
const totalSeconds = introSeconds + mainSeconds + outroSeconds;
for (const s of timeline) log(`  scene ${s.id ?? ""} at ${s.start.toFixed(1)} s for ${s.duration.toFixed(1)} s`);
log(`${spec.scenes.length} scenes, ${mainSeconds.toFixed(1)} s of lesson, ${totalSeconds.toFixed(1)} s total, voice ${voice}`);

const work = path.join(CACHE, "work", lessonId);
await mkdir(work, { recursive: true });
const voiceWav = path.join(work, "voice.wav");
const musicWav = path.join(work, "music.wav");
await buildVoiceTrack(
  timeline.map((s) => ({ file: s.audio, at: introSeconds + s.start + s.leadIn })),
  totalSeconds,
  voiceWav,
);
await buildMusic(totalSeconds, musicWav);
if (values["audio-only"]) {
  log(`audio ready in ${path.relative(ROOT, work)}`);
  process.exit(0);
}

// 3. Record and assemble each format.
const formats = values.format === "both" ? ["landscape", "portrait"] : [values.format];
const outDir = path.join(ROOT, "videos");
await mkdir(outDir, { recursive: true });
const server = await ensureServer({ build: values.build });
try {
  const actions = scheduleActions(timeline, fps);
  for (const format of formats) {
    const size = config.formats[format];
    if (!size) throw new Error(`Unknown format ${format}`);
    const fdir = path.join(work, format);
    await mkdir(fdir, { recursive: true });

    const cues = buildCues(
      timeline.map((s) => ({ ...s, start: introSeconds + s.start + s.leadIn })),
      format,
    );
    const ass = path.join(fdir, "captions.ass");
    await writeFile(ass, toAss(cues, size, format));
    const base = format === "landscape" ? lessonId : `${lessonId}.${format}`;
    await writeFile(path.join(outDir, `${base}.srt`), toSrt(cues));

    if (values.preview) {
      const seconds = values.preview.split(",").map(Number);
      const only = new Set(seconds.map((x) => Math.round(x * fps)));
      const pdir = path.join(fdir, "preview");
      await recordFrames({ base: server.url, lessonId, size, fps, totalSeconds: Math.max(...seconds) + 0.1, actions, dir: pdir, only });
      await captureCards(server.url, lessonId, size, pdir);
      log(`${format}: preview stills in ${path.relative(ROOT, pdir)}`);
      continue;
    }

    log(`${format}: capturing title cards`);
    const cards = await captureCards(server.url, lessonId, size, fdir);
    log(`${format}: recording ${Math.ceil(mainSeconds * fps)} frames at ${size.width}x${size.height}`);
    const { dir } = await recordFrames({
      base: server.url,
      lessonId,
      size,
      fps,
      totalSeconds: mainSeconds,
      actions,
      dir: path.join(fdir, "frames"),
      onProgress: (n, total, msPer) => log(`${format}: frame ${n}/${total}, about ${Math.round(((total - n) * msPer) / 60000)} min left`),
    });
    const out = path.join(outDir, `${base}.mp4`);
    log(`${format}: encoding ${path.relative(ROOT, out)}`);
    await assemble({
      work: fdir,
      framesDir: dir,
      fps,
      intro: cards.intro,
      outro: cards.outro,
      introSeconds,
      outroSeconds,
      mainSeconds: Math.ceil(mainSeconds * fps) / fps,
      voice: voiceWav,
      music: musicWav,
      ass,
      musicDb: config.musicVolumeDb,
      background: config.background,
      out,
    });
    await copyFile(cards.intro, path.join(fdir, "intro-card.png"));
    log(`${format}: done, ${path.relative(ROOT, out)}`);
  }
} finally {
  server.stop();
}
