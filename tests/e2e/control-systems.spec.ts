import { test, expect } from '@playwright/test';
import { open, trackErrors, noHScroll } from './helpers';

const SECTIONS = ['overview', 's1', 'splane', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13', 'cheatsec'];

test.describe('control-systems: the migrated interactive guide', () => {
  test('every guide section opens on the board without console errors and only that section is visible', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'control-systems', '#/board?pair=overview');
    for (const id of SECTIONS) {
      await page.goto(`/control-systems/index.html#/board?pair=${id}`);
      await expect(page.locator(`.legacy-board section#${id}`)).toBeVisible();
      expect(await page.locator('.legacy-board section[data-stage]:visible').count(), id).toBe(1);
    }
    expect(errs).toEqual([]);
  });

  test('legacy widgets still work: the second-order slider redraws the plot and its readouts', async ({ page }) => {
    await open(page, 'control-systems', '#/board?pair=s11');
    const before = await page.locator('#w3plot').innerHTML();
    await page.evaluate(() => { const e = document.getElementById('w3z') as HTMLInputElement; e.value = '0.2'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await expect.poll(async () => await page.locator('#w3plot').innerHTML()).not.toBe(before);
    await expect(page.locator('#w3ro')).toContainText(/%/);
  });

  test('in-guide links stay inside the app (no router hijack) and the quiz link opens the quiz', async ({ page }) => {
    await open(page, 'control-systems', '#/board?pair=overview');
    await page.locator('.legacy-board a[href="#s4"]').first().click();
    await expect(page).toHaveURL(/#\/board\?pair=s4/);
    await expect(page.locator('.legacy-board section#s4')).toBeVisible();
    await page.goto('/control-systems/index.html#/board?pair=cheatsec'); await page.reload();
    await page.locator('.legacy-board section#cheatsec a[href="#/quiz"]').first().click();
    await expect(page.getByTestId('qcard').first()).toBeVisible();
  });

  test('quizzes: 68 course + 22 mini-exam questions, tagged to map nodes; figure questions render their diagram', async ({ page }) => {
    await open(page, 'control-systems');
    const q = await page.evaluate(() => (window as any).__study.content.quiz);
    expect(q.filter((x: any) => x.id.startsWith('cs-')).length).toBe(68);
    expect(q.filter((x: any) => x.id.startsWith('mini-')).length).toBe(22);
    expect(q.filter((x: any) => x.q.includes('<svg')).length).toBe(4);
    await page.goto('/control-systems/index.html#/quiz?tags=blocks&title=Block%20diagrams'); await page.reload();
    await expect(page.locator('[data-testid=qcard] svg.diagram').first()).toBeVisible();
  });

  test('light and dark both render the guide, and 390px has no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    for (const id of ['overview', 's1', 'splane', 's11', 's13']) {
      await open(page, 'control-systems', `#/board?pair=${id}`);
      expect(await noHScroll(page), id).toBe(true);
    }
    await page.getByTestId('theme-toggle').click();
    const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.legacy-board')!).backgroundColor);
    expect(bg).not.toBe('rgb(0, 0, 0)');
    await page.getByTestId('theme-toggle').click();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.legacy-board')!).backgroundColor)).toBe('rgb(0, 0, 0)');
  });
});
