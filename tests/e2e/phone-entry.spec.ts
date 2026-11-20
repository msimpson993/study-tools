import { test, expect, type Page } from '@playwright/test';
import { APPS, open } from './helpers';

/* Phones (< 700 px), Nov 19: an open map entry is a floating card over most of the screen (about 10 px margins, rounded,
   the map faint at its edges). Since Nov 19 (10:17 PM) there is no bottom "← Back to map" bar: the card closes with its ✕
   (pinned at the card's top) or the browser/Android Back (opening pushes a history step). The map is not remounted; it
   keeps its scroll position, or shows the box the reader walked to if that is off screen. Desktop keeps 40/60. */
const card = (page: Page) => page.evaluate(() => {
  const p = document.querySelector('[data-testid=map-panel]') as HTMLElement, r = p.getBoundingClientRect(), cs = getComputedStyle(p);
  const x = p.querySelector('[data-testid=panel-close]') as HTMLElement | null, xr = x?.getBoundingClientRect();
  return { l: r.left, r: innerWidth - r.right, t: r.top, b: innerHeight - r.bottom, h: r.height, vh: innerHeight, radius: parseFloat(cs.borderTopLeftRadius), idle: p.classList.contains('idle'),
    bars: document.querySelectorAll('[data-testid=map-backbar], [data-testid=back-to-map-fixed]').length,
    x: xr ? { t: xr.top - r.top, w: xr.width, h: xr.height, inCard: xr.top >= r.top - 1 && xr.bottom <= r.bottom + 1 } : null };
});
/** scroll the page down a little and tag the map so a remount would show */
const settle = async (page: Page) => {
  await page.evaluate(() => { scrollTo(0, 260); (document.querySelector('[data-testid=map-wrap]') as HTMLElement).dataset.keep = '1'; });
  await page.waitForTimeout(150);
  return page.evaluate(() => scrollY);
};
/** the box the reader walked to is fully on screen (inside the map's scroll area and the viewport) */
const expectInView = async (page: Page, id: string) => {
  const r = await page.evaluate((x) => { const el = document.querySelector(`.qm-node[data-node="${x}"]`)!.getBoundingClientRect(), sc = document.querySelector('.cm-scroll')!.getBoundingClientRect();
    return { ok: el.top >= Math.max(0, sc.top) - 1 && el.bottom <= Math.min(innerHeight, sc.bottom) + 1 && el.left >= Math.max(0, sc.left) - 1 && el.right <= Math.min(innerWidth, sc.right) + 1, el: [el.left, el.top, el.right, el.bottom].map(Math.round) }; }, id);
  expect(r.ok, `walked-to box ${id} in view ${JSON.stringify(r.el)}`).toBe(true);
};
const kept = (page: Page) => page.evaluate(() => ({ y: scrollY, same: (document.querySelector('[data-testid=map-wrap]') as HTMLElement | null)?.dataset.keep === '1' }));

