import { test, expect, type Page } from '@playwright/test';
import { open, trackErrors } from './helpers';

/** Malcolm's chain navigation (linear-systems): the walk goes box → line → box; Next links/buttons open the outgoing line, Back opens the incoming line; a line's Next / Back open its boxes. */
const MAIN = ['root', 'SYS', 'SUP', 'LIN', 'NEAR', 'KICK', 'TONE', 'FOUR', 'LAP', 'PZ', 'STATE', 'MODES', 'STAB', 'INOUT', 'WORK'];
const heading = (page: Page) => page.locator('[data-testid=map-panel] .cm-head h3');
const labelOf = (page: Page, id: string) => page.evaluate((x) => (window as any).__study.content.maps[0].nodes.find((n: any) => n.id === x).label, id);

test.describe('linear-systems: walk the chain through the lines', () => {
  const edgeHead = (page: Page, a: string, b: string) => page.locator('[data-testid=chain-nav] [data-testid=edge-next][data-to="' + b + '"]');
  test('root → line → box 1 → line → … → box 14 using only Next, then back the same way using only Back', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-node][data-node="root"]').dispatchEvent('click');
    await expect(heading(page)).toHaveText(await labelOf(page, 'root'));
    await expect(page.getByTestId('chain-back')).toHaveCount(0); // the root has no Back
    const path: string[] = ['box:root'];
    for (let i = 1; i < MAIN.length; i++) {
      // box → its outgoing line (the Next-question link opens the LINE, not the next box)
      const link = page.locator(`[data-testid=pop-next-link][data-to="${MAIN[i]}"]`);
      await expect(link, `${MAIN[i - 1]} links to the line towards ${MAIN[i]}`).toHaveCount(1);
      await link.click();
      await expect(page.getByTestId('edge-why'), `line ${MAIN[i - 1]}→${MAIN[i]} says why`).toBeVisible();
      await expect(edgeHead(page, MAIN[i - 1], MAIN[i])).toHaveCount(1);
      path.push(`line:${MAIN[i - 1]}→${MAIN[i]}`);
      // line → the box it leads to
      await page.getByTestId('edge-next').click();
      await expect(heading(page)).toHaveText(await labelOf(page, MAIN[i]));
      path.push(`box:${MAIN[i]}`);
    }
    await expect(page.getByTestId('pop-next-link')).toHaveCount(0); // box 14 ends the chain
    expect(path.length).toBe(2 * MAIN.length - 1);
    // and back: box → incoming line → box above → … → root, by the main-chain Back each time
    for (let i = MAIN.length - 1; i > 0; i--) {
      const back = page.getByTestId('chain-back').first();
      await expect(back, `${MAIN[i]} Back goes along the main chain`).toHaveAttribute('data-to', MAIN[i - 1]);
      await back.click();
      await expect(page.getByTestId('edge-why')).toBeVisible();
      await expect(page.getByTestId('edge-back')).toHaveAttribute('data-to', MAIN[i - 1]);
      await page.getByTestId('edge-back').click();
      await expect(heading(page)).toHaveText(await labelOf(page, MAIN[i - 1]));
    }
    await expect(page.getByTestId('chain-back')).toHaveCount(0);
    expect(errs).toEqual([]);
  });

  test('box 9 lists both next questions, each opening its own line; buttons tappable at 390 px, no overlap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-node][data-node="PZ"]').dispatchEvent('click');
    await expect(page.getByTestId('pop-next-link')).toHaveCount(2);
    const next = page.getByTestId('chain-next'), back = page.getByTestId('chain-back');
    await expect(next).toHaveCount(2); await expect(back).toHaveCount(1);
    await expect(next.first()).toHaveAttribute('data-edge', 'PZ__STAB'); await expect(next.nth(1)).toHaveAttribute('data-edge', 'PZ__STATE');
    await expect(back.first()).toHaveAttribute('data-edge', 'LAP__PZ');
    const boxes = await page.locator('[data-testid=chain-nav] .tbtn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height })));
    for (const b of boxes) { expect(b.h).toBeGreaterThanOrEqual(44); expect(b.w).toBeGreaterThanOrEqual(44); expect(b.r).toBeLessThanOrEqual(390); }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], c = boxes[j]; expect(a.r <= c.l + 0.5 || c.r <= a.l + 0.5 || a.b <= c.t + 0.5 || c.b <= a.t + 0.5, `buttons ${i} and ${j} overlap`).toBe(true); }
    await next.nth(1).click();
    await expect(page.getByTestId('edge-why')).toContainText('Still open');
    await page.getByTestId('edge-next').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'STATE'));
  });

  test('a line pop-up teaches why you ask it (with a captioned figure where one helps) and has Back / Next', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-edge][data-edge="LIN__NEAR"]').first().dispatchEvent('click');
    const why = page.getByTestId('edge-why');
    for (const t of ['Still open', 'Why it matters', 'What we want', '2 V']) await expect(why).toContainText(t);
    await expect(page.getByTestId('edge-why-figures').locator('svg, canvas').first()).toBeVisible();
    await expect(page.getByTestId('edge-why-figcap')).toContainText('homogeneity');
    await page.getByTestId('edge-next').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'NEAR'));
    await page.locator('[data-testid=map-edge][data-edge="LIN__NEAR"]').first().dispatchEvent('click');
    await page.getByTestId('edge-back').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'LIN'));
    expect(errs).toEqual([]);
  });

  test('the dashed look-back: box 11 offers it, and its line reads from Modes back to Tones', async ({ page }) => {
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-node][data-node="MODES"]').dispatchEvent('click');
    await page.getByTestId('pop-side-link').click();
    await expect(page.getByTestId('edge-why')).toContainText('eigenvector');
    await expect(page.getByTestId('edge-back')).toHaveAttribute('data-to', 'MODES');
    await page.getByTestId('edge-next').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'TONE'));
  });
});
