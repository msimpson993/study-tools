import { test, expect } from '@playwright/test';
import { open } from './helpers';

/** Learner review, Nov 19: nothing on linear-systems makes a 390 px page scroll sideways, wide dive equations say they scroll, and the map shows near the top. */
test.describe('linear-systems at 390 px', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const noHScroll = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

  test('Live figures: long titles wrap inside their buttons, no sideways page', async ({ page }) => {
    await open(page, 'linear-systems', '#/s/figures');
    await expect(page.getByTestId('figure-list')).toBeVisible();
    expect(await noHScroll(page)).toBe(true);
    const rights = await page.locator('.fig-link').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right));
    for (const r of rights) expect(r).toBeLessThanOrEqual(390);
  });

  for (const pair of ['lap', 'zt', 'map', 'ft', 'fsamp', 'dtft', 'dft', 'fs', 'samp']) {
    test(`board pair ${pair}: equation rows wrap, no sideways page`, async ({ page }) => {
      await open(page, 'linear-systems', `#/board?pair=${pair}${pair === 'lap' ? '&preset=earbud' : ''}`);
      await page.waitForTimeout(600);
      expect(await noHScroll(page)).toBe(true);
    });
  }

  test('partial-fractions dive: its three wide equations scroll inside a box with a visible scroll cue', async ({ page }) => {
    await open(page, 'linear-systems', '#/dive/inverse');
    await page.waitForTimeout(400);
    expect(await noHScroll(page)).toBe(true);
    const n = await page.locator('.katex-display.x-scroll').count();
    expect(n).toBeGreaterThanOrEqual(3);
    await expect(page.getByTestId('scroll-cue')).toHaveCount(n);
    await expect(page.getByTestId('scroll-cue').first()).toBeVisible();
    await expect(page.getByTestId('scroll-cue').first()).toContainText('scroll');
  });

  test('phone landing: the map starts in the top 60% of the screen and the root label is whole', async ({ page }) => {
    await open(page, 'linear-systems');
    const top = (await page.getByTestId('map-svg').boundingBox())!.y;
    expect(top).toBeLessThan(844 * 0.6);
    const root = await page.locator('[data-testid=map-node][data-node=root] text').allTextContents();
    expect(root.join(' ')).not.toContain('…');
    expect(root.join(' ').replace(/\s+/g, ' ')).toContain('ANY input?');
    expect(await noHScroll(page)).toBe(true);
  });
});
