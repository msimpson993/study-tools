import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { MAP_APPS, open, trackErrors } from './helpers';

/* Full-map zoom (Nov 20, both apps): with nothing open the map is the same zoomable viewport as the side map: a frame filling the
   screen under the header; a plain wheel scrolls it (shift+wheel sideways; at its top or bottom edge the page scrolls on),
   Ctrl/Cmd+wheel or a trackpad pinch zooms about the cursor (only over the frame), a drag pans, two fingers pinch, one finger
   pans; from min(60%, the whole map) to 3×; the −/%/+ bar carries the one Fit to screen / Actual size control. The page still
   scrolls from outside the frame. Opening an entry shrinks the map to the side column at its fit, centred on the box; closing
   returns to the full view at its own zoom, centred on that box. */
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots', 'full-map-zoom');
fs.mkdirSync(OUT, { recursive: true });
const zoomOf = (page: Page) => page.evaluate(() => Number((document.querySelector('[data-testid=map-wrap]') as HTMLElement).dataset.zoom ?? '1'));
const frame = (page: Page) => page.evaluate(() => { const s = document.querySelector('.cm-scroll') as HTMLElement, r = s.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height, w: r.width, sl: s.scrollLeft, st: s.scrollTop, sw: s.scrollWidth, sh: s.scrollHeight, cw: s.clientWidth, ch: s.clientHeight }; });
/** the map point (viewBox units) under a screen point */
const under = (page: Page, x: number, y: number) => page.evaluate(([x, y]) => { const s = document.querySelector('[data-testid=map-svg]') as SVGSVGElement, r = s.getBoundingClientRect(), vb = s.viewBox.baseVal; return { x: ((x - r.left) / r.width) * vb.width, y: ((y - r.top) / r.height) * vb.height }; }, [x, y]);
const W3 = [[390, 844], [923, 1300], [1280, 900]] as const;

