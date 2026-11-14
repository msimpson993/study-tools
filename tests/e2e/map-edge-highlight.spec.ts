import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { APPS, open, selectMap } from './helpers';
import { pathToRoot, edgeKey } from '../../packages/core/src/maplayout';

// Tapping a LINE highlights that line (arrowhead + label) and NO box: neither endpoint, no chain, nothing selected. Every box dims like
// the other lines. Tapping a BOX keeps highlighting its chain. Also checked: no hover, focus, route or panel state lights a box after a line tap.
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
  const key = edgeKey(e.from, e.to), s = await state(page), all = m.nodes.map((n) => n.id);
  expect(s.end, `${what}: no endpoint style exists`).toEqual([]);
  expect([...s.sel, ...s.path, ...s.neigh], `${what}: no box highlighted (no chain, no selected box)`).toEqual([]);
  expect(s.dim, `${what}: every box dims, endpoints included`).toEqual([...all].sort());
  expect(await page.locator('[data-testid=map-node][aria-pressed=true]').count(), `${what}: no box is pressed`).toBe(0);
  expect(s.edgeOn, `${what}: only this line is active`).toEqual([key]); expect(s.edgeSel).toEqual([key]);
  expect(s.edgeDim.length, `${what}: other lines dim`).toBe(m.edges.length - 1);
  expect(s.labelOn.every((k) => k === key), `${what}: only this line's label is active`).toBe(true);
}
/** computed paint of a box's outline shape */
const paint = (page: Page, id: string) => page.locator(`[data-testid=map-node][data-node="${id}"] .shape`).evaluate((el) => { const c = getComputedStyle(el); return `${c.fill}|${c.stroke}|${c.strokeWidth}`; });
const deepest = (m: M) => [...m.edges].sort((a, b) => pathToRoot(b.from, m.edges).length - pathToRoot(a.from, m.edges).length)[0];
const tapEdge = (page: Page, e: E) => page.locator(`[data-testid=map-edge][data-edge="${edgeKey(e.from, e.to)}"]`).first().dispatchEvent('click');

for (const app of APPS) {
  test.describe(`${app}: tapping a line highlights only the line (no box)`, () => {
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

    test('a real mouse tap on the line’s dot: endpoints look exactly like every other dimmed box, whatever hovers or has focus; no route change; panel opens no dive', async ({ page }) => {
      await open(page, app);
      const m = (await maps(page))[0], e = deepest(m), key = edgeKey(e.from, e.to), hash0 = await page.evaluate(() => location.hash);
      const dot = page.locator(`[data-testid=map-edge][data-edge="${key}"] circle.dot`).first(); await dot.scrollIntoViewIfNeeded();
      const bb = (await dot.boundingBox())!; await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await expectOnlyEdge(page, m, e, 'mouse tap on dot');
      expect(await page.evaluate(() => location.hash), 'tapping a line does not navigate (no dive opens)').toBe(hash0);
      const other = m.nodes.map((n) => n.id).find((id) => id !== e.from && id !== e.to && id !== 'root')!;
      const base = await paint(page, other);
      // pointer away, then ON the downstream and upstream box: the paint stays the dimmed one
      await page.mouse.move(2, 2);
      for (const id of [e.from, e.to]) { expect(await paint(page, id), `${id} resting`).toBe(base); }
      for (const id of [e.to, e.from]) { await page.locator(`[data-testid=map-node][data-node="${id}"]`).hover(); expect(await paint(page, id), `${id} hovered`).toBe(base); expect(await page.locator('[data-testid=map-node].n-sel, [data-testid=map-node].n-path').count()).toBe(0); }
      // focus: nothing in the map holds focus on a box, and no focus ring is drawn on the endpoints
      await page.mouse.move(2, 2);
      expect(await page.evaluate(() => document.activeElement?.closest('[data-testid=map-node]') !== null && document.activeElement?.closest('[data-testid=map-node]') !== undefined), 'no box has focus').toBe(false);
      // the panel names the line and offers the boxes as explicit buttons only: the target box is not opened for you
      await expect(page.locator('.cm-wrap .st-hint, .cm-wrap h3').first()).toBeVisible();
      expect(await page.locator('[data-testid=map-node][aria-pressed=true]').count()).toBe(0);
    });

    test('keyboard: Enter on a focused line lights only the line too', async ({ page }) => {
      await open(page, app);
      const m = (await maps(page))[0], e = deepest(m), key = edgeKey(e.from, e.to);
      await page.locator(`[data-testid=map-edge][data-edge="${key}"]`).first().focus(); await page.keyboard.press('Enter');
      await expectOnlyEdge(page, m, e, 'keyboard');
    });

    for (const [view, vp] of [['desktop', { width: 1400, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
      test(`${view}: edge tap screenshot`, async ({ page }) => {
        await page.setViewportSize(vp); await open(page, app);
        const m = (await maps(page))[0], e = deepest(m);
        await tapEdge(page, e); await expectOnlyEdge(page, m, e, `${view} deepest line`);
        await page.locator(`[data-testid=map-edge][data-edge="${edgeKey(e.from, e.to)}"]`).first().evaluate((el) => { const r = el.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - 250); });
        await page.waitForTimeout(200);
        await page.screenshot({ path: path.join(OUT, `map-edge-tap-${app}-${view}.png`) });
      });
    }
  });
}
