import { test, expect, type Page } from '@playwright/test';
import { open, trackErrors } from './helpers';

/** Linear-systems review pass 5 (Nov 19): the map's shortcut and look-back lines read as what they are. */
const node = (page: Page, id: string) => page.locator(`[data-testid=map-node][data-node="${id}"]`);
const edge = (page: Page, key: string) => page.locator(`[data-edge="${key}"]`).first();
const label = (page: Page, key: string) => page.evaluate((k) => { const e = (window as any).__study.content.maps[0].edges.find((x: any) => `${x.from}__${x.to}` === k); return e?.label; }, key);

test.describe('linear-systems pass 5: map links', () => {
  test('PZ→STAB is a dotted shortcut with its own legend entry; SYS→SUP and TONE→MODES are relabelled', async ({ page }) => {
    await open(page, 'linear-systems');
    expect(await label(page, 'PZ__STAB')).toBe('shortcut: settle?');
    expect(await label(page, 'SYS__SUP')).toBe('any trick?');
    expect(await label(page, 'TONE__MODES')).toMatch(/^look back/);
    const cls = await page.locator('.qm-edge[data-edge="PZ__STAB"]').getAttribute('class');
    expect(cls).toContain('side');
    const arr = await page.locator('.qm-edge[data-edge="PZ__STAB"] .line').evaluate((el) => getComputedStyle(el).strokeDasharray);
    const dash = await page.locator('.qm-edge.dashed .line').first().evaluate((el) => getComputedStyle(el).strokeDasharray);
    expect(arr).not.toBe('none'); expect(arr).not.toBe(dash);
    const lg = page.locator('[data-testid=map-legend] [data-legend=side]');
    await expect(lg).toContainText('shortcut');
    expect(await lg.locator('.lg-line').evaluate((el) => getComputedStyle(el).strokeDasharray)).toBe(arr);
  });

  test('arriving at STAB by the shortcut restates the shortcut question, not the Modes one', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'linear-systems');
    await node(page, 'PZ').dispatchEvent('click');
    await page.locator('[data-testid=pop-next-link][data-to="STAB"]').click();
    await expect(page.getByTestId('edge-kind')).toContainText('Shortcut');
    await page.getByTestId('edge-next').click();
    await expect(page.getByTestId('pop-question')).toHaveAttribute('data-edge', 'PZ__STAB');
    await expect(page.getByTestId('pop-question')).toContainText('Will it settle?');
    // tapping the line on the map, then its box, counts as arriving by it too
    await node(page, 'MODES').dispatchEvent('click');
    await edge(page, 'PZ__STAB').dispatchEvent('click');
    await node(page, 'STAB').dispatchEvent('click');
    await expect(page.getByTestId('pop-question')).toHaveAttribute('data-edge', 'PZ__STAB');
    // a plain tap on STAB states the main-chain question
    await node(page, 'LIN').dispatchEvent('click');
    await node(page, 'STAB').dispatchEvent('click');
    await expect(page.getByTestId('pop-question')).toHaveAttribute('data-edge', 'MODES__STAB');
    expect(errs).toEqual([]);
  });

  test('TONE→MODES is a look-back: listed from Modes only, with a Modes-side breadcrumb', async ({ page }) => {
    await open(page, 'linear-systems');
    await node(page, 'TONE').dispatchEvent('click');
    await expect(page.locator('[data-testid=pop-side-link][data-edge="TONE__MODES"]')).toHaveCount(0);
    await expect(page.locator('[data-testid=pop-next-link][data-edge="TONE__MODES"]')).toHaveCount(0);
    await node(page, 'MODES').dispatchEvent('click');
    const side = page.getByTestId('pop-side');
    await expect(side).toContainText('Look back');
    await side.locator('[data-edge="TONE__MODES"]').click();
    await expect(page.getByTestId('edge-kind')).toContainText('Look-back');
    // breadcrumb: … → MODES, then TONE (where the look-back leads)
    const chips = await page.locator('[data-testid=map-panel] [data-testid=path-chips] [data-node]').evaluateAll((els) => els.map((e) => e.getAttribute('data-node')));
    expect(chips.slice(-2)).toEqual(['MODES', 'TONE']);
    await expect(page.getByTestId('edge-back')).toHaveAttribute('data-to', 'MODES');
    await expect(page.getByTestId('edge-next')).toHaveAttribute('data-to', 'TONE');
  });
});

