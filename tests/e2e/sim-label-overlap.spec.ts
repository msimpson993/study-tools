import { test, expect, type Page } from '@playwright/test';
import { open } from './helpers';

/**
 * Every Simulation Project step-card tile and its expanded view, at the sizes the reviews use:
 * drawn text boxes (from core text()'s __textLog) must not overlap each other, must stay inside
 * their clip (the plot box when clipped, otherwise the canvas), must not sit on a drawn curve
 * (__curveLog), and must not overlap drawn markers, dashed or target lines, or inset frames
 * (__obstacleLog). Required labels named in the card text / Look-for / How to read this must be
 * present in every expanded view, and on labelled tiles (923 and up) except the
 * one allowed Disk 5 hide. Phone tiles (320, 390, 844×390) are bare, so
 * required-on-tile is not asserted there.
 * Font size stays at least 9 px. Tick numbers on an axis are one size, ≥ 9 px, and sit on their line.
 * Anchored labels must stay near their mark and be ≥ 4 px closer to it than to any other marker or ray.
 * "unstable" must not appear in an all-stable inset.
 *
 * Allow known intentional overlaps or curve-on-label cases only with an explicit, commented entry.
 */
interface L {
  s: string; x0: number; x1: number; y0?: number; y1?: number; role?: string;
  skipped: boolean; gen: number; cv: number; id: string; W: number; H: number;
  where?: string; step?: string; size?: number;
  clip?: { x0: number; y0: number; x1: number; y1: number } | null;
  anchor?: { kind: 'marker' | 'ray' | 'bar' | 'line'; x: number; y: number; x2?: number; y2?: number };
}
interface C {
  pts: { x: number; y: number }[]; width: number; W: number; H: number;
  cv: number; id: string; gen: number; where?: string; step?: string;
}
interface O {
  kind: 'marker' | 'line' | 'inset';
  pts?: { x: number; y: number }[]; width?: number; x?: number; y?: number; r?: number;
  W: number; H: number; cv: number; id: string; gen: number; where?: string; step?: string;
}
interface P {
  x0: number; y0: number; x1: number; y1: number; W: number; H: number;
  cv: number; id: string; gen: number; where?: string; step?: string;
  xr?: [number, number]; yr?: [number, number];
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
 * Labels the card text, Look-for, or How to read this tells the reader to see.
 * Required on every expanded view, and on labelled tiles (923 and up) except
 * allowTileHide (Disk 5's long pole value). Phone tiles are bare, so
 * required-on-tile is not asserted at 320, 390, or 844×390. Optional extras
 * such as "unstable" stay expand-only.
 */
const REQUIRED: { comment: string; tab: string; step?: string; fig: string; re: RegExp; name: string; expandOnly?: boolean; allowTileHide?: boolean }[] = [
  // figures.yaml howToRead, borer / disk s-plane: "The lightly shaded region labelled 'unstable'"
  { comment: "Borer s-plane how-to-read: labelled 'unstable'", tab: 'borer', fig: 'splane', re: /unstable/i, name: 'unstable', expandOnly: true },
  { comment: "Disk s-plane how-to-read: labelled 'unstable'", tab: 'disk', fig: 'splane', re: /unstable/i, name: 'unstable', expandOnly: true },
  { comment: 'Disk 3 Look-for: pole labelled −9.8 + j17.43', tab: 'disk', step: '3', fig: 'splane', re: /−9\.8\s*\+?\s*j17\.43/, name: '−9.8+j17.43' },
  { comment: 'Disk 3 how-to-read: ray labelled with ζ to 2 s.f.', tab: 'disk', step: '3', fig: 'splane', re: /ζ\s*0\.49/, name: 'ζ 0.49' },
  { comment: 'Disk 5 Look-for: pole labelled −0.23 + j139.73', tab: 'disk', step: '5', fig: 'splane', re: /−0\.23\s*\+?\s*j139\.73/, name: '−0.23+j139.73', allowTileHide: true },
  { comment: 'Borer 1: double pole value −6 (double)', tab: 'borer', step: '1', fig: 'splane', re: /−6\s*\(double\)/, name: '−6 (double)' },
  { comment: 'Borer 1 / 3 how-to-read: ζ = 0.6 rays labelled', tab: 'borer', fig: 'splane', re: /ζ\s*0\.6/, name: 'ζ 0.6' },
  { comment: 'Borer 1 / 3 how-to-read: ζ = 1 ray labelled', tab: 'borer', fig: 'splane', re: /ζ\s*1\b/, name: 'ζ 1' },
  { comment: 'Borer 3: pole at −2 next to the zero', tab: 'borer', step: '3', fig: 'splane', re: /^−2$/, name: '−2' },
  { comment: 'Borer 3: pole at −10', tab: 'borer', step: '3', fig: 'splane', re: /^−10$/, name: '−10' },
  { comment: 'Engine 3 Look-for / readout terms: Tr', tab: 'engine', step: '3', fig: 'step', re: /^Tr\b/, name: 'Tr' },
  { comment: 'Engine 3 Look-for / readout terms: Tp', tab: 'engine', step: '3', fig: 'step', re: /\bTp\b/, name: 'Tp' },
  { comment: 'Engine 3 Look-for / readout terms: OS', tab: 'engine', step: '3', fig: 'step', re: /\bOS\b|% overshoot/, name: 'OS' },
  { comment: 'Engine 3 Look-for / readout terms: Ts', tab: 'engine', step: '3', fig: 'step', re: /^Ts /, name: 'Ts' },
  { comment: 'Engine 4 readout terms: Tr', tab: 'engine', step: '4', fig: 'step', re: /^Tr\b/, name: 'Tr' },
  { comment: 'Engine 4 readout terms: Ts', tab: 'engine', step: '4', fig: 'step', re: /^Ts /, name: 'Ts' },
  { comment: 'Engine 5 Look-for: Tr 1.088 s', tab: 'engine', step: '5', fig: 'step', re: /^Tr\b/, name: 'Tr' },
  { comment: 'Engine 5 Look-for: Ts 1.802 s', tab: 'engine', step: '5', fig: 'step', re: /^Ts /, name: 'Ts' },
  { comment: 'Disk s-plane caption: a line of text gives the ceiling Ka = 4080', tab: 'disk', fig: 'splane', re: /^ceiling Ka = 4080/, name: 'ceiling Ka = 4080' },
  { comment: "Disk s-plane caption: the coil's pole value is written in the corner", tab: 'disk', fig: 'splane', re: /^coil pole at/, name: 'coil pole at' },
  { comment: "Disk 5 s-plane caption: the panel says 'ζ ≈ 0'", tab: 'disk', step: '5', fig: 'splane', re: /^ζ ≈ 0/, name: 'ζ ≈ 0' },
  { comment: 'Disk seek caption: the readout gives Ka, OS and Ts', tab: 'disk', fig: 'seek', re: /^Ka = .*OS /, name: 'Seek readout' },
  { comment: 'Motor plot caption: a red bar and label at the right mark the final sag', tab: 'motor', step: '5', fig: 'plot', re: /sag|handout/, name: 'Motor sag' },
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
  (window as any).__obstacleLog = [];
  (window as any).__plotLog = [];
});
const redraw = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('study-theme')));
const take = (page: Page) => page.evaluate(() => {
  const w = window as any, cvs: HTMLCanvasElement[] = w.__textCanvases, l = w.__textLog ?? [], c = w.__curveLog ?? [], o = w.__obstacleLog ?? [], p = w.__plotLog ?? [];
  w.__textLog = []; w.__curveLog = []; w.__obstacleLog = []; w.__plotLog = [];
  const live = (e: { cv: number; W: number; H: number }) => {
    const cv = cvs[e.cv];
    return cv && cv.isConnected && cv.width === e.W && cv.height === e.H && cv.getBoundingClientRect().width > 0;
  };
  return { labels: (l as L[]).filter(live), curves: (c as C[]).filter(live), obstacles: (o as O[]).filter(live), plots: (p as P[]).filter(live) };
}) as Promise<{ labels: L[]; curves: C[]; obstacles: O[]; plots: P[] }>;

