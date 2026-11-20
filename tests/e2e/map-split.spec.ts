import { test, expect, type Page } from '@playwright/test';
import { APPS, open } from './helpers';

/* Desktop reading layout (Nov 19): with a box or line pop-up open, the map takes the left ~40% and the entry the right
   ~60%; the side map shrinks to fit its column and the mouse wheel zooms it about the cursor (drag pans, Reset zoom
   restores it). With nothing open the map is alone, full width. Since Nov 19 (9:29 PM) tablets get the same split from
   700 px (portrait 768/923, landscape 1024/1280) and touch pinch-zooms the side map; phones get the entry card (phone-entry.spec). */
const widths = (page: Page) => page.evaluate(() => {
  const w = (s: string) => { const e = document.querySelector(s) as HTMLElement | null; return e && e.offsetParent !== null ? e.getBoundingClientRect().width : 0; };
  return { wrap: w('[data-testid=map-wrap]'), map: w('.cm-mapcol'), panel: w('[data-testid=map-panel]'), split: document.querySelector('[data-testid=map-wrap]')!.classList.contains('split') };
});
const zoomOf = (page: Page) => page.evaluate(() => Number((document.querySelector('[data-testid=map-wrap]') as HTMLElement).dataset.zoom ?? '1'));

const VPS: [number, number][] = [[768, 1024], [923, 1300], [1024, 700], [1280, 760], [1366, 900], [1920, 1080]];
for (const app of APPS) for (const [vw, vh] of VPS) {
  test.describe(`${app} @${vw}x${vh}: split layout`, () => {
    test.use({ viewport: { width: vw, height: vh } });

    test('no entry: the map is full width; an entry open: map ~40% left, entry ~60% right; Back/Next and deep links keep it', async ({ page }) => {
      await open(page, app);
      const idle = await widths(page);
      expect(idle.split).toBe(false); expect(idle.panel, 'no idle panel column on desktop').toBe(0);
      expect(idle.map / idle.wrap, 'map alone, full width').toBeGreaterThan(0.98);
      await page.locator('[data-testid=map-node]').nth(3).dispatchEvent('click');
      const box = await widths(page);
      expect(box.split).toBe(true);
      const ratio = box.map / (box.map + box.panel);
      expect(ratio, `map share ${ratio.toFixed(3)}`).toBeGreaterThan(0.37); expect(ratio).toBeLessThan(0.43);
      expect(box.map + box.panel, 'the two columns fill the row').toBeGreaterThan(box.wrap * 0.97);
      // the side map fits its column at 100% (nothing to pan sideways) and the open box is on screen in it
      const fit = await page.evaluate(() => { const sc = document.querySelector('.cm-scroll') as HTMLElement, sel = document.querySelector('.qm-node.n-sel')!.getBoundingClientRect(), b = sc.getBoundingClientRect(); return { over: sc.scrollWidth - sc.clientWidth, seen: sel.top >= b.top - 1 && sel.bottom <= b.bottom + 1 && sel.left >= b.left - 1 && sel.right <= b.right + 1 }; });
      expect(fit.over, 'side map fits its column').toBeLessThanOrEqual(4); expect(fit.seen, 'the open box is visible in the side map').toBe(true);
      // the chain buttons walk box → line → box and the split stays; the path is lit
      await page.getByTestId('chain-next').first().click();
      await expect(page.locator('.qm-edge.e-sel')).toHaveCount(1);
      expect((await widths(page)).split).toBe(true);
      expect(await page.locator('.qm-edge.e-path').count(), 'chain highlighting').toBeGreaterThan(0);
      await page.getByTestId('edge-next').click();
      await expect(page.locator('.qm-node.n-sel')).toHaveCount(1);
      await page.getByTestId('chain-back').first().click();
      await expect(page.locator('.qm-edge.e-sel')).toHaveCount(1);
      // close: back to the full-width map
      await page.getByTestId('panel-close').click();
      const shut = await widths(page); expect(shut.split).toBe(false); expect(shut.map / shut.wrap).toBeGreaterThan(0.98);
      // a deep link opens straight into the split
      const id = await page.evaluate(() => (window as any).__study.content.maps[0].nodes[2].id);
      await open(page, app, `#/node/${id}`);
      await expect(page.locator(`.qm-node.n-sel[data-node="${id}"]`)).toHaveCount(1);
      const deep = await widths(page); expect(deep.split).toBe(true); expect(deep.map / (deep.map + deep.panel)).toBeLessThan(0.43);
    });

    if (vw >= 1366) test('the wheel zooms the side map about the cursor; drag pans; Reset zoom restores; the page does not scroll; no zoom outside the map or with nothing open', async ({ page }) => {
      await open(page, app);
      // nothing open: the wheel over the map scrolls the page as before (no zoom)
      const sc = page.locator('.cm-scroll');
      let bb = (await sc.boundingBox())!;
      await page.mouse.move(bb.x + bb.width / 2, Math.min(bb.y + 60, 850)); await page.mouse.wheel(0, 300); await page.waitForTimeout(200);
      expect(await zoomOf(page), 'no zoom without an entry open').toBe(1);
      await page.evaluate(() => scrollTo(0, 0));
      await page.locator('[data-testid=map-node]').nth(3).dispatchEvent('click');
      await page.evaluate(() => (document.querySelector('[data-testid=map-wrap]') as HTMLElement).scrollIntoView({ block: 'start' }));
      bb = (await sc.boundingBox())!;
      const cx = bb.x + bb.width * 0.5, cy = bb.y + Math.min(bb.height, 600) * 0.4;
      // the map point under the cursor, in map (viewBox) units, before and after: zoom about the cursor keeps it put
      const under = () => page.evaluate(([x, y]) => { const s = document.querySelector('[data-testid=map-svg]') as SVGSVGElement, r = s.getBoundingClientRect(), vb = s.viewBox.baseVal; return { x: ((x - r.left) / r.width) * vb.width, y: ((y - r.top) / r.height) * vb.height }; }, [cx, cy]);
      const p0 = await under(), y0 = await page.evaluate(() => scrollY);
      await page.mouse.move(cx, cy);
      for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(80); }
      const z1 = await zoomOf(page);
      expect(z1, 'wheel up zooms in').toBeGreaterThan(1.3);
      const p1 = await under();
      expect(Math.hypot(p1.x - p0.x, p1.y - p0.y), `zoom about the cursor (${JSON.stringify(p0)} → ${JSON.stringify(p1)})`).toBeLessThan(6);
      expect(await page.evaluate(() => scrollY), 'the page did not scroll').toBe(y0);
      await expect(page.getByTestId('map-zoom-pct')).toHaveText(`${Math.round(z1 * 100)}%`);
      // drag pans the zoomed map and is not a tap
      const s0 = await sc.evaluate((e) => [e.scrollLeft, e.scrollTop]);
      await page.mouse.down(); await page.mouse.move(cx - 40, cy - 60, { steps: 5 }); await page.mouse.move(cx - 80, cy - 120, { steps: 5 }); await page.mouse.up();
      const s1 = await sc.evaluate((e) => [e.scrollLeft, e.scrollTop]);
      expect(s1[0] > s0[0] || s1[1] > s0[1], `dragged (${s0} → ${s1})`).toBe(true);
      expect(await page.locator('.qm-node.n-sel').count(), 'a drag does not change the open box').toBe(1);
      // wheel down zooms out, never below fit
      for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 240);
      await page.waitForTimeout(150);
      expect(await zoomOf(page)).toBeGreaterThanOrEqual(0.999);
      // + then Reset zoom
      await page.getByTestId('map-zoom-in').click(); expect(await zoomOf(page)).toBeGreaterThan(1.2);
      await page.getByTestId('map-zoom-reset').click(); expect(await zoomOf(page)).toBe(1);
      await expect(page.getByTestId('map-zoom-pct')).toHaveText('100%');
      // the wheel over the entry scrolls it (or the page), it does not zoom the map
      const pb = (await page.getByTestId('map-panel').boundingBox())!;
      await page.mouse.move(pb.x + pb.width / 2, pb.y + 100); await page.mouse.wheel(0, -200); await page.waitForTimeout(150);
      expect(await zoomOf(page), 'no zoom from the entry side').toBe(1);
      // closing the entry leaves the map full width at 100%
      await page.getByTestId('panel-close').click(); expect(await zoomOf(page)).toBe(1);
    });
  });
}

