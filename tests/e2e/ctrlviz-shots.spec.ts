import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Screenshots of the core control visuals (gallery page) → shots/ctrlviz-<figure>-<view>-<theme>.png. Run: npm run shots
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const IDS = ['poles-step', 'locus', 'bode', 'height'];
const PRESET: Record<string, string> = { 'poles-step': 'ring', locus: 'edge', bode: 'k6', height: 'light' };
for (const [view, vp, mobile] of [['desktop', { width: 1280, height: 900 }, false], ['mobile', { width: 390, height: 844 }, true]] as const) {
  for (const theme of ['dark', 'light'] as const) {
    test(`ctrlviz shots ${view} ${theme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
      const page = await ctx.newPage();
      await page.goto('/_gallery/index.html'); await page.waitForFunction(() => !!(window as any).__gallery);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; window.dispatchEvent(new Event('study-theme')); }, theme);
      for (const id of IDS) {
        const sec = page.locator(`#fig-${id}`);
        await sec.scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
        await sec.screenshot({ path: path.join(OUT, `ctrlviz-${id}-${view}-${theme}.png`) });
        await sec.locator(`[data-preset=${PRESET[id]}]`).click(); await page.waitForTimeout(250);
        await sec.screenshot({ path: path.join(OUT, `ctrlviz-${id}-${PRESET[id]}-${view}-${theme}.png`) });
      }
      await ctx.close();
    });
  }
}

test('ctrlviz shots quiz figure', async ({ browser }) => {
  for (const [view, vp, mobile] of [['desktop', { width: 1280, height: 900 }, false], ['mobile', { width: 390, height: 844 }, true]] as const) {
    for (const theme of ['dark', 'light'] as const) {
      const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 }); const page = await ctx.newPage();
      await page.goto('/_gallery/index.html'); await page.waitForFunction(() => !!(window as any).__gallery);
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; window.dispatchEvent(new Event('study-theme')); }, theme);
      const sec = page.locator('#fig-quiz'); await sec.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
      await sec.screenshot({ path: path.join(OUT, `ctrlviz-quiz-figure-${view}-${theme}.png`) });
      await sec.locator('[data-choice="0"]').click(); await page.waitForTimeout(150);
      await sec.screenshot({ path: path.join(OUT, `ctrlviz-quiz-figure-answered-${view}-${theme}.png`) });
      await ctx.close();
    }
  }
});
