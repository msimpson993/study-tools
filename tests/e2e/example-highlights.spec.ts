import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { open, trackErrors, exampleGlyphClashes } from './helpers';

/* Example usage (Nov 20, linear-systems only; core feature, opt-in by per-box `examples`):
   - every box that uses an example carries a tiny glyph of it in a corner, clear of the label;
   - pointing at an Example node (mouse), tapping it, or having its introduction open lights every box that uses it (outline tint
     plus the glyph) and draws faint dotted links (no arrows) from the node to them; un-hover or close and they go;
   - the introduction ends with "Where this example comes back": those boxes in reading order, each a link that opens the box.
   control-systems has its own block since stage-pass2 (Nov 21): cs-example-highlights.spec.ts. */
const OUT = path.resolve(import.meta.dirname, '..', '..', 'shots', 'example-highlights');
fs.mkdirSync(OUT, { recursive: true });
const LS = 'linear-systems';
type M = { id: string; nodes: { id: string; label: string; examples?: string[] }[]; edges: { from: string; to: string; dashed?: boolean; side?: boolean; rank?: number }[] };
const mapsOf = (page: Page): Promise<M[]> => page.evaluate(() => (window as any).__study.content.maps);
const refsOf = (page: Page): Promise<{ id: string; at: string }[]> => page.evaluate(() => (window as any).__study.content.subject.runningExample.refs);
const refNode = (page: Page, id: string) => page.locator(`[data-testid=map-ref][data-ref="${id}"]`);
const lit = (page: Page) => page.locator('.qm-node.u-hl');
const visibleLinks = (page: Page) => page.locator('.qm-uselinks.u-on [data-testid=map-uselink]');
/** the tutor's comes-back lists for the Big-picture map (usage.json; the unit test checks both maps against exampleComesBack) */
const BACK: Record<string, string[]> = { earbud: ['STAB', 'WORK'], car: ['MODES', 'STAB', 'INOUT', 'WORK'] };
const users = (m: M, ex: string) => m.nodes.filter((n) => n.examples?.includes(ex)).map((n) => n.id);

