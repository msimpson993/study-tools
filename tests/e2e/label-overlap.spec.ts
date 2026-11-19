import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { open } from './helpers';

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
      if (mi > 0) await page.locator(`button[role=tab][data-map]`).nth(mi).click();
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
