import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { open, exampleNodeClashes } from './helpers';

/** In-plot labels must not sit on each other: a note (or a legend row) on an axis name, a tick number or another note.
 * Core text() records every label it draws when window.__textLog is an array (packages/core/src/viz.ts); we keep each canvas's latest draw. */
interface L { s: string; x0: number; x1: number; y0?: number; y1?: number; role?: string; skipped: boolean; gen: number; cv: number; id: string }
const collisions = (log: L[]) => {
  const last = new Map<number, number>(); for (const e of log) last.set(e.cv, Math.max(last.get(e.cv) ?? 0, e.gen));
  const by = new Map<number, L[]>(); for (const e of log) if (!e.skipped && e.y0 !== undefined && e.gen === last.get(e.cv)) { const a = by.get(e.cv) ?? []; a.push(e); by.set(e.cv, a); }
  const out: string[] = [];
  for (const a of by.values()) for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
    const p = a[i], q = a[j]; if (p.role === 'tick' && q.role === 'tick') continue; if (p.s === q.s && Math.abs(p.x0 - q.x0) < 1 && Math.abs(p.y0! - q.y0!) < 1) continue; // the same label twice (an outline)
    const w = Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0), h = Math.min(p.y1!, q.y1!) - Math.max(p.y0!, q.y0!);
    if (w > 1.5 && h > 1.5) out.push(`${p.id || `canvas ${p.cv}`}: “${p.s}” (${p.role}) × “${q.s}” (${q.role})`);
  }
  return out;
};
const start = (page: Page) => page.evaluate(() => { (window as any).__textLog = []; (window as any).__textCanvases = []; });
/** the log, kept to canvases still on the page and drawn at their current size (a pop-up being replaced can draw once more, tiny) */
const take = (page: Page) => page.evaluate(() => {
  const w = window as any, cvs: HTMLCanvasElement[] = w.__textCanvases, l = w.__textLog; w.__textLog = [];
  return l.filter((e: any) => { const c = cvs[e.cv]; return c && c.isConnected && c.width === e.W && c.height === e.H && c.getBoundingClientRect().width > 0; });
}) as Promise<L[]>;
const REPORT = process.env.LABEL_REPORT;

for (const app of ['control-systems'] as const) for (const vw of [1366, 390]) {
  test(`${app} @${vw}: in-plot notes do not overlap axis labels, tick numbers or each other (figures and box pop-ups)`, async ({ page }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: vw, height: vw > 500 ? 900 : 844 });
    await page.addInitScript(() => { (window as any).__textLog = []; (window as any).__textCanvases = []; });
    await open(page, app);
    const { figs, maps } = await page.evaluate(() => { const c = (window as any).__study.content; return { figs: c.figures.map((f: any) => f.id), maps: c.maps.map((m: any) => ({ id: m.id, nodes: m.nodes.filter((n: any) => n.pop?.figures?.length || n.pop).map((n: any) => n.id) })) }; });
    const bad: string[] = [];
    for (const id of figs) {
      await page.goto(`/${app}/index.html#/figure/${id}`); await page.reload(); await page.getByTestId('fig-stage').waitFor(); await page.waitForTimeout(500);
      await start(page); await page.getByTestId('reset').click().catch(() => {}); await page.waitForTimeout(400);
      bad.push(...collisions(await take(page)).map((s) => `figure ${id} · ${s}`));
    }
    await open(page, app);
    for (const [mi, m] of maps.entries()) {
      // on phones an open entry is a card over the map: close it before switching maps
      if (mi > 0) { await page.keyboard.press('Escape'); await page.locator(`button[role=tab][data-map]`).nth(mi).click(); }
      for (const n of m.nodes) {
        await start(page); await page.locator(`[data-testid=map-node][data-node="${n}"]`).first().dispatchEvent('click'); await page.waitForTimeout(350);
        bad.push(...collisions(await take(page)).map((s) => `${m.id} box ${n} · ${s}`));
      }
    }
    const uniq = [...new Set(bad)];
    if (REPORT) fs.writeFileSync(`${REPORT}-${app}-${vw}.txt`, uniq.join('\n'));
    expect(uniq, uniq.slice(0, 40).join('\n')).toEqual([]);
  });
}

/** linear-systems pass 4: the worked-example and review pictures and the figures the student flagged (R2, R3, A4),
 * at both widths: no label on another label and none running off its canvas */