const allowed = (p: L, q: L, at: string) => ALLOWLIST.some((a) => a.match(p, q, at));
const curveAllowed = (lab: L, at: string) => CURVE_ALLOWLIST.some((a) => a.match(lab, at));

const latest = <T extends { cv: number; gen: number }>(log: T[]) => {
  const last = new Map<number, number>();
  for (const e of log) last.set(e.cv, Math.max(last.get(e.cv) ?? 0, e.gen));
  return log.filter((e) => e.gen === last.get(e.cv));
};

/**
 * Locally, grow each text box so a slightly wider CI system-ui glyph would still be
 * flagged. Width grows by 9 % plus 2 px (split across both sides); height grows by
 * 2 px. CI itself uses the raw boxes — it is the source of truth for real glyphs.
 */
const LOCAL_GROW = process.env.CI ? 0 : 0.09;
const LOCAL_PX = process.env.CI ? 0 : 2;
const boxOf = (e: L) => {
  const dx = ((e.x1 - e.x0) * LOCAL_GROW + LOCAL_PX) / 2;
  const dy = LOCAL_PX / 2;
  return { x0: e.x0 - dx, x1: e.x1 + dx, y0: (e.y0 ?? 0) - dy, y1: (e.y1 ?? 0) + dy };
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
    const P = boxOf(p), Q = boxOf(q);
    const w = Math.min(P.x1, Q.x1) - Math.max(P.x0, Q.x0), h = Math.min(P.y1, Q.y1) - Math.max(P.y0, Q.y0);
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
    const pad = process.env.CI ? 1.5 : 0;
    const B = boxOf(lab);
    const x0 = B.x0 + pad, y0 = B.y0 + pad, x1 = B.x1 - pad, y1 = B.y1 - pad;
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


const hitsObstacle = (lab: L, o: O) => {
  const pad = process.env.CI ? 1.5 : 0;
  const B = boxOf(lab);
  const x0 = B.x0 + pad, y0 = B.y0 + pad, x1 = B.x1 - pad, y1 = B.y1 - pad;
  if (x1 - x0 < 2 || y1 - y0 < 2) return false;
  if (o.kind === 'marker' && o.x !== undefined && o.y !== undefined) {
    const r = o.r ?? 5;
    const cx = Math.max(x0, Math.min(o.x, x1));
    const cy = Math.max(y0, Math.min(o.y, y1));
    return Math.hypot(cx - o.x, cy - o.y) < r;
  }
  if ((o.kind === 'line' || o.kind === 'inset') && o.pts && o.pts.length >= 2) {
    const w = (o.width ?? 1) / 2;
    for (let i = 1; i < o.pts.length; i++) {
      const a = o.pts[i - 1], b = o.pts[i];
      if (segHits(a.x, a.y, b.x, b.y, x0 - w, y0 - w, x1 + w, y1 + w)) return true;
    }
  }
  return false;
};

const onObstacle = (labels: L[], marks: O[], at: string) => {
  const out: string[] = [];
  const labs = latest(labels).filter((e) => !e.skipped && e.s.trim() && e.y0 !== undefined && e.role !== 'tick');
  const obs = latest(marks);
  for (const lab of labs) {
    if (curveAllowed(lab, at)) continue;
    const hit = obs.filter((o) => o.cv === lab.cv).find((o) => hitsObstacle(lab, o));
    if (hit) {
      const what = hit.kind === 'marker' ? 'marker' : hit.kind === 'inset' ? 'inset frame' : 'dashed or target line';
      out.push(`${at} ${lab.id || 'canvas'}: “${lab.s}” sits on a ${what}`);
    }
  }
  return out;
};

const distToSeg = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};
const distToAnchor = (lab: L) => {
  const a = lab.anchor, x0 = lab.x0, x1 = lab.x1, y0 = lab.y0 ?? 0, y1 = lab.y1 ?? 0;
  if (!a) return 0;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  if (a.x2 !== undefined && a.y2 !== undefined) {
    const corners: [number, number][] = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
    let d = Math.min(...corners.map(([x, y]) => distToSeg(x, y, a.x, a.y, a.x2!, a.y2!)));
    for (const [ex, ey] of [[a.x, a.y], [a.x2, a.y2]] as [number, number][]) {
      d = Math.min(d, Math.hypot(clamp(ex, x0, x1) - ex, clamp(ey, y0, y1) - ey));
    }
    return d;
  }
  return Math.hypot(clamp(a.x, x0, x1) - a.x, clamp(a.y, y0, y1) - a.y);
};
/** "about 12 px" for a point marker or ray; a little more for a rise / settling bar. */
const ANCHOR_MAX = (kind: string) => (kind === 'bar' || kind === 'line' ? 24 : 16);
const farFromAnchor = (log: L[], at: string) => {
  const out: string[] = [];
  for (const lab of latest(log)) {
    if (lab.skipped || !lab.s.trim() || !lab.anchor || lab.y0 === undefined) continue;
    const d = distToAnchor(lab), max = ANCHOR_MAX(lab.anchor.kind);
    if (d > max) out.push(`${at} ${lab.id || 'canvas'}: “${lab.s}” is ${d.toFixed(1)} px from its ${lab.anchor.kind} (max ${max})`);
    if (lab.anchor.kind === 'ray' && lab.anchor.x2 !== undefined) {
      const axisX = Math.max(lab.anchor.x, lab.anchor.x2);
      if (lab.x0 > axisX + 2) out.push(`${at} ${lab.id || 'canvas'}: “${lab.s}” sits in the right half-plane, off its ray`);
    }
  }
  return out;
};

