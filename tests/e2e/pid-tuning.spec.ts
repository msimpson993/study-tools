import { test, expect } from '@playwright/test';
import { open, trackErrors, noHScroll } from './helpers';

const SECTIONS = ['overview', 'problem', 'feedback', 'pid', 'gains', 'tuning', 'methods', 'project', 'report', 'appendix'];

test.describe('pid-tuning: the migrated interactive guide', () => {
  test('every guide section opens on the board without console errors', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'pid-tuning', '#/board?pair=overview');
    for (const id of SECTIONS) {
      await page.goto(`/pid-tuning/index.html#/board?pair=${id}`);
      await expect(page.locator(`.legacy-board section#${id}`)).toBeVisible();
      expect(await page.locator('.legacy-board section[data-stage]:visible').count(), id).toBe(1);
    }
    expect(errs).toEqual([]);
  });

  test('PID Lab: presets and toggles change the response and the status line', async ({ page }) => {
    await open(page, 'pid-tuning', '#/board?pair=lab');
    await expect(page.locator('.legacy-board section#tuning')).toBeVisible();
    const plot = page.locator('#plot-lab');
    await page.locator('#presets button[data-p="P"]').click();
    const p = await plot.innerHTML();
    await page.locator('#presets button[data-p="PID"]').click();
    await expect.poll(async () => await plot.innerHTML()).not.toBe(p);
    const st = await page.locator('#lab-status').innerText();
    await page.locator('#lab input[type=checkbox]').nth(1).check();
    await expect.poll(async () => await plot.innerHTML()).not.toBe(p);
    expect(st.length).toBeGreaterThan(5);
  });

  test('failure cards deep-link open (pair=ap-slow shows the appendix with A1 expanded)', async ({ page }) => {
    await open(page, 'pid-tuning', '#/board?pair=ap-slow');
    await expect(page.locator('.legacy-board section#appendix')).toBeVisible();
    await expect(page.locator('details#ap-slow')).toHaveAttribute('open', '');
    await expect(page.locator('#fg-ap-slow svg').first()).toBeVisible();
  });

  test('quiz: 46 questions tagged to map nodes; troubleshooting questions carry their scope plot', async ({ page }) => {
    await open(page, 'pid-tuning');
    const q = await page.evaluate(() => (window as any).__study.content.quiz);
    expect(q.length).toBe(46);
    expect(q.filter((x: any) => x.q.includes('svg class="scope"')).length).toBe(9);
    expect(q.filter((x: any) => x.q.includes('svg class="diagram"')).length).toBe(1);
    await page.goto('/pid-tuning/index.html#/quiz?tags=ap-slow&title=Slow'); await page.reload();
    await expect(page.locator('[data-testid=qcard] svg.scope').first()).toBeVisible();
  });

  test('cross-links: control-systems map links to pid-tuning and back', async ({ page }) => {
    await open(page, 'control-systems');
    await page.locator('[data-testid=map-node][data-node="pid-tuning"]').dispatchEvent('click');
    await expect(page.getByTestId('map-panel').locator('a[href="../pid-tuning/index.html"]')).toBeVisible();
    await open(page, 'pid-tuning');
    await page.locator('[data-testid=map-node][data-node="root"]').dispatchEvent('click');
    await expect(page.getByTestId('map-panel').locator('a[href="../control-systems/index.html"]')).toBeVisible();
  });

  test('390px phone: no horizontal scroll on the guide', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    for (const id of ['overview', 'gains', 'tuning', 'appendix']) {
      await open(page, 'pid-tuning', `#/board?pair=${id}`);
      expect(await noHScroll(page), id).toBe(true);
    }
  });
});