const LS_PAGES = ['/review/part-a', '/review/part-b', '/dive/inverse', '/dive/roc', '/dive/sampling', '/dive/realize', '/dive/fs', '/dive/parseval', '/dive/ctrl', '/dive/obs', '/dive/diag', '/dive/kalman'];
/** a pixel or two of descender box past the edge is fine */
const clipped = (log: L[]) => {
  const out: string[] = [];
  for (const e of log as (L & { W: number; H: number })[]) if (!e.skipped && e.s.trim() && e.y0 !== undefined && (e.x0 < -1 || e.x1 > e.W + 1 || e.y0 < -3 || e.y1! > e.H + 3)) out.push(`${e.id || `canvas ${e.cv}`}: “${e.s}” runs off the canvas [${Math.round(e.x0)}–${Math.round(e.x1)} of ${e.W}, ${Math.round(e.y0)}–${Math.round(e.y1!)} of ${e.H}]`);
  return out;
};
for (const vw of [1366, 390]) {
  test(`linear-systems @${vw}: review and worked-example pictures, fs, sampling and car figures keep their labels apart and on the canvas`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: vw, height: vw > 500 ? 900 : 844 });
    await page.addInitScript(() => { (window as any).__textLog = []; (window as any).__textCanvases = []; });
    await open(page, 'linear-systems');
    const bad: string[] = [];
    for (const hash of LS_PAGES) {
      await page.goto(`/linear-systems/index.html#${hash}`); await page.reload(); await page.waitForTimeout(900);
      // every canvas drawn once at its laid-out size: scroll through the page so lazy figures mount
      for (const cv of await page.locator('main canvas').all()) await cv.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
      const log = await take(page);
      bad.push(...collisions(log).map((s) => `${hash} · ${s}`), ...clipped(log).map((s) => `${hash} · ${s}`));
    }
    const uniq = [...new Set(bad)];
    if (REPORT) fs.writeFileSync(`${REPORT}-linear-systems-pass4-${vw}.txt`, uniq.join('\n'));
    expect(uniq, uniq.slice(0, 40).join('\n')).toEqual([]);
  });
}

/** linear-systems Nov 19 expansion: the six new box pop-up pictures (ROC, ORTHO, SAMP, DTFT, WIN, FB) at both widths,
 * opened by deep link (the desktop split layout puts them in the right-hand column) */
const LS_EXPANDED = ['ROC', 'ORTHO', 'SAMP', 'DTFT', 'WIN', 'FB'];
for (const vw of [1366, 390]) {
  test(`linear-systems @${vw}: the expanded boxes' pop-up pictures keep their labels apart and on the canvas`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: vw, height: vw > 500 ? 900 : 844 });
    await page.addInitScript(() => { (window as any).__textLog = []; (window as any).__textCanvases = []; });
    const bad: string[] = [];
    for (const id of LS_EXPANDED) {
      await open(page, 'linear-systems', `#/node/${id}`); await page.reload();
      const strip = page.locator('[data-testid=map-panel] [data-testid=pop-figures]').first();
      await expect(strip, `${id} has its picture`).toHaveCount(1);
      await strip.scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
      const log = (await take(page)).filter((e) => e.id.startsWith('pop-'));
      expect(log.length, `${id}: the picture drew its labels`).toBeGreaterThan(3);
      bad.push(...collisions(log).map((s) => `box ${id} · ${s}`), ...clipped(log).map((s) => `box ${id} · ${s}`));
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
}

/** Example nodes (Nov 20): on both maps of both apps, at phone, tablet and desktop widths, in Fit and Actual size, nothing
 *  lies under a node (box, line, line label or another node) and its dotted link runs from its host into no box and across no line. */
for (const app of ['linear-systems', 'control-systems'] as const) test(`${app}: Example nodes clear of boxes, lines and labels at every width`, async ({ page }) => {
  test.setTimeout(120_000);
  const bad: string[] = [];
  for (const [W, H] of [[390, 844], [768, 1024], [923, 1300], [1024, 768], [1280, 900], [1600, 1000]] as const) {
    await page.setViewportSize({ width: W, height: H });
    await open(page, app);
    const maps: string[] = await page.evaluate(() => (window as any).__study.content.maps.map((m: any) => m.id));
    for (const view of ['fit', 'actual'] as const) {
      await page.locator(`[data-testid=map-view] [data-view=${view}]`).click();
      for (const m of maps) {
        await page.locator(`button[role=tab][data-map="${m}"]`).first().click(); await page.waitForTimeout(80);
        const c = await exampleNodeClashes(page);
        bad.push(...c.clashes.map((s) => `@${W} ${view} ${m}: ${s}`));
        if (c.nodes !== c.links) bad.push(`@${W} ${view} ${m}: ${c.nodes} nodes but ${c.links} links`);
      }
    }
    // the side map with a box open (desktop split: the map re-lays out in its narrow column)
    if (W >= 700) {
      await page.locator(`button[role=tab][data-map="${maps[0]}"]`).first().click();
      await page.locator('[data-testid=map-node]').nth(1).dispatchEvent('click'); await page.waitForTimeout(150);
      bad.push(...(await exampleNodeClashes(page)).clashes.map((s) => `@${W} split: ${s}`));
      await page.keyboard.press('Escape');
    }
  }
  expect(bad, bad.slice(0, 30).join('\n')).toEqual([]);
});