for (const app of APPS) test.describe(`${app} @390: map entry card`, () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('an open box or line is a floating card over most of the screen, no bottom bar, its ✕ pinned in reach while it scrolls', async ({ page }) => {
    await open(page, app);
    for (const target of ['[data-testid=map-node]', '[data-testid=map-edge]']) {
      await page.locator(target).nth(2).dispatchEvent('click');
      const c = await card(page);
      expect(c.idle).toBe(false);
      for (const m of [c.l, c.r, c.b]) { expect(m, 'small side/bottom margins').toBeGreaterThanOrEqual(6); expect(m).toBeLessThanOrEqual(14); }
      expect(c.h / c.vh, 'card takes most of the screen').toBeGreaterThan(0.85);
      expect(c.radius, 'rounded corners').toBeGreaterThanOrEqual(10);
      expect(c.bars, 'no "← Back to map" bar').toBe(0);
      expect(c.x, 'a ✕').not.toBeNull(); expect(c.x!.inCard).toBe(true); expect(c.x!.t, '✕ at the top').toBeLessThan(60);
      expect(Math.min(c.x!.w, c.x!.h), '✕ is a full-size tap target').toBeGreaterThanOrEqual(40);
      // scrolled to the end: the ✕ is still on screen at the card's top, and the last content is not cut off
      await page.evaluate(() => { const p = document.querySelector('[data-testid=map-panel]') as HTMLElement; p.scrollTop = p.scrollHeight; });
      await page.waitForTimeout(80);
      const c2 = await card(page); expect(c2.x!.inCard, '✕ stays in reach').toBe(true); expect(c2.x!.t).toBeLessThan(60);
      const end = await page.evaluate(() => { const p = document.querySelector('[data-testid=map-panel]') as HTMLElement, r = p.getBoundingClientRect(), last = (p.lastElementChild as HTMLElement).getBoundingClientRect(); return { last: last.bottom, card: r.bottom }; });
      expect(end.last, 'the last content is inside the card').toBeLessThanOrEqual(end.card + 1);
      await page.getByTestId('panel-close').click();
      await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    }
  });

  test('the ✕ closes the entry and returns to the map where it was, dropping the entry step from history', async ({ page }) => {
    await open(page, app);
    const y = await settle(page);
    const len = await page.evaluate(() => history.length);
    await page.locator('[data-testid=map-node]').nth(3).dispatchEvent('click');
    await expect(page).toHaveURL(/#\/node\//);
    expect(await page.evaluate(() => history.length), 'opening pushes one history step').toBe(len + 1);
    await page.getByTestId('panel-close').click();
    await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    await expect(page).not.toHaveURL(/#\/node\//);
    const k = await kept(page); expect(k.same, 'map not remounted').toBe(true); expect(Math.abs(k.y - y), 'scroll position kept').toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => history.state?.cmEntry ?? null), 'the entry step is gone from history').toBeNull();
  });

  test('browser Back closes the entry (after chain Next/Back inside it) on the map, showing the box walked to; Forward reopens it', async ({ page }) => {
    await open(page, app);
    const y = await settle(page);
    await page.locator('[data-testid=map-node]').nth(3).dispatchEvent('click');
    // walk the chain inside the entry: box → line → box; still one history step
    await page.getByTestId('chain-next').first().click();
    await expect(page.locator('.qm-edge.e-sel')).toHaveCount(1);
    await page.getByTestId('edge-next').click();
    await expect(page.locator('.qm-node.n-sel')).toHaveCount(1);
    const at = await page.evaluate(() => location.hash), walked = decodeURIComponent(at.split('/').pop()!);
    await page.goBack();
    await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    await expect(page.locator('.qm-node.n-sel')).toHaveCount(0);
    const k = await kept(page); expect(k.same, 'map not remounted').toBe(true); void y;
    await expectInView(page, walked);
    await page.goForward();
    await expect(page.getByTestId('map-panel')).not.toHaveClass(/idle/);
    expect(await page.evaluate(() => location.hash)).toBe(at);
  });
  test('a long walk down the chain, then ✕ (or Back): the map comes back centred on the box walked to, not the old spot', async ({ page }) => {
    for (const how of ['close', 'back'] as const) {
      await open(page, app);
      await page.evaluate(() => scrollTo(0, 0));
      await page.locator('[data-testid=map-node][data-node="root"]').dispatchEvent('click');
      for (let i = 0; i < 6; i++) { await page.getByTestId('chain-next').first().click(); await page.getByTestId('edge-next').click(); }
      const walked = await page.locator('.qm-node.n-sel').getAttribute('data-node');
      if (how === 'close') await page.getByTestId('panel-close').click(); else await page.goBack();
      await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
      await page.waitForTimeout(250);
      await expectInView(page, walked!);
      expect(await page.evaluate(() => history.state?.cmEntry ?? null), `${how}: no entry step left`).toBeNull();
    }
  });
});

for (const app of APPS) test(`${app} @1366: desktop keeps the 40/60 split, no Back bar and no extra history step`, async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await open(page, app);
  const len = await page.evaluate(() => history.length);
  await page.locator('[data-testid=map-node]').nth(3).dispatchEvent('click');
  await expect(page.getByTestId('map-wrap')).toHaveClass(/split/);
  expect((await card(page)).bars).toBe(0);
  expect(await page.evaluate(() => history.length)).toBe(len);
});
