import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const r = await page.evaluate(() => {
  const f = document.querySelector('.spline-frame');
  const cs = getComputedStyle(f);
  const fr = f.getBoundingClientRect();
  const si = document.querySelector('.spline-scene');
  const sir = si.getBoundingClientRect();
  const matches = [];
  for (const sheet of document.styleSheets) {
    let rules = [];
    try { rules = [...sheet.cssRules]; } catch { continue; }
    for (const rule of rules) {
      if (!rule.style || !rule.selectorText || !rule.selectorText.includes('spline-frame')) continue;
      matches.push(rule.selectorText + ' -> ' + rule.style.overflow + ' !' + !!rule.style.getPropertyPriority('overflow'));
    }
  }
  return { overflow: cs.overflow, clipPath: cs.clipPath, frameRect: `${fr.x},${fr.y},${fr.width},${fr.height}`, sceneRect: `${sir.x},${sir.y},${sir.width},${sir.height}`, matches };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();