/** tablets: the open entry and its side map fill the screen under the top bar, nothing clipped, entry text readable */
for (const app of APPS) for (const [vw, vh] of VPS.slice(0, 4)) test(`${app} @${vw}x${vh}: tablet split fills the screen, nothing clipped, entry text readable`, async ({ page }) => {
  await page.setViewportSize({ width: vw, height: vh });
  await open(page, app);
  await page.locator('[data-testid=map-node]').nth(3).dispatchEvent('click');
  await expect(page.getByTestId('map-wrap')).toHaveClass(/split/);
  const r = await page.evaluate(() => {
    const g = (q: string) => document.querySelector(q)!.getBoundingClientRect(), m = g('.cm-mapcol'), p = g('[data-testid=map-panel]');
    const t = (document.querySelector('[data-testid=map-panel] .pop-answer p') ?? document.querySelector('[data-testid=map-panel] [data-body]')) as HTMLElement;
    return { mt: m.top, mb: m.bottom, pt: p.top, pb: p.bottom, pw: p.width, vh: innerHeight, over: document.documentElement.scrollWidth - innerWidth, font: parseFloat(getComputedStyle(t).fontSize), sb: !!document.querySelector('.sidebar:not([hidden])') && innerWidth < 1100,
      zoomOverRoot: (() => { const z = document.querySelector('[data-testid=map-zoom]')!.getBoundingClientRect(), sc = document.querySelector('.cm-scroll') as HTMLElement; return z.bottom > sc.getBoundingClientRect().top + parseFloat(getComputedStyle(sc).paddingTop) + 1; })() };
  });
  expect(r.over, 'no sideways page').toBeLessThanOrEqual(1);
  expect(r.pt, 'entry starts under the top bar').toBeLessThan(80); expect(r.mt).toBeLessThan(80);
  expect(r.pb, 'entry ends on screen').toBeLessThanOrEqual(r.vh + 1); expect(r.mb).toBeLessThanOrEqual(r.vh + 1);
  expect(Math.max(r.pb - r.pt, r.mb - r.mt) / r.vh, 'map/entry get most of the height').toBeGreaterThan(0.85);
  expect(r.pw, 'entry column wide enough to read').toBeGreaterThan(400);
  expect(r.font, 'entry text size').toBeGreaterThanOrEqual(15);
  expect(r.sb, 'below 1100 px the sidebar is an overlay, closed').toBe(false);
  expect(r.zoomOverRoot, 'the zoom bar sits above the map, not on it').toBe(false);
});

