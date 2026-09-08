import { webkit } from 'playwright';
import path from 'node:path';

const browser = await webkit.launch();
const shots = [
  { name: 'desktop-1440', w: 1440, h: 900 },
  { name: 'mobile-390', w: 390, h: 844 },
  { name: 'tablet-820', w: 820, h: 1180 },
];
for (const { name, w, h } of shots) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const shell = page.locator('.hero-visual-shell');
  await shell.screenshot({ path: path.join(process.cwd(), `debug-hero-${name}.png`) });
  const info = await page.evaluate(() => {
    const f = document.querySelector('.spline-frame');
    const r = f ? f.getBoundingClientRect() : null;
    const shield = document.querySelector('.spline-watermark-shield');
    const s = shield ? shield.getBoundingClientRect() : null;
    return { frame: r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, shield: s && { x: Math.round(s.x), y: Math.round(s.y), w: Math.round(s.width), h: Math.round(s.height) } };
  });
  console.log(`[${name}]`, JSON.stringify(info));
  await page.close();
}
await browser.close();