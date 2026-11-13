import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { APPS, open, selectMap } from './helpers';
import { pathToRoot, edgeKey } from '../../packages/core/src/maplayout';

// Tapping a LINE highlights that line (arrowhead + label) and its two endpoint boxes only. It must not walk the chain back
// to the root: the line explains one step, the box beyond it explains another. Tapping a BOX keeps highlighting its chain.
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
type E = { from: string; to: string; label?: string }; type M = { id: string; title: string; nodes: { id: string }[]; edges: E[] };

const maps = (page: Page): Promise<M[]> => page.evaluate(() => (window as any).__study.content.maps);
const ids = (page: Page, sel: string) => page.locator(sel).evaluateAll((els) => els.map((e) => e.getAttribute('data-node') ?? e.getAttribute('data-edge') ?? e.getAttribute('data-label')).sort());

/** Everything the map says about the current selection. */
async function state(page: Page) {
  return {
    sel: await ids(page, '[data-testid=map-node].n-sel'), path: await ids(page, '[data-testid=map-node].n-path'), neigh: await ids(page, '[data-testid=map-node].n-neigh'),
    end: await ids(page, '[data-testid=map-node].n-end'), dim: await ids(page, '[data-testid=map-node].n-dim'),
    edgeOn: await ids(page, '[data-testid=map-edge].e-path'), edgeSel: await ids(page, '[data-testid=map-edge].e-sel'), edgeDim: await ids(page, '[data-testid=map-edge].e-dim'),
    labelOn: await ids(page, '[data-testid=map-label].l-path'),
  };
}
async function expectOnlyEdge(page: Page, m: M, e: E, what: string) {
  const key = edgeKey(e.from, e.to), s = await state(page), all = m.nodes.map((n) => n.id), ends = [...new Set([e.from, e.to])].sort();
  expect(s.end, `${what}: endpoint boxes`).toEqual(ends);
  expect([...s.sel, ...s.path, ...s.neigh], `${what}: no chain / selected-box highlight`).toEqual([]);
  expect(s.dim, `${what}: everything else dims`).toEqual(all.filter((n) => !ends.includes(n)).sort());
  expect(s.edgeOn, `${what}: only this line is active`).toEqual([key]); expect(s.edgeSel).toEqual([key]);
  expect(s.edgeDim.length, `${what}: other lines dim`).toBe(m.edges.length - 1);
  expect(s.labelOn.every((k) => k === key), `${what}: only this line's label is active`).toBe(true);
}
const deepest = (m: M) => [...m.edges].sort((a, b) => pathToRoot(b.from, m.edges).length - pathToRoot(a.from, m.edges).length)[0];
const tapEdge = (page: Page, e: E) => page.locator(`[data-testid=map-edge][data-edge="${edgeKey(e.from, e.to)}"]`).first().dispatchEvent('click');

for (const app of APPS) {
  test.describe(`${app}: tapping a line highlights only the line and its two ends`, () => {
    test('every line on every map', async ({ page }) => {
      test.setTimeout(120_000);
      await open(page, app);
      for (const m of await maps(page)) {
        await selectMap(page, m.title);
        for (const e of m.edges) { await tapEdge(page, e); await expectOnlyEdge(page, m, e, `${m.id} ${e.from}→${e.to}`); }
        await page.keyboard.press('Escape');
      }
    });

    test('the deepest line (long chain behind it) does not light the chain; a box tap still does; tapping again clears', async ({ page }) => {
      await open(page, app);
      const m = (await maps(page))[0], e = deepest(m);
      expect(pathToRoot(e.from, m.edges).length, 'the chosen line has a chain behind it').toBeGreaterThanOrEqual(2);
      await tapEdge(page, e); await expectOnlyEdge(page, m, e, 'deepest line');
      // a box tap behaves as before: the box, its chain, neighbours; no endpoint style
      await page.locator(`[data-testid=map-node][data-node="${e.to}"]`).dispatchEvent('click');
      const s = await state(page);
      expect(s.sel).toEqual([e.to]); expect(s.end).toEqual([]); expect(s.path.length).toBeGreaterThanOrEqual(1); expect(s.edgeOn.length).toBeGreaterThanOrEqual(1);
      // and back to the line, then toggle it off
      await tapEdge(page, e); await expectOnlyEdge(page, m, e, 'line after box'); await tapEdge(page, e);
      const off = await state(page); expect([...off.sel, ...off.path, ...off.end, ...off.dim, ...off.edgeOn, ...off.edgeDim]).toEqual([]);
    });

    test('tapping the line’s label does the same; the selection survives leaving the map and coming back', async ({ page }) => {
      await open(page, app);
      const m = (await maps(page))[0], e = deepest(m), key = edgeKey(e.from, e.to);
      const label = page.locator(`[data-testid=map-label][data-label="${key}"]`);
      if (await label.count()) { await label.first().dispatchEvent('click'); await expectOnlyEdge(page, m, e, 'label tap'); }
      else await tapEdge(page, e);
      await page.evaluate(() => { location.hash = '#/quiz'; }); await expect(page.getByTestId('quiz')).toBeVisible();
      await page.evaluate(() => { location.hash = '#/'; }); await expect(page.getByTestId('map-svg')).toBeVisible();
      await expectOnlyEdge(page, m, e, 'after returning to the map (restored state)');
    });

    for (const [view, vp] of [['desktop', { width: 1400, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
      test(`${view}: edge tap screenshot`, async ({ page }) => {
        await page.setViewportSize(vp); await open(page, app);
        const m = (await maps(page))[0], e = deepest(m);
        await tapEdge(page, e); await expectOnlyEdge(page, m, e, `${view} deepest line`);
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(OUT, `map-edge-tap-${app}-${view}.png`) });
      });
    }
  });
}
