import { webkit } from 'playwright';
const browser = await webkit.launch();

async function mount(page) {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const docH = document.documentElement.scrollHeight;
    for (let y = 0; y <= docH; y += 300) { window.scrollTo(0, y); await wait(60); }
  });
  for (let t = 0; t < 20 && !(await page.locator('.press-section').count()); t++) {
    await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const c = document.querySelector('.consultation-section');
      if (c) window.scrollTo(0, c.getBoundingClientRect().top + window.scrollY - 700);
      await wait(250);
    });
  }
  await page.waitForTimeout(1200);
  return (await page.locator('.press-section').count()) > 0;
}

async function scrollToSettled(page, y) {
  await page.evaluate(async (target) => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 60; i++) {
      window.scrollTo(0, target);
      await wait(30);
      if (Math.abs(window.scrollY - target) < 1) return;
    }
  }, y);
}

async function readState(page) {
  return page.evaluate(() => {
    const sy = window.scrollY;
    const sec = document.querySelector('.press-section');
    const cons = document.querySelector('.consultation-section');
    const cards = [...document.querySelectorAll('.press-card-slot .press-card')];
    return {
      sy,
      sb: Math.round(sec.getBoundingClientRect().bottom + sy),
      consultTop: Math.round(cons.getBoundingClientRect().top + sy),
      pins: cards.map(c => {
        const top = parseFloat(getComputedStyle(c).getPropertyValue('--stack-top') || '') || 108;
        const casc = parseFloat(getComputedStyle(c).getPropertyValue('--stack-cascade') || '0') || 0;
        return top + casc;
      }),
      vtop: cards.map(c => Math.round(c.getBoundingClientRect().top)),
      docTop: cards.map(c => Math.round(c.getBoundingClientRect().top + sy)),
      bottom: cards.map(c => Math.round(c.getBoundingClientRect().bottom + sy)),
      scale: cards.map(c => parseFloat(getComputedStyle(c).getPropertyValue('--stack-scale') || '1'))
    };
  });
}

async function run(vp) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  if (!(await mount(page))) { console.log(`[${vp.label}] FAIL mount`); await page.close(); return; }

  const base = await readState(page);
  let escapes = 0;
  const coexist = { '1&2': 0, '2&3': 0, '1&2&3': 0 };
  const maxOverlap = { '1&2': 0, '2&3': 0, '3&4': 0 };
  const minScale = [1, 1, 1, 1];
  let sawScale = false;
  let prevWho = null;
  const transitions = [];

  async function visit(y, label) {
    await scrollToSettled(page, y);
    const s = await readState(page);
    const n = s.pins.length;
    const pinned = s.pins.map((pin, i) => Math.abs(s.vtop[i] - pin) < 3);
    s.scale.forEach((sc, i) => { if (sc < minScale[i]) { minScale[i] = sc; sawScale = true; } });
    for (let i = 0; i + 1 < n; i++) {
      const o = Math.min(s.bottom[i], s.bottom[i + 1]) - Math.max(s.docTop[i], s.docTop[i + 1]);
      const key = `${i + 1}&${i + 2}`;
      if (o > maxOverlap[key]) maxOverlap[key] = o;
    }
    s.bottom.forEach((b) => { if (b > s.sb + 2) escapes++; });
    if (n >= 2 && pinned[0] && pinned[1]) coexist['1&2']++;
    if (n >= 3 && pinned[1] && pinned[2]) coexist['2&3']++;
    if (n >= 3 && pinned[0] && pinned[1] && pinned[2]) coexist['1&2&3']++;

    const who = pinned.map((p, i) => (p ? i + 1 : 0)).filter(Boolean).join(',');
    if (who !== prevWho) {
      transitions.push(`${label} y=${Math.round(s.sy)} pins ${prevWho ?? '-'} -> ${who || 'none'}`);
      prevWho = who;
    }
  }

  const start = Math.max(0, base.docTop[0] - vp.h);
  const end = base.sb + 400;
  const step = Math.max(26, Math.round((end - start) / 34));

  console.log(`\n[${vp.label}] ${vp.w}x${vp.h}`);
  console.log('sectionBottom', base.sb, 'consultTop', base.consultTop, 'gap', base.consultTop - base.sb);
  console.log('card doc tops:', base.docTop.join(', '), '| pin lines:', base.pins.join(', '));

  for (let y = start; y <= end; y += step) await visit(y, 'down');
  for (let y = end; y >= start; y -= step) await visit(y, 'up');
  for (const y of [0, 3000, base.docTop[1] - 300, base.sb - 800, base.sb + 300, 0]) {
    await visit(y, 'jump');
  }

  console.log('coexist frames:', JSON.stringify(coexist));
  console.log('max box overlap px:', JSON.stringify(maxOverlap));
  console.log('min scale per card:', JSON.stringify(minScale), 'sawScale=', sawScale);
  console.log('pin transitions:');
  for (const t of transitions) console.log('  ', t);
  console.log('ESCAPES total:', escapes);
  console.log('pageerrors:', errors.length ? JSON.stringify(errors) : 'none');
  await page.close();
}

await run({ label: 'desktop', w: 1440, h: 900 });
await run({ label: 'laptop', w: 1366, h: 768 });
await run({ label: 'mobile', w: 390, h: 844 });
await browser.close();