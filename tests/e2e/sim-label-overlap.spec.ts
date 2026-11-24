import { test, expect, type Page } from '@playwright/test';
import { open } from './helpers';

/**
 * Every Simulation Project step-card tile and its expanded view, at the sizes the reviews use:
 * drawn text boxes (from core text()'s __textLog) must not overlap each other, must stay inside
 * their clip (the plot box when clipped, otherwise the canvas), and must not sit on a drawn curve
 * (__curveLog). Required labels named in the card text / Look-for / How to read this must be
 * present on labelled tiles and in expanded views (not on bare phone tiles).
 *
 * Allow known intentional overlaps or curve-on-label cases only with an explicit, commented entry.
 */
interface L {
  s: string; x0: number; x1: number; y0?: number; y1?: number; role?: string;
  skipped: boolean; gen: number; cv: number; id: string; W: number; H: number;
  where?: string; step?: string;
  clip?: { x0: number; y0: number; x1: number; y1: number } | null;
}
interface C {
  pts: { x: number; y: number }[]; width: number; W: number; H: number;
  cv: number; id: string; gen: number; where?: string; step?: string;
}

/** Intentional label-vs-label overlaps the check may see and should ignore. Tick-vs-tick and exact duplicate (outline) pairs are skipped in code, not here. */
const ALLOWLIST: { comment: string; match: (p: L, q: L, at: string) => boolean }[] = [
  // none yet — add a commented entry if a genuine, intended overlap appears
];

/** Labels that are meant to sit on a curve or marker stroke (e.g. a probe sitting on the trace). */
const CURVE_ALLOWLIST: { comment: string; match: (lab: L, at: string) => boolean }[] = [
  // Tradeoff plot: "Ka = 10" / "K = 20" etc. are tags next to the marked operating points on the curve
  { comment: 'tradeoff operating-point tags sit beside the marked dots on the curve', match: (lab) => /^(Ka|K) = \d+$/.test(lab.s.trim()) && lab.id === 'curve' },
];

/**
 * Labels the card text, Look-for, or How to read this tells the reader to see, checked on
 * labelled tiles (923 / 1280 / 1920) and every expanded view — not on bare phone tiles.
 */
const REQUIRED: { comment: string; tab: string; step?: string; fig: string; re: RegExp; name: string }[] = [
  // figures.yaml howToRead, borer / disk s-plane: "The lightly shaded region labelled 'unstable'"
  { comment: "Borer s-plane how-to-read: labelled 'unstable'", tab: 'borer', fig: 'splane', re: /unstable/i, name: 'unstable' },
  { comment: "Disk s-plane how-to-read: labelled 'unstable'", tab: 'disk', fig: 'splane', re: /unstable/i, name: 'unstable' },
  // Disk 3 Look-for: "the upper pole is labelled −9.8 + j17.43"
  { comment: 'Disk 3 Look-for: pole labelled −9.8 + j17.43', tab: 'disk', step: '3', fig: 'splane', re: /−9\.8\s*\+?\s*j17\.43/, name: '−9.8+j17.43' },
  // Disk 5 Look-for: "the upper pole is labelled −0.23 + j139.73"
  { comment: 'Disk 5 Look-for: pole labelled −0.23 + j139.73', tab: 'disk', step: '5', fig: 'splane', re: /−0\.23\s*\+?\s*j139\.73/, name: '−0.23+j139.73' },
  // Engine readout terms / Look-for: Tr, Tp (when there is overshoot), Ts
  { comment: 'Engine 3 Look-for / readout terms: Tr', tab: 'engine', step: '3', fig: 'step', re: /^Tr\b/, name: 'Tr' },
  { comment: 'Engine 3 Look-for / readout terms: Tp', tab: 'engine', step: '3', fig: 'step', re: /\bTp\b/, name: 'Tp' },
  { comment: 'Engine 3 Look-for / readout terms: Ts', tab: 'engine', step: '3', fig: 'step', re: /^Ts\b|\bTs\b/, name: 'Ts' },
  { comment: 'Engine 4 readout terms: Tr', tab: 'engine', step: '4', fig: 'step', re: /^Tr\b/, name: 'Tr' },
  { comment: 'Engine 4 readout terms: Ts', tab: 'engine', step: '4', fig: 'step', re: /^Ts\b|\bTs\b/, name: 'Ts' },
  { comment: 'Engine 5 Look-for: Tr 1.088 s', tab: 'engine', step: '5', fig: 'step', re: /^Tr\b/, name: 'Tr' },
  { comment: 'Engine 5 Look-for: Ts 1.802 s', tab: 'engine', step: '5', fig: 'step', re: /^Ts\b|\bTs\b/, name: 'Ts' },
];