test.describe('linear-systems: example highlights', () => {
  for (const [W, H] of [[390, 844], [923, 1300], [1280, 900]] as const) test(`@${W}: a glyph per example in every box that uses it, clear of the label; screenshot`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: W, height: H });
    await open(page, LS);
    for (const m of await mapsOf(page)) {
      await page.locator(`button[role=tab][data-map="${m.id}"]`).first().click(); await page.waitForTimeout(80);
      for (const n of m.nodes) {
        const box = page.locator(`[data-testid=map-node][data-node="${n.id}"]`);
        await expect(box.getByTestId('map-exglyph'), `${m.id}/${n.id}`).toHaveCount(n.examples?.length ?? 0);
        for (const ex of n.examples ?? []) await expect(box.locator(`[data-testid=map-exglyph][data-ex="${ex}"]`)).toHaveCount(1);
      }
      const c = await exampleGlyphClashes(page);
      expect(c.clashes, c.clashes.join('\n')).toEqual([]);
      // nothing lit and no extra lines until asked
      await expect(lit(page)).toHaveCount(0); await expect(visibleLinks(page)).toHaveCount(0);
      await expect(page.locator('[data-legend=uses] [data-testid=legend-exglyph]')).toHaveCount((await refsOf(page)).filter((r) => m.nodes.some((n) => n.id === r.at)).length);
    }
    await page.locator('button[role=tab][data-map]').first().click(); await page.waitForTimeout(80);
    await page.getByTestId('concept-map').screenshot({ path: path.join(OUT, `ls-${W}-map.png`) });
    expect(errs).toEqual([]);
  });

  for (const [W, H] of [[923, 1300], [1280, 900]] as const) test(`@${W}: hovering an Example node lights its boxes and draws faint links; leaving clears them`, async ({ page }) => {
    await page.setViewportSize({ width: W, height: H });
    await open(page, LS);
    const m = (await mapsOf(page))[0];
    for (const r of await refsOf(page)) {
      const us = users(m, r.id);
      await refNode(page, r.id).scrollIntoViewIfNeeded(); await refNode(page, r.id).hover();
      await expect(lit(page)).toHaveCount(us.length);
      for (const id of us) await expect(page.locator(`.qm-node[data-node="${id}"]`)).toHaveClass(/u-hl/);
      await expect(visibleLinks(page)).toHaveCount(us.length - 1); // the host has its own dotted link
      const links = await visibleLinks(page).evaluateAll((ls) => ls.map((l) => ({ to: (l as SVGElement).dataset.to, dash: getComputedStyle(l).strokeDasharray, op: +getComputedStyle(l).opacity, marker: l.getAttribute('marker-end'), pe: getComputedStyle(l.parentElement!).pointerEvents })));
      expect(links.map((l) => l.to).sort()).toEqual(us.filter((id) => id !== r.at).sort());
      for (const l of links) { expect(l.dash).toMatch(/^0(px)?,? 4/); expect(l.op).toBeLessThan(0.8); expect(l.marker).toBeNull(); expect(l.pe).toBe('none'); }
      // a viewport shot: an element shot would scroll the map out from under the pointer (and un-hover it)
      if (W === 1280) await page.screenshot({ path: path.join(OUT, `ls-${W}-hover-${r.id}.png`) });
      await page.mouse.move(2, 2);
      await expect(lit(page)).toHaveCount(0); await expect(visibleLinks(page)).toHaveCount(0);
      await expect(page.getByTestId('map-panel')).toHaveClass(/idle/); // hovering opens nothing
    }
  });

  for (const [W, H] of [[390, 844], [923, 1300], [1280, 900]] as const) test(`@${W}: tapping opens the introduction with its boxes lit; "Where this example comes back" lists the tutor's boxes in path order and each link opens its box`, async ({ page }) => {
    const errs = trackErrors(page);
    await page.setViewportSize({ width: W, height: H });
    await open(page, LS);
    const m = (await mapsOf(page))[0], refs = await refsOf(page);
    for (const r of refs) {
      const us = users(m, r.id), back = BACK[r.id];
      await refNode(page, r.id).dispatchEvent('click');
      await expect(page.getByTestId('ref-question')).toBeVisible();
      await expect(lit(page)).toHaveCount(us.length); await expect(visibleLinks(page)).toHaveCount(us.length - 1);
      // the last section, before the Back-to button
      const list = page.getByTestId('ref-comesback');
      await expect(list).toBeVisible();
      await expect(page.locator('[data-testid=map-panel] h4.ref-h').last()).toHaveText('Where this example comes back');
      const got = await list.getByTestId('ref-comesback-link').evaluateAll((as) => as.map((a) => (a as HTMLElement).dataset.node));
      expect(got).toEqual(back);
      // each with its box's one-line why
      await expect(list.getByTestId('ref-comesback-why')).toHaveCount(back.length);
      await list.screenshot({ path: path.join(OUT, `ls-${W}-comesback-${r.id}.png`) });
      if (W !== 923) await page.getByTestId('map-panel').screenshot({ path: path.join(OUT, `ls-${W}-intro-${r.id}.png`) });
      if (W >= 700) await page.getByTestId('concept-map').screenshot({ path: path.join(OUT, `ls-${W}-open-${r.id}.png`) });
      // a link opens that box (the trip is over: its pop-up, not the introduction; the highlight goes)
      const target = back[Math.min(1, back.length - 1)];
      await list.locator(`[data-node="${target}"]`).click();
      await expect(page.locator(`.qm-node[data-node="${target}"]`)).toHaveClass(/n-sel/);
      await expect(page.getByTestId('ref-question')).toHaveCount(0);
      await expect(lit(page)).toHaveCount(0); await expect(visibleLinks(page)).toHaveCount(0);
      await page.keyboard.press('Escape'); await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
      // closing the introduction clears it too
      await refNode(page, r.id).dispatchEvent('click'); await expect(lit(page)).toHaveCount(us.length);
      await page.getByTestId('panel-close').click(); await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
      await expect(lit(page)).toHaveCount(0); await expect(visibleLinks(page)).toHaveCount(0);
    }
    expect(errs).toEqual([]);
  });

  test('@390 phone: a touch never leaves a hover highlight behind; browser Back closes the introduction and its highlight', async ({ page, browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    await open(p, LS);
    await p.locator('[data-testid=map-ref][data-ref=car]').scrollIntoViewIfNeeded();
    await p.locator('[data-testid=map-ref][data-ref=car]').tap();
    await expect(p.getByTestId('ref-question')).toBeVisible(); await expect(p.locator('.qm-node.u-hl').first()).toBeVisible();
    await p.goBack(); await expect(p.getByTestId('ref-question')).toHaveCount(0);
    await expect(p.locator('.qm-node.u-hl')).toHaveCount(0); await expect(p.locator('.qm-uselinks.u-on')).toHaveCount(0);
    await ctx.close();
  });
});
