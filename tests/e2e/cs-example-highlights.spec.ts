import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { open, trackErrors, exampleGlyphClashes } from './helpers';

/* control-systems staged running examples (stage-pass2, Nov 21; mirrors the LS block in example-highlights.spec.ts):
   house until Two poles, the corner joins there, the dish at Turn up the gain, the house returns at A push we didn't command and
   the corner at Look inside. Each Example node is a dashed bubble beside its host, joined by a plain dotted line (no arrow);
   highlights show only on demand (hover, tap, open). Screenshots go to /workspace/shots/cs-staged when that folder can be made. */
const CS = 'control-systems';
const OUT = process.env.CS_STAGED_OUT ?? '/workspace/shots/cs-staged';
let SHOTS = true; try { fs.mkdirSync(OUT, { recursive: true }); } catch { SHOTS = false; }
const shot = (n: string) => (SHOTS ? { path: `${OUT}/${n}` } : {});
type M = { id: string; nodes: { id: string; examples?: string[] }[] };
const mapsOf = (page: Page): Promise<M[]> => page.evaluate(() => (window as any).__study.content.maps);
const refNode = (page: Page, id: string) => page.locator(`[data-testid=map-ref][data-ref="${id}"]`);
const lit = (page: Page) => page.locator('.qm-node.u-hl');
const visibleLinks = (page: Page) => page.locator('.qm-uselinks.u-on [data-testid=map-uselink]');
const BACK: Record<string, string[]> = { house: ['DIST', 'SENS', 'NOISE', 'CC'], corner: ['STATE', 'CC', 'SF', 'OBS', 'SEP', 'REF'], dish: ['SSE', 'INT', 'DER', 'TUNE'] };
const users = (m: M, ex: string) => m.nodes.filter((n) => n.examples?.includes(ex)).map((n) => n.id);

for (const [W, H] of [[390, 844], [1280, 900]] as const) test(`control-systems @${W}: a glyph per example in every box, clear of the label; nothing lit until asked`, async ({ page }) => {
  const errs = trackErrors(page);
  await page.setViewportSize({ width: W, height: H });
  await open(page, CS);
  for (const m of await mapsOf(page)) {
    await page.locator(`button[role=tab][data-map="${m.id}"]`).first().click(); await page.waitForTimeout(80);
    for (const n of m.nodes) await expect(page.locator(`[data-testid=map-node][data-node="${n.id}"]`).getByTestId('map-exglyph'), `${m.id}/${n.id}`).toHaveCount(n.examples?.length ?? 0);
    const c = await exampleGlyphClashes(page);
    expect(c.clashes, c.clashes.join('\n')).toEqual([]);
    await expect(lit(page)).toHaveCount(0); await expect(visibleLinks(page)).toHaveCount(0);
  }
  await page.locator('button[role=tab][data-map]').first().click(); await page.waitForTimeout(80);
  if (W === 390) await page.screenshot(shot('phone-390-map.png'));
  expect(errs).toEqual([]);
});

test('control-systems @1280: hovering each Example bubble lights its boxes with faint arrowless links; leaving clears them', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, CS);
  const m = (await mapsOf(page))[0];
  for (const r of ['house', 'corner', 'dish']) {
    const us = users(m, r);
    await refNode(page, r).scrollIntoViewIfNeeded(); await refNode(page, r).hover();
    await expect(lit(page)).toHaveCount(us.length);
    await expect(visibleLinks(page)).toHaveCount(us.length - 1);
    for (const l of await visibleLinks(page).evaluateAll((ls) => ls.map((l) => l.getAttribute('marker-end')))) expect(l).toBeNull();
    await page.screenshot(shot(`hover-1280-${r}.png`));
    await page.mouse.move(2, 2);
    await expect(lit(page)).toHaveCount(0); await expect(visibleLinks(page)).toHaveCount(0);
  }
});

for (const [W, H] of [[390, 844], [1280, 900]] as const) test(`control-systems @${W}: each introduction ends with the tutor's comes-back list`, async ({ page }) => {
  const errs = trackErrors(page);
  await page.setViewportSize({ width: W, height: H });
  await open(page, CS);
  for (const r of ['house', 'corner', 'dish']) {
    await refNode(page, r).dispatchEvent('click');
    await expect(page.getByTestId('ref-question')).toBeVisible();
    const list = page.getByTestId('ref-comesback');
    await expect(page.locator('[data-testid=map-panel] h4.ref-h').last()).toHaveText('Where this example comes back');
    expect(await list.getByTestId('ref-comesback-link').evaluateAll((as) => as.map((a) => (a as HTMLElement).dataset.node))).toEqual(BACK[r]);
    await expect(list.getByTestId('ref-comesback-why')).toHaveCount(BACK[r].length);
    await page.getByTestId('map-panel').screenshot(shot(`intro-${W}-${r}.png`));
    await page.getByTestId('panel-close').click(); await expect(page.getByTestId('map-panel')).toHaveClass(/idle/);
  }
  expect(errs).toEqual([]);
});

test('control-systems: the switch-point box (Two poles) and its handoff line; the index dive telescope panel; the R2 offset readout', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page, CS);
  await page.locator('[data-testid=map-node][data-node="SECOND"]').first().click();
  await expect(page.getByTestId('map-panel')).not.toHaveClass(/idle/);
  await page.screenshot(shot('switch-SECOND-box.png'));
  await open(page, CS, '#/dive/index');
  const side = page.getByText('Side panel: the telescope in the lecture notes').first();
  await side.scrollIntoViewIfNeeded(); await expect(side).toBeVisible();
  await side.locator('xpath=ancestor::*[contains(@class,"callout")][1]').screenshot(shot('index-telescope-panel.png'));
  await open(page, CS, '#/figure/lab'); await page.getByTestId('fig-stage').waitFor();
  const presets = page.locator('[data-testid=controls] .st-presets button'), wind = page.locator('[data-testid=controls] input[type=checkbox][data-k="wind"]');
  for (let i = 0; i < await presets.count(); i++) {
    const name = (await presets.nth(i).innerText()).trim();
    if (!/^P 1000|tuned/i.test(name)) continue;
    await presets.nth(i).click(); if (!(await wind.isChecked())) await wind.click({ force: true });
    await page.waitForTimeout(700);
    await page.getByTestId('fig-stage').screenshot(shot(`lab-offset-${name.replace(/[^\w]+/g, '_')}.png`));
  }
});
