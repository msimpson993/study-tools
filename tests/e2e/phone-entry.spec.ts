import { test, expect, type Page } from '@playwright/test';
import { APPS, open } from './helpers';

/* Phones (< 700 px), Nov 19: an open map entry is a floating card over most of the screen (about 10 px margins, rounded,
   the map faint at its edges) with a fixed "← Back to map" bar at its foot. Opening it pushes a history step, so the
   browser/Android Back returns to the map; the map is not remounted, so it keeps its scroll position. Desktop keeps 40/60. */
const card = (page: Page) => page.evaluate(() => {
  const p = document.querySelector('[data-testid=map-panel]') as HTMLElement, r = p.getBoundingClientRect(), cs = getComputedStyle(p);
  const bar = p.querySelector('[data-testid=map-backbar]') as HTMLElement | null, br = bar?.getBoundingClientRect();
  return { l: r.left, r: innerWidth - r.right, t: r.top, b: innerHeight - r.bottom, h: r.height, vh: innerHeight, radius: parseFloat(cs.borderTopLeftRadius), idle: p.classList.contains('idle'),
    bar: br && getComputedStyle(bar!).display !== 'none' && br.height > 0 ? { t: br.top, b: innerHeight - br.bottom, l: br.left, r: innerWidth - br.right } : null };
});
/** scroll the page down a little and tag the map so a remount would show */
const settle = async (page: Page) => {
  await page.evaluate(() => { scrollTo(0, 260); (document.querySelector('[data-testid=map-wrap]') as HTMLElement).dataset.keep = '1'; });
  await page.waitForTimeout(150);
  return page.evaluate(() => scrollY);
};
const kept = (page: Page) => page.evaluate(() => ({ y: scrollY, same: (document.querySelector('[data-testid=map-wrap]') as HTMLElement | null)?.dataset.keep === '1' }));

for (const app of APPS) test.describe(`${app} @390: map entry card`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('an open box or line is a floating card over most of the screen, with the fixed Back bar clear of the last content', async ({ page }) => {
    await open(page, app);
    for (const target of ['[data-testid=map-node]', '[data-testid=map-edge]']) {
      await page.locator(target).nth(2).dispatchEvent('click');
      const c = await card(page);
      expect(c.idle).toBe(false);
      for (const m of [c.l, c.r, c.b]) { expect(m, 'small side/bottom margins').toBeGreaterThanOrEqual(6); expect(m).toBeLessThanOrEqual(14); }
      expect(c.h / c.vh, 'card takes most of the screen').toBeGreaterThan(0.85);
      expect(c.radius, 'rounded corners').toBeGreaterThanOrEqual(10);
      expect(c.bar, 'the Back bar shows').not.toBeNull();
      expect(c.bar!.b, 'bar fixed at the foot of the card').toBeLessThanOrEqual(c.b + 4);
      await expect(page.getByTestId('back-to-map-fixed')).toHaveText('← Back to map');
      // scrolled to the end, the last content sits above the bar
      const clear = await page.evaluate(() => {
        const p = document.querySelector('[data-testid=map-panel]') as HTMLElement; p.scrollTop = p.scrollHeight;
        const kids = [...p.children].filter((k) => !k.classList.contains('cm-backbar')) as HTMLElement[], last = kids[kids.length - 1].getBoundingClientRect();
        const bar = p.querySelector('.cm-backbar button')!.getBoundingClientRect(); return { last: last.bottom, bar: bar.top };
      });
      expect(clear.last, 'the bar does not cover the last content').toBeLessThanOrEqual(clear.bar + 1);
      await page.getByTestId('panel-close').click();
      await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    }
  });

  test('"← Back to map" closes the entry and returns to the map where it was', async ({ page }) => {
    await open(page, app);
    const y = await settle(page);
    const len = await page.evaluate(() => history.length);
    await page.locator('[data-testid=map-node]').nth(3).dispatchEvent('click');
    await expect(page).toHaveURL(/#\/node\//);
    expect(await page.evaluate(() => history.length), 'opening pushes one history step').toBe(len + 1);
    await page.getByTestId('back-to-map-fixed').click();
    await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    await expect(page).not.toHaveURL(/#\/node\//);
    const k = await kept(page); expect(k.same, 'map not remounted').toBe(true); expect(Math.abs(k.y - y), 'scroll position kept').toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => history.state?.cmEntry ?? null), 'the entry step is gone from history').toBeNull();
  });

  test('browser Back closes the entry (after chain Next/Back inside it) and keeps the map position; Forward reopens it', async ({ page }) => {
    await open(page, app);
    const y = await settle(page);
    await page.locator('[data-testid=map-node]').nth(3).dispatchEvent('click');
    // walk the chain inside the entry: box → line → box; still one history step
    await page.getByTestId('chain-next').first().click();
    await expect(page.locator('.qm-edge.e-sel')).toHaveCount(1);
    await page.getByTestId('edge-next').click();
    await expect(page.locator('.qm-node.n-sel')).toHaveCount(1);
    const at = await page.evaluate(() => location.hash);
    await page.goBack();
    await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    await expect(page.locator('.qm-node.n-sel')).toHaveCount(0);
    const k = await kept(page); expect(k.same, 'map not remounted').toBe(true); expect(Math.abs(k.y - y), 'scroll position kept').toBeLessThanOrEqual(2);
    await page.goForward();
    await expect(page.getByTestId('map-panel')).not.toHaveClass(/idle/);
    expect(await page.evaluate(() => location.hash)).toBe(at);
  });
});

for (const app of APPS) test(`${app} @1366: desktop keeps the 40/60 split, no Back bar and no extra history step`, async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await open(page, app);
  const len = await page.evaluate(() => history.length);
  await page.locator('[data-testid=map-node]').nth(3).dispatchEvent('click');
  await expect(page.getByTestId('map-wrap')).toHaveClass(/split/);
  expect((await card(page)).bar).toBeNull();
  expect(await page.evaluate(() => history.length)).toBe(len);
});
