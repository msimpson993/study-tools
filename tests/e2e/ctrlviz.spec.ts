import { test, expect, type Page, type Locator } from '@playwright/test';

// Core control-systems visuals (packages/core/src/ctrlviz.ts), exercised on the gallery page dist/_gallery/index.html.
const GAL = '/_gallery/index.html';
const IDS = ['poles-step', 'locus', 'bode', 'height'] as const;
const open = async (page: Page) => { await page.goto(GAL); await page.waitForFunction(() => !!(window as any).__gallery); await page.waitForTimeout(250); };
const fig = (page: Page, id: string) => page.locator(`#fig-${id}`);
const ink = (loc: Locator) => loc.evaluate((root) => { let n = 0, sig = ''; for (const c of root.querySelectorAll('canvas')) { const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 28) if (d[i] > 0) n++; sig += c.toDataURL().slice(-100); } return { n, sig }; });
const val = (page: Page, id: string, k: string) => fig(page, id).locator(`input[type=range][data-k="${k}"]`).evaluate((e: HTMLInputElement) => Number(e.value));
/** px position of s = (re, im) in an s-plane panel drawn by splaneFrame (planeFrame with pad 6, centre (reCenter, 0)). */
async function planePx(cv: Locator, range: number, reCenter: number, re: number, im: number) {
  await cv.scrollIntoViewIfNeeded();
  const r = (await cv.boundingBox())!, bw = r.width - 12, bh = r.height - 12, s = Math.min(bw, bh) / (2 * range);
  return { x: r.x + 6 + bw / 2 + (re - reCenter) * s, y: r.y + 6 + bh / 2 - im * s };
}
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8);
  await page.mouse.up();
}

test('every core control visual draws, responds to its controls and presets, has no console errors', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await open(page);
  for (const id of IDS) {
    const f = fig(page, id);
    await expect(f.locator('canvas').first()).toBeVisible();
    const a = await ink(f); expect(a.n, `${id} ink`).toBeGreaterThan(300);
    expect(await f.locator('canvas').count(), `${id} panels`).toBe(2);
    const sl = f.locator('input[type=range]').first(); const max = Number(await sl.getAttribute('max')), min = Number(await sl.getAttribute('min')), cur = Number(await sl.inputValue());
    await sl.fill(String(cur > (min + max) / 2 ? min + (max - min) * 0.25 : min + (max - min) * 0.75));
    await expect.poll(async () => (await ink(f)).sig, { message: `${id} responds` }).not.toBe(a.sig);
    const presets = f.locator('.st-presets button'); expect(await presets.count()).toBeGreaterThan(1);
    for (let i = 0; i < await presets.count(); i++) { await presets.nth(i).click(); expect((await ink(f)).n, `${id} preset ${i}`).toBeGreaterThan(300); }
  }
  expect(errs).toEqual([]);
});

test('drag a pole in the s-plane: the sliders follow, and the drag does not open the expanded view', async ({ page }) => {
  await open(page);
  const f = fig(page, 'poles-step'), cv = f.locator('canvas[data-fig=plane]');
  const wn0 = await val(page, 'poles-step', 'wn'), z0 = await val(page, 'poles-step', 'zeta');
  const from = await planePx(cv, 4, -1.2, -1, 0), to = await planePx(cv, 4, -1.2, -1, 2);
  await page.mouse.move(from.x, from.y); expect(await cv.evaluate((e) => (e as HTMLElement).style.cursor)).toBe('grab');
  await drag(page, from, to);
  const wn1 = await val(page, 'poles-step', 'wn'), z1 = await val(page, 'poles-step', 'zeta');
  expect(wn1).toBeGreaterThan(wn0 + 0.3); expect(z1).toBeLessThan(z0 - 0.3); expect(wn1).toBeCloseTo(Math.hypot(1, 2), 0); expect(z1).toBeCloseTo(1 / Math.hypot(1, 2), 1);
  await expect(f.getByTestId('fig-overlay')).toBeHidden();
  // a click on empty space still expands the plot (regression guard for click-to-expand)
  const empty = await planePx(cv, 4, -1.2, 3.5, -3); await page.mouse.click(empty.x, empty.y);
  await expect(f.getByTestId('fig-overlay')).toBeVisible();
  // dragging also works in the expanded view (separate canvas, same hook)
  const big = f.locator('canvas[data-big=plane]'); await expect(big).toBeVisible();
  await big.scrollIntoViewIfNeeded(); const r = (await big.boundingBox())!; const f2 = { x: r.x, y: r.y };
  const bw = r.width - 12, bh = r.height - 12, s = Math.min(bw, bh) / 8;
  const p = { x: f2.x + 6 + bw / 2 + (-wn1 * z1 + 1.2) * s, y: f2.y + 6 + bh / 2 - wn1 * Math.sqrt(1 - z1 * z1) * s };
  await drag(page, p, { x: p.x - 40, y: p.y }); expect(await val(page, 'poles-step', 'wn')).not.toBeCloseTo(wn1, 1);
});

