import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { open, selectMap, measureOverlaps } from './helpers';

// Crossing clarity: fewer crossings, and where two lines still cross the one with the horizontal piece hops over the other with a small arc.
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const PICK: Record<string, string> = { 'linear-systems': 'ops', 'control-systems': 'chain' };
const pickView = (page: Page, v: 'fit' | 'actual') => page.locator(`[data-testid=map-view] [data-view=${v}]`).click();
const maps = (page: Page): Promise<{ id: string; title: string }[]> => page.evaluate(() => (window as any).__study.content.maps);
const arcs = (page: Page) => page.evaluate(() => [...document.querySelectorAll('.qm-edge')].map((g) => ({ key: g.getAttribute('data-edge')!, d: g.querySelector('.line')!.getAttribute('d')!, plain: g.querySelector('path:not(.line):not(.head)')!.getAttribute('d')!, cls: g.getAttribute('class')! })).filter((e) => / A /.test(e.d)));

for (const app of Object.keys(PICK)) for (const [view, vp] of [['desktop', { width: 1400, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
  test.describe(`${app} ${view}: crossings and hops`, () => {
    test.use({ viewport: vp });

    test('hop arcs are drawn on the horizontal piece in Fit and Actual size; no label/box overlaps; screenshots', async ({ page }) => {
      await open(page, app);
      await selectMap(page, (await maps(page)).find((m) => m.id === PICK[app])!.title); await page.waitForTimeout(250);
      for (const v of ['fit', 'actual'] as const) {
        await pickView(page, v); await page.waitForTimeout(250);
        const a = await arcs(page);
        if (app === 'linear-systems') expect(a.length, `${v}: the busy map has hop-overs`).toBeGreaterThan(0);
        for (const e of a) {
          expect(e.d, 'arc is a half (or wider, merged) circle').toMatch(/A [\d.]+ [\d.]+ 0 0 [01] /);
          expect(e.plain, 'the tap target stays a plain line').not.toMatch(/ A /);
        }
        const o = await measureOverlaps(page); expect(o.nodeNode + o.labelNode + o.labelLabel, `${v} overlaps`).toBe(0);
      }
      await pickView(page, 'fit'); await page.waitForTimeout(250);
      await page.locator('.cm-scroll').screenshot({ path: path.join(OUT, `map-crossings-${app}-after-${view}.png`) });
    });

    test('tapping a line: its hop arc stays on that line, highlight and dimming are unchanged', async ({ page }) => {
      await open(page, app);
      await selectMap(page, (await maps(page)).find((m) => m.id === PICK[app])!.title); await page.waitForTimeout(250);
      const a = await arcs(page);
      test.skip(a.length === 0, 'no hop on this map');
      const key = a[0].key;
      await page.locator(`.qm-edge[data-edge="${key}"] .dot`).dispatchEvent('click'); await page.waitForTimeout(200);
      const sel = page.locator(`.qm-edge[data-edge="${key}"]`);
      await expect(sel).toHaveClass(/e-sel/); await expect(sel).toHaveClass(/e-path/);
      expect(await sel.locator('.line').getAttribute('d'), 'same hop arc after the tap').toBe(a[0].d);
      const st = await page.evaluate(() => ({ path: document.querySelectorAll('.qm-edge.e-path').length, dim: document.querySelectorAll('.qm-edge.e-dim').length, sel: document.querySelectorAll('.qm-edge.e-sel').length, hopsDim: [...document.querySelectorAll('.qm-edge.e-dim .line')].filter((l) => / A /.test(l.getAttribute('d')!)).length }));
      expect(st.sel).toBe(1); expect(st.path).toBeGreaterThanOrEqual(1);
      expect(st.dim, 'unrelated lines are dimmed').toBeGreaterThan(0);
      for (const e of (await arcs(page)).filter((x) => /e-dim/.test(x.cls))) expect(e.d, 'a dimmed line keeps its arc').toMatch(/ A /);
    });
  });
}

test('dashed cross-links hop too (linear-systems ops)', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 }); await open(page, 'linear-systems');
  await selectMap(page, (await maps(page)).find((m) => m.id === 'ops')!.title); await page.waitForTimeout(250);
  const n = await page.evaluate(() => [...document.querySelectorAll('.qm-edge.dashed .line')].filter((l) => / A /.test(l.getAttribute('d')!)).length);
  expect(n).toBeGreaterThan(0);
});