const TABS = ['engine', 'motor', 'borer', 'disk'] as const;
const VIEWPORTS = [
  { w: 320, h: 700, label: '320', labelled: false },
  { w: 390, h: 844, label: '390', labelled: false },
  { w: 844, h: 390, label: '844x390', labelled: false },
  { w: 923, h: 1300, label: '923', labelled: true },
  { w: 1280, h: 900, label: '1280', labelled: true },
  { w: 1920, h: 1080, label: '1920', labelled: true },
] as const;

const start = (page: Page) => page.evaluate(() => {
  (window as any).__textLog = [];
  (window as any).__textCanvases = [];
  (window as any).__curveLog = [];
});
const redraw = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('study-theme')));
const take = (page: Page) => page.evaluate(() => {
  const w = window as any, cvs: HTMLCanvasElement[] = w.__textCanvases, l = w.__textLog ?? [], c = w.__curveLog ?? [];
  w.__textLog = []; w.__curveLog = [];
  const live = (e: { cv: number; W: number; H: number }) => {
    const cv = cvs[e.cv];
    return cv && cv.isConnected && cv.width === e.W && cv.height === e.H && cv.getBoundingClientRect().width > 0;
  };
  return { labels: (l as L[]).filter(live), curves: (c as C[]).filter(live) };
}) as Promise<{ labels: L[]; curves: C[] }>;

const allowed = (p: L, q: L, at: string) => ALLOWLIST.some((a) => a.match(p, q, at));
const curveAllowed = (lab: L, at: string) => CURVE_ALLOWLIST.some((a) => a.match(lab, at));

const latest = <T extends { cv: number; gen: number }>(log: T[]) => {
  const last = new Map<number, number>();
  for (const e of log) last.set(e.cv, Math.max(last.get(e.cv) ?? 0, e.gen));
  return log.filter((e) => e.gen === last.get(e.cv));
};

const collisions = (log: L[], at: string) => {
  const by = new Map<number, L[]>();
  for (const e of latest(log)) if (!e.skipped && e.y0 !== undefined && e.s.trim()) {
    const a = by.get(e.cv) ?? []; a.push(e); by.set(e.cv, a);
  }
  const out: string[] = [];
  for (const a of by.values()) for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
    const p = a[i], q = a[j];
    if (p.role === 'tick' && q.role === 'tick') continue;
    if (p.s === q.s && Math.abs(p.x0 - q.x0) < 1 && Math.abs((p.y0 ?? 0) - (q.y0 ?? 0)) < 1) continue;
    if (allowed(p, q, at)) continue;
    const w = Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0), h = Math.min(p.y1!, q.y1!) - Math.max(p.y0!, q.y0!);
    if (w > 1.5 && h > 1.5) out.push(`${at} ${p.id || 'canvas'}: “${p.s}” (${p.role ?? '?'}) × “${q.s}” (${q.role ?? '?'})`);
  }
  return out;
};

/** a pixel or two of descender box past the edge is fine */
const clipped = (log: L[], at: string) => {
  const out: string[] = [];
  for (const e of log) if (!e.skipped && e.s.trim() && e.y0 !== undefined) {
    const r = e.clip;
    if (r) {
      if (e.x0 < r.x0 - 1 || e.x1 > r.x1 + 1 || e.y0 < r.y0 - 3 || e.y1! > r.y1 + 3)
        out.push(`${at} ${e.id || 'canvas'}: “${e.s}” runs off the plot clip [${Math.round(e.x0)}–${Math.round(e.x1)} of ${Math.round(r.x0)}–${Math.round(r.x1)}, ${Math.round(e.y0)}–${Math.round(e.y1!)} of ${Math.round(r.y0)}–${Math.round(r.y1)}]`);
    } else if (e.x0 < -1 || e.x1 > e.W + 1 || e.y0 < -3 || e.y1! > e.H + 3) {
      out.push(`${at} ${e.id || 'canvas'}: “${e.s}” runs off the canvas [${Math.round(e.x0)}–${Math.round(e.x1)} of ${e.W}, ${Math.round(e.y0)}–${Math.round(e.y1!)} of ${e.H}]`);
    }
  }
  return out;
};

const segHits = (ax: number, ay: number, bx: number, by: number, x0: number, y0: number, x1: number, y1: number) => {
  if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(ay, by) < y0 || Math.min(ay, by) > y1) return false;
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
  for (let k = 0; k <= n; k++) {
    const u = k / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u;
    if (x > x0 && x < x1 && y > y0 && y < y1) return true;
  }
  return false;
};

