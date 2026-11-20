import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { APPS, open, trackErrors, noHScroll } from './helpers';

/* Example bubbles (Nov 19, Option A): the running examples moved out of the map header into dashed "Example" chips on
   their host boxes (subject.yaml runningExample.refs). A chip opens a reference card: the example live (a core scene or a
   live figure) and brief specs, in the right panel from 700 px and as the floating card on phones. Chips are never part of
   the Next/Back chain, the header is one slim line, and the live canvas resizes with its column. */
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots', 'bubbles');
fs.mkdirSync(OUT, { recursive: true });
type Ref = { id: string; at: string; label: string; scene?: { id: string }; figure?: string };
const refsOf = (page: Page): Promise<Ref[]> => page.evaluate(() => (window as any).__study.content.subject.runningExample.refs);
const WANT: Record<string, string[]> = { 'linear-systems': ['earbud@SYS', 'car@STATE'], 'control-systems': ['house@MODEL', 'corner@SECOND', 'dish@PGAIN'] };
const liveBox = (page: Page) => page.evaluate(() => {
  const p = document.querySelector('[data-testid=map-panel]')!.getBoundingClientRect(), live = document.querySelector('[data-testid=ref-live]')!;
  const cs = [...live.querySelectorAll('canvas')].filter((c) => c.clientWidth > 0).map((c) => c.getBoundingClientRect());
  return { panel: [p.left, p.right], canvases: cs.map((c) => [Math.round(c.left), Math.round(c.right), Math.round(c.width), Math.round(c.height)]) };
});

