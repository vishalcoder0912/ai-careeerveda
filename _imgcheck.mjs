import {chromium} from "playwright";

const BASE = "http://localhost:5173";
const programSlugs = [
  "product-management", "business-analytics", "data-analytics",
  "investment-banking", "data-science-ai", "gen-ai",
  "data-engineering", "backend-engineering", "cybersecurity",
];
const blogSlugs = [
  "product-management-genai", "business-analytics-impact", "data-analytics-roadmap",
  "investment-banking-career", "data-science-genai", "data-engineering-backbone",
  "backend-engineering-systems", "cybersecurity-defender-roadmap",
  "ai-product-roadmaps-prioritisation", "building-first-rag-application",
  "power-bi-vs-tableau-2025", "soc-analyst-day-in-the-life",
  "financial-modeling-three-statement", "batch-vs-streaming-pipelines",
  "rest-vs-graphql-api-design", "sql-for-analysts-daily-queries",
  "engineer-to-product-manager-switch", "mlops-notebook-to-production",
  "data-storytelling-dashboards-to-decisions", "dcf-valuation-demystified",
  "ethical-hacking-vs-defensive-security", "apache-airflow-pipeline-orchestration",
  "nodejs-at-scale-millions-requests", "excel-advanced-techniques-analysts",
  "writing-prds-engineers-read", "prompt-engineering-for-data-scientists",
  "ab-testing-101-analysts", "ma-deals-explained",
  "understanding-phishing-top-threat", "modern-data-stack-tools",
  "database-design-sql-vs-nosql", "data-analyst-portfolio-that-gets-hired",
  "product-metrics-that-matter", "feature-engineering-winning-models",
  "breaking-into-ib-without-finance-degree", "analyst-to-strategist-analytics-career",
  "cloud-security-basics-aws-azure", "data-warehousing-snowflake-beginners",
];

const routes = [
  "/",
  "/programs",
  ...programSlugs.map((s) => `/programs/${s}`),
  "/jobs",
  "/faculty",
  "/blog",
  ...blogSlugs.map((s) => `/blog/${s}`),
  "/about",
  "/contact",
  "/alumni",
  "/enroll",
  "/privacy-policy",
  "/refund-policy",
  "/terms",
  "/escalation-policy",
];

const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 1440, height: 900}});
const page = await context.newPage();

async function settleImages(page) {
  await page.evaluate(async () => {
    const waitForComplete = () => new Promise((resolve) => {
      const imgs = Array.from(document.querySelectorAll("img")).filter((i) => i.src && !i.loading);
      const remaining = imgs.filter((i) => !i.complete);
      if (remaining.length === 0) return resolve();
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        const still = Array.from(document.querySelectorAll("img")).filter((i) => i.src && !i.loading && !i.complete);
        if (still.length === 0 || tries > 40) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
    return waitForComplete();
  });
}

async function checkPage(path) {
  const routeBad = new Map();
  const imgState = [];

  page.on("response", (resp) => {
    const url = resp.url();
    if (!/^https?:/i.test(url)) return;
    if (resp.status() >= 400 && /\.(png|jpe?g|gif|webp|svg|avif|ico|woff2?|mp4)(\?|$)/i.test(url)) {
      if (!routeBad.has(url)) routeBad.set(url, {status: resp.status(), kind: "response"});
    }
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (/\.(png|jpe?g|gif|webp|svg|avif|ico)(\?|$)/i.test(url)) {
      if (!routeBad.has(url)) routeBad.set(url, {status: "failed", kind: "requestfailed", err: req.failure()?.errorText || "?"});
    }
  });

  let navError = null;
  try {
    await page.goto(BASE + path, {waitUntil: "domcontentloaded", timeout: 60000});
  } catch (e) {
    navError = e.message.split("\n")[0];
  }
  if (navError) return {navError, total: 0, broken: [], netBad: []};

  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const step = 650;
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    let y = 0;
    const maxH = document.body.scrollHeight;
    while (y < maxH + 300) {
      window.scrollTo(0, y);
      if (y % 2600 === 0) await delay(120);
      y += step;
    }
    window.scrollTo(0, document.body.scrollHeight);
    await delay(500);
  });
  await settleImages(page);

  imgState.push(...await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("img").forEach((el) => {
      const src = el.currentSrc || el.src || "";
      if (!src) return;
      out.push({
        src,
        ok: el.complete && el.naturalWidth > 0,
        broken: el.complete && el.naturalWidth === 0,
        stillLoading: !el.complete,
        alt: (el.getAttribute("alt") || "").slice(0, 50),
        cls: (el.className || "").toString().slice(0, 50),
      });
    });
    return out;
  }));

  // Only count images that are genuinely broken (finished loading, 0 natural width).
  const realBroken = imgState.filter((i) => i.broken);

  // netBad that corresponds to actual <img> loads or css backgrounds that never resolved:
  const srcSet = new Set(imgState.map((i) => stripQuery(i.src)));
  const netBad = Array.from(routeBad.entries())
    .filter(([url]) => srcSet.has(stripQuery(url)))
    .map(([url, v]) => ({url, status: v.status}));

  return {navError: null, total: imgState.length, broken: realBroken, netBad};
}

const stripQuery = (u) => {
  try { return new URL(u, BASE).pathname; } catch { return u; }
};

const allBroken = new Map();

for (const path of routes) {
  let res;
  try { res = await checkPage(path); }
  catch (e) { res = {navError: e.message.split("\n")[0], total: 0, broken: [], netBad: []}; }

  const uniq = new Set();
  res.broken.forEach((b) => uniq.add(stripQuery(b.src) + (b.src.includes("[") ? "" : "")));
  res.netBad.forEach((b) => uniq.add("NET:" + b.url));

  if (res.navError) console.log(`ERROR  ${path.padEnd(42)} ${res.navError}`);
  else {
    console.log(`${(uniq.size ? "BROKEN" : "ok").padEnd(6)} ${path.padEnd(42)} imgs=${String(res.total).padStart(3)}`);
    uniq.forEach((u) => {
      console.log(`        -> ${u}`);
      if (!allBroken.has(u)) allBroken.set(u, []);
      allBroken.get(u).push(path);
    });
  }
}

await browser.close();

console.log("\n===== BROKEN IMAGE SUMMARY =====");
if (allBroken.size === 0) console.log("No broken images detected on any route.");
else {
  for (const [src, paths] of allBroken) {
    console.log(`${src}`);
    console.log(`     on: ${paths.join(", ")}`);
  }
}