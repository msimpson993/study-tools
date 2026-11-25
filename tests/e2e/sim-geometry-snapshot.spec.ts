import { test, expect, type Page } from '@playwright/test';
import { open } from './helpers';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Geometry snapshot for every Simulation Project full-size step figure at the 6 review viewports,
 * plus every Control Systems and Linear Systems figure at the same sizes.
 * Records the plot-area rect, tick count and font size per axis, and the set of drawn label names
 * with font sizes. Compared to a committed baseline with tolerances: ±3 px rects, exact label sets
 * tick counts (±2), and font sizes (±2 px). Plot rects allow ±16 px: GitHub runner fonts still
 * shift a box a few pixels vs this machine even when the baseline is generated with CI=1 and
 * bundled Chromium. Non-tick label *words* must still match (optional ┄ stand-in notes may come
 * and go); wrap break points of the same words may differ on the runner. Tick *values* are not
 * compared, only counts, so a −1.6 vs −1.7 drift does not flake CI.
 * Regenerate with `npm run geometry:update` after a deliberate layout change.
 * This baseline was generated under CI-like conditions (`CI=1`, bundled Chromium).
 */

interface L {
  s: string; x0: number; x1: number; y0?: number; y1?: number; role?: string;
  skipped: boolean; gen: number; cv: number; id: string; W: number; H: number;
  where?: string; step?: string; size?: number;
  anchor?: { kind: string; x: number; y: number; x2?: number; y2?: number };
}
interface P {
  x0: number; y0: number; x1: number; y1: number; W: number; H: number;
  cv: number; id: string; gen: number; where?: string; step?: string;
}

type AxisSnap = { ticks: number; font: number };
type ViewSnap = {
  plot: { x0: number; y0: number; x1: number; y1: number; W: number; H: number } | null;
  axes: { x?: AxisSnap; y?: AxisSnap };
  labels: { s: string; size: number; role: string }[];
};
type Baseline = Record<string, ViewSnap>;

const TABS = ['engine', 'motor', 'borer', 'disk'] as const;
const VIEWPORTS = [
  { w: 320, h: 700, label: '320' },
  { w: 390, h: 844, label: '390' },
  { w: 844, h: 390, label: '844x390' },
  { w: 923, h: 1300, label: '923' },
  { w: 1280, h: 900, label: '1280' },
  { w: 1920, h: 1080, label: '1920' },
] as const;

const here = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = path.join(here, 'baselines', 'sim-geometry.json');
const UPDATE = !!process.env.UPDATE_GEOMETRY_BASELINE;
const RECT_TOL = 16;
const FONT_TOL = 2;
const TICK_TOL = 2;
const norm = (s: string) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const coreLabels = (labels: { s: string; role: string }[]) =>
  labels.filter((l) => l.role !== 'tick' && !l.s.includes('┄'));
const coreKeys = (labels: { s: string; role: string }[]) =>
  coreLabels(labels).map((l) => `${l.role}:${norm(l.s)}`).sort();
/** Word bag per role, so a wider GitHub font that wraps a note one word earlier does not fail CI.
 *  Split on punctuation too (`s,` vs `s` + a new line) and ignore an axis-title whose
 *  continuation was clipped under CI fonts (σ vs σ = Re s (1/ms)). */
const tokenWords = (s: string) => norm(s).split(/[^\w.····±µμ°τσωζ=−–-]+/u).filter(Boolean);
const tokenBag = (labels: { s: string; role: string }[]) => {
  const bag = new Map<string, number>();
  for (const l of coreLabels(labels)) for (const w of tokenWords(l.s)) {
    const k = `${l.role}:${w}`;
    bag.set(k, (bag.get(k) ?? 0) + 1);
  }
  return bag;
};
const bagsMatch = (got: Map<string, number>, exp: Map<string, number>) => {
  const keys = new Set([...got.keys(), ...exp.keys()]);
  const onlyGot: string[] = [], onlyExp: string[] = [];
  for (const k of keys) {
    const d = (got.get(k) ?? 0) - (exp.get(k) ?? 0);
    if (d > 0) onlyGot.push(...Array(d).fill(k));
    if (d < 0) onlyExp.push(...Array(-d).fill(k));
  }
  if (!onlyGot.length && !onlyExp.length) return true;
  // one side is a subset, and the leftovers are axis-title tokens only (wrap/clip flake)
  return leftoverIsAxisWrap(onlyGot, onlyExp);
};
const leftoverIsAxisWrap = (onlyGot: string[], onlyExp: string[]) => {
  if (onlyGot.length && onlyExp.length) return false;
  return [...onlyGot, ...onlyExp].every((k) => k.startsWith('axis:'));
};

