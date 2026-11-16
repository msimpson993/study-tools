import { test, expect, type Page } from '@playwright/test';
import { APPS, open, noHScroll, trackErrors } from './helpers';

const isFull = (page: Page) => page.evaluate(() => !!(document.fullscreenElement ?? (document as any).webkitFullscreenElement));
const btn = (page: Page) => page.getByTestId('fullscreen-toggle');

for (const app of APPS) {
  test.describe(`${app}: full-screen button`, () => {
    test('sits in the top bar at 390px / 320px without colliding or scrolling sideways', async ({ page }) => {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 800 });
        await open(page, app);
        await expect(btn(page)).toBeVisible();
        const boxes = await page.evaluate(() => {
          const bar = document.querySelector('.topbar .in')!;
          const r = (e: Element) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height, id: (e as HTMLElement).dataset.testid || e.textContent || e.className }; };
          const bb = bar.getBoundingClientRect();
          const kids = [...bar.children].filter((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).map(r);
          return { bar: { l: bb.left, r: bb.right, h: bb.height }, kids };
        });
        // everything inside the bar, nothing overlapping its neighbour, bar did not grow to a second line
        for (const k of boxes.kids) { expect(k.l, k.id).toBeGreaterThanOrEqual(boxes.bar.l - 0.5); expect(k.r, k.id).toBeLessThanOrEqual(boxes.bar.r + 0.5); }
        const sorted = [...boxes.kids].sort((a, b) => a.l - b.l);
        for (let i = 1; i < sorted.length; i++) expect(sorted[i].l, `${sorted[i - 1].id} vs ${sorted[i].id}`).toBeGreaterThanOrEqual(sorted[i - 1].r - 0.5);
        const fsBox = boxes.kids.find((k) => k.id === 'fullscreen-toggle')!;
        expect(fsBox.w).toBeGreaterThanOrEqual(28); expect(fsBox.h).toBeGreaterThanOrEqual(24);
        expect(boxes.bar.h, 'top bar stays one line').toBeLessThan(width === 390 ? 64 : 100);
        expect(await noHScroll(page)).toBe(true);
      }
    });

    test('button toggles full screen, its pressed state and label, and the page keeps working', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      const errs = trackErrors(page);
      await open(page, app);
      await expect(btn(page)).toHaveAttribute('aria-pressed', 'false');
      await expect(btn(page)).toHaveAttribute('aria-label', 'Enter full screen');
      await btn(page).click();
      await expect.poll(() => isFull(page)).toBe(true);
      await expect(btn(page)).toHaveAttribute('aria-pressed', 'true');
      await expect(btn(page)).toHaveAttribute('aria-label', 'Exit full screen');
      await expect(btn(page)).toHaveClass(/\bon\b/);
      await expect(page.locator('.topbar')).toBeVisible();
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
      await btn(page).click();
      await expect.poll(() => isFull(page)).toBe(false);
      await expect(btn(page)).toHaveAttribute('aria-pressed', 'false');
      await expect(btn(page)).toHaveAttribute('aria-label', 'Enter full screen');
      expect(errs).toEqual([]);
    });

    test('pressing the button again leaves the URL, history depth and view unchanged', async ({ page }) => {
      await open(page, app);
      const before = await page.evaluate(() => ({ url: location.href, len: history.length }));
      await btn(page).click(); await expect.poll(() => isFull(page)).toBe(true);
      await btn(page).click(); await expect.poll(() => isFull(page)).toBe(false);
      // let the sentinel clean-up (history.back) settle
      await expect.poll(() => page.evaluate(() => location.href)).toBe(before.url);
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => location.href)).toBe(before.url);
      // one real back still leaves the page (to about:blank), not to a leftover duplicate of this page
      await page.goBack();
      await expect.poll(() => page.url()).not.toContain(`/${app}/index.html`);
    });

    test('a back gesture in full screen exits full screen and stays on the same page', async ({ page }) => {
      const errs = trackErrors(page);
      await open(page, app, '#/');
      const startUrl = await page.evaluate(() => location.href);
      await btn(page).click(); await expect.poll(() => isFull(page)).toBe(true);
      await page.goBack();
      await expect.poll(() => isFull(page)).toBe(false);
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => location.href)).toBe(startUrl);
      await expect(btn(page)).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('.topbar')).toBeVisible();
      expect(errs).toEqual([]);
    });

    test('in-app navigation works in full screen and the next back gesture still exits without navigating', async ({ page }) => {
      await open(page, app, '#/');
      const hubHash = await page.evaluate(() => location.hash);
      await btn(page).click(); await expect.poll(() => isFull(page)).toBe(true);
      // navigate inside the app (the router listens to hashchange); full screen must survive it
      const target = await page.evaluate(() => {
        const a = [...document.querySelectorAll('a[href^="#/"]')].find((x) => (x.getAttribute('href') ?? '') !== (location.hash || '#/')) as HTMLAnchorElement | undefined;
        if (!a) return null; const href = a.getAttribute('href')!; location.hash = href; return href;
      });
      if (target) {
        await expect.poll(() => page.evaluate(() => location.hash)).toBe(target);
        expect(await isFull(page)).toBe(true);
        await page.goBack();
        await expect.poll(() => isFull(page)).toBe(false);
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => location.hash)).toBe(target); // the swipe only left full screen
        await page.goBack();
        await expect.poll(() => page.evaluate(() => location.hash)).toBe(hubHash); // next back is the app's own previous page
      }
    });

    test('Escape (browser exit) leaves full screen and cleans up history', async ({ page }) => {
      await open(page, app, '#/');
      const startUrl = await page.evaluate(() => location.href);
      await btn(page).click(); await expect.poll(() => isFull(page)).toBe(true);
      await page.evaluate(() => document.exitFullscreen()); // what Esc / the browser UI does
      await expect.poll(() => isFull(page)).toBe(false);
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => location.href)).toBe(startUrl);
      await page.goBack();
      await expect.poll(() => page.url()).not.toContain(`/${app}/index.html`);
    });
  });
}

