import { test, expect } from '@playwright/test';
import { open, noHScroll, trackErrors } from './helpers';

const REVIEWS = ['mini-exam-1', 'mini-exam-2'];
const MIN_KATEX: Record<string, number> = { 'mini-exam-1': 0, 'mini-exam-2': 40 };

test.describe('control-systems: the Review area (mini exams live outside the map)', () => {
  test('the map is still the landing view and no exam node is on it', async ({ page }) => {
    await open(page, 'control-systems');
    await expect(page.getByTestId('map-svg')).toBeVisible();
    await expect(page.locator('[data-testid=map-node][data-node=mini-exam]')).toHaveCount(0);
    await expect(page.locator('[data-testid=map-node][data-node=cheat]')).toHaveCount(0);
  });

  test('the Review list shows each mini exam, with a self-test count', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'control-systems', '#/review');
    await expect(page.getByTestId('review-list')).toBeVisible();
    await expect(page.getByTestId('review-card')).toHaveCount(REVIEWS.length);
    await expect(page.getByTestId('review-card').first()).toContainText(/-question self-test/);
    expect(errs).toEqual([]);
  });

  for (const id of REVIEWS) {
    for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      test(`${id} renders at ${vp.width}px: checklist, formula sheet, no horizontal scroll, math without errors`, async ({ page }) => {
        const errs = trackErrors(page);
        await page.setViewportSize(vp);
        await open(page, 'control-systems', `#/review/${id}`);
        const pg = page.getByTestId('review-page');
        await expect(pg).toBeVisible();
        await expect(pg.locator('.formula-sheet')).toHaveCount(1);
        await expect(pg.locator('table').first()).toBeVisible();
        await expect(pg.locator('.math-error, .katex-error')).toHaveCount(0);
        expect(await pg.locator('.katex').count()).toBeGreaterThanOrEqual(MIN_KATEX[id]);
        expect(await noHScroll(page)).toBe(true);
        expect(errs).toEqual([]);
      });
    }

    test(`${id}: the self-test button opens a quiz limited to that exam, and the print button sets the sheet mode`, async ({ page }) => {
      await open(page, 'control-systems', `#/review/${id}`);
      await page.getByTestId('review-quiz').click();
      await expect(page).toHaveURL(/#\/quiz\?tags=/);
      await expect(page.getByTestId('qcard').first()).toBeVisible();
      await page.goBack();
      await page.evaluate(() => { window.print = () => { (window as any).__printed = document.body.dataset.print; }; });
      await page.getByTestId('review-print').click();
      expect(await page.evaluate(() => (window as any).__printed)).toBe('sheet');
    });
  }

  test('in-page links on a review page resolve to real dives', async ({ page }) => {
    await open(page, 'control-systems', '#/review/mini-exam-1');
    const links = await page.locator('[data-testid=review-page] a[href^="#/dive/"]').evaluateAll((a) => a.map((x) => x.getAttribute('href')!));
    expect(links.length).toBeGreaterThan(5);
    await page.goto(page.url().replace(/#.*/, links[0]));
    await expect(page.getByTestId('dive')).toBeVisible();
  });
});
