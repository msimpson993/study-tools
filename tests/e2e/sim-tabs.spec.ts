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


  test('each Motor (c) step is its own card with a local figure and preset', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const cards = page.getByTestId('step-card');
    await expect(cards).toHaveCount(6);
    const want = ['open', 'closed', 'scale', 'kt2', 'sweep', 'heavy'];
    for (let i = 0; i < want.length; i++) {
      const card = cards.nth(i);
      await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await expect.poll(async () => card.locator('[data-testid=viz] canvas').count(), { timeout: 5000 }).toBeGreaterThan(0);
      await expect(card).toHaveAttribute('data-preset', want[i]);
      await expect(card.getByTestId('step-ind')).toHaveText(`Step ${i + 1} of 6`);
      await expect(card.locator('[data-testid=viz]')).toHaveAttribute('data-figure', 'motor');
    }
    // sliders are local to the card: changing card 1 does not change card 2's preset
    await cards.nth(0).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => cards.nth(0).locator('canvas').count()).toBeGreaterThan(0);
    await cards.nth(0).locator('.st-presets [data-preset=kt2]').click();
    await expect(cards.nth(0).locator('[data-testid=viz]')).toHaveAttribute('data-preset', 'kt2');
    await cards.nth(1).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => cards.nth(1).locator('canvas').count()).toBeGreaterThan(0);
    await expect(cards.nth(1)).toHaveAttribute('data-preset', 'closed');
  });

  for (const width of [923, 1280, 1920] as const) {
    test(`section (c) uses a 40/60 text/figure split at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
      await open(page, 'sim-project', '#/tab/motor');
      const card = page.getByTestId('step-card').first();
      await expect(card).toBeVisible();
      const dims = await card.evaluate((el) => {
        const text = el.querySelector('[data-testid=step-card-text]')!;
        const fig = el.querySelector('[data-testid=step-card-fig]')!;
        const tr = text.getBoundingClientRect();
        const fr = fig.getBoundingClientRect();
        return { textShare: tr.width / (tr.width + fr.width), tr: tr.width, fr: fr.width, sideBySide: fr.left > tr.right - 2 };
      });
      expect(dims.sideBySide, `columns should sit side by side at ${width}px`).toBe(true);
      expect(dims.textShare, `text/(text+figure) ${dims.textShare} at ${width}px`).toBeGreaterThanOrEqual(0.37);
      expect(dims.textShare).toBeLessThanOrEqual(0.43);
    });
  }

  test('the text column scrolls while the figure stays put', async ({ page }) => {
    // 720px leaves less than a full 900px column so step 2's long text has to scroll
    await page.setViewportSize({ width: 1280, height: 720 });
    await open(page, 'sim-project', '#/tab/motor');
    const card = page.getByTestId('step-card').nth(1); // long step-2 text
    await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => card.locator('canvas').count()).toBeGreaterThan(0);
    const before = await card.evaluate((el) => {
      const text = el.querySelector('[data-testid=step-card-text]') as HTMLElement;
      const fig = el.querySelector('[data-testid=step-card-fig]') as HTMLElement;
      return { figTop: fig.getBoundingClientRect().top, scrollTop: text.scrollTop, canScroll: text.scrollHeight > text.clientHeight + 8 };
    });
    expect(before.canScroll, 'step 2 text should overflow the text column').toBe(true);
    await card.getByTestId('step-card-text').evaluate((el) => { (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight; });
    const after = await card.evaluate((el) => {
      const text = el.querySelector('[data-testid=step-card-text]') as HTMLElement;
      const fig = el.querySelector('[data-testid=step-card-fig]') as HTMLElement;
      return { figTop: fig.getBoundingClientRect().top, scrollTop: text.scrollTop };
    });
    expect(Math.abs(after.figTop - before.figTop), 'figure top should stay fixed').toBeLessThan(2);
    expect(after.scrollTop).toBeGreaterThan(before.scrollTop + 20);
  });

  test('scrolling from one card hands off and snaps to the next', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const card2 = page.getByTestId('step-card').nth(1);
    await card2.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(400);
    const top = await card2.evaluate((el) => el.getBoundingClientRect().top);
    const chrome = await page.evaluate(() => {
      const bar = document.querySelector('.tab-bar-wrap') as HTMLElement | null;
      return bar ? bar.getBoundingClientRect().bottom : 88;
    });
    expect(Math.abs(top - chrome), `card 2 top ${top} vs chrome ${chrome}`).toBeLessThan(24);
  });

  test('Look-for stays in the card text, How to read is under the figure, and there is no More controls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const card = page.getByTestId('step-card').first();
    await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => card.locator('canvas').count()).toBeGreaterThan(0);
    await expect(card.getByTestId('step-card-fig')).not.toContainText(/Look for/i);
    await expect(card.getByTestId('step-card-text')).toContainText(/Look for/i);
    await expect(card.getByTestId('how-to-read')).toBeVisible();
    await expect(card.locator('[data-testid=more-controls]')).toHaveCount(0);
    // every motor control is visible, including the ones that used to sit in "More controls"
    await expect(card.getByTestId('controls')).toContainText('J (inertia');
    await expect(card.getByTestId('controls')).toContainText('b (friction');
    await expect(card.getByTestId('controls')).toContainText('Kb (back-EMF');
  });

  test('on a 390px phone the plot is about half the card and the controls sheet covers only the text', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'sim-project', '#/tab/motor');
    const card = page.getByTestId('step-card').first();
    await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => card.locator('canvas').count()).toBeGreaterThan(0);
    const frac = await card.evaluate((el) => {
      const body = el.querySelector('.step-card-body') as HTMLElement;
      const fig = el.querySelector('[data-testid=step-card-fig]') as HTMLElement;
      return fig.getBoundingClientRect().height / body.getBoundingClientRect().height;
    });
    expect(frac, `plot half ${frac}`).toBeGreaterThanOrEqual(0.4);
    expect(frac).toBeLessThanOrEqual(0.6);
    // stacked: plot above text
    const stacked = await card.evaluate((el) => {
      const text = el.querySelector('[data-testid=step-card-text]')!.getBoundingClientRect();
      const fig = el.querySelector('[data-testid=step-card-fig]')!.getBoundingClientRect();
      return fig.bottom <= text.top + 4;
    });
    expect(stacked).toBe(true);
    await page.getByTestId('step-controls-open').first().click();
    const sheet = page.getByTestId('step-controls-sheet').first();
    await expect(sheet).toBeVisible();
    const cover = await card.evaluate((el) => {
      const fig = el.querySelector('[data-testid=step-card-fig]')!.getBoundingClientRect();
      const text = el.querySelector('[data-testid=step-card-text]')!.getBoundingClientRect();
      const sheet = el.querySelector('[data-testid=step-controls-sheet]')!.getBoundingClientRect();
      return {
        plotVisible: fig.height > 40 && fig.bottom > fig.top,
        sheetOverText: sheet.top >= fig.bottom - 8 && Math.abs(sheet.top - text.top) < 24,
        sheetNotOverPlot: sheet.top >= fig.bottom - 8,
      };
    });
    expect(cover.plotVisible).toBe(true);
    expect(cover.sheetNotOverPlot).toBe(true);
    expect(cover.sheetOverText).toBe(true);
    await expect(sheet.locator('[data-testid=more-controls]')).toHaveCount(0);
    await page.getByTestId('step-controls-close').first().click();
    await expect(sheet).toBeHidden();
  });

  test('lazy-mount keeps about three live figure instances', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const live = () => page.evaluate(() =>
      [...document.querySelectorAll('[data-testid=step-card] [data-testid=viz]')].filter((el) => el.querySelector('canvas')).length
    );
    await expect.poll(live, { timeout: 5000 }).toBeGreaterThan(0);
    expect(await live()).toBeLessThanOrEqual(4);
    const last = page.getByTestId('step-card').nth(5);
    await last.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => last.locator('canvas').count(), { timeout: 5000 }).toBeGreaterThan(0);
    expect(await live()).toBeLessThanOrEqual(4);
    // the first card should have been unmounted
    await expect.poll(async () => page.getByTestId('step-card').nth(0).locator('canvas').count()).toBe(0);
  });

  for (const width of [390, 1280] as const) {
    test(`section (c) comes after (b) and before (d) on every problem tab at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      for (const id of ['engine', 'motor', 'borer', 'disk'] as const) {
        await open(page, 'sim-project', `#/tab/${id}`);
        const order = await page.evaluate(() => {
          const art = document.querySelector('.tab-article')!;
          const items: { kind: string; id: string }[] = [];
          const consider = (el: Element) => {
            if (el.matches('h2')) items.push({ kind: 'h2', id: el.id || (el.textContent || '').trim() });
            else if (el.matches('[data-testid=step-cards]')) items.push({ kind: 'cards', id: 'cards' });
            else if (el.matches('.tab-sec-setup')) {
              const h = el.querySelector('h2');
              if (h) items.push({ kind: 'h2', id: h.id || (h.textContent || '').trim() });
            } else if (el.matches('.tab-body, .tab-article')) {
              for (const c of el.children) consider(c);
            }
          };
          consider(art);
          return items;
        });
        const ids = order.map((o) => o.id.toLowerCase());
        const ia = ids.findIndex((s) => s.startsWith('a-') || /the idea/.test(s) || /what feedback/.test(s));
        const ib = ids.findIndex((s) => s.startsWith('b-') || /the setup/.test(s));
        const ic = ids.findIndex((s) => s.startsWith('c-') || /what.?s going on/.test(s));
        const icards = ids.indexOf('cards');
        const idd = ids.findIndex((s) => s.startsWith('d-') || /try it|the idea in the room|check/.test(s));
        expect(ia, `${id} (a) at ${width}: ${ids.join(' | ')}`).toBeGreaterThanOrEqual(0);
        expect(ib, `${id} (b)`).toBeGreaterThan(ia);
        expect(ic, `${id} (c)`).toBeGreaterThan(ib);
        expect(icards, `${id} cards`).toBeGreaterThan(ic);
        if (idd >= 0) expect(idd, `${id} (d)`).toBeGreaterThan(icards);
        const ys = await page.evaluate(() => {
          const y = (sel: string) => {
            const el = document.querySelector(sel) as HTMLElement | null;
            return el ? el.getBoundingClientRect().top + window.scrollY : -1;
          };
          return {
            a: y('h2[id^="a-"]'),
            b: y('.tab-sec-setup h2, h2[id^="b-"]'),
            c: y('h2[id^="c-"]'),
            cards: y('[data-testid=step-cards]'),
            d: y('h2[id^="d-"]'),
          };
        });
        expect(ys.a, `${id} y(a)`).toBeGreaterThanOrEqual(0);
        expect(ys.b).toBeGreaterThan(ys.a);
        expect(ys.c).toBeGreaterThan(ys.b);
        expect(ys.cards).toBeGreaterThan(ys.c);
        if (ys.d >= 0) expect(ys.d).toBeGreaterThan(ys.cards);
      }
    });
  }

  for (const width of [923, 1280] as const) {
    test(`a 100 px wheel scroll moves the page by about 100 px at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, 'sim-project', '#/tab/motor');
      const card = page.getByTestId('step-card').first();
      await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(450);
      const before = await page.evaluate(() => window.scrollY);
      await page.evaluate(() => window.scrollBy(0, 100));
      await page.waitForTimeout(280);
      const after = await page.evaluate(() => window.scrollY);
      expect(Math.abs((after - before) - 100), `moved ${after - before} at ${width}`).toBeLessThan(20);
    });
  }

  test('scrolling 600 px at 923 never ends parked oddly', async ({ page }) => {
    await page.setViewportSize({ width: 923, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const card = page.getByTestId('step-card').first();
    await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(450);
    const before = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const pin = (() => {
        const bar = document.querySelector('.tab-bar-wrap') as HTMLElement | null;
        return bar ? bar.getBoundingClientRect().bottom : 88;
      })();
      const band = window.innerHeight * 0.13;
      const odd = [...document.querySelectorAll<HTMLElement>('.step-card')].some((el) => {
        const d = el.getBoundingClientRect().top - pin;
        // a card stuck a little off flush, but not far enough to look like a free scroll
        return Math.abs(d) > 8 && Math.abs(d) <= band;
      });
      return { y: window.scrollY, odd };
    });
    expect(Math.abs((after.y - before) - 600), `moved ${after.y - before}`).toBeLessThan(40);
    expect(after.odd, 'a card ended parked in the settle band without being flush').toBe(false);
  });

  test('slider and preset changes survive lazy unmount and remount', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const first = page.getByTestId('step-card').nth(0);
    await first.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => first.locator('canvas').count()).toBeGreaterThan(0);
    await first.locator('.st-presets [data-preset=kt2]').click();
    await expect(first.locator('[data-testid=viz]')).toHaveAttribute('data-preset', 'kt2');
    const last = page.getByTestId('step-card').nth(5);
    await last.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => last.locator('canvas').count()).toBeGreaterThan(0);
    await expect.poll(async () => first.locator('canvas').count()).toBe(0);
    await first.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => first.locator('canvas').count()).toBeGreaterThan(0);
    await expect(first.locator('[data-testid=viz]')).toHaveAttribute('data-preset', 'kt2');
    // a preset that matches the control defaults must also be saved (Motor "both loops, 7 s axis")
    await first.locator('.st-presets [data-preset=scale]').click();
    await expect(first.locator('[data-testid=viz]')).toHaveAttribute('data-preset', 'scale');
    await last.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => last.locator('canvas').count()).toBeGreaterThan(0);
    await expect.poll(async () => first.locator('canvas').count()).toBe(0);
    await first.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => first.locator('canvas').count()).toBeGreaterThan(0);
    await expect(first.locator('[data-testid=viz]')).toHaveAttribute('data-preset', 'scale');
  });

  test('phone Contents links land on their own sections, not the last card', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'sim-project', '#/tab/motor');
    const last = page.getByTestId('step-card').last();
    await last.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    const tocLinks = page.getByTestId('tab-toc').locator('a[data-jump]');
    expect(await tocLinks.count()).toBeGreaterThan(2);
    await tocLinks.nth(0).click();
    await page.waitForTimeout(500);
    const landedA = await page.evaluate(() => {
      const pin = (() => {
        const bar = document.querySelector('.tab-bar-wrap') as HTMLElement | null;
        return bar ? bar.getBoundingClientRect().bottom : 88;
      })();
      const a = document.querySelector('h2[id^="a-"]') as HTMLElement | null;
      const lastCard = document.querySelector('[data-testid=step-card]:last-of-type') as HTMLElement | null;
      return {
        aTop: a ? a.getBoundingClientRect().top - pin : 999,
        lastTop: lastCard ? lastCard.getBoundingClientRect().top - pin : 999,
      };
    });
    expect(Math.abs(landedA.aTop), `section (a) top vs chrome ${landedA.aTop}`).toBeLessThan(48);
    expect(Math.abs(landedA.lastTop), 'should not have landed on the last card').toBeGreaterThan(80);
    await tocLinks.filter({ hasText: /going on/i }).click();
    await page.waitForTimeout(500);
    const landedC = await page.evaluate(() => {
      const pin = (() => {
        const bar = document.querySelector('.tab-bar-wrap') as HTMLElement | null;
        return bar ? bar.getBoundingClientRect().bottom : 88;
      })();
      const c = document.querySelector('h2[id^="c-"]') as HTMLElement | null;
      const lastCard = document.querySelector('[data-testid=step-card]:last-of-type') as HTMLElement | null;
      return {
        cTop: c ? c.getBoundingClientRect().top - pin : 999,
        lastTop: lastCard ? lastCard.getBoundingClientRect().top - pin : 999,
      };
    });
    expect(Math.abs(landedC.cTop), `section (c) top vs chrome ${landedC.cTop}`).toBeLessThan(64);
    expect(Math.abs(landedC.lastTop), 'jump to (c) should not land on the last card').toBeGreaterThan(80);
  });


  test('on a 390px phone Engine step 4 and Disk step 4 keep their picture dots in view', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const tab of ['engine', 'disk'] as const) {
      await open(page, 'sim-project', `#/tab/${tab}`);
      const card = page.locator('[data-testid=step-card][data-step="4"]');
      await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await expect.poll(async () => card.locator('canvas').count(), { timeout: 5000 }).toBeGreaterThan(0);
      const nav = card.getByTestId('pics-nav');
      await expect(nav, `${tab} step 4 dots`).toBeVisible();
      expect(await nav.locator('[data-testid=pics-dot]').count(), `${tab} step 4 dot count`).toBeGreaterThan(2);
      const vis = await card.evaluate((el) => {
        const fig = el.querySelector('[data-testid=step-card-fig]')!.getBoundingClientRect();
        const dots = el.querySelector('[data-testid=pics-nav]')!.getBoundingClientRect();
        const hint = el.querySelector('[data-testid=more-plots]') as HTMLElement | null;
        const hintBox = hint && !hint.hidden ? hint.getBoundingClientRect() : null;
        return {
          dotsInPanel: dots.height > 0 && dots.top >= fig.top - 2 && dots.bottom <= fig.bottom + 4,
          hintInPanel: hintBox ? hintBox.top >= fig.top - 2 && hintBox.bottom <= fig.bottom + 4 : false,
          hintShown: !!(hint && !hint.hidden),
        };
      });
      expect(vis.dotsInPanel, `${tab} step 4 dots should sit inside the figure panel`).toBe(true);
      expect(vis.hintInPanel || vis.dotsInPanel, `${tab} step 4 should show a more-plots cue or visible dots`).toBe(true);
    }
  });

});