/** touch: two fingers pinch-zoom the side map about their midpoint; one finger pans it; the page does not scroll */
for (const app of APPS) test(`${app} @923x1300 touch: pinch zooms the side map, one finger pans it, Reset zoom restores`, async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'multi-touch via CDP');
  await page.setViewportSize({ width: 923, height: 1300 });
  await open(page, app);
  await page.locator('[data-testid=map-node]').nth(3).dispatchEvent('click');
  await expect(page.getByTestId('map-wrap')).toHaveClass(/split/);
  const cdp = await page.context().newCDPSession(page);
  const bb = (await page.locator('.cm-scroll').boundingBox())!, cx = bb.x + bb.width / 2, cy = bb.y + 300;
  const y0 = await page.evaluate(() => scrollY);
  const touch = (type: string, pts: [number, number][]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) } as any);
  await touch('touchStart', [[cx - 30, cy], [cx + 30, cy]]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [[cx - 30 - i * 10, cy], [cx + 30 + i * 10, cy]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(150);
  const z = await zoomOf(page);
  expect(z, 'pinch out zooms in (~×2.3)').toBeGreaterThan(1.8);
  await expect(page.getByTestId('map-zoom-pct')).toHaveText(`${Math.round(z * 100)}%`);
  expect(Math.abs((await page.evaluate(() => scrollY)) - y0), 'the page did not scroll').toBeLessThanOrEqual(1);
  // one finger pans the zoomed map (native scrolling inside the map)
  const s0 = await page.locator('.cm-scroll').evaluate((e) => [e.scrollLeft, e.scrollTop]);
  await touch('touchStart', [[cx, cy + 100]]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [[cx - i * 8, cy + 100 - i * 15]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(400);
  const s1 = await page.locator('.cm-scroll').evaluate((e) => [e.scrollLeft, e.scrollTop]);
  expect(s1[0] !== s0[0] || s1[1] !== s0[1], `one-finger pan (${s0} → ${s1})`).toBe(true);
  // pinch in, never below fit; Reset zoom
  await touch('touchStart', [[cx - 150, cy], [cx + 150, cy]]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [[cx - 150 + i * 17, cy], [cx + 150 - i * 17, cy]]);
  await touch('touchEnd', []);
  expect(await zoomOf(page)).toBeGreaterThanOrEqual(0.999);
  await page.getByTestId('map-zoom-in').click(); await page.getByTestId('map-zoom-reset').click();
  expect(await zoomOf(page)).toBe(1);
});
