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
