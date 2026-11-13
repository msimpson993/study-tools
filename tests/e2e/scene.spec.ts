import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { noHScroll } from './helpers';

// Example scenes (packages/core/src/scene.ts): the animated running example. Gallery section = core reference.
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const setTheme = (page: Page, t: 'dark' | 'light') => page.evaluate((x) => { document.documentElement.dataset.theme = x; window.dispatchEvent(new Event('study-theme')); }, t);
/** Number of painted (non-transparent) pixels and a cheap hash of the canvas. */
const ink = (page: Page, sel: string) => page.locator(sel).first().evaluate((cv: HTMLCanvasElement) => {
  const g = cv.getContext('2d')!, d = g.getImageData(0, 0, cv.width, cv.height).data; let n = 0, hsh = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 20) { n++; hsh = (hsh * 31 + d[i - 3] + d[i - 2] * 3 + d[i - 1] * 7 + i) | 0; }
  return { n, hsh, w: cv.width, h: cv.height, cssW: cv.getBoundingClientRect().width };
});

test.describe('gallery: example scenes', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => { (window as any).__sceneFreeze = 1.2; }); });

  test('every scene set paints a labelled picture (alt text, caption, overlay chips)', async ({ page }) => {
    await page.goto('/_gallery/index.html');
    const cells = page.locator('[data-scene-set]'); expect(await cells.count()).toBeGreaterThanOrEqual(12);
    for (let i = 0; i < (await cells.count()); i++) {
      const c = cells.nth(i), key = await c.getAttribute('data-scene-set');
      await c.scrollIntoViewIfNeeded();
      const cv = c.locator('[data-testid=scene-canvas]');
      const r = await ink(page, `[data-scene-set="${key}"] [data-testid=scene-canvas]`);
      expect(r.n, `${key}: painted`).toBeGreaterThan(1500);
      expect((await cv.getAttribute('aria-label'))!.length, `${key}: alt text`).toBeGreaterThan(60);
      expect((await c.locator('.scene-chip').count()), `${key}: overlay chips`).toBeGreaterThanOrEqual(1);
    }
  });


  for (const [view, vp] of [['desktop', { width: 1200, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
    test(`${view}: scenes fit the viewport (no horizontal scroll), both themes paint differently`, async ({ page }) => {
      await page.setViewportSize(vp); await page.goto('/_gallery/index.html');
      const sec = page.getByTestId('scenes'); await sec.scrollIntoViewIfNeeded();
      expect(await noHScroll(page)).toBe(true);
      const cells = page.locator('[data-scene-set]');
      for (let i = 0; i < (await cells.count()); i++) { const bb = (await cells.nth(i).boundingBox())!; expect(bb.x + bb.width, `cell ${i}`).toBeLessThanOrEqual(vp.width + 1); }
      const sel = '[data-scene-set="cart:modes+trace"] [data-testid=scene-canvas]';
      await page.locator(sel).scrollIntoViewIfNeeded(); await setTheme(page, 'dark'); await page.waitForTimeout(150); const d = await ink(page, sel);
      await setTheme(page, 'light'); await page.waitForTimeout(150); const l = await ink(page, sel);
      expect(d.hsh, 'theme changes the colours').not.toBe(l.hsh);
      await sec.screenshot({ path: path.join(OUT, `scene-gallery-${view}-light.png`) });
      await setTheme(page, 'dark'); await page.waitForTimeout(150);
      await sec.screenshot({ path: path.join(OUT, `scene-gallery-${view}-dark.png`) });
    });
  }
});

test('un-frozen, the scene animates (two frames differ)', async ({ page }) => {
  await page.goto('/_gallery/index.html');
  const sel = '[data-scene-set="cart:hammer+trace"] [data-testid=scene-canvas]'; await page.locator(sel).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); const a = await ink(page, sel); await page.waitForTimeout(700); const b = await ink(page, sel);
  expect(a.hsh).not.toBe(b.hsh);
});
