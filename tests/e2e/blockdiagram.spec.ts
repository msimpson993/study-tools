import { test, expect, type Page } from '@playwright/test';
import { noHScroll, trackErrors } from './helpers';

// The cart's staged block diagrams (ode, open, loop, disturb, gain). control-systems used to ship them on its hero and dives;
// since its Nov 2026 rebuild (house, corner and dish drawn by the app) they are exercised from the gallery rows instead.
const setTheme = (page: Page, t: 'dark' | 'light') => page.evaluate((x) => { document.documentElement.dataset.theme = x; window.dispatchEvent(new Event('study-theme')); }, t);
const cell = (set: string) => `[data-scene-set="${set}"]`;
const ink = (page: Page, sel: string) => page.locator(sel).first().evaluate((cv: HTMLCanvasElement) => {
  const g = cv.getContext('2d')!, d = g.getImageData(0, 0, cv.width, cv.height).data; let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++;
  return { n, w: cv.width, h: cv.height, cssH: cv.getBoundingClientRect().height };
});

test.describe('cart scene: the staged block diagram builds with the example', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => { (window as any).__sceneFreeze = 2.4; }); });

  test('a closed loop with a loop-stage diagram is legible at 390 px', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/_gallery/index.html'); await setTheme(page, 'dark');
    const sc = page.locator(cell('cart:loop:loop')).getByTestId('example-scene');
    await sc.scrollIntoViewIfNeeded(); await expect(sc).toBeVisible();
    await expect(sc).toHaveAttribute('data-overlays', /loop/);
    await expect(sc).toHaveAttribute('data-diagram', 'loop');
    expect(await sc.getByTestId('scene-canvas').getAttribute('aria-label')).toMatch(/Closed-loop block diagram|controller C/i);
    const r = await ink(page, `${cell('cart:loop:loop')} [data-testid=scene-canvas]`);
    expect(r.n, 'paints the cart and the diagram').toBeGreaterThan(800);
    expect(r.cssH, 'diagram adds height under the cart').toBeGreaterThan(180);
    expect(await noHScroll(page)).toBe(true);
    expect(errs).toEqual([]);
  });

  test('the ODE stage and, beside it, the open-loop plant block G(s)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/_gallery/index.html');
    const sc = page.locator(cell('cart:forces:ode+open')).getByTestId('example-scene');
    await sc.scrollIntoViewIfNeeded(); await expect(sc).toHaveAttribute('data-diagram', 'ode,open');
    const alt = (await sc.getByTestId('scene-canvas').getAttribute('aria-label'))!;
    expect(alt).toMatch(/ordinary differential equation/); expect(alt).toMatch(/Open-loop block diagram/); expect(alt).toMatch(/G\(s\)/);
    expect((await ink(page, `${cell('cart:forces:ode+open')} [data-testid=scene-canvas]`)).n).toBeGreaterThan(1500);
  });

  test('two stages (loop, then the shove) stack under the cart', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/_gallery/index.html');
    const sc = page.locator(cell('cart:disturb:loop+disturb')).getByTestId('example-scene');
    await sc.scrollIntoViewIfNeeded(); await expect(sc).toHaveAttribute('data-diagram', 'loop,disturb');
    const alt = (await sc.getByTestId('scene-canvas').getAttribute('aria-label'))!;
    expect(alt).toMatch(/Closed-loop block diagram/); expect(alt).toMatch(/disturbance d/);
    const r = await ink(page, `${cell('cart:disturb:loop+disturb')} [data-testid=scene-canvas]`);
    expect(r.n).toBeGreaterThan(1500); expect(r.cssH, 'two stacked stages plus the cart').toBeGreaterThan(300);
  });

  test('the gain stage mounts a live K slider wired to the scene', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto('/_gallery/index.html');
    const sc = page.locator(cell('cart:loop:gain')).getByTestId('example-scene');
    await sc.scrollIntoViewIfNeeded(); await expect(sc).toHaveAttribute('data-diagram', 'gain');
    const row = sc.getByTestId('diagram-k'); await expect(row).toBeVisible();
    await expect(sc.getByTestId('diagram-k-value')).toHaveText('7');
    await row.locator('input[type=range]').fill('20');
    await expect(sc.getByTestId('diagram-k-value')).toHaveText('20');
  });

  test('apps that did not ask for a diagram do not grow one', async ({ page }) => {
    await page.goto('/linear-systems/index.html');
    const hero = page.getByTestId('map-hero').getByTestId('example-scene');
    await expect(hero).toBeVisible();
    expect(await hero.getAttribute('data-diagram')).toBeFalsy();
  });
});
