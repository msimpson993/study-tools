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

/* ───────────── in the apps: every dive of linear-systems and transforms, and the hero on both maps ───────────── */
import { APPS, open, trackErrors } from './helpers';
type Dv = { id: string; title: string; exampleScene?: { overlays?: string[] } };
const dives = (page: Page): Promise<Dv[]> => page.evaluate(() => (window as any).__study.content.dives);
/** Hold the scene at a frame where its overlays have something to show, then repaint. */
const freezeAt = async (page: Page, t: number) => { await page.evaluate((x) => { (window as any).__sceneFreeze = x; window.dispatchEvent(new Event('study-theme')); }, t); await page.waitForTimeout(120); };
const restFor = (ov: string[]) => (ov.includes('hammer') ? 0.9 : ov.includes('shaker') ? 9 : ov.includes('push') ? 1.6 : ov.includes('window') || ov.includes('sampler') || ov.includes('envelope') ? 1.3 : 1.0);
const SHOT_DIVES: Record<string, string[]> = { 'linear-systems': ['ss', 'eig', 'ctrl', 'obs', 'lti', 'sampling', 'jordan'], transforms: ['ring', 'sampled', 'zmap', 'leakage'], 'control-systems': ['model', 'sp8', 'ctrl', 'second'], 'pid-tuning': ['problem', 'windup', 'ap-kick', 'ap-delay'] };

for (const app of ['linear-systems', 'transforms', 'control-systems', 'pid-tuning'] as const) {
  test.describe(`${app}: example scenes in dives and on the map`, () => {
    test('every dive shows the scene beside “what this adds”, with the overlays its content chose', async ({ page }) => {
      test.setTimeout(120_000);
      const errs = trackErrors(page); await open(page, app);
      const ds = await dives(page); expect(ds.length).toBeGreaterThanOrEqual(5);
      for (const d of ds) {
        await page.evaluate((id) => { location.hash = `#/dive/${id}`; }, d.id);
        const row = page.getByTestId('dive-example-row'); await expect(row, `${d.id}: row`).toBeVisible();
        await expect(row.getByTestId('dive-example')).toBeVisible();
        const sc = row.getByTestId('example-scene'); await expect(sc, `${d.id}: scene`).toBeVisible();
        expect(d.exampleScene?.overlays?.length, `${d.id}: content chose overlays`).toBeGreaterThan(0);
        await expect(sc).toHaveAttribute('data-overlays', d.exampleScene!.overlays!.join(','));
        await freezeAt(page, restFor(d.exampleScene!.overlays!));
        const r = await ink(page, '[data-testid=dive-example-row] [data-testid=scene-canvas]');
        expect(r.n, `${d.id}: painted`).toBeGreaterThan(1500);
        expect((await sc.getByTestId('scene-canvas').getAttribute('aria-label'))!.length).toBeGreaterThan(60);
      }
      expect(errs).toEqual([]);
    });

    test('different dives draw different pictures (the overlays matter)', async ({ page }) => {
      await open(page, app); const ds = await dives(page); const seen = new Map<string, string>();
      for (const d of ds) {
        await page.evaluate((id) => { location.hash = `#/dive/${id}`; }, d.id); await page.getByTestId('example-scene').waitFor();
        await freezeAt(page, restFor(d.exampleScene!.overlays!)); const r = await ink(page, '[data-testid=scene-canvas]');
        const k = d.exampleScene!.overlays!.slice().sort().join(',');
        if (seen.has(k)) continue; seen.set(k, `${r.hsh}`);
      }
      expect(new Set(seen.values()).size, 'distinct overlay sets paint distinct pictures').toBe(seen.size);
    });

    for (const [view, vp] of [['desktop', { width: 1300, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
      test(`${view}: map hero sits ${view === 'desktop' ? 'beside' : 'under'} the central question`, async ({ page }) => {
        await page.addInitScript(() => { (window as any).__sceneFreeze = 1.2; });
        await page.setViewportSize(vp); await open(page, app);
        const hero = page.getByTestId('map-hero'), sc = hero.getByTestId('example-scene'); await expect(sc).toBeVisible();
        const q = (await page.getByTestId('central-question').boundingBox())!, s = (await sc.boundingBox())!;
        expect(s.x + s.width, 'hero inside viewport').toBeLessThanOrEqual(vp.width + 1);
        if (view === 'desktop') { expect(s.x, 'beside the question').toBeGreaterThan(q.x + q.width - 4); expect(s.height, 'small').toBeLessThanOrEqual(190); }
        else { expect(s.y, 'under the question').toBeGreaterThanOrEqual(q.y + q.height - 2); expect(s.height, 'small').toBeLessThanOrEqual(170); }
        expect((await ink(page, '[data-testid=map-hero] [data-testid=scene-canvas]')).n).toBeGreaterThan(800);
        expect(await noHScroll(page)).toBe(true);
        for (const th of ['light', 'dark'] as const) { await setTheme(page, th); await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, `scene-hero-${app}-${view}-${th}.png`) }); }
      });
      test(`${view}: dives fit with no horizontal scroll, light and dark; screenshots`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize(vp); await open(page, app);
        const ds = await dives(page);
        for (const d of ds) {
          await page.evaluate((id) => { location.hash = `#/dive/${id}`; }, d.id); const sc = page.getByTestId('example-scene'); await sc.waitFor();
          await freezeAt(page, restFor(d.exampleScene!.overlays!));
          const bb = (await sc.boundingBox())!; expect(bb.x + bb.width, `${d.id}: scene inside viewport`).toBeLessThanOrEqual(vp.width + 1); expect(await noHScroll(page), `${d.id}: no h-scroll`).toBe(true);
          if (view === 'desktop') expect(bb.x, `${d.id}: scene is beside the text on desktop`).toBeGreaterThan(vp.width * 0.4);
          if (!SHOT_DIVES[app].includes(d.id)) continue;
          for (const th of ['light', 'dark'] as const) {
            await setTheme(page, th); await page.waitForTimeout(150);
            await page.getByTestId('dive-example-row').screenshot({ path: path.join(OUT, `scene-${app}-${d.id}-${view}-${th}.png`) });
          }
        }
      });
    }
  });
}

test('control-systems and pid-tuning choose overlays for every dive (none falls back to the default) and declare a map hero', async ({ page }) => {
  for (const app of ['control-systems', 'pid-tuning']) {
    await open(page, app);
    const { ds, hero } = await page.evaluate(() => { const c = (window as any).__study.content; return { ds: c.dives as Dv[], hero: c.subject.runningExample.scene }; });
    expect(hero, `${app}: hero scene`).toMatchObject({ id: 'cart' });
    for (const d of ds) { expect(d.exampleScene?.overlays?.length, `${app}/${d.id}: own overlays`).toBeGreaterThan(0); expect(d.exampleScene?.overlays, `${app}/${d.id}: not the default`).not.toEqual(['forces']); }
  }
});
