import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { APPS, open, trackErrors, noHScroll, exampleNodeClashes } from './helpers';

/* Example nodes (Nov 20, approved redesign): each running example is its own dashed node with an "Example" tag in a side
   column beside the box where it first appears, joined to that box by a plain dotted link (no arrowhead, no label, not
   clickable, no line pop-up). No example pill inside the topic boxes. Its pop-up is the example's introduction: the restated
   question, the animated drawing and its caption, "What it is and why we use it", the key numbers introduced so far and a
   "Back to <box>" button. A side trip: never in Next/Back; Close, Esc and browser Back return to where the reader was. */
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots', 'example-nodes');
fs.mkdirSync(OUT, { recursive: true });
type Ref = { id: string; at: string; label: string; question?: string; scene?: { id: string }; figure?: string };
const refsOf = (page: Page): Promise<Ref[]> => page.evaluate(() => (window as any).__study.content.subject.runningExample.refs);
const WANT: Record<string, string[]> = { 'linear-systems': ['earbud@SYS', 'car@STATE'], 'control-systems': ['house@MODEL', 'corner@SECOND', 'dish@PGAIN'], 'sim-project': ['motor@BLOCKS', 'borer@PRICE', 'disk@DISK', 'engine@TUNER'] };
const node = (page: Page, id: string) => page.locator(`[data-testid=map-ref][data-ref="${id}"]`);
const liveBox = (page: Page) => page.evaluate(() => {
  const p = document.querySelector('[data-testid=map-panel]')!.getBoundingClientRect(), live = document.querySelector('[data-testid=ref-live]')!;
  const cs = [...live.querySelectorAll('canvas')].filter((c) => c.clientWidth > 0).map((c) => c.getBoundingClientRect());
  return { panel: [p.left, p.right], canvases: cs.map((c) => [Math.round(c.left), Math.round(c.right), Math.round(c.width), Math.round(c.height)]) };
});
const label = (page: Page, id: string) => page.evaluate((i) => (window as any).__study.content.maps.flatMap((m: any) => m.nodes).find((n: any) => n.id === i).label, id);

