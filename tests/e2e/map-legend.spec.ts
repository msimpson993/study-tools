import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { APPS, open, selectMap, noHScroll } from './helpers';

// The legend is the map's key: solid = next question, dashed = same idea in another view, plus the box shapes the map uses.
// It must list only what the current map uses, draw its swatches with the SAME dash pattern as the real lines, and no line state may read as dotted.
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
type M = { id: string; title: string; nodes: { kind?: string }[]; edges: { from: string; to: string; dashed?: boolean }[] };
const maps = (page: Page): Promise<M[]> => page.evaluate(() => (window as any).__study.content.maps);
const items = (page: Page) => page.locator('[data-testid=map-legend] [data-legend]').evaluateAll((els) => els.map((e) => ({ key: e.getAttribute('data-legend'), text: e.textContent?.trim() })));
const dash = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => { const c = getComputedStyle(el); return { arr: c.strokeDasharray, cap: c.strokeLinecap }; });
/** Dash and gap lengths of a computed stroke-dasharray ("none" -> []). */
const nums = (a: string) => (a === 'none' ? [] : a.split(/[ ,]+/).map((x) => parseFloat(x)));

for (const app of APPS) {
  test.describe(`${app}: map legend`, () => {
    test('lists exactly what each map uses, with swatches that match the real lines', async ({ page }) => {
      await open(page, app);
      for (const m of await maps(page)) {
        await selectMap(page, m.title);
        const legend = page.getByTestId('map-legend');
        await expect(legend).toBeVisible();
        const got = (await items(page)).map((i) => i.key);
        const kinds = new Set(m.nodes.map((n) => n.kind ?? 'box'));
        const want = ['solid', ...(m.edges.some((e) => e.dashed) ? ['dashed'] : []), ...(kinds.has('decision') ? ['decision'] : []), ...(kinds.has('terminal') ? ['terminal'] : [])];
        expect(got, `${m.id} legend entries`).toEqual(want);
        const txt = (await legend.textContent()) ?? '';
        expect(txt).toContain('next question');
        if (want.includes('dashed')) expect(txt).toContain('same idea, other view'); else expect(txt).not.toContain('other view');

        // solid swatch is solid; dashed swatch has a real dash pattern identical to a real dashed line on the map
        expect((await dash(page, '[data-legend=solid] .lg-line')).arr).toBe('none');
        if (want.includes('dashed')) {
          const sw = await dash(page, '[data-legend=dashed] .lg-line'), real = await dash(page, '.qm-edge.dashed .line');
          expect(sw.arr).toBe(real.arr);
          const [d, g] = nums(sw.arr); expect(d, 'dash is long enough to read as a dash, not a dot').toBeGreaterThanOrEqual(6); expect(g).toBeGreaterThan(0);
          expect(real.cap, 'butt caps: no rounded dots').toBe('butt');
        }
      }
    });

    test('no line state renders dotted: solid lines stay solid, dashed stay dashed with the one pattern, also when dimmed or selected', async ({ page }) => {
      await open(page, app);
      for (const m of await maps(page)) {
        await selectMap(page, m.title);
        const pattern = async () => page.locator('[data-testid=map-edge]').evaluateAll((els) => els.map((g) => ({ dashed: g.classList.contains('dashed'), arr: getComputedStyle(g.querySelector('.line')!).strokeDasharray })));
        const check = (rows: { dashed: boolean; arr: string }[], what: string) => {
          const pats = new Set(rows.filter((r) => r.dashed).map((r) => r.arr));
          expect(pats.size, `${m.id} ${what}: one dash pattern`).toBeLessThanOrEqual(1);
          for (const r of rows) if (!r.dashed) expect(r.arr, `${m.id} ${what}: solid line`).toBe('none');
          for (const p of pats) expect(nums(p)[0]).toBeGreaterThanOrEqual(6);
          return pats;
        };
        const base = check(await pattern(), 'idle');
        const e = m.edges[0];
        await page.locator(`[data-testid=map-edge]`).first().dispatchEvent('click');
        const sel = check(await pattern(), 'edge selected (others dim)');
        expect([...sel]).toEqual([...base]);
        await page.locator('[data-testid=map-node]').first().dispatchEvent('click');
        check(await pattern(), 'box selected');
        await page.keyboard.press('Escape');
        void e;
      }
    });

    for (const [view, vp] of [['desktop', { width: 1400, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
      for (const theme of ['light', 'dark'] as const) {
        test(`${view}/${theme}: legend fits, no horizontal scroll; screenshot`, async ({ page }) => {
          await page.setViewportSize(vp); await open(page, app);
          await page.evaluate((t) => { document.documentElement.dataset.theme = t; window.dispatchEvent(new Event('study-theme')); }, theme);
          const legend = page.getByTestId('map-legend');
          await expect(legend).toBeVisible();
          const box = (await legend.boundingBox())!;
          expect(box.x + box.width, 'legend inside viewport').toBeLessThanOrEqual(vp.width + 1);
          expect(box.height, 'legend stays small').toBeLessThanOrEqual(vp.width < 600 ? 110 : 60);
          expect(await noHScroll(page)).toBe(true);
          await page.locator('[data-testid=map-edge]').first().dispatchEvent('click');
          await page.waitForTimeout(150);
          await page.screenshot({ path: path.join(OUT, `map-legend-${app}-${view}-${theme}.png`) });
        });
      }
    }
  });
}