/** Every tick column / row on a canvas uses one size, all ≥ 9 px (BUG-61). */
const tickSizeMix = (log: L[], at: string) => {
  const out: string[] = [];
  const by = new Map<number, L[]>();
  for (const e of latest(log)) {
    if (e.skipped || e.role !== 'tick' || e.size === undefined || e.y0 === undefined) continue;
    const a = by.get(e.cv) ?? []; a.push(e); by.set(e.cv, a);
  }
  const horiz = (e: L) => !!(e.anchor && Math.abs(e.anchor.y - (e.anchor.y2 ?? e.anchor.y)) < 1 && Math.abs((e.anchor.x2 ?? e.anchor.x) - e.anchor.x) > 4);
  const vert = (e: L) => !!(e.anchor && Math.abs(e.anchor.x - (e.anchor.x2 ?? e.anchor.x)) < 1 && Math.abs((e.anchor.y2 ?? e.anchor.y) - e.anchor.y) > 4);
  const check = (g: L[], axis: string) => {
    if (g.length < 2) return;
    const sizes = [...new Set(g.map((e) => Math.round((e.size ?? 0) * 10) / 10))];
    const small = g.filter((e) => (e.size ?? 0) < 9 - 0.01);
    if (small.length) out.push(`${at} ${g[0].id || 'canvas'}: tick “${small[0].s}” is ${small[0].size!.toFixed(1)} px (min 9)`);
    else if (sizes.length > 1) out.push(`${at} ${g[0].id || 'canvas'}: mixed tick sizes ${sizes.join(' / ')} px on the ${axis} axis (“${g.map((e) => e.s).join('”, “')}”)`);
  };
  const groups = (labs: L[], key: (e: L) => string) => {
    const m = new Map<string, L[]>();
    for (const e of labs) { const k = key(e); const a = m.get(k) ?? []; a.push(e); m.set(k, a); }
    return [...m.values()];
  };
  // one axis = one plot box (a canvas may host a main plot and an inset, each with its own size)
  const boxY = (e: L) => `${Math.round(e.anchor!.x / 2) * 2}:${Math.round((e.anchor!.x2 ?? e.anchor!.x) / 2) * 2}`;
  const boxX = (e: L) => `${Math.round(e.anchor!.y / 2) * 2}:${Math.round((e.anchor!.y2 ?? e.anchor!.y) / 2) * 2}`;
  for (const labs of by.values()) {
    for (const g of groups(labs.filter(horiz), boxY)) check(g, 'y');
    for (const g of groups(labs.filter(vert), boxX)) check(g, 'x');
  }
  return out;
};

