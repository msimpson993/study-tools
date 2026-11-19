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

  test('quizzes: 39 box asks + 53 dive checks + 83 course + 22 mini-exam + 46 PID questions; figure questions render their diagram', async ({ page }) => {
    await open(page, 'control-systems');
    const q = await page.evaluate(() => (window as any).__study.content.quiz);
    expect(q.length).toBe(261);
    expect(q.filter((x: any) => /^q-/.test(x.id)).length).toBe(39);
    expect(q.filter((x: any) => x.id.startsWith('ck-')).length).toBe(53);
    expect(q.filter((x: any) => x.id.startsWith('cs-')).length).toBe(83);
    expect(q.filter((x: any) => x.id.startsWith('mini-')).length).toBe(22);
    expect(q.filter((x: any) => x.id.startsWith('pid-')).length).toBe(46);
    expect(q.filter((x: any) => x.q.includes('<svg')).length).toBe(10);
    await page.goto('/control-systems/index.html#/quiz?tags=blocks&title=Block%20diagrams'); await page.reload();
    // the box ask and dive checks lead (map order); step on until the first block-diagram question
    for (let i = 0; i < 12 && !(await page.locator('[data-testid=qcard] svg.diagram').count()); i++) {
      const card = page.getByTestId('qcard');
      if (await card.locator('button[data-choice]').count()) { await card.locator('button[data-choice]').first().click(); await page.getByTestId('next').click(); }
      else { await page.getByTestId('flip').click(); await page.getByTestId('missed-it').click(); }
    }
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

test.describe('control-systems: PID folded in (the PID Lab on the dish, the failure cards, no pid-tuning page)', () => {
  test('the PID Lab opens on the antenna dish with Kp 1000 and D on measurement, and switching plant resets the gains', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'control-systems', '#/figure/lab');
    const v = await page.evaluate(() => (window as any).__study.content.figures.find((f: any) => f.id === 'lab').controls.map((c: any) => [c.id, c.default]));
    const d = Object.fromEntries(v);
    expect(d.plant).toBe('dish'); expect(d.Kp).toBe(1000); expect(d.Ki).toBe(0); expect(d.Kd).toBe(0); expect(d.dm).toBe(true);
    await expect(page.getByTestId('fig-stage')).toBeVisible();
    expect(errs).toEqual([]);
  });
  test('the failures dive embeds all 14 cards, each drawing a figure', async ({ page }) => {
    const errs = trackErrors(page);
    await open(page, 'control-systems', '#/dive/failures');
    await expect(page.locator('[data-testid=dive] [data-figure^="fail-"]')).toHaveCount(14);
    expect(errs).toEqual([]);
  });
  test('the hub lists control-systems and no pid-tuning page; /pid-tuning/ is gone', async ({ page, request }) => {
    await page.goto('/index.html');
    await expect(page.locator('a[href*="control-systems"]').first()).toBeVisible();
    expect(await page.locator('a[href*="pid-tuning"]').count()).toBe(0);
    const r = await request.get('/pid-tuning/index.html');
    expect(r.status()).toBe(404);
  });
  test('phone landing: the map starts in the top 60% and the root label is whole (hyphen break, no ellipsis)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'control-systems');
    expect((await page.getByTestId('map-svg').boundingBox())!.y).toBeLessThan(844 * 0.6);
    const root = (await page.locator('[data-testid=map-node][data-node=root] text').allTextContents()).join(' ');
    expect(root).not.toContain('…');
    // every line of the root label sits inside its box (a long word is hyphen-broken, never run past the edge)
    const fits = await page.locator('[data-testid=map-node][data-node=root]').evaluate((g) => { const r = (g.querySelector('rect') as SVGGraphicsElement).getBoundingClientRect(); return [...g.querySelectorAll('text')].every((t) => { const b = t.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1; }); });
    expect(fits).toBe(true);
    expect(root.replace(/\s+/g, ' ')).toContain('before we build it?');
    // the map legend wraps on a phone instead of running off the right edge (both apps share it)
    for (const app of ['control-systems', 'linear-systems']) {
      if (app !== 'control-systems') await open(page, app);
      const right = await page.locator('[data-testid=map-legend] *').evaluateAll((els) => Math.max(...els.map((e) => e.getBoundingClientRect().right)));
      expect(right, `${app} legend`).toBeLessThanOrEqual(390);
      expect(await page.getByTestId('map-legend').evaluate((e) => e.scrollWidth <= e.clientWidth + 1), `${app} legend scroll`).toBe(true);
    }
    await open(page, 'control-systems');
    expect(await noHScroll(page)).toBe(true);
  });
  test('the dish, corner and house dives render at 390 px with no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of ['overview', 'model', 'second', 'ctrl', 'tuning', 'lab', 'sf']) {
      await open(page, 'control-systems', `#/dive/${id}`);
      await expect(page.getByTestId('dive')).toBeVisible();
      expect(await noHScroll(page), id).toBe(true);
    }
  });
});

