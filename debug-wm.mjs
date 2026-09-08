import { webkit } from 'playwright';

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const frames = page.frames().map((f) => ({ url: f.url().slice(0, 90), name: f.name() }));
console.log('FRAMES', JSON.stringify(frames, null, 2));

const out = await page.evaluate(() => {
  const ifr = document.querySelector('.spline-scene');
  const r = ifr.getBoundingClientRect();
  return {
    iframeCss: { w: getComputedStyle(ifr).width, h: getComputedStyle(ifr).height, bottom: r.bottom, right: r.right },
  };
});
console.log('MAINF', JSON.stringify(out));

for (const f of page.frames()) {
  if (!f.url().includes('spline.design')) continue;
  const info = await f.evaluate(() => {
    const wm = document.querySelector('.spline-watermark');
    const canvas = document.querySelector('canvas');
    return {
      hasCanvas: !!canvas,
      canvasRect: canvas ? (canvas.getBoundingClientRect().width + 'x' + canvas.getBoundingClientRect().height) : null,
      watermarkPresent: !!wm,
      watermarkVisibility: wm ? getComputedStyle(wm).visibility + '/' + getComputedStyle(wm).display : null,
      watermarkRect: wm ? JSON.stringify({
        left: Math.round(wm.getBoundingClientRect().left),
        top: Math.round(wm.getBoundingClientRect().top),
        w: Math.round(wm.getBoundingClientRect().width),
        h: Math.round(wm.getBoundingClientRect().height),
      }) : null,
      docSize: JSON.stringify({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }),
      viewport: JSON.stringify({ w: window.innerWidth, h: window.innerHeight }),
    };
  });
  console.log('SPLINE FRAME', f.url().slice(0, 70), JSON.stringify(info));
}
await browser.close();