/** Y-axis tick labels stay within ~2 px of their tick line (BUG-65). */
const tickAlign = (log: L[], at: string) => {
  const out: string[] = [];
  for (const lab of latest(log)) {
    if (lab.skipped || lab.role !== 'tick' || !lab.anchor || lab.y0 === undefined || lab.anchor.y2 === undefined) continue;
    const horiz = Math.abs(lab.anchor.y - lab.anchor.y2) < 1 && Math.abs((lab.anchor.x2 ?? lab.anchor.x) - lab.anchor.x) > 4;
    if (!horiz) continue;
    const mid = ((lab.y0 ?? 0) + (lab.y1 ?? 0)) / 2;
    const d = Math.abs(mid - lab.anchor.y);
    if (d > 2.5) out.push(`${at} ${lab.id || 'canvas'}: tick “${lab.s}” is ${d.toFixed(1)} px off its line (max 2 px)`);
  }
  return out;
};

const boxDistPt = (e: L, x: number, y: number) => {
  const cx = Math.max(e.x0, Math.min(x, e.x1)), cy = Math.max(e.y0 ?? 0, Math.min(y, e.y1 ?? 0));
  return Math.hypot(cx - x, cy - y);
};
const boxDistSeg = (e: L, x1: number, y1: number, x2: number, y2: number) => {
  const n = Math.max(8, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 4));
  let best = Infinity;
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    best = Math.min(best, boxDistPt(e, x1 + (x2 - x1) * u, y1 + (y2 - y1) * u));
  }
  return best;
};