for (const app of MAP_APPS) for (const [W, H] of W3) test.describe(`${app} @${W}: full-map zoom`, () => {
  test('a framed viewport under the header, one zoom bar with Fit / Actual size (none in the legend), 100% at the top; screenshot', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: W, height: H });
    await open(page, app);
    const f = await frame(page);
    expect(f.bottom, 'fills the screen to its foot').toBeGreaterThanOrEqual(Math.min(H - 14, f.top + H * 0.6 - 2));
    expect(f.h).toBeGreaterThanOrEqual(H * 0.6 - 2); expect(f.h).toBeLessThanOrEqual(H);
    expect(f.st, 'starts at the top of the map').toBe(0);
    expect(await zoomOf(page)).toBe(1);
    await expect(page.getByTestId('map-zoom')).toBeVisible();
    await expect(page.getByTestId('map-view')).toHaveCount(1);
    await expect(page.getByTestId('map-legend').getByTestId('map-view')).toHaveCount(0);
    await expect(page.getByTestId('map-zoom').getByTestId('map-view').locator('[data-view=fit]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('map-zoom-reset')).toHaveText('Fit to screen');
    // the bar sits over the frame's top padding, not on a box
    const over = await page.evaluate(() => { const z = document.querySelector('[data-testid=map-zoom]')!.getBoundingClientRect(); return [...document.querySelectorAll('[data-testid=map-node]')].some((n) => { const r = n.getBoundingClientRect(); return r.left < z.right && z.left < r.right && r.top < z.bottom && z.top < r.bottom; }); });
    expect(over, 'zoom bar clear of the boxes').toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways page scroll').toBe(true);
    await page.screenshot({ path: path.join(OUT, `${app}-${W}-map.png`) });
    expect(errs).toEqual([]);
  });

  if (W >= 923) test('Ctrl+wheel zooms about the cursor over the frame only (a plain wheel does not); drag pans; range min(60%, whole map) to 3×; the page scrolls from outside', async ({ page }) => {
    await page.setViewportSize({ width: W, height: H });
    await open(page, app);
    const f = await frame(page), cx = Math.round(f.w / 2 + (await page.locator('.cm-scroll').boundingBox())!.x), cy = Math.round(f.top + Math.min(f.h, 500) * 0.5);
    const p0 = await under(page, cx, cy), y0 = await page.evaluate(() => scrollY);
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -120); await page.waitForTimeout(100); expect(await zoomOf(page), 'a plain wheel does not zoom').toBe(1);
    await page.keyboard.down('Control');
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(60); }
    await page.keyboard.up('Control');
    const z1 = await zoomOf(page); expect(z1, 'Ctrl+wheel up zooms in').toBeGreaterThan(1.3);
    const p1 = await under(page, cx, cy), fz = await frame(page);
    // the point under the cursor stays put on each axis the frame can scroll (a map still shorter than a tall frame cannot move up)
    if (fz.sw > fz.cw + 2) expect(Math.abs(p1.x - p0.x), 'zoom about the cursor (x)').toBeLessThan(4);
    if (fz.sh > fz.ch + 2 && fz.st < fz.sh - fz.ch - 1) expect(Math.abs(p1.y - p0.y), 'zoom about the cursor (y)').toBeLessThan(4);
    expect(await page.evaluate(() => scrollY), 'the page did not scroll').toBe(y0);
    await expect(page.getByTestId('map-zoom-pct')).toHaveText(`${Math.round(z1 * 100)}%`);
    await page.screenshot({ path: path.join(OUT, `${app}-${W}-zoomed.png`) });
    // drag pans, not a tap
    const s0 = await frame(page);
    await page.mouse.down(); await page.mouse.move(cx - 40, cy - 60, { steps: 5 }); await page.mouse.move(cx - 90, cy - 120, { steps: 5 }); await page.mouse.up();
    const s1 = await frame(page); expect(s1.sl > s0.sl || s1.st > s0.st, 'dragged').toBe(true);
    await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    // in to about 3× at most
    await page.keyboard.down('Control');
    for (let i = 0; i < 20; i++) await page.mouse.wheel(0, -240);
    await page.waitForTimeout(100); expect(await zoomOf(page)).toBeLessThanOrEqual(3.001); expect(await zoomOf(page)).toBeGreaterThan(2.9);
    // out to 60% or the whole map in the frame, whichever is smaller
    for (let i = 0; i < 40; i++) await page.mouse.wheel(0, 240);
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);
    const zOut = await zoomOf(page), lim = await page.evaluate(() => { const s = document.querySelector('.cm-scroll') as HTMLElement, vb = (document.querySelector('[data-testid=map-svg]') as SVGSVGElement).viewBox.baseVal; return Math.min(0.6, (s.clientWidth - 8) / vb.width, (s.clientHeight - parseFloat(getComputedStyle(s).paddingTop) - 8) / vb.height); });
    expect(zOut).toBeCloseTo(lim, 2);
    const fo = await frame(page); expect(fo.sh <= fo.ch + 2 || lim === 0.6, 'at the floor the whole map fits (or 60%)').toBe(true);
    await page.screenshot({ path: path.join(OUT, `${app}-${W}-zoomed-out.png`) });
    // Fit to screen resets
    await page.getByTestId('map-zoom-reset').click(); expect(await zoomOf(page)).toBe(1);
    // the wheel over the header scrolls the page and does not zoom
    await page.mouse.move(cx, 80); const ya = await page.evaluate(() => scrollY), canScroll = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 4);
    await page.mouse.wheel(0, 200); await page.waitForTimeout(200);
    expect(await zoomOf(page), 'no zoom from the header').toBe(1);
    if (canScroll) expect(await page.evaluate(() => scrollY), 'the page scrolled').toBeGreaterThan(ya);
    // over the legend too
    await page.evaluate(() => scrollTo(0, 0)); const lg = (await page.getByTestId('map-legend').boundingBox())!;
    await page.mouse.move(lg.x + 20, lg.y + lg.height / 2); await page.mouse.wheel(0, 150); await page.waitForTimeout(200);
    expect(await zoomOf(page), 'no zoom from the legend').toBe(1);
  });

  if (W >= 923) test('a plain wheel scrolls the map (shift+wheel sideways), never zooms; at the frame\'s top or bottom edge the page scrolls on', async ({ page }) => {
    await page.setViewportSize({ width: W, height: H });
    await open(page, app);
    const sc = page.locator('.cm-scroll'), bb = (await sc.boundingBox())!;
    const cx = Math.round(bb.x + bb.width / 2), cy = Math.round(bb.y + Math.min(bb.height, 500) * 0.5);
    await page.mouse.move(cx, cy);
    // zoom in (Ctrl+wheel) so the map scrolls both ways inside its frame
    await page.keyboard.down('Control'); for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -120); await page.keyboard.up('Control'); await page.waitForTimeout(120);
    const z = await zoomOf(page); expect(z).toBeGreaterThan(1.3);
    await sc.evaluate((e) => { e.scrollTop = 0; e.scrollLeft = 0; });
    const y0 = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 150); await page.waitForTimeout(150);
    let f = await frame(page); expect(f.st, 'plain wheel scrolls the map down').toBeGreaterThan(50);
    expect(await page.evaluate(() => scrollY), 'the page stays while the map can scroll').toBe(y0);
    await page.keyboard.down('Shift'); await page.mouse.wheel(0, 150); await page.keyboard.up('Shift'); await page.waitForTimeout(150);
    f = await frame(page); expect(f.sl, 'shift+wheel scrolls sideways').toBeGreaterThan(50);
    expect(await zoomOf(page), 'scrolling never zooms').toBeCloseTo(z, 3);
    // at the bottom edge the wheel carries on scrolling the page; at the top edge, back up
    await sc.evaluate((e) => { e.scrollTop = e.scrollHeight; });
    const canScroll = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + scrollY + 40);
    const ya = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 200); await page.waitForTimeout(200);
    if (canScroll) expect(await page.evaluate(() => scrollY), 'page scrolls on at the bottom edge').toBeGreaterThan(ya);
    const yb = await page.evaluate(() => scrollY);
    await sc.evaluate((e) => { e.scrollTop = 0; });
    const over = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.cm-scroll'), [cx, cy]);
    if (yb > 0 && over) { await page.mouse.wheel(0, -100); await page.waitForTimeout(200); expect(await page.evaluate(() => scrollY), 'page scrolls back up at the top edge').toBeLessThan(yb); }
    expect(await zoomOf(page)).toBeCloseTo(z, 3);
  });

  test('open an entry: the side map fits its column, centred on the box; close: the full view at its own zoom, centred on that box', async ({ page }) => {
    await page.setViewportSize({ width: W, height: H });
    await open(page, app);
    await page.getByTestId('map-zoom-in').click(); const zFull = await zoomOf(page); expect(zFull).toBeCloseTo(1.25, 2);
    const id = await page.evaluate(() => (window as any).__study.content.maps[0].nodes[4].id);
    await page.locator(`[data-testid=map-node][data-node="${id}"]`).dispatchEvent('click');
    const centred = () => page.evaluate((i) => { const b = document.querySelector(`.qm-node[data-node="${i}"]`)!.getBoundingClientRect(), s = document.querySelector('.cm-scroll')!.getBoundingClientRect(); return { dx: Math.abs(b.left + b.width / 2 - (s.left + s.width / 2)), dy: Math.abs(b.top + b.height / 2 - (s.top + s.height / 2)), inside: b.left >= s.left - 1 && b.right <= s.right + 1 && b.top >= s.top - 1 && b.bottom <= s.bottom + 1 }; }, id);
    if (W >= 700) {
      await expect(page.getByTestId('map-wrap')).toHaveClass(/split/);
      expect(await zoomOf(page), 'the side map at its column fit').toBeLessThanOrEqual(1);
      expect((await centred()).inside, 'the open box is in view in the side map').toBe(true);
      await page.screenshot({ path: path.join(OUT, `${app}-${W}-open.png`) });
      await page.getByTestId('panel-close').click();
      await expect(page.getByTestId('map-wrap')).not.toHaveClass(/split/);
      expect(await zoomOf(page), 'the full view comes back at its zoom').toBeCloseTo(zFull, 2);
      const c = await centred(); expect(c.inside, 'centred on the box it showed').toBe(true); expect(c.dy).toBeLessThan(120);
    } else {
      // phone: the floating card; the map keeps its zoom behind it; closing shows the box
      await expect(page.getByTestId('map-panel')).not.toHaveClass(/idle/);
      expect(await zoomOf(page)).toBeCloseTo(zFull, 2);
      await page.screenshot({ path: path.join(OUT, `${app}-${W}-open.png`) });
      await page.getByTestId('panel-close').click(); await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
      expect(await zoomOf(page)).toBeCloseTo(zFull, 2);
      expect((await centred()).inside, 'the box it showed is in view').toBe(true);
    }
  });

  if (W !== 1280) test('touch: two fingers pinch-zoom the full map, one finger pans it; the page scrolls from outside the frame', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'multi-touch via CDP');
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: W < 700 });
    const page = await ctx.newPage();
    await open(page, app);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, pts: [number, number][]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) } as any);
    const f = await frame(page), cx = Math.round(W / 2), cy = Math.round(f.top + Math.min(f.h, 400) * 0.5);
    const y0 = await page.evaluate(() => scrollY);
    await touch('touchStart', [[cx - 30, cy], [cx + 30, cy]]);
    for (let i = 1; i <= 8; i++) await touch('touchMove', [[cx - 30 - i * 10, cy], [cx + 30 + i * 10, cy]]);
    await touch('touchEnd', []); await page.waitForTimeout(150);
    const z = await zoomOf(page); expect(z, 'pinch out zooms in').toBeGreaterThan(1.8);
    expect(Math.abs((await page.evaluate(() => scrollY)) - y0), 'the page did not scroll').toBeLessThanOrEqual(1);
    await page.screenshot({ path: path.join(OUT, `${app}-${W}-pinched.png`) });
    // one finger pans the zoomed map
    const s0 = await frame(page);
    await touch('touchStart', [[cx, cy + 60]]);
    for (let i = 1; i <= 8; i++) await touch('touchMove', [[cx - i * 8, cy + 60 - i * 15]]);
    await touch('touchEnd', []); await page.waitForTimeout(400);
    const s1 = await frame(page); expect(s1.sl !== s0.sl || s1.st !== s0.st, 'one-finger pan').toBe(true);
    expect(await zoomOf(page), 'a pan is not a zoom').toBeCloseTo(z, 2);
    // a swipe on the header, outside the frame, scrolls the page
    const hb = (await page.getByTestId('central-question').boundingBox())!;
    if (await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 4)) {
      const ya = await page.evaluate(() => scrollY);
      await touch('touchStart', [[hb.x + 20, hb.y + hb.height / 2]]);
      for (let i = 1; i <= 8; i++) await touch('touchMove', [[hb.x + 20, hb.y + hb.height / 2 - i * 12]]);
      await touch('touchEnd', []); await page.waitForTimeout(500);
      expect(await page.evaluate(() => scrollY), 'the page scrolled from outside the map').toBeGreaterThan(ya);
      expect(await zoomOf(page)).toBeCloseTo(z, 2);
    }
    await ctx.close();
  });
});