const onCurve = (labels: L[], curves: C[], at: string) => {
  const out: string[] = [];
  const labs = latest(labels).filter((e) => !e.skipped && e.s.trim() && e.y0 !== undefined && e.role !== 'tick');
  const cvs = latest(curves);
  for (const lab of labs) {
    if (curveAllowed(lab, at)) continue;
    const pad = 1.5;
    const x0 = lab.x0 + pad, y0 = lab.y0! + pad, x1 = lab.x1 - pad, y1 = lab.y1! - pad;
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    const hit = cvs.filter((c) => c.cv === lab.cv).some((c) => {
      const w = (c.width ?? 2) / 2;
      for (let i = 1; i < c.pts.length; i++) {
        const a = c.pts[i - 1], b = c.pts[i];
        if (segHits(a.x, a.y, b.x, b.y, x0 - w, y0 - w, x1 + w, y1 + w)) return true;
      }
      return false;
    });
    if (hit) out.push(`${at} ${lab.id || 'canvas'}: “${lab.s}” sits on a drawn curve`);
  }
  return out;
};

const missingRequired = (labels: L[], at: string, tab: string, step: string, fig: string | null, check: boolean) => {
  if (!check) return [];
  const labs = latest(labels).filter((e) => !e.skipped && e.s.trim());
  const out: string[] = [];
  for (const req of REQUIRED) {
    if (req.tab !== tab) continue;
    if (req.step && req.step !== step) continue;
    if (fig !== null && req.fig !== fig) continue;
    // a tile check has fig=null and must find the label on the matching fig's canvas
    const pool = fig !== null ? labs : labs.filter((e) => e.id === req.fig);
    if (fig === null && !pool.length && !labs.some((e) => e.id === req.fig)) continue; // that fig is not on this tile view
    if (!pool.some((e) => req.re.test(e.s))) out.push(`${at}: missing required label “${req.name}” (${req.comment})`);
  }
  return out;
};

async function waitTiles(page: Page, card: ReturnType<Page['locator']>) {
  await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect.poll(async () => card.locator('.step-thumbs canvas[data-fig], .tile-frame canvas[data-fig]').count(), { timeout: 12_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(200);
}

for (const vp of VIEWPORTS) {
  test(`sim-project @${vp.label}: step-card tiles and expanded views keep labels apart, on the clip, off curves, and complete`, async ({ page }) => {
    test.setTimeout(420_000);
    await page.addInitScript(() => { (window as any).__textLog = []; (window as any).__textCanvases = []; (window as any).__curveLog = []; });
    await page.setViewportSize({ width: vp.w, height: vp.h });
    const bad: string[] = [];
    let seen = 0;
    for (const tab of TABS) {
      await open(page, 'sim-project', `#/tab/${tab}`);
      await page.waitForTimeout(300);
      const n = await page.locator('[data-testid=step-card]').count();
      for (let i = 0; i < n; i++) {
        const card = page.locator('[data-testid=step-card]').nth(i);
        const step = (await card.getAttribute('data-step')) ?? String(i + 1);
        await waitTiles(page, card);
        await start(page);
        await redraw(page);
        await page.waitForTimeout(250);
        const takenTiles = await take(page);
        const tiles = takenTiles.labels.filter((e) => e.where === 'tile' && e.step === step);
        const tileCurves = takenTiles.curves.filter((e) => e.where === 'tile' && e.step === step);
        seen += tiles.length;
        const atTile = `${tab} step ${step} tile @${vp.label}`;
        bad.push(...collisions(tiles, atTile), ...clipped(tiles, atTile), ...onCurve(tiles, tileCurves, atTile));
        bad.push(...missingRequired(tiles, atTile, tab, step, null, vp.labelled));

        const thumbs = card.locator('.step-thumbs canvas[data-fig]');
        const tcount = await thumbs.count();
        for (let k = 0; k < tcount; k++) {
          const thumb = thumbs.nth(k);
          if (!(await thumb.isVisible().catch(() => false))) continue;
          const fig = (await thumb.getAttribute('data-fig')) ?? String(k);
          await thumb.click();
          const overlay = card.getByTestId('fig-overlay').locator('visible=true');
          await expect(overlay).toHaveCount(1, { timeout: 8_000 });
          await expect(overlay.locator('canvas[data-big]')).toBeVisible();
          await page.waitForTimeout(200);
          await start(page);
          await redraw(page);
          await page.waitForTimeout(250);
          const takenExp = await take(page);
          const exp = takenExp.labels.filter((e) => e.where === 'expand');
          const expCurves = takenExp.curves.filter((e) => e.where === 'expand');
          seen += exp.length;
          const atExp = `${tab} step ${step} expand ${fig} @${vp.label}`;
          bad.push(...collisions(exp, atExp), ...clipped(exp, atExp), ...onCurve(exp, expCurves, atExp));
          bad.push(...missingRequired(exp, atExp, tab, step, fig, true));
          await overlay.locator('[data-testid=fig-close]').click();
          await expect(overlay).toHaveCount(0, { timeout: 8_000 });
        }
      }
    }
    const uniq = [...new Set(bad)];
    expect(seen, `expected drawn labels at ${vp.label}`).toBeGreaterThan(0);
    expect(uniq, uniq.slice(0, 60).join('\n')).toEqual([]);
  });
}
