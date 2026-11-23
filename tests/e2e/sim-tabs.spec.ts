import { test, expect } from '@playwright/test';
import { open, noHScroll, trackErrors } from './helpers';

const TABS = [
  { id: 'overview', label: 'Overview', title: 'Overview' },
  { id: 'engine', label: 'Engine', title: 'Engine speed with the PID Tuner' },
  { id: 'motor', label: 'Motor', title: 'Speed controlled motor' },
  { id: 'borer', label: 'Boring machine', title: 'Boring machine' },
  { id: 'disk', label: 'Disk head', title: 'Disk drive head' },
] as const;

test.describe('sim-project tabbed page', () => {
  test('tabs render, have their own URLs, and Back returns to the previous tab', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'sim-project');
    await expect(page).toHaveURL(/#\/tab\/overview/);
    await expect(page.getByTestId('tab-bar')).toBeVisible();
    await expect.poll(async () => page.getByTestId('tab').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.tab))).toEqual(TABS.map((t) => t.id));
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
      expect(got, `${tab} loop presets`).toEqual(ids.length > 1 ? ids : []);
      if (ids.length > 1) {
        const machines = await loop.locator('select[aria-label="machine"]').evaluate((el: HTMLSelectElement) => [...el.options].map((o) => o.value));
        expect(machines, `${tab} machine select`).toEqual(ids);
      } else {
        await expect(loop.locator('select[aria-label="machine"]'), `${tab} hides a one-option machine select`).toHaveCount(0);
      }
      for (const other of all.filter((id) => !ids.includes(id))) {
        await expect(loop.locator(`.st-presets [data-preset="${other}"]`), `${tab} should not offer ${other}`).toHaveCount(0);
      }
    }
  });

  test('no select or radio group with a single option is rendered on any tab', async ({ page }) => {
    for (const t of TABS) {
      await open(page, 'sim-project', `#/tab/${t.id}`);
      const bad = await page.evaluate(() => {
        const sels = [...document.querySelectorAll('select')].filter((s) => (s as HTMLSelectElement).options.length <= 1)
          .map((s) => (s as HTMLSelectElement).getAttribute('aria-label') || s.outerHTML.slice(0, 80));
        const groups = [...document.querySelectorAll('[role=radiogroup]')].filter((g) => g.querySelectorAll('[role=radio]').length <= 1)
          .map((g) => g.getAttribute('aria-label') || (g as HTMLElement).innerText.slice(0, 80));
        return { sels, groups };
      });
      expect(bad.sels, `${t.id} single-option selects`).toEqual([]);
      expect(bad.groups, `${t.id} single-option radio groups`).toEqual([]);
    }
  });

  for (const width of [320, 390] as const) {
    test(`every tab is reachable at ${width}px and the tab bar shows a scroll control when it overflows`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, 'sim-project', '#/tab/overview');
      const wrap = page.locator('.tab-bar-wrap');
      const overflows = await wrap.evaluate((el) => el.classList.contains('overflows') || (el.querySelector('.tab-bar')!.scrollWidth > el.querySelector('.tab-bar')!.clientWidth + 1));
      if (overflows) {
        await expect(wrap).toHaveClass(/overflows/);
        await expect(page.getByTestId('tab-bar-next')).toBeVisible();
      }
      for (const t of TABS) {
        const tab = page.getByTestId('tab').filter({ hasText: t.label });
        await tab.evaluate((el) => el.scrollIntoView({ inline: 'nearest', block: 'nearest' }));
        await expect(tab, `${t.label} at ${width}px`).toBeVisible();
        await tab.click();
        await expect(page).toHaveURL(new RegExp(`#/tab/${t.id}`));
        await expect(page.getByTestId('tab-page')).toContainText(t.title);
      }
    });
  }
});

  test('scrolling each (c) step changes the sticky figure preset on Engine and Motor', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await open(page, 'sim-project', '#/tab/motor');
    const motorSteps = page.getByTestId('sticky-step');
    await expect(motorSteps).toHaveCount(6);
    const motorWant = ['open', 'closed', 'scale', 'kt2', 'sweep', 'heavy'];
    for (let i = 0; i < motorWant.length; i++) {
      await motorSteps.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await expect.poll(async () => page.getByTestId('sticky-fig').getAttribute('data-preset'), { timeout: 5000 })
        .toBe(motorWant[i]);
      await expect(page.getByTestId('sticky-readout')).toContainText(motorWant[i]);
    }

    await open(page, 'sim-project', '#/tab/engine');
    const engineSteps = page.getByTestId('sticky-step');
    await expect(engineSteps).toHaveCount(6);
    const engineWant: { figure: string; preset: string; params?: string }[] = [
      { figure: 'pi', preset: 'ponly' },
      { figure: 'engine-fit', preset: '' },
      { figure: 'tuner', preset: 'initial' },
      { figure: 'tuner', preset: 'slower' },
      { figure: 'tuner', preset: 'final' },
      { figure: 'tuner', preset: 'final', params: 'rpm' },
    ];
    for (let i = 0; i < engineWant.length; i++) {
      await engineSteps.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const want = engineWant[i];
      await expect.poll(async () => page.getByTestId('sticky-fig').getAttribute('data-figure'), { timeout: 5000 })
        .toContain(want.figure);
      await expect.poll(async () => page.getByTestId('sticky-fig').getAttribute('data-preset') ?? '', { timeout: 5000 })
        .toContain(want.preset);
      if (want.params) {
        await expect.poll(async () => page.getByTestId('sticky-fig').getAttribute('data-params') ?? '').toContain(want.params);
      }
    }
  });

  test('"Show this" switches the sticky figure to that step', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const steps = page.getByTestId('sticky-step');
    await expect(page.getByTestId('sticky-fig')).toHaveAttribute('data-preset', 'open');
    await steps.nth(3).getByTestId('sticky-show').click();
    await expect(page.getByTestId('sticky-fig')).toHaveAttribute('data-preset', 'kt2');
    await expect(steps.nth(3)).toHaveAttribute('aria-current', 'step');
    await expect(page.getByTestId('sticky-cap')).toContainText('Step 4');
    await expect(page.getByTestId('sticky-show').nth(3)).toBeEnabled();
    expect(await steps.nth(3).getByTestId('sticky-show').evaluate((el) => el.tagName)).toBe('BUTTON');
  });

  for (const width of [1280, 390] as const) {
    test(`sticky figure stays on screen while scrolling (c) at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1280 ? 900 : 800 });
      await open(page, 'sim-project', '#/tab/motor');
      const split = page.getByTestId('sticky-split');
      await expect(split).toBeVisible();
      const steps = page.getByTestId('sticky-step');
      const n = await steps.count();
      expect(n).toBeGreaterThan(1);
      for (let i = 0; i < n; i++) {
        await steps.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(150);
        const vis = await page.getByTestId('sticky-fig').evaluate((el) => {
          const r = el.getBoundingClientRect();
          return r.height > 0 && r.bottom > 8 && r.top < window.innerHeight - 8;
        });
        expect(vis, `step ${i + 1} at ${width}px`).toBe(true);
      }
    });
  }

  for (const width of [320, 390, 923, 1280] as const) {
    test(`no horizontal overflow at ${width}px on every problem tab`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 923 ? 900 : 800 });
      for (const t of TABS.filter((x) => x.id !== 'overview')) {
        await open(page, 'sim-project', `#/tab/${t.id}`);
        await page.waitForTimeout(200);
        expect(await noHScroll(page), `${t.id} at ${width}`).toBe(true);
      }
    });
  }

  test('clicking a step card activates it and shows that figure', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const steps = page.getByTestId('sticky-step');
    await expect(page.getByTestId('sticky-fig')).toHaveAttribute('data-preset', 'open');
    await steps.nth(3).click({ position: { x: 24, y: 40 } });
    await expect(page.getByTestId('sticky-fig')).toHaveAttribute('data-preset', 'kt2');
    await expect(steps.nth(3)).toHaveAttribute('aria-current', 'step');
    await expect(page.getByTestId('sticky-cap')).toContainText('Step 4');
  });

  for (const width of [923, 1280, 1920] as const) {
    test(`at ${width}px the (c) split is about 40 % text and 60 % figure, with controls under the plots`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 1920 ? 1080 : 900 });
      await open(page, 'sim-project', '#/tab/motor');
      const split = page.getByTestId('sticky-split');
      await expect(split).toBeVisible();
      const dims = await page.evaluate(() => {
        const steps = document.querySelector('.sticky-steps')!;
        const fig = document.querySelector('[data-testid=sticky-fig]')!;
        const sr = steps.getBoundingClientRect();
        const fr = fig.getBoundingClientRect();
        const plots = fig.querySelector('.pair2, .fig-stage')!;
        const rail = fig.querySelector('.st-ctl');
        const pair = sr.width + fr.width;
        return {
          textShare: sr.width / pair,
          sideBySide: Math.abs(sr.top - fr.top) < 80 && fr.left > sr.right - 8,
          railBelow: !rail || rail.getBoundingClientRect().top >= plots.getBoundingClientRect().bottom - 8,
        };
      });
      expect(dims.textShare, `text/(text+figure) ${dims.textShare} at ${width}px`).toBeGreaterThanOrEqual(0.37);
      expect(dims.textShare).toBeLessThanOrEqual(0.43);
      expect(dims.sideBySide).toBe(true);
      expect(dims.railBelow).toBe(true);
    });
  }

  test('no Look-for text appears inside the sticky figure panel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    await expect(page.getByTestId('sticky-fig')).not.toContainText(/Look for/i);
    await expect(page.getByTestId('sticky-step').first()).toContainText(/Look for/i);
    await expect(page.getByTestId('how-to-read')).toBeVisible();
    await page.getByTestId('sticky-step').nth(1).getByTestId('sticky-show').click();
    await expect(page.getByTestId('sticky-fig')).not.toContainText(/Look for/i);
  });

  test('the phone Controls sheet opens over the text and leaves the plot visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page, 'sim-project', '#/tab/motor');
    const fig = page.getByTestId('sticky-fig');
    await expect(fig).toBeVisible();
    await page.getByTestId('sticky-step').nth(1).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(250);
    await page.getByTestId('sticky-controls-open').click();
    await expect(page.getByTestId('sticky-controls-sheet')).toBeVisible();
    const vis = await page.evaluate(() => {
      const figEl = document.querySelector('[data-testid=sticky-fig]')!;
      const plot = [...figEl.querySelectorAll('canvas')].find((c) => {
        const r = c.getBoundingClientRect();
        return r.height > 40 && r.width > 40;
      }) ?? figEl;
      const sheet = document.querySelector('[data-testid=sticky-controls-sheet]')!;
      const pr = plot.getBoundingClientRect();
      const sr = sheet.getBoundingClientRect();
      return {
        plotVisible: pr.height > 40 && pr.top >= 0 && pr.bottom <= window.innerHeight + 4,
        sheetBelowPlot: sr.top >= pr.bottom - 4,
      };
    });
    expect(vis.plotVisible).toBe(true);
    expect(vis.sheetBelowPlot).toBe(true);
    await page.getByTestId('sticky-controls-close').click();
    await expect(page.getByTestId('sticky-controls-sheet')).toBeHidden();
  });

  test('at 390px there is no gap above the pinned figure header', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await open(page, 'sim-project', '#/tab/motor');
    await page.getByTestId('sticky-step').nth(2).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(250);
    const gap = await page.evaluate(() => {
      const bar = document.querySelector('.tab-bar-wrap')!.getBoundingClientRect();
      const fig = document.querySelector('[data-testid=sticky-fig]')!.getBoundingClientRect();
      return fig.top - bar.bottom;
    });
    expect(gap, `gap ${gap}px`).toBeGreaterThanOrEqual(-1);
    expect(gap).toBeLessThanOrEqual(3);
  });

  test('at 1920px each side margin of the tab column is under 8 % of the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await open(page, 'sim-project', '#/tab/motor');
    const m = await page.evaluate(() => {
      const frame = document.querySelector('.frame.tabbed')!;
      const r = frame.getBoundingClientRect();
      return { left: r.left / window.innerWidth, right: (window.innerWidth - r.right) / window.innerWidth };
    });
    expect(m.left, `left margin ${m.left}`).toBeLessThan(0.08);
    expect(m.right, `right margin ${m.right}`).toBeLessThan(0.08);
    expect(m.left).toBeGreaterThan(0);
  });

  test('an 844×390 landscape phone uses a 40/60 side-by-side split', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await open(page, 'sim-project', '#/tab/motor');
    const dims = await page.evaluate(() => {
      const split = document.querySelector('[data-testid=sticky-split]')!;
      const steps = document.querySelector('.sticky-steps')!;
      const fig = document.querySelector('[data-testid=sticky-fig]')!;
      const sw = split.getBoundingClientRect().width;
      const sr = steps.getBoundingClientRect();
      const fr = fig.getBoundingClientRect();
      const rail = fig.querySelector('.st-ctl');
      const plots = fig.querySelector('.pair2, .fig-stage');
      const plot = [...fig.querySelectorAll('canvas')].find((c) => {
        const r = c.getBoundingClientRect();
        return (c.getAttribute('data-fig') === 'plot' || r.height > 40) && r.width > 40;
      });
      return {
        textShare: sr.width / (sr.width + fr.width),
        sideBySide: fr.left > sr.right - 12 && Math.abs(sr.top - fr.top) < 120,
        stacked: fr.top > sr.bottom - 8,
        railBelow: !rail || !plots || rail.getBoundingClientRect().top >= plots.getBoundingClientRect().bottom - 8,
        plotFrac: plot ? plot.getBoundingClientRect().width / fr.width : 0,
      };
    });
    expect(dims.stacked, 'must not stack top/bottom').toBe(false);
    expect(dims.sideBySide).toBe(true);
    expect(dims.textShare, `text/(text+figure) ${dims.textShare}`).toBeGreaterThanOrEqual(0.37);
    expect(dims.textShare).toBeLessThanOrEqual(0.43);
    expect(dims.railBelow).toBe(true);
    expect(dims.plotFrac, `plot/panel ${dims.plotFrac}`).toBeGreaterThanOrEqual(0.85);
  });
