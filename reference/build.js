// Lecture video pipeline. Usage: node build.js <CODE>  (run from reference/)
// Reads ../lectures/<CODE>.json, synthesises narration with Kokoro, renders every
// scene through lecture.html with Playwright + ffmpeg, concatenates, writes captions
// and updates ../videos/manifest.json.
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const {spawn, spawnSync} = require('child_process');

const CODE = process.argv[2];
if (!CODE) { console.error('usage: node build.js <CODE>'); process.exit(1); }

const REF = __dirname;
const ROOT = path.join(REF, '..');
const specPath = path.join(ROOT, 'lectures', `${CODE}.json`);
const lecture = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const buildDir = path.join(ROOT, 'videos', '_build', CODE);
fs.mkdirSync(buildDir, {recursive: true});
const videosDir = path.join(ROOT, 'videos');

// 1. narration file for gen_voice.py
const narr = {};
for (const s of lecture.scenes) narr[s.id] = s.narration;
fs.writeFileSync(path.join(buildDir, 'narr.json'), JSON.stringify(narr));

// 2. synthesise voice (writes <scene>.wav, dur.json, cues.json into buildDir)
console.log('synthesising narration with Kokoro...');
const voiceRes = spawnSync('python3', [path.join(REF, 'gen_voice.py'), path.join(buildDir, 'narr.json')], {
  cwd: buildDir, env: {...process.env, KOKORO_DIR: process.env.KOKORO_DIR || '/root/kokoro'}, stdio: 'inherit'
});
if (voiceRes.status !== 0) { console.error('gen_voice.py failed'); process.exit(1); }

const dur = JSON.parse(fs.readFileSync(path.join(buildDir, 'dur.json')));
const cues = JSON.parse(fs.readFileSync(path.join(buildDir, 'cues.json')));
const order = lecture.scenes.map(s => s.id);

// 3. caption chunking (character-proportional split at commas/periods, <=~88 chars)
const caps = {};
for (const k of order) {
  caps[k] = [];
  const c = cues[k];
  c.forEach(([st, txt], i) => {
    const en = (c[i + 1] ? c[i + 1][0] : dur[k] - 0.9) - 0.5;
    const ch = []; let cur = '';
    for (const w of txt.split(' ')) {
      if ((cur + ' ' + w).trim().length > 88 && cur && /[,.]$/.test(cur) || (cur + ' ' + w).length > 100) { ch.push(cur.trim()); cur = w; }
      else cur = (cur + ' ' + w).trim();
    }
    if (cur) ch.push(cur);
    const tot = ch.join('').length; let acc = 0;
    for (const x of ch) { caps[k].push([st + acc / tot * (en - st), x]); acc += x.length; }
  });
}

// 4. scene spec for the page (type + props only)
const spec = {};
for (const s of lecture.scenes) spec[s.id] = {type: s.type, props: s.props || {}};

// 5. render each scene to its own mp4
async function renderScenes() {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1920, height: 1080}});
  await page.goto('file://' + path.join(REF, 'lecture.html'));
  await page.evaluate(([l, s, c, q]) => { setLecture(l); setSpec(s); setCaps(c, q); }, [
    {code: lecture.code, title: lecture.title}, spec, caps, cues
  ]);
  await page.waitForTimeout(300);

  for (const k of order) {
    const D = dur[k], n = Math.round(D * 30);
    const tmp = path.join(buildDir, `scene_${k}.tmp.mp4`);
    const wav = path.join(buildDir, `${k}.wav`);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-i', '-',
      '-i', wav, '-af', 'adelay=300|300,apad', '-t', String(n / 30),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', tmp]);
    for (let i = 0; i < n; i++) {
      await page.evaluate(([k, t, d]) => render(k, t, d), [k, i / 30, D]);
      const buf = await page.screenshot({type: 'jpeg', quality: 92});
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(k)));
    fs.renameSync(tmp, path.join(buildDir, `scene_${k}.mp4`));
    console.log('rendered', k, D + 's');
  }
  await browser.close();
}

// 6. concat + loudness pass
function concatAndFinalize() {
  const listPath = path.join(buildDir, 'concat.txt');
  fs.writeFileSync(listPath, order.map(k => `file 'scene_${k}.mp4'`).join('\n'));
  const concatOut = path.join(buildDir, 'concat.mp4');
  let r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', concatOut], {cwd: buildDir});
  if (r.status !== 0) throw new Error('concat failed: ' + r.stderr);

  const finalOut = path.join(videosDir, `${CODE}.mp4`);
  r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', concatOut,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart', finalOut]);
  if (r.status !== 0) throw new Error('loudnorm pass failed: ' + r.stderr);
  return finalOut;
}

// 7. captions across the concatenated timeline
function writeCaptions() {
  let offset = 0;
  const cueList = []; // [startAbs, endAbs, text]
  for (const k of order) {
    const list = caps[k];
    list.forEach(([st, txt], i) => {
      const enRel = list[i + 1] ? list[i + 1][0] : dur[k] - 0.9;
      cueList.push([offset + st, offset + enRel, txt]);
    });
    offset += dur[k];
  }
  const fmt = (s, comma) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.round((s % 1) * 1000);
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    return `${pad(h)}:${pad(m)}:${pad(sec)}${comma ? ',' : '.'}${pad(ms, 3)}`;
  };
  let vtt = 'WEBVTT\n\n', srt = '';
  cueList.forEach(([st, en, txt], i) => {
    vtt += `${fmt(st)} --> ${fmt(en)}\n${txt}\n\n`;
    srt += `${i + 1}\n${fmt(st, true)} --> ${fmt(en, true)}\n${txt}\n\n`;
  });
  fs.writeFileSync(path.join(videosDir, `${CODE}.vtt`), vtt);
  fs.writeFileSync(path.join(videosDir, `${CODE}.srt`), srt);
  return offset; // total duration seconds
}

function updateManifest(finalOut, totalDuration) {
  const manifestPath = path.join(videosDir, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath)) : {lectures: []};
  const stat = fs.statSync(finalOut);
  const chapters = [];
  let offset = 0;
  for (const s of lecture.scenes) { chapters.push({id: s.id, start: Math.round(offset * 100) / 100}); offset += dur[s.id]; }
  const entry = {
    code: lecture.code, lessonId: lecture.lessonId, title: lecture.title,
    durationSeconds: Math.round(totalDuration * 100) / 100,
    fileSizeBytes: stat.size,
    files: {mp4: `${CODE}.mp4`, vtt: `${CODE}.vtt`, srt: `${CODE}.srt`},
    chapters
  };
  manifest.lectures = manifest.lectures.filter(l => l.code !== CODE);
  manifest.lectures.push(entry);
  manifest.lectures.sort((a, b) => a.code.localeCompare(b.code));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return entry;
}

(async () => {
  await renderScenes();
  const finalOut = concatAndFinalize();
  const totalDuration = writeCaptions();
  const entry = updateManifest(finalOut, totalDuration);
  console.log('DONE', JSON.stringify(entry, null, 2));
})().catch(err => { console.error(err); process.exit(1); });
