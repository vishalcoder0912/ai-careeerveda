import {test} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {FRONTEND} from "./helpers.js";

const analyse = (page) => new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test.describe("debug contrast", () => {
  for (const [name, path] of [["contact", "/contact"], ["enroll", "/enroll"]]) {
    test(`${name}`, async ({page}) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      await page.goto(`${FRONTEND}${path}`, {waitUntil: "domcontentloaded"});
      await page.waitForFunction(
        () => document.querySelector("main")?.textContent.trim().length > 100,
        {timeout: 30000},
      );
      const before = await page.evaluate(() => {
        const el = document.querySelector(".form-field.full");
        if (!el) return {found: false};
        const cs = getComputedStyle(el);
        const textarea = el.querySelector("textarea");
        return {
          found: true,
          opacity: el.closest(".page-form") ? getComputedStyle(el.closest(".page-form")).opacity : "n/a",
          formTransform: el.closest(".page-form") ? getComputedStyle(el.closest(".page-form")).transform.slice(0, 60) : "n/a",
          color: cs.color,
          bgParent: el.closest(".page-form") ? getComputedStyle(el.closest(".page-form")).backgroundColor : "n/a",
          rectTop: el.getBoundingClientRect().top,
          viewport: window.innerHeight,
          textareaColor: textarea ? getComputedStyle(textarea).color : "none",
          textareaPlaceholder: textarea ? getComputedStyle(textarea, "::placeholder").color : "none",
        };
      });
      test.info().annotations.push({type: "styles", description: JSON.stringify(before)});
      if (!before.found) throw new Error("no .form-field.full found");

      for (let i = 0; i < 6; i++) {
        const {violations} = await analyse(page);
        const cc = violations.find((v) => v.id === "color-contrast");
        if (cc) {
          const details = cc.nodes.flatMap((n) => n.any.concat(n.all, n.none).slice(0, 4));
          console.log(`[debug] ${name} round ${i}: CONTRAST FAIL target=${cc.nodes[0]?.target} ratio=${details[0]?.data?.contrastRatio} fontSize=${details[0]?.data?.fontSize} fontWeight=${details[0]?.data?.fontWeight} expected=${details[0]?.data?.expectedContrastRatio}`);
          console.log(`[debug] ${name} round ${i}: message=${JSON.stringify(details[0]?.message?.slice(0, 120))}`);
          const st = await page.evaluate(() => {
            const el = document.querySelector(".form-field.full");
            const cs = getComputedStyle(el);
            const pf = el.closest(".page-form");
            return {elOpacity: cs.opacity, formOpacity: pf ? getComputedStyle(pf).opacity : "n/a", color: cs.color, formColor: pf ? getComputedStyle(pf).backgroundColor : "n/a"};
          });
          console.log(`[debug] ${name} round ${i}: styles=${JSON.stringify(st)}`);
        } else {
          console.log(`[debug] ${name} round ${i}: NO CONTRAST VIOLATION`);
        }
        await page.waitForTimeout(600);
      }
      console.log(`[debug] pageerrors=${JSON.stringify(errors)}`);
    });
  }
});