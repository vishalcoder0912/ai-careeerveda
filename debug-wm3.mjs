import { webkit } from 'playwright';

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const info = await page.evaluate(() => {
  const stage = document.querySelector('.hero-spline-stage');
  const frame = document.querySelector('.spline-frame');
  const ifr = document.querySelector('.spline-scene');
  const shield = document.querySelector('.spline-watermark-shield');
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
  const pts = [[1190, 696], [1190, 680], [1190, 712], [1130, 690], [1250, 690]];
  const hits = pts.map(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return `${x},${y}:${el ? `${el.tagName}.${el.className}` : 'null'}`;
  });
  return {
    stage: rect(stage), frame: rect(frame), frameOverflow: getComputedStyle(frame).overflow,
    ifr: rect(ifr), shield: rect(shield),
    stageTransform: getComputedStyle(stage).transform,
    shell: rect(document.querySelector('.hero-visual-shell')),
    hits,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();