for (const app of APPS) test.describe(`${app}: Example bubbles`, () => {
  test('one dashed chip per example on its host box, on every map that has the box; a legend entry; a slim header', async ({ page }) => {
    await open(page, app);
    const refs = await refsOf(page);
    expect(refs.map((r) => `${r.id}@${r.at}`)).toEqual(WANT[app]);
    const maps: { id: string; nodes: { id: string }[] }[] = await page.evaluate(() => (window as any).__study.content.maps);
    for (const m of maps) {
      await page.locator(`button[role=tab][data-map="${m.id}"]`).first().click();
      const want = refs.filter((r) => m.nodes.some((n) => n.id === r.at));
      await expect(page.getByTestId('map-ref')).toHaveCount(want.length);
      for (const r of want) {
        const chip = page.locator(`[data-testid=map-ref][data-ref="${r.id}"]`);
        await expect(chip).toContainText(r.label); await expect(chip).toContainText('EXAMPLE');
        expect(await chip.locator('.chip').evaluate((e) => getComputedStyle(e).strokeDasharray)).not.toBe('none');
        // the chip sits inside its host box
        const c = (await chip.boundingBox())!, b = (await page.locator(`[data-testid=map-node][data-node="${r.at}"]`).boundingBox())!;
        expect(c.x >= b.x - 1 && c.x + c.width <= b.x + b.width + 1 && c.y >= b.y - 6 && c.y + c.height <= b.y + b.height + 1, `${r.id} inside ${r.at}`).toBe(true);
      }
      if (want.length) await expect(page.locator('[data-testid=map-legend] [data-legend=example]')).toContainText('running example');
    }
    // the header is one slim line: no scene, no switch; the map starts near the top
    await expect(page.getByTestId('map-hero').locator('canvas')).toHaveCount(0);
    await expect(page.getByTestId('hero-switch')).toHaveCount(0);
    expect((await page.getByTestId('map-hero').boundingBox())!.height).toBeLessThan(70);
  });

  test('a chip opens its live card (not the box), outside the Next/Back chain; Close and Esc return to the map', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, app);
    for (const r of await refsOf(page)) {
      await page.locator(`[data-testid=map-ref][data-ref="${r.id}"]`).dispatchEvent('click');
      await expect(page.getByTestId('map-wrap')).toHaveClass(/split/);
      await expect(page).toHaveURL(new RegExp(`#/ref/${r.id}$`));
      await expect(page.getByTestId('ref-live').locator('canvas').first()).toBeVisible();
      await expect(page.getByTestId('ref-specs')).toBeVisible();
      await expect(page.locator('.qm-ref.r-sel')).toHaveCount(1); await expect(page.locator('.qm-node.n-sel')).toHaveCount(0);
      // no chain controls on the card, and no box lists a bubble as its Next
      await expect(page.getByTestId('map-panel').getByTestId('chain-next')).toHaveCount(0);
      await expect(page.getByTestId('map-panel').getByTestId('chain-back')).toHaveCount(0);
      await page.getByTestId('ref-host').click();
      await expect(page.locator(`.qm-node.n-sel[data-node="${r.at}"]`)).toHaveCount(1);
      expect(await page.locator('[data-testid=pop-next-link], [data-testid=chain-next]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.to))).not.toContain(r.id);
      await page.locator(`[data-testid=map-ref][data-ref="${r.id}"]`).dispatchEvent('click');
      await page.getByTestId('panel-close').click();
      await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    }
    await page.locator('[data-testid=map-ref]').first().dispatchEvent('click');
    await page.keyboard.press('Escape'); await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    // a #/ref/<id> link opens the card directly
    await open(page, app, `#/ref/${(await refsOf(page))[0].id}`);
    await expect(page.getByTestId('ref-live')).toBeVisible();
    expect(errs).toEqual([]);
  });

  for (const [W, H] of [[390, 844], [768, 1024], [923, 1300], [1024, 768], [1280, 900]] as const) test(`@${W}: every card's live canvas fits its column, no page scroll sideways; screenshot`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: W, height: H });
    await open(page, app);
    for (const r of await refsOf(page)) {
      await page.locator(`[data-testid=map-ref][data-ref="${r.id}"]`).dispatchEvent('click');
      await expect(page.getByTestId('ref-live').locator('canvas').first()).toBeVisible();
      await page.waitForTimeout(250);
      const b = await liveBox(page);
      expect(b.canvases.length, `${r.id}: a live canvas`).toBeGreaterThan(0);
      for (const [l, rr, w, h] of b.canvases) { expect(l, `${r.id} canvas left`).toBeGreaterThanOrEqual(b.panel[0] - 1); expect(rr, `${r.id} canvas right`).toBeLessThanOrEqual(b.panel[1] + 1); expect(w * h).toBeGreaterThan(0); }
      expect(await noHScroll(page), `${r.id}: no sideways page scroll`).toBe(true);
      if (W < 700) await expect(page.getByTestId('back-to-map-fixed')).toHaveCount(0); // phones close the card with ✕ or Back
      await page.screenshot({ path: path.join(OUT, `${app}-${W}-${r.id}.png`) });
      await page.getByTestId('panel-close').click();
      await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    }
    expect(errs).toEqual([]);
  });

  test('resizing with a card open (1280 → 768 → 390 → 1024) keeps the live canvas inside its column', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, app);
    const r = (await refsOf(page))[0];
    await page.locator(`[data-testid=map-ref][data-ref="${r.id}"]`).dispatchEvent('click');
    for (const [W, H] of [[768, 1024], [390, 844], [1024, 768]] as const) {
      await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(400);
      const b = await liveBox(page);
      for (const [l, rr] of b.canvases) { expect(l, `@${W} left`).toBeGreaterThanOrEqual(b.panel[0] - 1); expect(rr, `@${W} right`).toBeLessThanOrEqual(b.panel[1] + 1); }
      expect(await noHScroll(page), `@${W}`).toBe(true);
    }
    expect(errs).toEqual([]);
  });

  test('@390 phone: the card is the floating entry card; browser Back closes it and the map shows the chip', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, app);
    const r = (await refsOf(page)).at(-1)!;
    const chip = page.locator(`[data-testid=map-ref][data-ref="${r.id}"]`);
    await chip.scrollIntoViewIfNeeded();
    await chip.dispatchEvent('click');
    await expect(page.getByTestId('map-panel')).not.toHaveClass(/idle/);
    expect(await page.evaluate(() => history.state?.cmEntry ?? null)).toBe(1);
    await page.goBack();
    await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    const c = (await chip.boundingBox())!;
    expect(c.y >= 0 && c.y + c.height <= 844, 'the chip is on screen after Back').toBe(true);
  });
});