/** A pole / ζ label must be ≥ 4 px closer (by its centre) to its own mark than to any other ×, ○, or other ray (BUG-64). Ticks are not in this check. */
const nearerThanOthers = (log: L[], marks: O[], at: string) => {
  const out: string[] = [];
  const labs = latest(log).filter((e) => !e.skipped && e.role === 'axis' && e.anchor && (e.anchor.kind === 'marker' || e.anchor.kind === 'ray') && e.y0 !== undefined && e.s.trim());
  const markers = latest(marks).filter((o) => o.kind === 'marker' && o.x !== undefined && o.y !== undefined);
  const centre = (e: L) => ({ x: (e.x0 + e.x1) / 2, y: ((e.y0 ?? 0) + (e.y1 ?? 0)) / 2 });
  const distPt = (e: L, x: number, y: number) => { const c = centre(e); return Math.hypot(c.x - x, c.y - y); };
  const distSeg = (e: L, x1: number, y1: number, x2: number, y2: number) => {
    const c = centre(e);
    const n = Math.max(8, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 4));
    let best = Infinity;
    for (let k = 0; k <= n; k++) { const u = k / n; best = Math.min(best, Math.hypot(c.x - (x1 + (x2 - x1) * u), c.y - (y1 + (y2 - y1) * u))); }
    return best;
  };
  const dOwnOf = (lab: L) => lab.anchor!.kind === 'ray' && lab.anchor!.x2 !== undefined
    ? distSeg(lab, lab.anchor!.x, lab.anchor!.y, lab.anchor!.x2, lab.anchor!.y2!)
    : distPt(lab, lab.anchor!.x, lab.anchor!.y);
  for (const lab of labs) {
    const dOwn = dOwnOf(lab);
    for (const mk of markers.filter((m) => m.cv === lab.cv)) {
      if (lab.anchor!.kind === 'marker' && Math.hypot((mk.x ?? 0) - lab.anchor!.x, (mk.y ?? 0) - lab.anchor!.y) < 5) continue;
      // a ζ ray's own poles sit on the ray — they are not "another mark"
      if (lab.anchor!.kind === 'ray' && lab.anchor!.x2 !== undefined) {
        const dRay = (() => {
          const n = Math.max(8, Math.ceil(Math.hypot(lab.anchor!.x2! - lab.anchor!.x, lab.anchor!.y2! - lab.anchor!.y) / 4));
          let best = Infinity;
          for (let k = 0; k <= n; k++) {
            const u = k / n;
            best = Math.min(best, Math.hypot((mk.x ?? 0) - (lab.anchor!.x + (lab.anchor!.x2! - lab.anchor!.x) * u), (mk.y ?? 0) - (lab.anchor!.y + (lab.anchor!.y2! - lab.anchor!.y) * u)));
          }
          return best;
        })();
        if (dRay < 10) continue;
      }
      const d = distPt(lab, mk.x!, mk.y!);
      if (d + 0.01 < dOwn + 4)
        out.push(`${at} ${lab.id || 'canvas'}: “${lab.s}” is ${d.toFixed(1)} px from another mark, only ${dOwn.toFixed(1)} from its own ${lab.anchor!.kind} (need ≥ 4 px closer)`);
    }
    if (lab.anchor!.kind !== 'ray') continue;
    for (const other of labs) {
      if (other.cv !== lab.cv || other === lab || other.anchor?.kind !== 'ray' || other.anchor.x2 === undefined) continue;
      if (Math.hypot(lab.anchor!.x - other.anchor.x, lab.anchor!.y - other.anchor.y) < 2
        && Math.hypot((lab.anchor!.x2 ?? 0) - (other.anchor.x2 ?? 0), (lab.anchor!.y2 ?? 0) - (other.anchor.y2 ?? 0)) < 2) continue;
      const d = distSeg(lab, other.anchor.x, other.anchor.y, other.anchor.x2!, other.anchor.y2!);
      if (d + 0.01 < dOwn + 4)
        out.push(`${at} ${lab.id || 'canvas'}: “${lab.s}” is ${d.toFixed(1)} px from another ray, only ${dOwn.toFixed(1)} from its own ray (need ≥ 4 px closer)`);
    }
  }
  return out;
};

