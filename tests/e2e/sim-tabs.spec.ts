import { test, expect } from '@playwright/test';
import { open, noHScroll, trackErrors } from './helpers';

const TABS = [
  { id: 'overview', label: 'Overview', title: 'Overview' },
  { id: 'motor', label: 'Motor', title: 'Speed controlled motor' },
  { id: 'borer', label: 'Boring machine', title: 'Boring machine' },
  { id: 'disk', label: 'Disk head', title: 'Disk drive head' },
  { id: 'engine', label: 'Engine', title: 'Engine speed with the PID Tuner' },
] as const;

test.describe('sim-project tabbed page', () => {
  test('tabs render, have their own URLs, and Back returns to the previous tab', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'sim-project');
    await expect(page).toHaveURL(/#\/tab\/overview/);
    await expect(page.getByTestId('tab-bar')).toBeVisible();
    for (const t of TABS) await expect(page.getByTestId('tab').filter({ hasText: t.label })).toBeVisible();
    await expect(page.getByTestId('tab-page')).toContainText('What feedback means here');

    await page.getByTestId('tab').filter({ hasText: 'Motor' }).click();
    await expect(page).toHaveURL(/#\/tab\/motor/);
    await expect(page.getByTestId('tab-page')).toContainText('Speed controlled motor');
    await expect(page.getByTestId('tab-toc')).toBeVisible();

    await page.getByTestId('tab').filter({ hasText: 'Disk head' }).click();
    await expect(page).toHaveURL(/#\/tab\/disk/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/tab\/motor/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/tab\/overview/);
    expect(errs).toEqual([]);
  });

  test('every figure fence on the four problem tabs mounts a live figure', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'sim-project');
    for (const t of TABS.filter((x) => x.id !== 'overview')) {
      await page.goto(`/sim-project/index.html#/tab/${t.id}`);
      await page.waitForFunction(() => !!(window as any).__study);
      const pageTitle = page.getByTestId('tab-page').locator('h1');
      await expect(pageTitle).toContainText(t.title);
      const n = await page.getByTestId('viz').count();
      expect(n, `${t.id} figure count`).toBeGreaterThan(0);
      // each slot either mounted a figure (canvas) or must not show the missing fallback
      const missing = page.locator('[data-testid=viz]', { hasText: 'is not available' });
      await expect(missing, `${t.id} unresolved fences`).toHaveCount(0);
      expect(await page.locator('[data-testid=viz] canvas').count(), `${t.id} canvases`).toBeGreaterThan(0);
    }
    expect(errs.filter((e) => !/ResizeObserver/.test(e))).toEqual([]);
  });

  test('the menu opens Quiz (tab filter defaults to All), Glossary and Practice', async ({ page }) => {
    await open(page, 'sim-project', '#/tab/overview');
    await page.getByTestId('app-menu').evaluate((el: HTMLDetailsElement) => { el.open = true; });
    await page.getByTestId('menu-quiz').click();
    await expect(page).toHaveURL(/#\/quiz/);
    await expect(page.getByTestId('quiz')).toBeVisible();
    const filt = page.getByTestId('quiz-tab-filter');
    await expect(filt).toBeVisible();
    await expect(filt.locator('[data-tab=all]')).toHaveClass(/on/);
    const nAll = await page.getByTestId('qcard').count();
    expect(nAll).toBeGreaterThan(0);
    await filt.locator('[data-tab=overview]').click();
    // the card is one-at-a-time; the progress label names the subset size
    await expect(page.locator('.cm-sum')).toContainText(/Question 1 of /);

    await page.getByTestId('app-menu').evaluate((el: HTMLDetailsElement) => { el.open = true; });
    await page.getByTestId('menu-glossary').click();
    await expect(page).toHaveURL(/#\/glossary/);
    await expect(page.getByTestId('glossary-page')).toContainText('Blocks & loops');
    await expect(page.getByTestId('glossary-page')).toContainText('Engine & tuner');

    await page.getByTestId('app-menu').evaluate((el: HTMLDetailsElement) => { el.open = true; });
    await page.getByTestId('menu-practice').click();
    await expect(page).toHaveURL(/#\/review\/practice/);
    await expect(page.getByTestId('review-page')).toContainText('Practice problems');
  });

  test('Eq. 4.69 minus-sign callout appears on the Disk tab as written', async ({ page }) => {
    await open(page, 'sim-project', '#/tab/disk');
    const art = page.getByTestId('tab-page');
    await expect(art).toContainText('Eq. 4.69');
    await expect(art).toContainText(/minus sign|no minus/i);
  });

  for (const width of [320, 390, 1280] as const) {
    test(`no horizontal overflow at ${width}px on Overview, Motor, Quiz and Glossary`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1280 ? 900 : 800 });
      for (const hash of ['#/tab/overview', '#/tab/motor', '#/quiz', '#/glossary']) {
        await open(page, 'sim-project', hash);
        await page.waitForTimeout(200);
        expect(await noHScroll(page), hash).toBe(true);
      }
    });
  }

  test('authoring notes (FIGURES.md, new preset) never appear in the DOM', async ({ page }) => {
    for (const hash of ['#/tab/overview', '#/tab/motor', '#/tab/borer', '#/tab/disk', '#/tab/engine', '#/quiz', '#/glossary', '#/review/practice']) {
      await open(page, 'sim-project', hash);
      const body = await page.locator('#app').innerText();
      expect(body, hash).not.toMatch(/FIGURES\.md/);
      expect(body, hash).not.toMatch(/new preset/i);
    }
  });

  for (const width of [923, 1280] as const) {
    test(`back-to-back figures stack and no text column is under 200px at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const hash of ['#/tab/disk', '#/tab/engine']) {
        await open(page, 'sim-project', hash);
        await page.waitForTimeout(300);
        const info = await page.evaluate(() => {
          const figs = [...document.querySelectorAll<HTMLElement>('[data-testid=viz] .fig, [data-testid=viz] .fig-stage')];
          const narrow = figs.map((el) => ({ w: Math.round(el.getBoundingClientRect().width), t: (el.querySelector('h4')?.textContent ?? el.className).slice(0, 60) })).filter((x) => x.w > 0 && x.w < 200);
          const sideBySide = [...document.querySelectorAll<HTMLElement>('.pop-figs.n2, .pop-figs.n3, .pop-figs.n4')].some((el) => {
            const cs = getComputedStyle(el);
            return (cs.gridTemplateColumns || '').split(' ').filter((c) => c && c !== 'none').length > 1;
          });
          return { narrow, sideBySide };
        });
        expect(info.sideBySide, `${hash} still lays two figures in one row`).toBe(false);
        expect(info.narrow, `${hash} narrow columns: ${JSON.stringify(info.narrow)}`).toEqual([]);
      }
    });
  }

  test('loop figure presets are tab-local on each problem tab', async ({ page }) => {
    const want: Record<string, string[]> = {
      motor: ['motor-open', 'motor-closed'],
      borer: ['borer'],
      disk: ['disk'],
      engine: ['engine'],
    };
    const all = Object.values(want).flat();
    for (const [tab, ids] of Object.entries(want)) {
      await open(page, 'sim-project', `#/tab/${tab}`);
      const loop = page.locator('[data-testid=viz][data-figure=loop]');
      await expect(loop, `${tab} has a loop figure`).toHaveCount(1);
      const got = await loop.locator('.st-presets [data-preset]').evaluateAll((els) => els.map((e) => e.getAttribute('data-preset')));
      expect(got, `${tab} loop presets`).toEqual(ids);
      const machines = await loop.locator('select[aria-label="machine"]').evaluate((el: HTMLSelectElement) => [...el.options].map((o) => o.value));
      expect(machines, `${tab} machine select`).toEqual(ids);
      for (const other of all.filter((id) => !ids.includes(id))) {
        await expect(loop.locator(`.st-presets [data-preset="${other}"]`), `${tab} should not offer ${other}`).toHaveCount(0);
      }
    }
  });
});
