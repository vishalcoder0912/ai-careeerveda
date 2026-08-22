/* eslint-disable no-undef */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  const failedRequests = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  page.on('requestfailed', request => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText });
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Check for canvas elements
    const canvases = await page.$$('canvas');
    console.log(`Found ${canvases.length} canvas elements`);
    
    // Check for iframe (Spline)
    const iframes = await page.$$('iframe');
    console.log(`Found ${iframes.length} iframe elements`);
    
    // Check for cloud-band
    const cloudBand = await page.$('.cloud-band');
    console.log(`Cloud band exists: ${!!cloudBand}`);
    
    // Check for scroll-progress
    const scrollProgress = await page.$('.scroll-progress');
    console.log(`Scroll progress exists: ${!!scrollProgress}`);
    
    // Check for grid layer
    const gridLayer = await page.$('.cv-grid-layer');
    console.log(`Grid layer exists: ${!!gridLayer}`);
    
    // Check Spline iframe src
    if (iframes.length > 0) {
      const src = await iframes[0].getAttribute('src');
      console.log(`Spline iframe src: ${src}`);
    }
    
    // Check ShapeGrid canvas size
    const canvasInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases).map(c => ({
        width: c.width,
        height: c.height,
        offsetWidth: c.offsetWidth,
        offsetHeight: c.offsetHeight,
        parentClass: c.parentElement?.className
      }));
    });
    console.log('\n--- Canvas Info ---');
    console.log(JSON.stringify(canvasInfo, null, 2));
    
    console.log('\n--- Console Errors ---');
    if (errors.length === 0) {
      console.log('No console errors!');
    } else {
      errors.forEach(e => console.log('ERROR:', e));
    }
    
    console.log('\n--- Failed Requests ---');
    if (failedRequests.length === 0) {
      console.log('No failed requests!');
    } else {
      failedRequests.forEach(r => console.log('FAILED:', r.url, '-', r.failure));
    }
  } catch (e) {
    console.error('Page load error:', e.message);
  }
  
  await browser.close();
})();