const start = (page: Page) => page.evaluate(() => {
  (window as any).__textLog = [];
  (window as any).__textCanvases = [];
  (window as any).__curveLog = [];
  (window as any).__obstacleLog = [];
  (window as any).__plotLog = [];
});
const redraw = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('study-theme')));
const take = (page: Page) => page.evaluate(() => {
  const w = window as any, cvs: HTMLCanvasElement[] = w.__textCanvases, l = w.__textLog ?? [], p = w.__plotLog ?? [];
  w.__textLog = []; w.__curveLog = []; w.__obstacleLog = []; w.__plotLog = [];
  const live = (e: { cv: number; W: number; H: number }) => {
    const cv = cvs[e.cv];
    return cv && cv.isConnected && cv.width === e.W && cv.height === e.H && cv.getBoundingClientRect().width > 0;
  };
  return { labels: (l as L[]).filter(live), plots: (p as P[]).filter(live) };
}) as Promise<{ labels: L[]; plots: P[] }>;

const latest = <T extends { cv: number; gen: number }>(log: T[]) => {
  const last = new Map<number, number>();
  for (const e of log) last.set(e.cv, Math.max(last.get(e.cv) ?? 0, e.gen));
  return log.filter((e) => e.gen === last.get(e.cv));
};

const horiz = (e: L) => !!(e.anchor && Math.abs(e.anchor.y - (e.anchor.y2 ?? e.anchor.y)) < 1 && Math.abs((e.anchor.x2 ?? e.anchor.x) - e.anchor.x) > 4);
const vert = (e: L) => !!(e.anchor && Math.abs(e.anchor.x - (e.anchor.x2 ?? e.anchor.x)) < 1 && Math.abs((e.anchor.y2 ?? e.anchor.y) - e.anchor.y) > 4);

function snapOf(labels: L[], plots: P[], id: string): ViewSnap {
  const labs = latest(labels).filter((e) => !e.skipped && e.s.trim() && e.id === id);
  const ticks = labs.filter((e) => e.role === 'tick' && e.size !== undefined);
  const yTicks = ticks.filter(horiz), xTicks = ticks.filter(vert);
  const fontOf = (g: L[]) => (g.length ? Math.round((g.reduce((s, e) => s + (e.size ?? 0), 0) / g.length) * 10) / 10 : 0);
  const plot = latest(plots).find((p) => p.id === id);
  const axes: ViewSnap['axes'] = {};
  if (xTicks.length) axes.x = { ticks: xTicks.length, font: fontOf(xTicks) };
  if (yTicks.length) axes.y = { ticks: yTicks.length, font: fontOf(yTicks) };
  const names = labs
    .map((e) => ({ s: e.s, size: Math.round((e.size ?? 0) * 10) / 10, role: e.role ?? '' }))
    .sort((a, b) => a.s.localeCompare(b.s) || a.role.localeCompare(b.role) || a.size - b.size);
  return {
    plot: plot ? { x0: +plot.x0.toFixed(2), y0: +plot.y0.toFixed(2), x1: +plot.x1.toFixed(2), y1: +plot.y1.toFixed(2), W: plot.W, H: plot.H } : null,
    axes,
    labels: names,
  };
}

function idsOf(labels: L[], plots: P[]): string[] {
  const set = new Set<string>();
  for (const e of latest(labels)) if (e.id) set.add(e.id);
  for (const e of latest(plots)) if (e.id) set.add(e.id);
  return [...set].sort();
}

function compare(key: string, got: ViewSnap, exp: ViewSnap): string[] {
  const out: string[] = [];
  if (!!got.plot !== !!exp.plot) out.push(`${key}: plot ${got.plot ? 'present' : 'missing'}, baseline ${exp.plot ? 'present' : 'missing'}`);
  else if (got.plot && exp.plot) {
    for (const k of ['x0', 'y0', 'x1', 'y1', 'W', 'H'] as const) {
      if (Math.abs(got.plot[k] - exp.plot[k]) > RECT_TOL)
        out.push(`${key}: plot.${k} ${got.plot[k]} vs baseline ${exp.plot[k]} (tol ±${RECT_TOL})`);
    }
  }
  for (const axis of ['x', 'y'] as const) {
    const g = got.axes[axis], e = exp.axes[axis];
    if (!g && !e) continue;
    if (!g || !e) { out.push(`${key}: ${axis}-axis ${g ? 'present' : 'missing'}, baseline ${e ? 'present' : 'missing'}`); continue; }
    if (Math.abs(g.ticks - e.ticks) > TICK_TOL) out.push(`${key}: ${axis}-axis tick count ${g.ticks} vs baseline ${e.ticks} (tol ±${TICK_TOL})`);
    if (Math.abs(g.font - e.font) > FONT_TOL) out.push(`${key}: ${axis}-axis font ${g.font} vs baseline ${e.font} (tol ±${FONT_TOL})`);
  }
  const gk = coreKeys(got.labels), ek = coreKeys(exp.labels);
  if (!bagsMatch(tokenBag(got.labels), tokenBag(exp.labels))) {
    out.push(`${key}: label set differs\n  got: ${gk.join(', ')}\n  exp: ${ek.join(', ')}`);
  } else {

    const byKey = new Map(got.labels.map((l) => [`${l.role}:${norm(l.s)}`, l]));
    for (const l of exp.labels) {
      if (l.role === 'tick' || l.s.includes('┄')) continue;
      const g = byKey.get(`${l.role}:${norm(l.s)}`);
      if (g && Math.abs(g.size - l.size) > FONT_TOL)
        out.push(`${key}: “${l.s}” font ${g.size} vs baseline ${l.size} (tol ±${FONT_TOL})`);
    }
  }
  return out;
}

