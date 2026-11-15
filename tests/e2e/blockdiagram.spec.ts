import { test, expect, type Page } from '@playwright/test';
import { open, noHScroll, trackErrors } from './helpers';

const setTheme = (page: Page, t: 'dark' | 'light') => page.evaluate((x) => { document.documentElement.dataset.theme = x; window.dispatchEvent(new Event('study-theme')); }, t);
const ink = (page: Page, sel: string) => page.locator(sel).first().evaluate((cv: HTMLCanvasElement) => {
  const g = cv.getContext('2d')!, d = g.getImageData(0, 0, cv.width, cv.height).data; let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++;
  return { n, w: cv.width, h: cv.height, cssH: cv.getBoundingClientRect().height };
});

test.describe('control-systems: the block diagram builds with the example', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => { (window as any).__sceneFreeze = 2.4; }); });

  test('map hero is a closed loop with a loop-stage diagram, and is legible at 390 px', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'control-systems');
    await setTheme(page, 'dark');
    const sc = page.getByTestId('map-hero').getByTestId('example-scene');
    await expect(sc).toBeVisible();
    await expect(sc).toHaveAttribute('data-overlays', /loop/);
    await expect(sc).toHaveAttribute('data-diagram', 'loop');
    const alt = await sc.getByTestId('scene-canvas').getAttribute('aria-label');
    expect(alt).toMatch(/Closed-loop block diagram|controller C/i);
    expect((await sc.locator('.scene-cap').textContent()) ?? '').toMatch(/Where the course is headed/);
    const r = await ink(page, '[data-testid=map-hero] [data-testid=scene-canvas]');
    expect(r.n, 'hero paints the cart and the diagram').toBeGreaterThan(800);
    expect(r.cssH, 'diagram adds height under the cart').toBeGreaterThan(180);
    expect(await noHScroll(page)).toBe(true);
    expect(errs).toEqual([]);
  });

  test('the model dive shows the ODE and, beside it, the open-loop plant block G(s)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'control-systems', '#/dive/model');
    const sc = page.getByTestId('example-scene');
    await expect(sc).toBeVisible();
    await expect(sc).toHaveAttribute('data-diagram', 'ode,open');
    const alt = await sc.getByTestId('scene-canvas').getAttribute('aria-label');
    expect(alt).toMatch(/ordinary differential equation/);
    expect(alt).toMatch(/Open-loop block diagram/);
    expect(alt).toMatch(/G\(s\)/);
    const r = await ink(page, '[data-testid=dive-example-row] [data-testid=scene-canvas]');
    expect(r.n).toBeGreaterThan(1500);
    expect(await noHScroll(page)).toBe(true);
  });

  test('the blocks dive has two stages — loop, then the shove — and no horizontal scroll at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'control-systems', '#/dive/blocks');
    const sc = page.getByTestId('example-scene');
    await expect(sc).toBeVisible();
    await expect(sc).toHaveAttribute('data-diagram', 'loop,disturb');
    const alt = await sc.getByTestId('scene-canvas').getAttribute('aria-label');
    expect(alt).toMatch(/Closed-loop block diagram/);
    expect(alt).toMatch(/disturbance d/);
    const r = await ink(page, '[data-testid=dive-example-row] [data-testid=scene-canvas]');
    expect(r.n).toBeGreaterThan(1500);
    expect(r.cssH, 'two stacked stages plus the cart').toBeGreaterThan(300);
    expect(await noHScroll(page)).toBe(true);
  });

  test('sp8 mounts a live K slider that is wired to the scene', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await open(page, 'control-systems', '#/dive/sp8');
    const sc = page.getByTestId('example-scene');
    await expect(sc).toHaveAttribute('data-diagram', 'gain');
    const row = sc.getByTestId('diagram-k');
    await expect(row).toBeVisible();
    await expect(sc.getByTestId('diagram-k-value')).toHaveText('7');
    await row.locator('input[type=range]').fill('20');
    await expect(sc.getByTestId('diagram-k-value')).toHaveText('20');
  });

  test('other cart apps do not grow a diagram unless they asked for one', async ({ page }) => {
    await open(page, 'linear-systems');
    const hero = page.getByTestId('map-hero').getByTestId('example-scene');
    await expect(hero).toBeVisible();
    expect(await hero.getAttribute('data-diagram')).toBeFalsy();
    await open(page, 'pid-tuning');
    const phero = page.getByTestId('map-hero').getByTestId('example-scene');
    await expect(phero).toBeVisible();
    expect(await phero.getAttribute('data-diagram')).toBeFalsy();
  });
});
