import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { noHScroll } from './helpers';

// Closed-loop cart overlays (loop, pid, disturb, noise, limit, delay, lag): the gallery rows, phone width, themes, screenshots.
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const setTheme = (page: Page, t: 'dark' | 'light') => page.evaluate((x) => { document.documentElement.dataset.theme = x; window.dispatchEvent(new Event('study-theme')); }, t);
const freeze = (page: Page, s: number) => page.evaluate((x) => { (window as any).__sceneFreeze = x; window.dispatchEvent(new Event('study-theme')); }, s);
const hash = (page: Page, sel: string) => page.locator(sel).first().evaluate((cv: HTMLCanvasElement) => {
  const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data; let n = 0, h = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 20) { n++; h = (h * 31 + d[i - 3] + d[i - 2] * 3 + d[i - 1] * 7 + i) | 0; }
  return { n, h };
});
const SETS = [['loop', 'loop+poles'], ['pid', 'pid'], ['disturb', 'disturb'], ['noise', 'noise'], ['limit', 'limit'], ['delay', 'delay'], ['lag', 'lag']] as const;
/** the moment each overlay is photographed: when it is doing its thing */
const SHOT_T: Record<string, number> = { loop: 1.2, pid: 1.2, disturb: 4.6, noise: 5, limit: 0.3, delay: 1.4, lag: 1.4 };
const cellSel = (key: string) => `[data-scene-set="cart:${key}"]`;

test.describe('closed-loop overlays in the gallery', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => { (window as any).__sceneFreeze = 2.4; }); });

  test('every loop overlay paints its own picture, and it changes with time (real simulation, not a still)', async ({ page }) => {
    await page.goto('/_gallery/index.html');
    const seen = new Set<number>();
    for (const [name, key] of SETS) {
      const sel = `${cellSel(key)} [data-testid=scene-canvas]`; await page.locator(sel).scrollIntoViewIfNeeded();
      await freeze(page, 2.4); const a = await hash(page, sel); expect(a.n, `${name}: painted`).toBeGreaterThan(3000);
      await freeze(page, 7); const b = await hash(page, sel); expect(b.h, `${name}: moves`).not.toBe(a.h);
      expect(seen.has(a.h), `${name}: differs from the others`).toBe(false); seen.add(a.h);
      expect(await page.locator(`${cellSel(key)} .scene-chip`).count()).toBeGreaterThanOrEqual(1);
    }
  });

  for (const [view, vp] of [['desktop', { width: 1100, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
    test(`${view}: fits (no horizontal scroll, nothing wider than the screen); screenshots light and dark`, async ({ page }) => {
      await page.setViewportSize(vp); await page.goto('/_gallery/index.html');
      expect(await noHScroll(page)).toBe(true);
      for (const [name, key] of SETS) {
        const cell = page.locator(cellSel(key)); await cell.scrollIntoViewIfNeeded();
        const bb = (await cell.boundingBox())!; expect(bb.x + bb.width, name).toBeLessThanOrEqual(vp.width + 1);
        const cv = page.locator(`${cellSel(key)} [data-testid=scene-canvas]`), cb = (await cv.boundingBox())!;
        expect(cb.x, `${name}: canvas not clipped at the left`).toBeGreaterThanOrEqual(0); expect(cb.x + cb.width).toBeLessThanOrEqual(vp.width + 1);
        await freeze(page, SHOT_T[name]);
        for (const th of ['light', 'dark'] as const) { await setTheme(page, th); await page.waitForTimeout(120); await cell.screenshot({ path: path.join(OUT, `scene-loop-${name}-${view}-${th}.png`) }); }
      }
      await setTheme(page, 'dark');
    });
  }

  test('a taller picture for a loop (controller block fits), the same width as other scenes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/_gallery/index.html');
    const loop = (await page.locator(`${cellSel('pid')} [data-testid=scene-canvas]`).boundingBox())!, open = (await page.locator('[data-scene-set="cart:modes+trace"] [data-testid=scene-canvas]').boundingBox())!;
    expect(loop.width).toBeCloseTo(open.width, 0); expect(loop.height).toBeGreaterThan(open.height);
  });
});

test('un-frozen, the loop animates (the cart moves with the closed-loop sim)', async ({ page }) => {
  await page.goto('/_gallery/index.html');
  const sel = `${cellSel('loop+poles')} [data-testid=scene-canvas]`; await page.locator(sel).scrollIntoViewIfNeeded();
  await page.waitForTimeout(250); const a = await hash(page, sel); await page.waitForTimeout(600); const b = await hash(page, sel);
  expect(a.h).not.toBe(b.h);
});