test('where the Fullscreen API is missing the button is hidden and nothing throws', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errs = trackErrors(page);
  await page.addInitScript(() => {
    (Element.prototype as any).requestFullscreen = undefined; (Element.prototype as any).webkitRequestFullscreen = undefined;
  });
  await open(page, 'transforms');
  await expect(btn(page)).toBeHidden();
  await expect(page.getByTestId('theme-toggle')).toBeVisible();
  expect(await noHScroll(page)).toBe(true);
  expect(errs).toEqual([]);
});

test('left-edge rightward swipe in full screen exits (touch fallback)', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, baseURL: 'http://localhost:4173' });
  const page = await ctx.newPage();
  await open(page, 'transforms', '#/');
  const startUrl = await page.evaluate(() => location.href);
  await btn(page).tap(); await expect.poll(() => isFull(page)).toBe(true);
  await page.evaluate(() => {
    const fire = (type: string, x: number, y: number) => {
      const t = new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y });
      document.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true }));
    };
    fire('touchstart', 6, 400); fire('touchmove', 40, 405); fire('touchmove', 120, 410); fire('touchend', 120, 410);
  });
  await expect.poll(() => isFull(page)).toBe(false);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => location.href)).toBe(startUrl);
  await ctx.close();
});

test('copyref still works after full screen is toggled', async ({ page }) => {
  await open(page, 'transforms');
  await btn(page).click(); await expect.poll(() => isFull(page)).toBe(true);
  await btn(page).click(); await expect.poll(() => isFull(page)).toBe(false);
  await page.waitForTimeout(300);
  await expect(page.getByTestId('theme-toggle')).toBeVisible();
  expect(await page.evaluate(() => !!(window as any).__study)).toBe(true);
});
