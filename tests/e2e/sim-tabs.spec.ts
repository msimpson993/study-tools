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
          const figs = [...document.querySelectorAll<HTMLElement>('[data-testid=viz] .fig, [data-testid=viz] .fig-stage')]
            .filter((el) => !el.closest('.step-host-bin, .step-host-parked') && el.getBoundingClientRect().height > 8);
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
      await expect.poll(async () => card.locator('canvas[data-fig]').count(), { timeout: 5000 }).toBeGreaterThan(0);
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

  test('on a 390px phone the plots sit in the top 60% and the controls sheet covers only the text', async ({ page }) => {
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
    expect(frac, `plot share ${frac} should hug content and stay at most 60%`).toBeGreaterThan(0);
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
      [...document.querySelectorAll('[data-testid=step-card]')].filter((el) => el.querySelector('canvas[data-fig]')).length
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

  test('scrolling 600 px at 923 snaps the next card flush', async ({ page }) => {
    await page.setViewportSize({ width: 923, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const card1 = page.getByTestId('step-card').first();
    const card2 = page.getByTestId('step-card').nth(1);
    await card1.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(450);
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(800);
    const landed = await page.evaluate(() => {
      const pin = (() => {
        const bar = document.querySelector('.tab-bar-wrap') as HTMLElement | null;
        return bar ? bar.getBoundingClientRect().bottom : 88;
      })();
      const cards = [...document.querySelectorAll<HTMLElement>('.step-card')];
      return {
        pin,
        c2: cards[1] ? cards[1].getBoundingClientRect().top - pin : 999,
      };
    });
    expect(Math.abs(landed.c2), `card 2 top vs chrome ${landed.c2}`).toBeLessThan(24);
  });

  test('a partway wheel scroll snaps the landing card flush', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const card1 = page.getByTestId('step-card').first();
    const card2 = page.getByTestId('step-card').nth(1);
    await card1.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(450);
    const chrome = await page.evaluate(() => {
      const bar = document.querySelector('.tab-bar-wrap') as HTMLElement | null;
      return bar ? bar.getBoundingClientRect().bottom : 88;
    });
    const h = await card1.evaluate((el) => el.getBoundingClientRect().height);
    const head = card1.locator('h3');
    const box = await head.boundingBox();
    expect(box, 'card heading should be on screen to receive the wheel').toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + Math.min(8, box!.height / 2));
    await page.mouse.wheel(0, Math.round(h * 0.58));
    await page.waitForTimeout(800);
    const top = await card2.evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top - chrome), `card 2 top ${top} vs chrome ${chrome}`).toBeLessThan(24);
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


  test('on a 390px phone every panel of a step is a visible thumbnail, with no swipe dots', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const cases: { tab: 'motor' | 'engine'; step: string; min: number }[] = [
      { tab: 'motor', step: '1', min: 1 },
      { tab: 'engine', step: '1', min: 2 },
      { tab: 'engine', step: '3', min: 2 },
      { tab: 'engine', step: '4', min: 4 },
    ];
    for (const c of cases) {
      await open(page, 'sim-project', `#/tab/${c.tab}`);
      const card = page.locator(`[data-testid=step-card][data-step="${c.step}"]`);
      await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await expect.poll(async () => card.locator('[data-testid=step-thumbs] canvas').count(), { timeout: 5000 }).toBeGreaterThanOrEqual(c.min);
      await expect(card.getByTestId('pics-nav')).toBeHidden();
      await expect(card.locator('[data-testid=pics-dot]')).toHaveCount(0);
      const vis = await card.evaluate((el) => {
        const fig = el.querySelector('[data-testid=step-card-fig]')!.getBoundingClientRect();
        const tiles = [...el.querySelectorAll<HTMLElement>('.step-thumbs > .fig:not([hidden])')];
        const canvases = tiles.map((tile) => tile.querySelector('canvas')).filter((cv): cv is HTMLCanvasElement => !!cv);
        return {
          count: canvases.length,
          allInFig: canvases.every((cv) => {
            const r = cv.getBoundingClientRect();
            return r.height > 24 && r.bottom <= fig.bottom + 4 && r.top >= fig.top - 4;
          }),
          abreast: (() => {
            if (canvases.length < 2) return true;
            const rows = canvases.map((cv) => Math.round(cv.getBoundingClientRect().top));
            return new Set(rows).size < canvases.length;
          })(),
        };
      });
      expect(vis.count, `${c.tab} step ${c.step} thumb count`).toBeGreaterThanOrEqual(c.min);
      expect(vis.allInFig, `${c.tab} step ${c.step} thumbs should all sit in the figure card`).toBe(true);
      if (c.min >= 2) expect(vis.abreast, `${c.tab} step ${c.step} should keep at least two plots side by side`).toBe(true);
      const stray = await card.evaluate((el) =>
        [...el.querySelectorAll<HTMLElement>('.step-thumbs .step-host, .step-thumbs .fig-stage')].filter((n) => {
          const r = n.getBoundingClientRect();
          const cs = getComputedStyle(n);
          return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        }).length
      );
      expect(stray, `${c.tab} step ${c.step} should not show empty host shells in the tile grid`).toBe(0);
      if (c.tab === 'engine' && c.step === '3') {
        await expect(card.getByTestId('param-chip')).toBeVisible();
        await expect(card.locator('.step-thumbs > .fig:not([hidden]) canvas[data-fig=table]')).toHaveCount(0);
      }
    }
  });

  test('tapping a portrait thumbnail expands the plot, and tapping it again shrinks it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'sim-project', '#/tab/motor');
    const card = page.getByTestId('step-card').first();
    await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => card.locator('.step-thumbs canvas').count(), { timeout: 5000 }).toBeGreaterThan(0);
    await card.locator('.step-thumbs canvas').first().click();
    const overlay = card.getByTestId('fig-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('canvas[data-big]')).toBeVisible();
    await overlay.locator('canvas[data-big]').first().click();
    await expect(overlay).toBeHidden();
  });

  for (const vp of [
    { width: 1280, height: 720, label: '1280 desktop' },
    { width: 923, height: 900, label: '923 tablet' },
    { width: 390, height: 844, label: '390 phone' },
  ] as const) {
    test(`the text/figure gap matches the gap between step cards at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await open(page, 'sim-project', '#/tab/motor');
      const first = page.getByTestId('step-card').first();
      await first.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      const gaps = await page.evaluate(() => {
        const cards = [...document.querySelectorAll<HTMLElement>('[data-testid=step-card]')];
        const c1 = cards[0], c2 = cards[1];
        const text = c1.querySelector('[data-testid=step-card-text]')!.getBoundingClientRect();
        const fig = c1.querySelector('[data-testid=step-card-fig]')!.getBoundingClientRect();
        const inner = fig.left >= text.right - 2
          ? fig.left - text.right
          : (text.top >= fig.bottom - 2 ? text.top - fig.bottom : fig.top - text.bottom);
        const outer = c2.getBoundingClientRect().top - c1.getBoundingClientRect().bottom;
        const raw = getComputedStyle(c1.closest('.step-cards') as HTMLElement).getPropertyValue('--step-card-gap');
        return { inner, outer, raw };
      });
      expect(gaps.inner, `inner gap ${gaps.inner} (${gaps.raw}) at ${vp.label}`).toBeGreaterThan(4);
      expect(Math.abs(gaps.inner - gaps.outer), `inner ${gaps.inner} vs between-step ${gaps.outer} at ${vp.label}`).toBeLessThan(1.5);
    });
  }

  test('each step card mounts only the panels that step discusses', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await open(page, 'sim-project', '#/tab/motor');
    const motor = page.getByTestId('step-card').first();
    await motor.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => motor.locator('canvas[data-fig]').count()).toBeGreaterThan(0);
    expect(await motor.locator('canvas[data-fig]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fig')))).toEqual(['plot']);

    await open(page, 'sim-project', '#/tab/engine');
    const eng1 = page.getByTestId('step-card').first();
    await eng1.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => eng1.locator('canvas[data-fig]').count()).toBeGreaterThan(0);
    const eng1ids = await eng1.locator('canvas[data-fig]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fig')));
    expect(eng1ids.sort()).toEqual(['speed', 'throttle']);

    const disk4 = page.locator('[data-testid=step-card][data-step="4"]');
    await open(page, 'sim-project', '#/tab/disk');
    await disk4.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => disk4.locator('canvas[data-fig]').count()).toBeGreaterThan(0);
    const d4 = await disk4.locator('canvas[data-fig]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fig')));
    expect(d4.sort()).toEqual(['curve', 'shock']);
    expect(d4).not.toContain('scene');
    expect(d4).not.toContain('seek');
  });

  test("a card's How to read only describes the panels it draws", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const motor = page.getByTestId('step-card').first();
    await motor.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    const how = motor.getByTestId('how-to-read');
    await expect(how).toBeVisible();
    await expect(how).toContainText(/speed change ω after a 1 N·m load/i);
    await expect(how).not.toContainText(/The picture shows/i);
    await expect(how).not.toContainText(/load disc/i);
  });

  test('the expanded plot has a single title', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const card = page.getByTestId('step-card').first();
    await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => card.locator('canvas[data-fig=plot]').count()).toBeGreaterThan(0);
    await card.locator('canvas[data-fig=plot]').first().click();
    const overlay = card.getByTestId('fig-overlay');
    await expect(overlay).toBeVisible();
    const titles = overlay.locator('h4');
    await expect(titles).toHaveCount(1);
    await expect(overlay.locator('.sh')).not.toContainText(/Speed change after a 1 N·m load/i);
  });

  test('no card shows a Play button that does nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const tabs = ['engine', 'motor', 'borer', 'disk'] as const;
    for (const tab of tabs) {
      await open(page, 'sim-project', `#/tab/${tab}`);
      const cards = page.getByTestId('step-card');
      const n = await cards.count();
      for (let i = 0; i < n; i++) {
        const card = cards.nth(i);
        await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.waitForTimeout(150);
        const info = await card.evaluate((el) => ({
          step: (el as HTMLElement).dataset.step,
          hasScene: el.querySelectorAll('canvas[data-fig="scene"]').length > 0,
          play: el.querySelectorAll('[data-testid=play]').length,
          time: [...el.querySelectorAll('label, [aria-label]')].some((n) => /^(time)$/i.test((n.getAttribute('aria-label') || n.textContent || '').trim().split('\n')[0].trim()) || /\btime\b/i.test(n.getAttribute('aria-label') || '')),
        }));
        if (!info.hasScene) {
          expect(info.play, `${tab} step ${info.step} should hide Play when no picture is mounted`).toBe(0);
        }
      }
      // also the gear sheet on a phone-sized check is covered below
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'sim-project', '#/tab/motor');
    const card = page.getByTestId('step-card').first();
    await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect(card.getByTestId('play')).toHaveCount(0);
    await card.getByTestId('step-controls-open').click();
    const sheet = page.getByTestId('step-controls-sheet').first();
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId('play')).toHaveCount(0);
    await expect(sheet).not.toContainText(/^time$/i);
    // the time slider label
    const timeVisible = await sheet.evaluate((el) =>
      [...el.querySelectorAll('label, [aria-label]')].some((n) => /^(time)$/i.test((n.getAttribute('aria-label') || '').trim()) || /^time$/i.test((n.textContent || '').trim().split('\n')[0].trim()))
    );
    expect(timeVisible, 'gear sheet should hide the time slider when no picture is mounted').toBe(false);
  });

});