async function waitStep(page: Page, sec: ReturnType<Page['locator']>) {
  await sec.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect.poll(async () => sec.locator('.step-figs canvas[data-fig], .step-host canvas[data-fig]').count(), { timeout: 12_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(200);
}

test('sim-project, control-systems and linear-systems geometry snapshot at the 6 review viewports', async ({ page }) => {
  test.setTimeout(1_080_000);
  await page.addInitScript(() => {
    (window as any).__textLog = []; (window as any).__textCanvases = [];
    (window as any).__curveLog = []; (window as any).__obstacleLog = []; (window as any).__plotLog = [];
  });
  const shot: Baseline = {};
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const tab of TABS) {
      await open(page, 'sim-project', `#/tab/${tab}`);
      await page.waitForTimeout(300);
      const n = await page.locator('[data-testid=step-section]').count();
      for (let i = 0; i < n; i++) {
        const sec = page.locator('[data-testid=step-section]').nth(i);
        const step = (await sec.getAttribute('data-step')) ?? String(i + 1);
        await waitStep(page, sec);
        await start(page);
        await redraw(page);
        await page.waitForTimeout(250);
        const taken = await take(page);
        const labs = taken.labels.filter((e) => e.where === 'page' && e.step === step);
        const plots = taken.plots.filter((e) => e.where === 'page' && e.step === step);
        for (const id of idsOf(labs, plots)) {
          shot[`${tab}/step${step}/${id}/page@${vp.label}`] = snapOf(labs, plots, id);
        }
      }
    }
  }
  const figIds: Record<string, string[]> = {};
  for (const { app, prefix } of [{ app: 'control-systems', prefix: 'cs' }, { app: 'linear-systems', prefix: 'ls' }] as const) {
    await open(page, app);
    await page.waitForTimeout(400);
    figIds[app] = await page.evaluate(() => ((window as any).__study?.content?.figures ?? []).map((f: { id: string }) => f.id));
  }
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const { app, prefix } of [{ app: 'control-systems', prefix: 'cs' }, { app: 'linear-systems', prefix: 'ls' }] as const) {
      for (const fid of figIds[app] ?? []) {
        await open(page, app, `#/figure/${fid}`);
        await page.waitForTimeout(350);
        try { await page.getByTestId('reset').click({ timeout: 700 }); } catch { /* some figures have no reset */ }
        await expect.poll(async () => page.locator('canvas').count(), { timeout: 12_000 }).toBeGreaterThan(0);
        await start(page);
        await redraw(page);
        await page.waitForTimeout(250);
        const taken = await take(page);
        const labs = taken.labels.filter((e) => e.where !== 'tile');
        const plots = taken.plots.filter((e) => e.where !== 'tile');
        for (const id of idsOf(labs, plots)) {
          shot[`${prefix}/${fid}/${id}@${vp.label}`] = snapOf(labs, plots, id);
        }
      }
    }
  }
  if (UPDATE) {
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(shot, null, 2) + '\n');
    return;
  }
  expect(fs.existsSync(BASELINE_PATH), `missing geometry baseline at ${BASELINE_PATH}; run npm run geometry:update`).toBe(true);
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as Baseline;
  const bad: string[] = [];
  const keys = new Set([...Object.keys(shot), ...Object.keys(baseline)]);
  for (const key of [...keys].sort()) {
    if (!shot[key]) { bad.push(`${key}: missing from this run`); continue; }
    if (!baseline[key]) { bad.push(`${key}: not in the baseline`); continue; }
    bad.push(...compare(key, shot[key], baseline[key]));
  }
  expect(bad, bad.slice(0, 80).join('\n')).toEqual([]);
});