for (const app of APPS) test.describe(`${app}: Example nodes`, () => {
  test('one standalone dashed node per example beside its host, a plain dotted link, no pill in any box, a legend entry', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, app);
    const refs = await refsOf(page);
    expect(refs.map((r) => `${r.id}@${r.at}`)).toEqual(WANT[app]);
    const maps: { id: string; nodes: { id: string }[]; edges: unknown[] }[] = await page.evaluate(() => (window as any).__study.content.maps);
    for (const m of maps) {
      await page.locator(`button[role=tab][data-map="${m.id}"]`).first().click();
      const want = refs.filter((r) => m.nodes.some((n) => n.id === r.at));
      await expect(page.getByTestId('map-ref')).toHaveCount(want.length);
      await expect(page.getByTestId('map-exlink')).toHaveCount(want.length);
      // the links are not lines of the chain: the chain's line count is unchanged and none of them is a tap target
      await expect(page.getByTestId('map-edge')).toHaveCount(m.edges.length);
      for (const r of want) {
        const n = node(page, r.id);
        await expect(n).toContainText(r.label.split(' ')[0]); await expect(n).toContainText('EXAMPLE');
        expect(await n.locator('.chip').evaluate((e) => getComputedStyle(e).strokeDasharray), 'dashed outline').not.toBe('none');
        // standalone: not inside its host (or any) box
        const c = (await n.boundingBox())!, b = (await page.locator(`[data-testid=map-node][data-node="${r.at}"]`).boundingBox())!;
        expect(c.x >= b.x + b.width || c.x + c.width <= b.x || c.y >= b.y + b.height || c.y + c.height <= b.y, `${r.id} outside ${r.at}`).toBe(true);
        const lk = page.locator(`[data-testid=map-exlink][data-ref="${r.id}"]`);
        const st = await lk.evaluate((e) => { const cs = getComputedStyle(e); return { dash: cs.strokeDasharray, cap: cs.strokeLinecap, pe: cs.pointerEvents, marker: cs.markerEnd, tag: e.tagName, role: e.getAttribute('role'), sib: e.parentElement!.classList.contains('qm-edge') }; });
        expect(st.dash, 'dotted').toMatch(/^0(px)?,?\s/); expect(st.cap).toBe('round');
        expect(st.pe, 'not clickable').toBe('none'); expect(st.marker, 'no arrowhead').toBe('none'); expect(st.tag).toBe('line'); expect(st.role).toBeNull(); expect(st.sib, 'not a chain line').toBe(false);
        expect(await page.locator(`[data-testid=map-label][data-label*="${r.id}"]`).count(), 'no label').toBe(0);
      }
      const clash = await exampleNodeClashes(page);
      expect(clash.clashes, `${m.id}: ${clash.clashes.join('; ')}`).toEqual([]);
      // no example pill left inside the topic boxes
      expect(await page.locator('[data-testid=map-node] .chip, [data-testid=map-node] .qm-ref, [data-testid=map-node] .tag').count()).toBe(0);
      expect(await page.locator('[data-testid=map-node]').evaluateAll((els) => els.filter((e) => /EXAMPLE/.test(e.textContent ?? '')).length)).toBe(0);
      if (want.length) await expect(page.locator('[data-testid=map-legend] [data-legend=example]')).toContainText(/running example.*dotted/);
      if (want.length) {
        // the legend swatch is drawn like the real thing: a dashed node and the same dotted link
        const sw = await page.locator('[data-testid=map-legend] [data-legend=example]').evaluate((e) => ({ link: getComputedStyle(e.querySelector('.lg-exlink')!).strokeDasharray, node: getComputedStyle(e.querySelector('.lg-ref')!).strokeDasharray }));
        expect(sw.link).toBe(await page.locator('[data-testid=map-exlink]').first().evaluate((e) => getComputedStyle(e).strokeDasharray));
        expect(sw.node).not.toBe('none');
      }
    }
    // the standalone running-example section is gone from the page (its content is in the introductions)
    await expect(page.getByTestId('running-example')).toHaveCount(0);
    expect((await page.getByTestId('map-hero').boundingBox())!.height).toBeLessThan(70);
  });

  test('a tap on the dotted link does nothing (no line pop-up)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, app);
    const lk = page.locator('[data-testid=map-exlink]').first(); await lk.scrollIntoViewIfNeeded();
    const b = (await lk.boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
  });

  test('the pop-up is the introduction: question, drawing + caption, what and why, key numbers, Back to its box; no chain', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, app);
    for (const r of await refsOf(page)) {
      await node(page, r.id).dispatchEvent('click');
      await expect(page.getByTestId('map-wrap')).toHaveClass(/split/);
      await expect(page).toHaveURL(new RegExp(`#/ref/${r.id}$`));
      await expect(page.getByTestId('ref-question')).toContainText(r.question ?? "What's the running example?");
      await expect(page.getByTestId('ref-live').locator('canvas').first()).toBeVisible();
      await expect(page.getByTestId('ref-live').locator('.scene-cap, .ref-cap').first()).toBeVisible();
      // a figure shows only its picture: no controls rail, no "Look for"
      await expect(page.getByTestId('ref-live').locator('.st-ctl, .st-presets, [data-testid=look-for]')).toHaveCount(0);
      await expect(page.getByTestId('ref-about').locator('li')).not.toHaveCount(0);
      await expect(page.getByTestId('ref-numbers').locator('li')).not.toHaveCount(0);
      await expect(page.locator('.ref-h').first()).toHaveText('What it is and why we use it');
      const words = await page.evaluate(() => ['ref-about', 'ref-numbers'].map((t) => document.querySelector(`[data-testid=${t}]`)!.textContent!).join(' ').split(/\s+/).filter(Boolean).length);
      expect(words, 'under 400 words').toBeLessThan(400);
      await expect(page.getByTestId('ref-trail')).toContainText('Side trip from');
      await expect(page.getByTestId('ref-host')).toHaveText(`← Back to ${await label(page, r.at)}`);
      await expect(page.locator('.qm-ref.r-sel')).toHaveCount(1); await expect(page.locator('.qm-node.n-sel')).toHaveCount(0);
      // outside the Next/Back chain
      await expect(page.getByTestId('map-panel').getByTestId('chain-next')).toHaveCount(0);
      await expect(page.getByTestId('map-panel').getByTestId('chain-back')).toHaveCount(0);
      await page.getByTestId('ref-host').click();
      await expect(page.locator(`.qm-node.n-sel[data-node="${r.at}"]`)).toHaveCount(1);
      expect(await page.locator('[data-testid=pop-next-link], [data-testid=chain-next]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.to))).not.toContain(r.id);
      await page.keyboard.press('Escape');
    }
    // a #/ref/<id> link opens the introduction directly
    await open(page, app, `#/ref/${(await refsOf(page))[0].id}`);
    await expect(page.getByTestId('ref-live')).toBeVisible();
    expect(errs).toEqual([]);
  });

  for (const W of [1280, 390] as const) test(`@${W}: a side trip: Close, Esc and browser Back return to where you were (a box, or the bare map)`, async ({ page }) => {
    await page.setViewportSize({ width: W, height: W < 700 ? 844 : 900 });
    await open(page, app);
    const r = (await refsOf(page))[0];
    const len0 = await page.evaluate(() => history.length);
    // from the bare map: ✕, Esc, Back each close it, and the history is left as it was
    for (const how of ['close', 'esc', 'back'] as const) {
      await node(page, r.id).scrollIntoViewIfNeeded(); await node(page, r.id).dispatchEvent('click');
      await expect(page.getByTestId('ref-live')).toBeVisible();
      if (how === 'close') await page.getByTestId('panel-close').click(); else if (how === 'esc') await page.keyboard.press('Escape'); else await page.goBack();
      await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
      await expect(page).not.toHaveURL(/#\/ref\//);
      await page.waitForTimeout(150);
      expect(await page.evaluate(() => [history.state?.cmRef ?? null, history.state?.cmEntry ?? null]), `${how}: no step left`).toEqual([null, null]);
    }
    expect(await page.evaluate(() => history.length)).toBeGreaterThanOrEqual(len0);
    if (W < 700) return; // on a phone the card covers the map: the example is opened from the map, not from an open box
    // from an open box: the trip returns to that box
    for (const how of ['close', 'esc', 'back', 'retap'] as const) {
      await page.locator(`[data-testid=map-node][data-node="${r.at}"]`).dispatchEvent('click');
      await expect(page.locator(`.qm-node.n-sel[data-node="${r.at}"]`)).toHaveCount(1);
      await node(page, r.id).dispatchEvent('click');
      await expect(page.getByTestId('ref-live')).toBeVisible();
      if (how === 'close') await page.getByTestId('panel-close').click(); else if (how === 'esc') await page.keyboard.press('Escape'); else if (how === 'back') await page.goBack(); else await node(page, r.id).dispatchEvent('click');
      await expect(page.locator(`.qm-node.n-sel[data-node="${r.at}"]`), `${how}: back at the box`).toHaveCount(1);
      await expect(page).toHaveURL(new RegExp(`#/node/${r.at}$`));
      await page.waitForTimeout(150);
      expect(await page.evaluate(() => history.state?.cmRef ?? null), `${how}: the trip's step is gone`).toBeNull();
      await page.keyboard.press('Escape'); await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    }
  });

  for (const [W, H] of [[390, 844], [768, 1024], [923, 1300], [1024, 768], [1280, 900]] as const) test(`@${W}: map clear of clashes; every introduction's drawing fits its column; screenshots`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: W, height: H });
    await open(page, app);
    const clash = await exampleNodeClashes(page); expect(clash.clashes).toEqual([]); expect(clash.nodes).toBe(WANT[app].length);
    await page.screenshot({ path: path.join(OUT, `${app}-${W}-map.png`) });
    for (const r of await refsOf(page)) {
      await node(page, r.id).scrollIntoViewIfNeeded(); await node(page, r.id).dispatchEvent('click');
      await expect(page.getByTestId('ref-live').locator('canvas').first()).toBeVisible();
      await page.waitForTimeout(250);
      if (W >= 700) { const c2 = await exampleNodeClashes(page); expect(c2.clashes, 'the side map too').toEqual([]); }
      const b = await liveBox(page);
      expect(b.canvases.length, `${r.id}: a live canvas`).toBeGreaterThan(0);
      for (const [l, rr, w, h] of b.canvases) { expect(l, `${r.id} canvas left`).toBeGreaterThanOrEqual(b.panel[0] - 1); expect(rr, `${r.id} canvas right`).toBeLessThanOrEqual(b.panel[1] + 1); expect(w * h).toBeGreaterThan(0); }
      expect(await noHScroll(page), `${r.id}: no sideways page scroll`).toBe(true);
      await page.screenshot({ path: path.join(OUT, `${app}-${W}-${r.id}.png`) });
      await page.getByTestId('panel-close').click();
      await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    }
    expect(errs).toEqual([]);
  });

  test('resizing with an introduction open (1280 → 768 → 390 → 1024) keeps the drawing inside its column', async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, app);
    const r = (await refsOf(page))[0];
    await node(page, r.id).dispatchEvent('click');
    for (const [W, H] of [[768, 1024], [390, 844], [1024, 768]] as const) {
      await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(400);
      const b = await liveBox(page);
      for (const [l, rr] of b.canvases) { expect(l, `@${W} left`).toBeGreaterThanOrEqual(b.panel[0] - 1); expect(rr, `@${W} right`).toBeLessThanOrEqual(b.panel[1] + 1); }
      expect(await noHScroll(page), `@${W}`).toBe(true);
    }
    expect(errs).toEqual([]);
  });

  test('@390 phone: the introduction is the floating card; browser Back closes it and the map shows the node', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, app);
    const r = (await refsOf(page)).at(-1)!;
    const n = node(page, r.id);
    await n.scrollIntoViewIfNeeded(); await n.dispatchEvent('click');
    await expect(page.getByTestId('map-panel')).not.toHaveClass(/idle/);
    expect(await page.evaluate(() => history.state?.cmEntry ?? null)).toBe(1);
    await page.goBack();
    await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
    const c = (await n.boundingBox())!;
    expect(c.y >= 0 && c.y + c.height <= 844, 'the node is on screen after Back').toBe(true);
  });
});