test('drag along the root locus sets the gain K (and the readout agrees with the closed-loop poles)', async ({ page }) => {
  await open(page);
  const cv = fig(page, 'locus').locator('canvas[data-fig=locus]');
  const from = await planePx(cv, 3.2, -1.1, -2, 0), to = await planePx(cv, 3.2, -1.1, -2.5, 0);
  await drag(page, from, to);
  const K = await val(page, 'locus', 'K'); expect(K).toBeGreaterThan(1.6); expect(K).toBeLessThan(2.2); // |D/N| at s = −2.5 is 1.875
  // a press far from the locus does not grab: it expands the plot instead
  const far = await planePx(cv, 3.2, -1.1, 2.5, 2.5); await page.mouse.click(far.x, far.y);
  await expect(fig(page, 'locus').getByTestId('fig-overlay')).toBeVisible();
});

for (const [name, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile 390', { width: 390, height: 844 }]] as const) {
  test(`${name}: no horizontal scroll, panels have size, draggable canvases block touch scroll`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 }); const page = await ctx.newPage();
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    for (const id of IDS) for (const c of await fig(page, id).locator('canvas').all()) { const b = (await c.boundingBox())!; expect(b.width, id).toBeGreaterThan(200); expect(b.width, id).toBeLessThanOrEqual(vp.width); expect(b.height, id).toBeGreaterThan(100); }
    expect(await fig(page, 'poles-step').locator('canvas[data-fig=plane]').evaluate((e) => (e as HTMLElement).style.touchAction)).toBe('none');
    expect(await fig(page, 'poles-step').locator('canvas[data-fig=step]').evaluate((e) => (e as HTMLElement).style.touchAction)).toBe('');
    await ctx.close();
  });
}

test('light theme draws every figure too', async ({ page }) => {
  await open(page); await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; window.dispatchEvent(new Event('study-theme')); }); await page.waitForTimeout(300);
  for (const id of IDS) expect((await ink(fig(page, id))).n, id).toBeGreaterThan(300);
});

test.describe('quiz questions with a figure (fixed params, registry, fallback)', () => {
  const card = (page: Page) => page.locator('#fig-quiz [data-testid=qcard]');
  const sig = (loc: Locator) => loc.evaluate((c: HTMLCanvasElement) => { const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 28) if (d[i] > 0) n++; return { n, url: c.toDataURL().slice(-120), w: c.clientWidth, h: c.clientHeight }; });
  test('renders a labelled canvas, params change the picture, answers/feedback unchanged', async ({ page }) => {
    await open(page);
    const cv = card(page).locator('canvas[data-testid=quiz-figure]');
    await expect(cv).toHaveAttribute('role', 'img'); await expect(cv).toHaveAttribute('aria-label', /overshooting to about 1.38/);
    await expect.poll(async () => (await sig(cv)).n).toBeGreaterThan(300);
    const first = await sig(cv); expect(first.w).toBeLessThanOrEqual(440); expect(first.w / first.h).toBeCloseTo(360 / 176, 1);
    await expect(card(page).locator('.qfig-cap')).toHaveText('p2 plant, Kp = 2, Ki = 3.5');
    await card(page).locator('[data-choice="0"]').click(); await expect(page.locator('#fig-quiz [data-testid=why]')).toContainText('integral windup');
    await page.locator('#fig-quiz [data-testid=next]').click();
    const cv2 = card(page).locator('canvas[data-testid=quiz-figure]'); await expect.poll(async () => (await sig(cv2)).n).toBeGreaterThan(300);
    expect((await sig(cv2)).url, 'different fixed params → different picture').not.toBe(first.url);
  });
  test('no-figure question is untouched; unknown id shows a visible fallback with the alt text; flashcards show the figure', async ({ page }) => {
    await open(page);
    for (let i = 0; i < 2; i++) { await card(page).locator('[data-choice="0"]').click(); await page.locator('#fig-quiz [data-testid=next]').click(); }
    await expect(card(page).locator('.qtext')).toContainText('without a figure'); await expect(card(page).locator('figure')).toHaveCount(0);
    await card(page).locator('[data-choice="0"]').click(); await page.locator('#fig-quiz [data-testid=next]').click();
    await expect(card(page).locator('[data-testid=quiz-figure-missing]')).toContainText('“nope” is not available'); await expect(card(page).locator('[data-testid=quiz-figure-missing]')).toContainText('not registered');
    await card(page).locator('[data-choice="0"]').click(); await page.locator('#fig-quiz [data-testid=next]').click();
    await expect(card(page).locator('canvas[data-testid=quiz-figure]')).toBeVisible(); // the recall card
    await card(page).locator('[data-testid=flip]').click(); await expect(card(page).locator('.why')).toContainText('38 %');
    await page.locator('#fig-quiz [data-mode=flash]').click(); await expect(card(page).locator('canvas[data-testid=quiz-figure]')).toBeVisible();
  });
  test('redraws in the light theme and fits a 390 px screen', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage();
    await open(page);
    const cv = card(page).locator('canvas[data-testid=quiz-figure]'); await expect.poll(async () => (await sig(cv)).n).toBeGreaterThan(300);
    const dark = (await sig(cv)).url;
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; window.dispatchEvent(new Event('study-theme')); });
    await expect.poll(async () => (await sig(cv)).url).not.toBe(dark);
    expect((await sig(cv)).w).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await ctx.close();
  });
});