/** Pass 5 figure keys: every line style, colour and marker on the new pictures is named on the figure itself. */
const KEYS: Record<string, (string | RegExp)[]> = {
  ROC: ['← jω axis'], // the rotated y titles (ω (rad/ms), h(t) / x(t), scaled) are not in the text log; see the shots
  ORTHO: [/: average 0.637 → 2 × 0.637 = 1.27 V$/, /: average 0.212 → 2 × 0.212 = 0.42 V$/, /thin: square wave · dashed: 200 Hz sine · thick: their product; blue = above 0, red = below/, 'thin: 200 Hz sine · dashed: 600 Hz sine · thick: product'],
  SAMP: ['7.8 kHz → 200 Hz'],
  WIN: ['hum: 690 Hz = bin 5.52', 'inset: the 64 samples', 'yellow: the flat window', 'yellow: the Hann taper', /^bins \d+\+ are below$/, '−80 dB: off the scale'],
};
for (const vw of [1366, 390]) test(`linear-systems @${vw}: pass-5 figure keys are drawn on ROC, ORTHO, SAMP and WIN; SAMP has its 0 tick on both axes`, async ({ page }) => {
  const errs = trackErrors(page);
  await page.setViewportSize({ width: vw, height: vw > 500 ? 900 : 844 });
  await page.addInitScript(() => { (window as any).__textLog = []; });
  for (const [id, want] of Object.entries(KEYS)) {
    await open(page, 'linear-systems', `#/node/${id}`); await page.reload();
    const strip = page.locator('[data-testid=map-panel] [data-testid=pop-figures]').first();
    await strip.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
    const got: string[] = await page.evaluate(() => { const l = (window as any).__textLog as { s: string; id: string }[]; return l.filter((e) => e.id?.startsWith('pop-')).map((e) => e.s); });
    for (const w of want) expect(got.some((s) => (typeof w === 'string' ? s === w : w.test(s))), `${id}: "${w}" drawn (${[...new Set(got)].join(' | ').slice(0, 400)})`).toBe(true);
    if (id === 'SAMP') expect(got.filter((s) => s === '0').length, 'SAMP: 0 on the x axis and on the y axis').toBeGreaterThanOrEqual(2);
  }
  expect(errs).toEqual([]);
});

test.describe('linear-systems pass 5: UI', () => {
  test('DTFT → DFT → Windowing (and back) logs no canvas errors on desktop or phone', async ({ page }) => {
    const errs = trackErrors(page);
    for (const [W, H] of [[1366, 850], [923, 1300], [390, 844]] as const) {
      await page.setViewportSize({ width: W, height: H });
      await open(page, 'linear-systems');
      await page.locator('button[role=tab][data-map="full"]').first().click();
      for (const id of ['DTFT', 'DFT', 'WIN', 'DTFT']) { await node(page, id).first().dispatchEvent('click'); await page.waitForTimeout(400); }
      await page.locator('[data-testid=map-ref][data-ref=earbud]').first().dispatchEvent('click'); await page.waitForTimeout(400);
    }
    expect(errs).toEqual([]);
  });

  test('@390: the Variables drawer opens at the open box\'s own topic (State space for Modes), as on desktop', async ({ page }) => {
    for (const [W, H] of [[390, 844], [1366, 900]] as const) {
      await page.setViewportSize({ width: W, height: H });
      await open(page, 'linear-systems');
      for (const [id, sec] of [['MODES', 'State space'], ['FOUR', 'Fourier and sampling'], ['INOUT', 'Reachability and observability']] as const) {
        await node(page, id).dispatchEvent('click');
        await page.getByTestId('glossary-btn').click();
        const g = page.getByTestId('glossary');
        await expect(g).toHaveAttribute('data-topic', sec);
        const r = await g.evaluate((el, s) => { const hd = [...el.querySelectorAll<HTMLElement>('.gloss-sec')].find((e) => e.textContent === s)!; const a = hd.getBoundingClientRect(), b = el.getBoundingClientRect(); return { top: a.top - b.top, h: b.height }; }, sec);
        expect(r.top, `@${W} ${id}: the "${sec}" heading is at the top of the drawer`).toBeGreaterThanOrEqual(-2);
        expect(r.top).toBeLessThan(r.h / 3);
        await page.getByTestId('glossary-btn').click();
        await page.keyboard.press('Escape');
      }
    }
  });

  test('@390: closing the card after walking down the chain shows the box walked to', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'linear-systems');
    await node(page, 'root').dispatchEvent('click');
    for (let i = 0; i < 9; i++) { await page.locator('[data-testid=pop-next-link]').first().click(); await page.getByTestId('edge-next').click(); }
    const walked = (await page.locator('.qm-node.n-sel').getAttribute('data-node'))!;
    await page.getByTestId('panel-close').click(); await page.waitForTimeout(250);
    const r = await node(page, walked).evaluate((el) => { const a = el.getBoundingClientRect(); return a.top >= 0 && a.bottom <= innerHeight && a.left >= 0 && a.right <= innerWidth; });
    expect(r, `${walked} on screen`).toBe(true);
  });
});
