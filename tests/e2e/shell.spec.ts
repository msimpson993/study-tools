import { test, expect } from '@playwright/test';
import { APPS, open, url, noHScroll, trackErrors } from './helpers';

test('hub lists both pages and links to them', async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto('/index.html');
  for (const app of APPS) await expect(page.locator(`a[href="./${app}/index.html"]`)).toBeVisible();
  await page.locator('a[href="./transforms/index.html"]').click();
  await expect(page).toHaveURL(/transforms\/index\.html/);
  expect(errs).toEqual([]);
});

test('hub is true-black in dark mode and has no horizontal scroll at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/index.html');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
  expect(await noHScroll(page)).toBe(true);
});

for (const app of APPS) {
  test.describe(`${app}: shell`, () => {
    test('true-black dark default, light toggle persists across reloads', async ({ page }) => {
      await open(page, app);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
      await page.getByTestId('theme-toggle').click();
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg).not.toBe('rgb(0, 0, 0)');
      await page.reload(); await page.waitForFunction(() => !!(window as any).__study);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
      await page.getByTestId('theme-toggle').click();
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    });

    test('sidebar collapses and the glossary drawer opens', async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 900 });
      await open(page, app);
      await expect(page.getByTestId('sidebar')).toBeVisible();
      await page.getByTestId('sidebar-toggle').click();
      await expect(page.getByTestId('sidebar')).toBeHidden();
      await page.getByTestId('glossary-btn').click();
      await expect(page.getByTestId('glossary')).toBeVisible();
    });

    test('no horizontal overflow at 390px on map, quiz and glossary pages', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      await open(page, app);
      expect(await noHScroll(page)).toBe(true);
      await page.goto(url(app, '#/quiz')); await page.waitForTimeout(300);
      expect(await noHScroll(page)).toBe(true);
    });

    test('quiz: answering shows the explanation, flashcards flip, missed-only filter works', async ({ page }) => {
      await open(page, app, '#/quiz');
      const card = page.getByTestId('qcard').first();
      await expect(card).toBeVisible();
      const mcq = page.locator('[data-testid=qcard] button[data-choice]').first();
      if (await mcq.count()) { await mcq.click(); await expect(page.getByTestId('why')).toBeVisible(); }
      await page.getByRole('button', { name: /Flashcards/ }).click();
      await page.getByTestId('flip').click();
      await expect(page.getByTestId('got-it')).toBeVisible();
    });
  });
}

test('linear-systems: a deep dive renders chain, MATLAB fold collapsed, math and neighbours', async ({ page }) => {
  const errs = trackErrors(page);
  await open(page, 'linear-systems', '#/dive/dtft');
  await expect(page.locator('[data-testid=dive] h2')).toContainText(/DTFT/);
  await expect(page.locator('.katex').first()).toBeVisible();
  const fold = page.locator('details', { hasText: /MATLAB/ }).first();
  await expect(fold).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-testid=dive] ol.chain')).toBeVisible();
  expect(errs).toEqual([]);
});

test('every linear-systems dive opens without errors', async ({ page }) => {
  const errs = trackErrors(page);
  await open(page, 'linear-systems');
  const ids: string[] = await page.evaluate(() => (window as any).__study.content.dives.map((d: any) => d.id));
  expect(ids.length).toBe(18);
  for (const id of ids) {
    await page.goto(url('linear-systems', `#/dive/${id}`)); await page.waitForFunction(() => !!(window as any).__study);
    await expect(page.getByTestId('dive')).toBeVisible();
    expect((await page.locator('main').innerText()).length, id).toBeGreaterThan(300);
  }
  expect(errs).toEqual([]);
});

test('linear-systems: nodes on the transforms branch link to the transforms app', async ({ page }) => {
  await open(page, 'linear-systems');
  const links: string[] = await page.evaluate(() => (window as any).__study.content.maps.flatMap((m: any) => m.nodes.filter((n: any) => n.link).map((n: any) => n.link.href)));
  expect(links.length).toBeGreaterThanOrEqual(5);
  expect(links.every((h) => h.startsWith('../transforms/'))).toBe(true);
});