const missingRequired = (labels: L[], at: string, tab: string, step: string, fig: string | null, check: boolean) => {
  if (!check) return [];
  const isTile = fig === null;
  const labs = latest(labels).filter((e) => !e.skipped && e.s.trim() && e.role !== 'tick');
  const out: string[] = [];
  for (const req of REQUIRED) {
    if (req.tab !== tab) continue;
    if (req.step && req.step !== step) continue;
    if (fig !== null && req.fig !== fig) continue;
    if (req.expandOnly && isTile) continue;
    if (req.allowTileHide && isTile) continue;
    // a tile check has fig=null and must find the label on the matching fig's canvas
    const pool = fig !== null ? labs : labs.filter((e) => e.id === req.fig);
    if (fig === null && !pool.length && !labs.some((e) => e.id === req.fig)) continue; // that fig is not on this tile view
    if (!pool.some((e) => req.re.test(e.s))) out.push(`${at}: missing required label “${req.name}” (${req.comment})`);
  }
  return out;
};

/** Font size is never below the 9 px floor (BUG-60). */
const tooSmall = (log: L[], at: string, tab: string, step: string, fig: string | null) => {
  const out: string[] = [];
  const isTile = fig === null;
  for (const e of latest(log)) {
    if (e.skipped || !e.s.trim() || e.size === undefined) continue;
    if (e.size >= 9 - 0.01) continue;
    if (e.role === 'tick') { out.push(`${at} ${e.id || 'canvas'}: tick “${e.s}” is ${e.size.toFixed(1)} px (min 9)`); continue; }
    // the 9 px floor is for caption-referenced required labels (BUG-60 rest), not every fitted note
    const needed = REQUIRED.some((req) => {
      if (req.tab !== tab) return false;
      if (req.step && req.step !== step) return false;
      if (fig !== null && req.fig !== fig) return false;
      if (isTile && req.fig !== e.id) return false;
      if (req.expandOnly && isTile) return false;
      return req.re.test(e.s);
    });
    if (needed) out.push(`${at} ${e.id || 'canvas'}: “${e.s}” is ${e.size.toFixed(1)} px (min 9)`);
  }
  return out;
};

