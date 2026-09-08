import { webkit } from 'playwright';

const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const iframeRect = await page.evaluate(() => {
  const ifr = document.querySelector('.spline-scene');
  const r = ifr.getBoundingClientRect();
  return { left: r.left, top: r.top, w: r.width, h: r.height };
});
console.log('IFRAME PAGE RECT', JSON.stringify(iframeRect));

for (const f of page.frames()) {
  if (!f.url().includes('spline.design')) continue;
  const info = await f.evaluate(() => {
    const wm = document.querySelector('.spline-watermark');
    if (!wm) return { anchor: null };
    const r = wm.getBoundingClientRect();
    return { anchor: { left: r.left, top: r.top, w: r.width, h: r.height } };
  });
  console.log('ANCHOR FRAME-RECT', JSON.stringify(info));
  if (info.anchor) {
    const pageRect = {
      left: iframeRect.left + info.anchor.left,
      top: iframeRect.top + info.anchor.top,
      w: info.anchor.w,
      h: info.anchor.h,
      clipBottom: Math.max(0, (iframeRect.top + info.anchor.top + info.anchor.h) - (iframeRect.top + iframeRect.h)),
    };
    console.log('ANCHOR PAGE-RECT', JSON.stringify(pageRect));
    const probe = await page.evaluate((r) => {
      const cx = r.left + r.w / 2;
      const cy = r.top + r.h / 2;
      const el = document.elementFromPoint(cx, cy);
      return {
        topMost: el ? `${el.tagName}.${el.className}` : null,
        insideIframe: cx >= r.left && cx <= r.left + r.w && cy >= r.top && cy <= r.top + r.h,
        iframeBottom: r.top + r.h,
        shieldRect: (() => { const s = document.querySelector('.spline-watermark-shield'); if (!s) return null; const sr = s.getBoundingClientRect(); return { top: sr.top, bottom: sr.bottom, left: sr.left, right: sr.right }; })(),
      };
    }, pageRect);
    console.log('PAGE-PROBE', JSON.stringify(probe));
  }
}
await browser.close();