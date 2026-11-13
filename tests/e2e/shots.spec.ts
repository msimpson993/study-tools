import { test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { open, url } from './helpers';

// Writes screenshots of every page to shots/ (desktop 1400, mobile 390; dark and light). Run: npm run shots
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: 'desktop', viewport: { width: 1400, height: 900 }, mobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
] as const;

async function setTheme(page: Page, theme: 'dark' | 'light') {
  await page.evaluate((t) => { localStorage.setItem('study-theme', t); document.documentElement.dataset.theme = t; window.dispatchEvent(new Event('study-theme')); }, theme);
  await page.waitForTimeout(150);
}
const snap = async (page: Page, name: string, full = false) => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }); };

for (const v of VIEWS) {
  for (const theme of ['dark', 'light'] as const) {
    test(`shots ${v.name} ${theme}`, async ({ browser }) => {
      test.setTimeout(120_000);
      const ctx = await browser.newContext({ viewport: v.viewport, isMobile: v.mobile, hasTouch: v.mobile, deviceScaleFactor: v.mobile ? 2 : 1 });
      const page = await ctx.newPage();
      const tag = `${v.name}-${theme}`;

      await page.goto('/index.html'); await setTheme(page, theme);
      await snap(page, `hub-${tag}`, true);

      for (const app of ['transforms', 'linear-systems']) {
        await open(page, app); await setTheme(page, theme);
        await snap(page, `${app}-map-${tag}`);
        const maps: { title: string }[] = await page.evaluate(() => (window as any).__study.content.maps);
        // map with an open node popup
        const node = page.locator('[data-testid=map-node]').nth(2);
        await node.dispatchEvent('click'); await snap(page, `${app}-map-popup-${tag}`);
        // review mode
        await page.getByRole('button', { name: 'Review' }).click();
        for (let i = 0; i < 4; i++) await page.locator('[data-testid=map-node]').nth(i).dispatchEvent('click');
        await snap(page, `${app}-map-review-${tag}`);
        await page.evaluate(() => { localStorage.clear(); });
        if (maps.length > 1) {
          await open(page, app); await setTheme(page, theme);
          await page.locator('[data-testid=concept-map] [role=tab]').nth(2).click();
          await snap(page, `${app}-map-3-${tag}`);
        }
        await open(page, app, '#/quiz'); await setTheme(page, theme);
        await snap(page, `${app}-quiz-${tag}`);
      }

      // transforms board: collapsed, expanded, pair view
      await open(page, 'transforms', '#/board'); await setTheme(page, theme);
      await page.waitForFunction(() => !!(window as any).S);
      await snap(page, `transforms-board-${tag}`);
      await page.evaluate("__apply('alias')");
      await snap(page, `transforms-board-alias-${tag}`);
      await page.evaluate("openModal('CF');setLegend(0,true)");
      await snap(page, `transforms-board-expanded-${tag}`);
      await page.evaluate("closeModal();__apply('crit');document.getElementById('exinfo').open=true");
      await snap(page, `transforms-board-about-${tag}`, true);
      await page.evaluate("document.getElementById('exinfo').open=false;__apply('alias');pick('map')");
      await snap(page, `transforms-board-pair-${tag}`);
      await page.evaluate("closeModal()");

      // linear-systems: dive, figure expanded, pair
      await open(page, 'linear-systems', '#/dive/eig'); await setTheme(page, theme);
      await snap(page, `linear-systems-dive-${tag}`);
      await open(page, 'linear-systems', '#/figure/expm'); await setTheme(page, theme);
      await snap(page, `linear-systems-figure-${tag}`, v.mobile);
      await page.locator('[data-testid=fig-stage] canvas').first().click({ force: true });
      await snap(page, `linear-systems-figure-expanded-${tag}`);
      if (!v.mobile) { await page.getByTestId('pair-open').click(); await page.getByTestId('legend-chip').first().click(); await snap(page, `linear-systems-figure-pair-${tag}`); }
      await ctx.close();
    });
  }
}
