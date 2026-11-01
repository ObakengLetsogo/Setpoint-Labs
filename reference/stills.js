// Contact sheet: quick visual QA before a full render. Usage: node stills.js <CODE> [outDir]
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const CODE = process.argv[2];
if (!CODE) { console.error('usage: node stills.js <CODE> [outDir]'); process.exit(1); }
const outDir = process.argv[3] || '/tmp';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1920, height: 1080}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, 'lecture.html'));
  const lecture = JSON.parse(fs.readFileSync(path.join(__dirname, `../lectures/${CODE}.json`)));
  const spec = {}, caps = {}, cues = {};
  for (const s of lecture.scenes) { spec[s.id] = {type: s.type, props: s.props || {}}; caps[s.id] = []; cues[s.id] = s.narration.map((t, i) => [i * 2, t]); }
  await page.evaluate(([l, s, c, q]) => { setLecture(l); setSpec(s); setCaps(c, q); }, [{code: lecture.code, title: lecture.title}, spec, caps, cues]);
  await page.waitForTimeout(200);
  for (const s of lecture.scenes) {
    for (const t of [0.5, 3, 7]) {
      await page.evaluate(([k, t, d]) => render(k, t, d), [s.id, t, 10]);
      await page.screenshot({path: path.join(outDir, `still_${s.id}_${t}.jpg`), type: 'jpeg', quality: 85});
    }
  }
  console.log('errors:', errors);
  await browser.close();
})();
