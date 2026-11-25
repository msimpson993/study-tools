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
            .filter((el) => !el.closest('.step-section, .step-host-bin, .step-host-parked') && el.getBoundingClientRect().height > 8);
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



  test('each Motor (c) step is its own section with a local figure and preset', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const secs = page.getByTestId('step-section');
    await expect(secs).toHaveCount(6);
    const want = ['open', 'closed', 'scale', 'kt2', 'sweep', 'heavy'];
    for (let i = 0; i < want.length; i++) {
      const sec = secs.nth(i);
      await sec.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await expect.poll(async () => sec.locator('canvas[data-fig]').count(), { timeout: 5000 }).toBeGreaterThan(0);
      await expect(sec).toHaveAttribute('data-preset', want[i]);
      await expect(sec.getByTestId('step-ind')).toHaveText(`Step ${i + 1} of 6`);
      await expect(sec.locator('[data-testid=viz]')).toHaveAttribute('data-figure', 'motor');
    }
    await secs.nth(0).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => secs.nth(0).locator('canvas').count()).toBeGreaterThan(0);
    await secs.nth(0).locator('.st-presets [data-preset=kt2]').click();
    await expect(secs.nth(0).locator('[data-testid=viz]')).toHaveAttribute('data-preset', 'kt2');
    await secs.nth(1).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => secs.nth(1).locator('canvas').count()).toBeGreaterThan(0);
    await expect(secs.nth(1)).toHaveAttribute('data-preset', 'closed');
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
            else if (el.matches('[data-testid=step-sections]')) items.push({ kind: 'sections', id: 'sections' });
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
        const isec = ids.indexOf('sections');
        const idd = ids.findIndex((s) => s.startsWith('d-') || /try it|the idea in the room|check/.test(s));
        expect(ia, `${id} (a) at ${width}: ${ids.join(' | ')}`).toBeGreaterThanOrEqual(0);
        expect(ib, `${id} (b)`).toBeGreaterThan(ia);
        expect(ic, `${id} (c)`).toBeGreaterThan(ib);
        expect(isec, `${id} step sections`).toBeGreaterThan(ic);
        if (idd >= 0) expect(idd, `${id} (d)`).toBeGreaterThan(isec);
        const ys = await page.evaluate(() => {
          const y = (sel: string) => {
            const el = document.querySelector(sel) as HTMLElement | null;
            return el ? el.getBoundingClientRect().top + window.scrollY : -1;
          };
          return {
            a: y('h2[id^="a-"]'),
            b: y('.tab-sec-setup h2, h2[id^="b-"]'),
            c: y('h2[id^="c-"]'),
            sections: y('[data-testid=step-sections]'),
            d: y('h2[id^="d-"]'),
          };
        });
        expect(ys.a, `${id} y(a)`).toBeGreaterThanOrEqual(0);
        expect(ys.b).toBeGreaterThan(ys.a);
        expect(ys.c).toBeGreaterThan(ys.b);
        expect(ys.sections).toBeGreaterThan(ys.c);
        if (ys.d >= 0) expect(ys.d).toBeGreaterThan(ys.sections);
      }
    });
  }

  for (const width of [923, 1280] as const) {
    test(`a 100 px wheel scroll moves the page by about 100 px at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, 'sim-project', '#/tab/motor');
      const sec = page.getByTestId('step-section').first();
      await sec.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(450);
      const before = await page.evaluate(() => window.scrollY);
      await page.evaluate(() => window.scrollBy(0, 100));
      await page.waitForTimeout(280);
      const after = await page.evaluate(() => window.scrollY);
      expect(Math.abs((after - before) - 100), `moved ${after - before} at ${width}`).toBeLessThan(20);
    });
  }

  test('phone Contents links land on their own sections, not the last step', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'sim-project', '#/tab/motor');
    const last = page.getByTestId('step-section').last();
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
      const lastSec = document.querySelector('[data-testid=step-section]:last-of-type') as HTMLElement | null;
      return {
        aTop: a ? a.getBoundingClientRect().top - pin : 999,
        lastTop: lastSec ? lastSec.getBoundingClientRect().top - pin : 999,
      };
    });
    expect(Math.abs(landedA.aTop), `section (a) top vs chrome ${landedA.aTop}`).toBeLessThan(48);
    expect(Math.abs(landedA.lastTop), 'should not have landed on the last step').toBeGreaterThan(80);
    await tocLinks.filter({ hasText: /going on/i }).click();
    await page.waitForTimeout(500);
    const landedC = await page.evaluate(() => {
      const pin = (() => {
        const bar = document.querySelector('.tab-bar-wrap') as HTMLElement | null;
        return bar ? bar.getBoundingClientRect().bottom : 88;
      })();
      const c = document.querySelector('h2[id^="c-"]') as HTMLElement | null;
      const lastSec = document.querySelector('[data-testid=step-section]:last-of-type') as HTMLElement | null;
      return {
        cTop: c ? c.getBoundingClientRect().top - pin : 999,
        lastTop: lastSec ? lastSec.getBoundingClientRect().top - pin : 999,
      };
    });
    expect(Math.abs(landedC.cTop), `section (c) top vs chrome ${landedC.cTop}`).toBeLessThan(64);
    expect(Math.abs(landedC.lastTop), 'jump to (c) should not land on the last step').toBeGreaterThan(80);
  });

  test('each step mounts only the panels that step discusses', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await open(page, 'sim-project', '#/tab/motor');
    const motor = page.getByTestId('step-section').first();
    await motor.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => motor.locator('.step-figs canvas[data-fig]:visible, .step-host canvas[data-fig]').count()).toBeGreaterThan(0);
    const motorIds = await motor.locator('.step-host canvas[data-fig]').evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).offsetParent !== null || getComputedStyle(e).display !== 'none')
        .map((e) => e.getAttribute('data-fig')).filter((id) => id && id !== 'table'));
    expect(motorIds).toEqual(['plot']);

    await open(page, 'sim-project', '#/tab/engine');
    const eng1 = page.getByTestId('step-section').first();
    await eng1.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => eng1.locator('canvas[data-fig]').count()).toBeGreaterThan(0);
    const eng1ids = await eng1.locator('.step-host canvas[data-fig]').evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-fig')).filter((id) => id && id !== 'table'));
    expect(eng1ids.sort()).toEqual(['speed', 'throttle']);

    await open(page, 'sim-project', '#/tab/disk');
    const disk4 = page.locator('[data-testid=step-section][data-step="4"]');
    await disk4.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => disk4.locator('canvas[data-fig]').count()).toBeGreaterThan(0);
    const d4 = await disk4.locator('.step-host canvas[data-fig]').evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-fig')).filter((id) => id && id !== 'table'));
    expect(d4.sort()).toEqual(['curve', 'shock']);
    expect(d4).not.toContain('scene');
    expect(d4).not.toContain('seek');
  });

  test("a step's How to read only describes the panels it draws", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const motor = page.getByTestId('step-section').first();
    await motor.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    const how = motor.getByTestId('how-to-read');
    await expect(how).toBeVisible();
    await expect(how).toContainText(/speed change ω after a 1 N·m load/i);
    await expect(how).not.toContainText(/The picture shows/i);
    await expect(how).not.toContainText(/load disc/i);
  });

  test('no step shows a Play button that does nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const tabs = ['engine', 'motor', 'borer', 'disk'] as const;
    for (const tab of tabs) {
      await open(page, 'sim-project', `#/tab/${tab}`);
      const secs = page.getByTestId('step-section');
      const n = await secs.count();
      for (let i = 0; i < n; i++) {
        const sec = secs.nth(i);
        await sec.evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.waitForTimeout(150);
        const info = await sec.evaluate((el) => ({
          step: (el as HTMLElement).dataset.step,
          hasScene: el.querySelectorAll('canvas[data-fig="scene"]').length > 0,
          play: el.querySelectorAll('[data-testid=play]').length,
        }));
        if (!info.hasScene) {
          expect(info.play, `${tab} step ${info.step} should hide Play when no picture is mounted`).toBe(0);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'sim-project', '#/tab/motor');
    const sec = page.getByTestId('step-section').first();
    await sec.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect(sec.getByTestId('play')).toHaveCount(0);
    await expect(sec.getByTestId('step-controls')).toBeVisible();
    await expect(sec.getByTestId('step-controls-open')).toHaveCount(0);
  });

  test('a named lone preset stays visible when the step text names it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/disk');
    const sec = page.locator('[data-testid=step-section][data-step="4"]');
    await sec.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => sec.locator('canvas[data-fig=curve]').count()).toBeGreaterThan(0);
    const btn = sec.locator('.st-presets [data-preset=disk]');
    await expect(btn, 'Disk step 4 should show the “disk head, Ka = 80” preset the Look-for names').toBeVisible();
    await expect(btn).toHaveText(/disk head, Ka = 80/);
  });


  test("the tuner's Parameters table sits under the tuner plot, with no button", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/engine');
    const sec = page.locator('[data-testid=step-section][data-step="3"]');
    await sec.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => sec.locator('canvas[data-fig=step]').count()).toBeGreaterThan(0);
    const table = sec.locator('.fig:has(canvas[data-fig=table])');
    await expect(table, 'the full Parameters table should be visible under the tuner plot').toBeVisible();
    await expect(sec.getByTestId('param-chip')).toHaveCount(0);
    await expect(sec.getByRole('button', { name: /^Parameters$/ })).toHaveCount(0);
    const under = await sec.evaluate(() => {
      const step = document.querySelector('[data-testid=step-section][data-step="3"] canvas[data-fig=step]') as HTMLElement | null;
      const tab = document.querySelector('[data-testid=step-section][data-step="3"] .fig:has(canvas[data-fig=table])') as HTMLElement | null;
      if (!step || !tab) return { ok: false };
      const a = step.getBoundingClientRect(), b = tab.getBoundingClientRect();
      return { ok: b.top >= a.bottom - 8, stepBottom: a.bottom, tableTop: b.top };
    });
    expect(under.ok, `table should sit under the step plot (stepBottom=${under.stepBottom}, tableTop=${under.tableTop})`).toBe(true);
  });

  test('two figures on a desktop step sit abreast, and stack on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/engine');
    const eng1 = page.getByTestId('step-section').first();
    await eng1.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => eng1.locator('.step-host canvas[data-fig]').count()).toBeGreaterThan(1);
    const desk = await eng1.evaluate((el) => {
      const figs = [...el.querySelectorAll<HTMLElement>('.fig')].filter((h) => {
        const r = h.getBoundingClientRect(), cs = getComputedStyle(h);
        return r.height > 8 && r.width > 8 && cs.display !== 'none' && cs.visibility !== 'hidden';
      });
      if (figs.length < 2) return { n: figs.length, abreast: false };
      const a = figs[0].getBoundingClientRect(), b = figs[1].getBoundingClientRect();
      return { n: figs.length, abreast: Math.abs(a.top - b.top) < 48 && b.left > a.right - 8 };
    });
    expect(desk.abreast, `engine step 1 should be two abreast at 1280 (n=${desk.n})`).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await eng1.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(200);
    const phone = await eng1.evaluate((el) => {
      const figs = [...el.querySelectorAll<HTMLElement>('.fig')].filter((h) => {
        const r = h.getBoundingClientRect(), cs = getComputedStyle(h);
        return r.height > 8 && r.width > 8 && cs.display !== 'none' && cs.visibility !== 'hidden';
      });
      if (figs.length < 2) return { n: figs.length, stacked: false };
      const a = figs[0].getBoundingClientRect(), b = figs[1].getBoundingClientRect();
      return { n: figs.length, stacked: b.top >= a.bottom - 8 };
    });
    expect(phone.stacked, `engine step 1 should stack at 390 (n=${phone.n})`).toBe(true);
  });

  test('non-step figures are full-size, with no Expand button or tap-to-expand label (BUG-79)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const tab of ['engine', 'motor', 'borer', 'disk'] as const) {
      await open(page, 'sim-project', `#/tab/${tab}`);
      const setup = page.getByTestId('tab-setup');
      await expect(setup, `${tab} setup`).toBeVisible();
      await expect.poll(async () => setup.locator('canvas[data-fig=diagram]').count()).toBeGreaterThan(0);
      await expect(setup.locator('.st-xp'), `${tab} setup should have no Expand button`).toHaveCount(0);
      const aria = await setup.locator('canvas[data-fig=diagram]').first().getAttribute('aria-label');
      expect(aria, `${tab} setup aria-label`).toBeTruthy();
      expect(aria!, `${tab} setup aria-label should be the plain figure title`).not.toMatch(/tap to expand/i);
    }
    for (const tab of ['motor', 'borer', 'disk'] as const) {
      await open(page, 'sim-project', `#/tab/${tab}`);
      const host = page.locator('.tab-body .viz-embed, .tab-body .pop-figs .viz-embed').filter({ has: page.locator('canvas[data-fig=code], canvas[data-fig=diag], canvas[data-fig=frac]') }).first();
      await host.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await expect.poll(async () => host.locator('canvas').count()).toBeGreaterThan(0);
      await expect(page.locator('.tab-body .st-xp'), `${tab} handout-script figures should have no Expand button`).toHaveCount(0);
      const labels = await page.locator('.tab-body canvas[data-fig=code], .tab-body canvas[data-fig=diag], .tab-body canvas[data-fig=frac]').evaluateAll((cs) => cs.map((c) => c.getAttribute('aria-label') || ''));
      expect(labels.length, `${tab} should mount the handout-script panels`).toBeGreaterThan(0);
      for (const a of labels) expect(a, `${tab} ${a}`).not.toMatch(/tap to expand/i);
    }
  });

  test('the setup block diagram uses the full figure width, not a 300 px tile (BUG-80)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/disk');
    const setup = page.getByTestId('tab-setup');
    await expect.poll(async () => setup.locator('canvas[data-fig=diagram]').count()).toBeGreaterThan(0);
    const w = await setup.locator('canvas[data-fig=diagram]').first().evaluate((c) => (c as HTMLElement).getBoundingClientRect().width);
    expect(w, `disk setup diagram should be a full-size figure, not a ~300 px tile (got ${w})`).toBeGreaterThan(500);
  });

  test('a single-plot figure fills the frame, and two-figure plots stay at least as wide as on a phone (BUG-81)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'sim-project', '#/tab/disk');
    const disk4 = page.locator('[data-testid=step-section][data-step="4"]');
    await disk4.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => disk4.locator('.step-figs canvas[data-fig]').count()).toBeGreaterThan(0);
    const phoneW = await disk4.locator('.step-figs canvas[data-fig]').first().evaluate((c) => (c as HTMLElement).getBoundingClientRect().width);

    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, 'sim-project', '#/tab/motor');
    const motor1 = page.getByTestId('step-section').first();
    await motor1.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => motor1.locator('.step-figs canvas[data-fig]').count()).toBeGreaterThan(0);
    const single = await motor1.evaluate((el) => {
      const canvas = el.querySelector('.step-figs canvas[data-fig]') as HTMLElement | null;
      const host = el.querySelector('.step-host, .step-figs') as HTMLElement | null;
      if (!canvas || !host) return { cw: 0, hw: 0 };
      return { cw: canvas.getBoundingClientRect().width, hw: host.getBoundingClientRect().width };
    });
    expect(single.cw, `Motor 1 plot should use the frame, not half of it (plot ${single.cw} in frame ${single.hw})`).toBeGreaterThan(700);
    expect(single.cw, 'Motor 1 should not leave half the frame empty').toBeGreaterThan(single.hw * 0.7);

    await open(page, 'sim-project', '#/tab/disk');
    const disk4d = page.locator('[data-testid=step-section][data-step="4"]');
    await disk4d.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect.poll(async () => disk4d.locator('.step-figs canvas[data-fig]').count()).toBeGreaterThan(0);
    const widths = await disk4d.locator('.step-figs canvas[data-fig]').evaluateAll((cs) => cs.map((c) => (c as HTMLElement).getBoundingClientRect().width));
    for (const w of widths) {
      expect(w, `Disk 4 plot ${w}px at 1280 should be at least as wide as on a 390 phone (${phoneW}px)`).toBeGreaterThanOrEqual(phoneW - 8);
    }

    // Engine 3 and 5: two plots plus a full-width table must not leave an empty third column (BUG-87).
    for (const step of ['3', '5']) {
      await open(page, 'sim-project', '#/tab/engine');
      const sec = page.locator(`[data-testid=step-section][data-step="${step}"]`);
      await sec.evaluate((el) => el.scrollIntoView({ block: 'start' }));
      const plots = sec.locator('.step-figs canvas[data-fig="step"], .step-figs canvas[data-fig="bode"]');
      await expect.poll(async () => plots.count()).toBe(2);
      const ws = await plots.evaluateAll((cs) => cs.map((c) => (c as HTMLElement).getBoundingClientRect().width));
      for (const w of ws) {
        expect(w, `Engine ${step} plot ${w}px at 1280 should fill half the row, not sit next to an empty third column`).toBeGreaterThan(480);
      }
    }
  });
});
