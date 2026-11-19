import { test, expect, type Page } from '@playwright/test';
import { open, trackErrors } from './helpers';

/** Malcolm's chain navigation (linear-systems): Next links and buttons forward, Back buttons up the chain, edge pop-ups with why / Back / Next. */
const MAIN = ['root', 'SYS', 'SUP', 'LIN', 'NEAR', 'KICK', 'TONE', 'FOUR', 'LAP', 'PZ', 'STATE', 'MODES', 'STAB', 'INOUT', 'WORK'];
const heading = (page: Page) => page.locator('[data-testid=map-panel] .cm-head h3');
const labelOf = (page: Page, id: string) => page.evaluate((x) => (window as any).__study.content.maps[0].nodes.find((n: any) => n.id === x).label, id);

test.describe('linear-systems: walk the chain', () => {
  test('root → box 14 using only the Next-question links, then back to the root using only Back', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-node][data-node="root"]').dispatchEvent('click');
    await expect(heading(page)).toHaveText(await labelOf(page, 'root'));
    await expect(page.getByTestId('chain-back')).toHaveCount(0); // the root has no Back
    for (let i = 1; i < MAIN.length; i++) {
      const link = page.locator(`[data-testid=pop-next-link][data-to="${MAIN[i]}"]`);
      await expect(link, `${MAIN[i - 1]} links to ${MAIN[i]}`).toHaveCount(1);
      await link.click();
      await expect(heading(page)).toHaveText(await labelOf(page, MAIN[i]));
    }
    await expect(page.getByTestId('pop-next-link')).toHaveCount(0); // box 14 ends the chain
    const seen = ['WORK'];
    for (let k = 0; k < 20 && seen[seen.length - 1] !== 'root'; k++) {
      const back = page.getByTestId('chain-back').first();
      const to = (await back.getAttribute('data-to'))!;
      await back.click(); await expect(heading(page)).toHaveText(await labelOf(page, to)); seen.push(to);
    }
    expect(seen[seen.length - 1]).toBe('root');
    for (let i = 1; i < seen.length; i++) expect(MAIN.indexOf(seen[i]), seen.join(' ← ')).toBeLessThan(MAIN.indexOf(seen[i - 1])); // always up the chain
    expect(errs).toEqual([]);
  });

  test('box 9 lists both next questions; the bottom buttons name the next and previous boxes; all tappable at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-node][data-node="PZ"]').dispatchEvent('click');
    await expect(page.getByTestId('pop-next-link')).toHaveCount(2);
    const next = page.getByTestId('chain-next'), back = page.getByTestId('chain-back');
    await expect(next).toHaveCount(2); await expect(back).toHaveCount(1);
    await expect(next.first()).toContainText(await labelOf(page, 'STAB')); await expect(back.first()).toContainText(await labelOf(page, 'LAP'));
    const boxes = await page.locator('[data-testid=chain-nav] .tbtn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height })));
    for (const b of boxes) { expect(b.h).toBeGreaterThanOrEqual(44); expect(b.w).toBeGreaterThanOrEqual(44); expect(b.r).toBeLessThanOrEqual(390); }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], c = boxes[j]; expect(a.r <= c.l + 0.5 || c.r <= a.l + 0.5 || a.b <= c.t + 0.5 || c.b <= a.t + 0.5, `buttons ${i} and ${j} overlap`).toBe(true); }
    await next.nth(1).click(); await expect(heading(page)).toHaveText(await labelOf(page, 'STATE'));
  });

  test('an edge pop-up says why you ask it there, with Back and Next', async ({ page }) => {
    await open(page, 'linear-systems');
    await page.locator('[data-testid=map-edge][data-edge="LIN__NEAR"]').first().dispatchEvent('click');
    await expect(page.getByTestId('edge-why')).toContainText('2 V');
    await page.getByTestId('edge-next').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'NEAR'));
    await page.locator('[data-testid=map-edge][data-edge="LIN__NEAR"]').first().dispatchEvent('click');
    await page.getByTestId('edge-back').click(); await expect(heading(page)).toHaveText(await labelOf(page, 'LIN'));
  });
});
