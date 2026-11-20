import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { APPS, open } from './helpers';

// Map view toggle: "Fit to screen" (default, the layout follows the screen) vs "Actual size" (natural boxes, pan around).
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'study-tools.mapView';
const pick = (page: Page, v: 'fit' | 'actual') => page.locator(`[data-testid=map-view] [data-view=${v}]`).click();
const dims = (page: Page) => page.evaluate(() => { const sc = document.querySelector('.cm-scroll') as HTMLElement, sv = sc.querySelector('svg')!.getBoundingClientRect(); const nb = (document.querySelector('[data-testid=map-node] .shape') as SVGGraphicsElement).getBoundingClientRect(); return { cw: sc.clientWidth, ch: sc.clientHeight, sw: sc.scrollWidth, sh: sc.scrollHeight, svgW: sv.width, boxW: nb.width, actual: sc.classList.contains('actual'), sl: sc.scrollLeft, st: sc.scrollTop }; });
const state = (page: Page) => page.evaluate(() => ({ sel: document.querySelectorAll('.qm-node.n-sel').length, edge: document.querySelectorAll('.qm-edge.e-sel').length }));

for (const app of APPS) {
  for (const [view, vp] of [['desktop', { width: 1400, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
    test.describe(`${app} ${view}: map view`, () => {
      test.use({ viewport: vp });

      test('default is Fit; Actual size keeps boxes at natural size, makes the map pannable, and the choice is remembered', async ({ page }) => {
        await open(page, app);
        const toggle = page.getByTestId('map-view'); await expect(toggle).toBeVisible();
        await expect(toggle.locator('[data-view=fit]')).toHaveAttribute('aria-pressed', 'true');
        const fit = await dims(page); expect(fit.actual).toBe(false);
        expect(fit.sw, 'fit: nothing to pan sideways').toBeLessThanOrEqual(fit.cw + 4);
        await pick(page, 'actual');
        const act = await dims(page); expect(act.actual).toBe(true);
        expect(act.boxW, 'natural box size (184 px)').toBeGreaterThanOrEqual(183); expect(act.boxW).toBeGreaterThanOrEqual(fit.boxW - 0.5);
        if (view === 'mobile') { expect(act.sw, 'wider than the phone: pans').toBeGreaterThan(act.cw + 200); expect(fit.boxW).toBeLessThan(180); }
        expect(await page.evaluate(() => { const s = document.querySelector('.cm-scroll')!.getBoundingClientRect(); return [...document.querySelectorAll('[data-testid=map-node]')].filter((n) => { const r = n.getBoundingClientRect(); return r.right > s.left + 20 && r.left < s.right - 20 && r.bottom > s.top && r.top < s.bottom; }).length; }), 'Actual size opens on the boxes, not on the empty margin').toBeGreaterThanOrEqual(2);
        expect(act.ch, 'the map is a bounded viewport (the screen under the header) that pans vertically too').toBeLessThanOrEqual(page.viewportSize()!.height);
        expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('"actual"');
        await page.reload(); await expect(page.getByTestId('map-svg')).toBeVisible();
        await expect(page.locator('[data-testid=map-view] [data-view=actual]')).toHaveAttribute('aria-pressed', 'true');
        expect((await dims(page)).actual, 'remembered after reload').toBe(true);
        await pick(page, 'fit'); expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('"fit"'); expect((await dims(page)).actual).toBe(false);
      });

      test('a mouse drag pans and is not a tap; a plain click still opens a box and a line; the wheel zooms; re-render keeps the position', async ({ page }) => {
        await open(page, app); await pick(page, 'actual');
        await page.evaluate(() => (document.querySelector('.cm-scroll') as HTMLElement).scrollIntoView({ block: 'start' }));
        const sc = page.locator('.cm-scroll'), bb = (await sc.boundingBox())!;
        const before = await dims(page), sx = bb.x + bb.width * 0.5, sy = bb.y + bb.height * 0.5;
        // drag across a box (start ON a box): the map moves, nothing gets picked
        await page.evaluate(() => { const s = document.querySelector('.cm-scroll') as HTMLElement; s.scrollLeft = Math.max(0, (s.scrollWidth - s.clientWidth) / 2 - 150); s.scrollTop = 150; });
        Object.assign(before, await dims(page));
        // start the drag ON a box (the visible part of one: on a phone most boxes stick out of the screen)
        const pt = await page.evaluate(() => { for (const n of document.querySelectorAll('[data-testid=map-node]')) { const r = n.getBoundingClientRect(), x0 = Math.max(r.left, 6), x1 = Math.min(r.right, innerWidth - 6), y0 = Math.max(r.top, 6), y1 = Math.min(r.bottom, innerHeight - 6); if (x1 - x0 > 30 && y1 - y0 > 20) { const x = (x0 + x1) / 2, y = (y0 + y1) / 2; if (document.elementFromPoint(x, y)?.closest('[data-testid=map-node]') === n) return { x, y }; } } return null; });
        expect(pt, 'a box on screen to start the drag from').not.toBeNull();
        const box = { x: pt!.x, y: pt!.y, width: 0, height: 0 };
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 40, { steps: 4 }); await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 100, { steps: 4 }); await page.mouse.up();
        const after = await dims(page);
        expect(after.st < before.st || after.sl < before.sl, `dragged the map (${JSON.stringify(before)} → ${JSON.stringify(after)})`).toBe(true);
        expect(await state(page), 'a drag is not a tap').toEqual({ sel: 0, edge: 0 }); await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
        // plain taps still work
        await page.locator('[data-testid=map-node]').nth(2).dispatchEvent('click'); expect((await state(page)).sel).toBe(1);
        await page.keyboard.press('Escape');
        // (closing an entry on a phone may bring the box it showed into view, by design: phone-entry.spec; measure from here)
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
        const atTap = await dims(page);
        await page.locator('[data-testid=map-edge]').first().dispatchEvent('click'); expect((await state(page)).edge).toBe(1);
        // the tap re-rendered the svg but the pan position stayed
        // (desktop: an open entry moves the map into its side column, a deliberate re-layout; map-split.spec covers that)
        if (view === 'mobile') { const kept = await dims(page); expect(Math.abs(kept.st - atTap.st) + Math.abs(kept.sl - atTap.sl), 'position kept across re-render').toBeLessThan(3); }
        else { await expect(page.getByTestId('map-wrap')).toHaveClass(/split/); expect(await page.evaluate(() => { const e = document.querySelector('.qm-edge.e-sel .dot')!.getBoundingClientRect(), b = document.querySelector('.cm-scroll')!.getBoundingClientRect(); return e.left >= b.left && e.right <= b.right && e.top >= b.top && e.bottom <= b.bottom; }), 'the open line is in view in the side map').toBe(true); }
        // the wheel over the map zooms it (the full-width map is a zoomable viewport too; full-map-zoom.spec)
        await page.keyboard.press('Escape'); await page.mouse.move(sx, sy);
        const z0 = await page.evaluate(() => Number((document.querySelector('[data-testid=map-wrap]') as HTMLElement).dataset.zoom ?? '1'));
        await page.mouse.wheel(0, 200); await page.waitForTimeout(150);
        const z1 = await page.evaluate(() => Number((document.querySelector('[data-testid=map-wrap]') as HTMLElement).dataset.zoom ?? '1'));
        expect(z1, 'wheel down zooms out').toBeLessThan(z0);
      });

      test('a real click on a box and on a line dot works in both modes', async ({ page }) => {
        await open(page, app);
        for (const v of ['fit', 'actual'] as const) {
          await pick(page, v);
          const node = page.locator('[data-testid=map-node]').first(); await node.scrollIntoViewIfNeeded(); await node.click({ position: { x: 20, y: 10 } });
          expect((await state(page)).sel, `${v}: box click`).toBe(1); await page.keyboard.press('Escape');
          await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60))))); // the phone close re-shows the walked-to box a frame later
          const dot = page.locator('[data-testid=map-edge] circle.dot').first(); await dot.scrollIntoViewIfNeeded(); const d = (await dot.boundingBox())!;
          await page.mouse.click(d.x + d.width / 2, d.y + d.height / 2); expect((await state(page)).edge, `${v}: line click`).toBe(1); await page.keyboard.press('Escape');
        }
      });

      test('no horizontal page scroll in either mode; screenshots', async ({ page }) => {
        await open(page, app);
        for (const v of ['fit', 'actual'] as const) {
          await pick(page, v); await page.waitForTimeout(150);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${v}: the page itself does not scroll sideways`).toBe(true);
          if (app === 'linear-systems') {
            await page.evaluate(() => (document.querySelector('.cm-legend') as HTMLElement).scrollIntoView({ block: 'start' })); await page.waitForTimeout(150);
            await page.screenshot({ path: path.join(OUT, `map-view-${v}-${app}-${view}.png`) });
          }
        }
      });
    });
  }
}