/** "unstable" must not appear inside a zoom inset whose window is the stable half-plane (BUG-53). */
const unstableInInset = (labels: L[], marks: O[], at: string) => {
  const out: string[] = [];
  const labs = latest(labels).filter((e) => !e.skipped && /unstable/i.test(e.s) && e.y0 !== undefined);
  const insets = latest(marks).filter((o) => o.kind === 'inset' && o.pts && o.pts.length >= 4);
  for (const lab of labs) {
    const B = { x0: lab.x0, x1: lab.x1, y0: lab.y0 ?? 0, y1: lab.y1 ?? 0 };
    for (const inset of insets.filter((o) => o.cv === lab.cv)) {
      const xs = inset.pts!.map((p) => p.x), ys = inset.pts!.map((p) => p.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      if (B.x0 >= x0 - 1 && B.x1 <= x1 + 1 && B.y0 >= y0 - 1 && B.y1 <= y1 + 1)
        out.push(`${at}: “${lab.s}” drawn inside a zoom inset`);
    }
  }
  return out;
};

/** Phone tiles stay bare of axis names such as σ and jω (BUG-67). */
const bareAxisNames = (log: L[], at: string) => {
  const out: string[] = [];
  for (const e of latest(log)) {
    if (e.skipped || !e.s.trim()) continue;
    if (/^(σ|jω)\b|σ \(1\/s\)|jω \(rad/.test(e.s))
      out.push(`${at} ${e.id || 'canvas'}: axis name “${e.s}” drawn on a bare tile`);
  }
  return out;
};

/** Every axis that shows numbers has at least 2 labelled ticks, plus 0 when 0 is in range (BUG-68). */
const minTicks = (log: L[], plots: P[], at: string) => {
  const out: string[] = [];
  const ticks = latest(log).filter((e) => !e.skipped && e.role === 'tick' && e.y0 !== undefined && e.s.trim());
  const horiz = (e: L) => !!(e.anchor && Math.abs(e.anchor.y - (e.anchor.y2 ?? e.anchor.y)) < 1 && Math.abs((e.anchor.x2 ?? e.anchor.x) - e.anchor.x) > 4);
  const vert = (e: L) => !!(e.anchor && Math.abs(e.anchor.x - (e.anchor.x2 ?? e.anchor.x)) < 1 && Math.abs((e.anchor.y2 ?? e.anchor.y) - e.anchor.y) > 4);
  const byCv = new Map<number, L[]>();
  for (const e of ticks) { const a = byCv.get(e.cv) ?? []; a.push(e); byCv.set(e.cv, a); }
  const boxY = (e: L) => `${Math.round(e.anchor!.x / 2) * 2}:${Math.round((e.anchor!.x2 ?? e.anchor!.x) / 2) * 2}`;
  const boxX = (e: L) => `${Math.round(e.anchor!.y / 2) * 2}:${Math.round((e.anchor!.y2 ?? e.anchor!.y) / 2) * 2}`;
  const groups = (labs: L[], key: (e: L) => string) => {
    const m = new Map<string, L[]>();
    for (const e of labs) { const k = key(e); const a = m.get(k) ?? []; a.push(e); m.set(k, a); }
    return [...m.values()];
  };
  const check = (g: L[], axis: string) => {
    if (!g.length) return;
    if (g.length < 2) out.push(`${at} ${g[0].id || 'canvas'}: ${axis}-axis has ${g.length} labelled tick${g.length === 1 ? '' : 's'} (“${g.map((e) => e.s).join('”, “')}”; min 2)`);
  };
  for (const labs of byCv.values()) {
    for (const g of groups(labs.filter(horiz), boxY)) check(g, 'y');
    for (const g of groups(labs.filter(vert), boxX)) check(g, 'x');
  }
  for (const pl of latest(plots)) {
    const labs = ticks.filter((e) => e.cv === pl.cv && e.id === pl.id);
    if (!labs.length) continue;
    const xr = pl.xr, yr = pl.yr;
    const needs0 = (xr && xr[0] <= 0 && 0 <= xr[1]) || (yr && yr[0] <= 0 && 0 <= yr[1]);
    if (needs0 && !labs.some((e) => e.s === '0'))
      out.push(`${at} ${pl.id || 'canvas'}: 0 is in range but no labelled 0 tick`);
  }
  return out;
};

/** On tiles, the plot box is at least ~60% of the tile height (BUG-69). */
const plotAreaFraction = (plots: P[], at: string) => {
  const out: string[] = [];
  for (const pl of latest(plots)) {
    if (!(pl.H > 0)) continue;
    const frac = (pl.y1 - pl.y0) / pl.H;
    if (frac < 0.58)
      out.push(`${at} ${pl.id || 'canvas'}: plot is ${(frac * 100).toFixed(1)}% of the tile height (min ~60%)`);
  }
  return out;
};

/** Caption-named header readouts on labelled tiles take at most 2 lines (BUG-69). */
const headerTwoLines = (log: L[], at: string) => {
  const out: string[] = [];
  const header = /^(ceiling Ka|coil pole at|Ka = |K = |OS |error |offset |ζ = |ω = |\|S\||P = |open sag|closed sag|loop gain)/;
  for (const e of latest(log)) {
    if (e.skipped || e.role === 'tick' || !e.s.trim() || e.y0 === undefined || e.size == null) continue;
    if (!header.test(e.s)) continue;
    const span = (e.y1 ?? e.y0) - e.y0;
    if (span > e.size * 2.45 + 1)
      out.push(`${at} ${e.id || 'canvas'}: “${e.s}” is ${span.toFixed(1)} px tall at ${e.size.toFixed(1)} px (more than 2 lines)`);
  }
  return out;
};

async function waitTiles(page: Page, card: ReturnType<Page['locator']>) {
  await card.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect.poll(async () => card.locator('.step-thumbs canvas[data-fig], .tile-frame canvas[data-fig]').count(), { timeout: 12_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(200);
}

for (const vp of VIEWPORTS) {
  test(`sim-project @${vp.label}: step-card tiles and expanded views keep labels apart, on the clip, off curves and markers, near their anchors, complete, and at least 9 px`, async ({ page }) => {
    test.setTimeout(420_000);
    await page.addInitScript(() => { (window as any).__textLog = []; (window as any).__textCanvases = []; (window as any).__curveLog = []; (window as any).__obstacleLog = []; (window as any).__plotLog = []; });
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
        const tileObs = takenTiles.obstacles.filter((e) => e.where === 'tile' && e.step === step);
        seen += tiles.length;
        const atTile = `${tab} step ${step} tile @${vp.label}`;
        const tilePlots = takenTiles.plots.filter((e) => e.where === 'tile' && e.step === step);
        bad.push(...collisions(tiles, atTile), ...clipped(tiles, atTile), ...onCurve(tiles, tileCurves, atTile), ...onObstacle(tiles, tileObs, atTile), ...farFromAnchor(tiles, atTile));
        bad.push(...tooSmall(tiles, atTile, tab, step, null), ...unstableInInset(tiles, tileObs, atTile));
        bad.push(...missingRequired(tiles, atTile, tab, step, null, vp.labelled));
        bad.push(...tickSizeMix(tiles, atTile), ...tickAlign(tiles, atTile), ...nearerThanOthers(tiles, tileObs, atTile));
        bad.push(...minTicks(tiles, tilePlots, atTile), ...plotAreaFraction(tilePlots, atTile));
        if (!vp.labelled) bad.push(...bareAxisNames(tiles, atTile));
        else bad.push(...headerTwoLines(tiles, atTile));

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
          const expObs = takenExp.obstacles.filter((e) => e.where === 'expand');
          seen += exp.length;
          const atExp = `${tab} step ${step} expand ${fig} @${vp.label}`;
          const expPlots = takenExp.plots.filter((e) => e.where === 'expand');
          bad.push(...collisions(exp, atExp), ...clipped(exp, atExp), ...onCurve(exp, expCurves, atExp), ...onObstacle(exp, expObs, atExp), ...farFromAnchor(exp, atExp));
          bad.push(...tooSmall(exp, atExp, tab, step, fig), ...unstableInInset(exp, expObs, atExp));
          bad.push(...missingRequired(exp, atExp, tab, step, fig, true));
          bad.push(...tickSizeMix(exp, atExp), ...tickAlign(exp, atExp), ...nearerThanOthers(exp, expObs, atExp));
          bad.push(...minTicks(exp, expPlots, atExp));
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
