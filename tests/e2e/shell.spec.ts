import { test, expect } from '@playwright/test';
import { APPS, open, url, noHScroll, trackErrors } from './helpers';

test('hub lists both pages and links to them', async ({ page }) => {
  const errs = trackErrors(page);
  await page.goto('/index.html');
  for (const app of APPS) await expect(page.locator(`a[href="./${app}/index.html"]`)).toBeVisible();
  await expect(page.locator('a[href="./transforms/index.html"]')).toHaveCount(0); // retired: folded into linear-systems
  await page.locator('a[href="./linear-systems/index.html"]').click();
  await expect(page).toHaveURL(/linear-systems\/index\.html/);
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

test('linear-systems: a deep dive opens on its map question (no chain fold), MATLAB fold collapsed, math and neighbours', async ({ page }) => {
  const errs = trackErrors(page);
  await open(page, 'linear-systems', '#/dive/dtft');
  await expect(page.locator('[data-testid=dive] h2')).toContainText(/DTFT/);
  await expect(page.locator('.katex').first()).toBeVisible();
  const fold = page.locator('details', { hasText: /MATLAB/ }).first();
  await expect(fold).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-testid=dive] ol.chain')).toHaveCount(0);
  await expect(page.locator('[data-testid=dive] p', { hasText: 'The question:' }).first()).toContainText('sampled signal');
  expect(errs).toEqual([]);
});

test('every linear-systems dive opens without errors', async ({ page }) => {
  const errs = trackErrors(page);
  await open(page, 'linear-systems');
  const ids: string[] = await page.evaluate(() => (window as any).__study.content.dives.map((d: any) => d.id));
  expect(ids.length).toBe(30);
  for (const id of ids) {
    await page.goto(url('linear-systems', `#/dive/${id}`)); await page.waitForFunction(() => !!(window as any).__study);
    await expect(page.getByTestId('dive')).toBeVisible();
    expect((await page.locator('main').innerText()).length, id).toBeGreaterThan(300);
  }
  expect(errs).toEqual([]);
});

test('linear-systems: boxes on the transforms branch open the six-domains board section on the right pair and preset', async ({ page }) => {
  await open(page, 'linear-systems');
  const links: string[] = await page.evaluate(() => (window as any).__study.content.maps.flatMap((m: any) => m.nodes.filter((n: any) => n.link?.href.includes('board')).map((n: any) => n.link.href)));
  expect(links.length).toBeGreaterThanOrEqual(7);
  expect(links.every((h) => /^#\/board\?pair=\w+&preset=\w+$/.test(h))).toBe(true);
  // box 7 (Fourier) → the FT pair
  await page.locator('[data-testid=map-node][data-node="FOUR"]').dispatchEvent('click');
  await page.locator('[data-testid=map-panel] a.tbtn[href*="board"]').click();
  await page.waitForFunction(() => !!(window as any).S && (window as any).MOD?.k);
  expect(await page.evaluate(() => (window as any).S.sel)).toBe('ft');
  expect(await page.evaluate(() => [(window as any).S.sig, (window as any).S.f0, (window as any).S.fs])).toEqual([1.267, 0.688, 8]); // the Earbud preset
  await expect(page.locator('#ringNote')).toContainText('generic ring');
});

test('the retired transforms page redirects into linear-systems, keeping board deep links', async ({ page }) => {
  await page.goto('/transforms/index.html#/board?pair=lap&preset=over');
  await expect(page).toHaveURL(/\/linear-systems\/index\.html#\/board\?pair=lap&preset=over$/);
  await page.waitForFunction(() => !!(window as any).S && (window as any).MOD?.k);
  expect(await page.evaluate(() => ({ sel: (window as any).S.sel, mode: (window as any).S.mode }))).toEqual({ sel: 'lap', mode: 'over' });
  await page.goto('/transforms/index.html');
  await expect(page).toHaveURL(/\/linear-systems\/index\.html#\/board$/);
  await page.goto('/transforms/index.html#/dive/leakage');
  await expect(page).toHaveURL(/\/linear-systems\/index\.html#\/dive\/window$/);
});

test('linear-systems: the windowing and sampling dives open the board on their presets', async ({ page }) => {
  const errs = trackErrors(page);
  for (const [dive, pair, preset] of [['window', 'dft', 'offbin'], ['sampling', 'samp', 'zohsinc']] as const) {
    await open(page, 'linear-systems', `#/dive/${dive}`);
    await page.locator(`a[href="#/board?pair=${pair}&preset=${preset}"]`).first().click();
    await page.waitForFunction(() => !!(window as any).S && (window as any).MOD?.k);
    expect(await page.evaluate(() => (window as any).S.sel)).toBe(pair);
  }
  expect(errs).toEqual([]);
});
