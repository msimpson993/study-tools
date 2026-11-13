import { C, cabs, type Cx } from './dsp/complex';
import { type TF, type StepMetrics, type Margins, type Bode, bode, margins, stepMetrics, tfEval, logspace, tfPoles, tfZeros, freqresp } from './dsp/tf';
import { type RLocus, rlocusPolesAt, rlocusNearest } from './dsp/rlocus';
import { col, planeFrame, rangeFrame, wipe, text, tline, polyline, dot, cross, graphAxes, curve, clipBox, heat, axes2, type Frame, type V2 } from './viz';
import type { PanelPointer } from './figure';

/**
 * Control-systems pictures that sit on top of `viz.ts` and `@study/core/dsp` (tf, rlocus). Each `draw…` function paints one
 * canvas panel from plain data, so a figure is `figureOf((c) => [{ id, title, x, y, draw: (g, w, h) => drawX(g, w, h, {...}) }])`.
 * Draggable things come as `PanelPointer`s (see figure.ts) and must be mirrored by sliders: a drag only calls your `on…` callback,
 * which should `controls.set(...)` the same controls the sliders use.
 *
 *   drawStepResponse   step response with optional Tr / Tp / %OS / ±band / Ts / ess markers and a ghost trace
 *   drawSPlane         s-plane: poles ×, zeros ○, ζ rays, ωn circles, spec region, locus branches, marks, drag handles
 *   drawRootLocus      the s-plane view of an `RLocus` with asymptotes, breakaways, jω crossings and the poles at gain K
 *   drawBode           magnitude (dB) over phase (°) with gain / phase margin bars
 *   drawHeightMap      |G(s)| as a height (colour) map over the s-plane, jω axis highlighted, optional probe at s = jω
 *   drawJwSlice        |G(jω)| along the imaginary axis, i.e. the cut through the height map (= the Bode magnitude)
 *   splaneDrag / locusDrag   pointer hooks to drag poles/zeros in the s-plane, or to drag the gain along a locus
 */
export const BRANCH_COLORS = (): string[] => [col.a(), col.b(), col.c(), col.d(), col.e(), '#ff7eb9', col.accent(), col.muted()];
const fmtN = (v: number, d = 2) => (Number.isFinite(v) ? String(+v.toFixed(d)) : '—');
const fmtC = (z: Cx) => (Math.abs(z.im) < 1e-9 ? fmtN(z.re) : `${fmtN(z.re)}${z.im < 0 ? '−' : '+'}j${fmtN(Math.abs(z.im))}`);
const niceStep = (span: number, n: number) => { const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };

/* ═════════════════════════════ step response ═════════════════════════════ */
export interface StepViewSpec {
  t: ArrayLike<number>; y: ArrayLike<number>;
  /** a faint dashed second trace (e.g. the previous tuning) */ ghost?: { t: ArrayLike<number>; y: ArrayLike<number>; label?: string };
  /** reference level (default 1) */ ref?: number; /** final value; default = last sample */ final?: number;
  /** which markers to draw; each is optional and off by default */
  show?: { timing?: boolean; overshoot?: boolean; band?: boolean; settling?: boolean; ess?: boolean };
  /** settling band fraction (default 0.02) */ band?: number;
  tEnd?: number; yRange?: V2; xLabel?: string; yLabel?: string; color?: string;
}
/** Draw a step response. Returns the metrics used for the markers (or null when the data has fewer than 3 samples). */
export function drawStepResponse(g: CanvasRenderingContext2D, w: number, h: number, s: StepViewSpec): StepMetrics | null {
  wipe(g, w, h);
  const t = Array.from(s.t), y = Array.from(s.y), ref = s.ref ?? 1, band = s.band ?? 0.02, show = s.show ?? {};
  if (t.length < 3) return null;
  const tEnd = s.tEnd ?? t[t.length - 1];
  const all = [...y, ...(s.ghost ? Array.from(s.ghost.y) : []), ref];
  const yr: V2 = s.yRange ?? [Math.min(0, ...all) - 0.05 * Math.abs(ref), Math.max(ref * 1.15, Math.max(...all) * 1.06)];
  const f = rangeFrame(w, h, [0, tEnd], yr, 46, 14, 10, 32);
  graphAxes(g, f, [0, tEnd], yr, s.xLabel ?? 'time (s)', s.yLabel ?? 'output');
  const m = stepMetrics(t, y, { ref, final: s.final, band });
  const yf = m.yFinal;
  if (show.band && Number.isFinite(yf)) { g.save(); clipBox(g, f); g.fillStyle = col.ok(); g.globalAlpha = 0.14; g.fillRect(f.box.l, f.Y(yf * (1 + band)), f.box.r - f.box.l, f.Y(yf * (1 - band)) - f.Y(yf * (1 + band))); g.restore(); text(g, `±${fmtN(band * 100, 0)}%`, f.box.l + 4, f.Y(yf * (1 - band)) + 9, col.ok(), 'left', 10); }
  tline(g, f, [0, ref], [tEnd, ref], col.muted(), 1, [5, 4]);
  if (s.ghost) curve(g, f, Array.from(s.ghost.t), Array.from(s.ghost.y), col.muted(), 2, [6, 4]);
  curve(g, f, t, y, s.color ?? col.a(), 2.4);
  if (s.ghost?.label) text(g, `┄ ${s.ghost.label}`, f.box.r - 5, f.box.b - 8, col.muted(), 'right', 10);
  const lbl = (str: string, px: number, py: number, color: string, align: CanvasTextAlign = 'left') => text(g, str, px, py, color, align, 10.5);
  if (show.timing && Number.isFinite(m.riseTime)) {
    const y10 = yf * 0.1, y90 = yf * 0.9;
    tline(g, f, [m.t10, y10], [m.t10, 0], col.e(), 1, [2, 3]); tline(g, f, [m.t90, y90], [m.t90, 0], col.e(), 1, [2, 3]);
    g.strokeStyle = col.e(); g.lineWidth = 2; g.beginPath(); g.moveTo(f.X(m.t10), f.Y(yr[0]) - 6); g.lineTo(f.X(m.t90), f.Y(yr[0]) - 6); g.stroke();
    lbl(`Tr ${fmtN(m.riseTime)} s`, f.X((m.t10 + m.t90) / 2), f.Y(yr[0]) - 15, col.e(), 'center');
  }
  if (show.overshoot && Number.isFinite(m.peak) && m.overshootPct > 0.05) {
    tline(g, f, [m.peakTime, m.peak], [m.peakTime, yr[0]], col.b(), 1, [2, 3]); dot(g, f, [m.peakTime, m.peak], col.b(), 4);
    lbl(`${fmtN(m.overshootPct, 1)}% overshoot  (Tp ${fmtN(m.peakTime)} s)`, Math.min(f.X(m.peakTime) + 8, f.box.r - 4), f.Y(m.peak) - 8, col.b(), f.X(m.peakTime) > w * 0.6 ? 'right' : 'left');
  }
  if (show.settling && m.settled && Number.isFinite(m.settlingTime)) {
    tline(g, f, [m.settlingTime, yr[0]], [m.settlingTime, yr[1]], col.c(), 1.5, [5, 4]);
    lbl(`Ts ${fmtN(m.settlingTime)} s`, f.X(m.settlingTime) + 4, f.box.b - 18, col.c());
  }
  if (show.ess && Number.isFinite(m.ess) && Math.abs(m.ess) > 1e-3 * Math.max(1, Math.abs(ref))) {
    const xe = tEnd * 0.985; tline(g, f, [xe, yf], [xe, ref], col.bad(), 3);
    lbl(`ess ${fmtN(m.ess, 3)}`, f.X(xe) - 6, f.Y((yf + ref) / 2), col.bad(), 'right');
  }
  return m;
}

/* ═════════════════════════════ s-plane ═════════════════════════════ */
export interface SPlaneMark { s: Cx; label?: string; color?: string; shape?: 'dot' | 'ring' | 'diamond' }
export interface SPlaneSpec {
  /** the plane shows at least ±range (equal aspect) */ range: number; /** real-axis centre of the view (default −0.3·range, to give the left half plane room) */ reCenter?: number;
  poles?: Cx[]; zeros?: Cx[]; /** print “σ ± jω” next to each pole (upper half / real only) */ labels?: boolean;
  /** damping ratios whose rays (angle acos ζ off the negative real axis) are drawn */ zetaRays?: number[]; /** natural frequencies whose circles are drawn */ wnCircles?: number[];
  /** shaded “allowed” region: damping ≥ zeta, ωn ≤ wn, decay rate σ ≥ sigma (any subset) */ region?: { zeta?: number; wn?: number; sigma?: number };
  shadeUnstable?: boolean;
  /** locus branches (poly-lines), drawn under the poles */ locus?: Cx[][]; asymptotes?: { centroid: number; anglesDeg: number[] };
  marks?: SPlaneMark[];
  /** rings drawn around draggable poles/zeros so the affordance is visible */ handles?: Cx[];
  xLabel?: string; yLabel?: string;
}
/** The frame every s-plane panel with the same (w, h, range, reCenter) uses; dragging code calls this too so hits line up with pixels. */
export const splaneFrame = (w: number, h: number, range: number, reCenter = -0.3 * range): Frame => planeFrame(w, h, range, reCenter, 0, 6);

export function drawSPlane(g: CanvasRenderingContext2D, w: number, h: number, s: SPlaneSpec): Frame {
  wipe(g, w, h);
  const f = splaneFrame(w, h, s.range, s.reCenter), R = Math.hypot(w, h) / Math.min(f.sx, f.sy);
  const x0 = f.X(0), y0 = f.Y(0);
  if (s.shadeUnstable !== false) { g.save(); clipBox(g, f); g.fillStyle = col.bad(); g.globalAlpha = 0.07; g.fillRect(Math.max(x0, f.box.l), f.box.t, f.box.r - Math.max(x0, f.box.l), f.box.b - f.box.t); g.restore(); if (x0 < f.box.r - 70) text(g, 'unstable', f.box.r - 5, f.box.t + 10, col.bad(), 'right', 10); }
  // grid
  const st = niceStep(2 * s.range, 6); g.save(); clipBox(g, f); g.strokeStyle = col.grid(); g.lineWidth = 1;
  for (let x = Math.ceil(f.ix(f.box.l) / st) * st; x <= f.ix(f.box.r); x += st) { g.beginPath(); g.moveTo(f.X(x), f.box.t); g.lineTo(f.X(x), f.box.b); g.stroke(); text(g, String(+x.toFixed(3)), f.X(x) + 2, f.box.b - 6, col.muted(), 'left', 9); }
  for (let y = Math.ceil(f.iy(f.box.b) / st) * st; y <= f.iy(f.box.t); y += st) { g.beginPath(); g.moveTo(f.box.l, f.Y(y)); g.lineTo(f.box.r, f.Y(y)); g.stroke(); if (Math.abs(y) > 1e-9) text(g, String(+y.toFixed(3)), f.box.l + 3, f.Y(y) - 6, col.muted(), 'left', 9); }
  g.restore();
  // allowed region
  if (s.region) {
    const r = s.region; g.save(); clipBox(g, f);
    if (r.sigma !== undefined) { g.beginPath(); g.rect(f.box.l, f.box.t, f.X(-r.sigma) - f.box.l, f.box.b - f.box.t); g.clip(); }
    if (r.zeta !== undefined) { const th = Math.acos(Math.min(1, Math.max(0, r.zeta))); g.beginPath(); g.moveTo(x0, y0); g.lineTo(f.X(-Math.cos(th) * R), f.Y(Math.sin(th) * R)); g.lineTo(f.X(-R), f.Y(0)); g.lineTo(f.X(-Math.cos(th) * R), f.Y(-Math.sin(th) * R)); g.closePath(); g.clip(); }
    if (r.wn !== undefined) { g.beginPath(); g.arc(x0, y0, r.wn * f.sx, 0, 2 * Math.PI); g.clip(); }
    g.fillStyle = col.ok(); g.globalAlpha = 0.13; g.fillRect(f.box.l, f.box.t, f.box.r - f.box.l, f.box.b - f.box.t); g.restore();
  }
  axes2(g, f, s.xLabel ?? 'σ (1/s)', s.yLabel ?? 'jω (rad/s)');
  g.save(); clipBox(g, f);
  g.strokeStyle = col.strong(); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, f.box.t); g.lineTo(x0, f.box.b); g.stroke(); // the jω axis: the edge of stability
  for (const wn of s.wnCircles ?? []) { g.strokeStyle = col.d(); g.globalAlpha = 0.7; g.lineWidth = 1; g.setLineDash([3, 4]); g.beginPath(); g.arc(x0, y0, wn * f.sx, Math.PI / 2, (3 * Math.PI) / 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; text(g, `ωn ${fmtN(wn)}`, x0 - wn * f.sx + 3, y0 + 10, col.d(), 'left', 10); }
  for (const z of s.zetaRays ?? []) {
    const th = Math.acos(Math.min(1, Math.max(0, z)));
    for (const sg of [1, -1]) tline(g, f, [0, 0], [-Math.cos(th) * R, sg * Math.sin(th) * R], col.e(), 1, [5, 4]);
    const rl = Math.min(s.range * 0.9, R); text(g, `ζ ${fmtN(z)}`, f.X(-Math.cos(th) * rl) + 4, f.Y(Math.sin(th) * rl) + 2, col.e(), 'left', 10);
  }
  if (s.asymptotes) for (const a of s.asymptotes.anglesDeg) { const r = (a * Math.PI) / 180; tline(g, f, [s.asymptotes.centroid, 0], [s.asymptotes.centroid + Math.cos(r) * R, Math.sin(r) * R], col.muted(), 1.2, [6, 4]); }
  const pal = BRANCH_COLORS();
  (s.locus ?? []).forEach((br, i) => polyline(g, f, br.map((z): V2 => [z.re, z.im]), pal[i % pal.length], 2));
  for (const m of s.marks ?? []) {
    const c = m.color ?? col.accent(), p: V2 = [m.s.re, m.s.im];
    if (m.shape === 'ring') dot(g, f, p, c, 5, true); else if (m.shape === 'diamond') { const X = f.X(p[0]), Y = f.Y(p[1]); g.fillStyle = c; g.beginPath(); g.moveTo(X, Y - 6); g.lineTo(X + 5, Y); g.lineTo(X, Y + 6); g.lineTo(X - 5, Y); g.closePath(); g.fill(); } else dot(g, f, p, c, 5);
    if (m.label) text(g, m.label, f.X(p[0]) + 8, f.Y(p[1]) - 9, c, 'left', 10);
  }
  for (const hd of s.handles ?? []) for (const sg of Math.abs(hd.im) < 1e-9 ? [1] : [1, -1]) { g.strokeStyle = col.accent(); g.globalAlpha = sg === 1 ? 0.9 : 0.4; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.arc(f.X(hd.re), f.Y(sg * hd.im), 11, 0, 2 * Math.PI); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
  for (const z of s.zeros ?? []) dot(g, f, [z.re, z.im], col.c(), 5, true);
  for (const p of s.poles ?? []) { cross(g, f, [p.re, p.im], col.b(), 6); if (s.labels && p.im >= -1e-9) text(g, fmtC(p), f.X(p.re) + 9, f.Y(p.im) + (p.im > 1e-9 ? 14 : -12), col.b(), 'left', 10); }
  g.restore();
  return f;
}

/** Natural frequency and damping ratio of a pole (ζ = −σ/|s|; ζ < 0 means unstable). */
export const wnZeta = (p: Cx): { wn: number; zeta: number } => { const wn = cabs(p); return { wn, zeta: wn > 0 ? -p.re / wn : 1 }; };
/** The pole in the upper half plane with natural frequency wn and damping ratio zeta (ζ > 1 gives a real pair: use the first). */
export const poleFromWnZeta = (wn: number, zeta: number): Cx => (zeta >= 1 ? C(-wn * (zeta - Math.sqrt(zeta * zeta - 1)), 0) : C(-zeta * wn, wn * Math.sqrt(1 - zeta * zeta)));

export interface SPlaneDragSpec {
  range: number; reCenter?: number;
  /** the draggable points; ids are yours (`'p1'`, `'zero'`…) */ handles: () => { id: string; s: Cx }[];
  /** called while dragging with the new s (already mirrored to the upper half plane when `upperOnly`); set your controls here */ onDrag: (id: string, s: Cx) => void;
  /** grab radius in px (default 18; 26 for touch-sized forgiveness is a good value on phones) */ radius?: number;
  /** drags of a handle with im ≥ 0 stay in the upper half plane (a conjugate pair) — default false */ upperOnly?: boolean;
  /** constrain a handle to the real axis: ids in this set */ realOnly?: string[];
  /** keep points inside ±limit of the view (default 1.15·range) */ limit?: number;
}
/** Pointer hook: drag poles/zeros around the s-plane. Conjugates are the caller's business (see `upperOnly`). */
export function splaneDrag(d: SPlaneDragSpec): PanelPointer {
  let grab: string | null = null;
  const toS = (x: number, y: number, w: number, h: number, id: string): Cx => {
    const f = splaneFrame(w, h, d.range, d.reCenter), lim = d.limit ?? 1.15 * d.range;
    let re = f.ix(x), im = f.iy(y);
    re = Math.max(-lim * 2, Math.min(lim, re)); im = Math.max(-lim, Math.min(lim, im));
    if (d.realOnly?.includes(id)) im = 0; else if (d.upperOnly) im = Math.abs(im);
    return C(re, im);
  };
  const near = (x: number, y: number, w: number, h: number) => {
    const f = splaneFrame(w, h, d.range, d.reCenter), r = d.radius ?? 18; let best: string | null = null, bd = r;
    for (const hd of d.handles()) for (const sg of [1, -1]) { const dd = Math.hypot(f.X(hd.s.re) - x, f.Y(sg * hd.s.im) - y); if (dd <= bd) { bd = dd; best = hd.id; } }
    return best;
  };
  return {
    down: (x, y, w, h) => { grab = near(x, y, w, h); return grab !== null; },
    move: (x, y, w, h) => { if (grab) d.onDrag(grab, toS(x, y, w, h, grab)); },
    up: () => { grab = null; },
    hover: (x, y, w, h) => near(x, y, w, h) !== null,
  };
}

/* ═════════════════════════════ root locus ═════════════════════════════ */
export interface RootLocusViewSpec extends Omit<SPlaneSpec, 'poles' | 'zeros' | 'locus' | 'asymptotes' | 'marks'> {
  rl: RLocus; L: TF; /** current gain magnitude K ≥ 0 */ K: number;
  showAsymptotes?: boolean; showSpecialPoints?: boolean; showReadout?: boolean;
}
/** A suggested slider range for K: far enough to see the locus leave through the jω axis and head for its asymptotes. */
export function suggestKMax(rl: RLocus): number {
  const sweep = rl.K[rl.K.length - 1] ?? 1, kc = Math.max(0, ...rl.crossings.map((c) => c.K)), kb = Math.max(0, ...rl.breakaways.map((b) => b.K));
  let k = kc > 0 ? kc * 2.5 : kb > 0 ? kb * 10 : 0;
  if (!(k > 0)) { const i = rl.K.findIndex((_, j) => rl.branches.some((br) => cabs(br[j]) > 2.5 * rl.scale)); k = i > 0 ? rl.K[i] : sweep; }
  return +Math.min(sweep, k).toPrecision(2);
}
export function drawRootLocus(g: CanvasRenderingContext2D, w: number, h: number, s: RootLocusViewSpec): Frame {
  const { rl, L, K } = s, pal = BRANCH_COLORS();
  const at = rlocusPolesAt(rl, K, L);
  const marks: SPlaneMark[] = [];
  if (s.showSpecialPoints !== false) {
    for (const b of rl.breakaways) marks.push({ s: C(b.s, 0), shape: 'diamond', color: col.e(), label: `${b.kind === 'breakaway' ? 'breakaway' : 'break-in'} K=${fmtN(b.K, 2)}` });
    for (const c of rl.crossings) { marks.push({ s: C(0, c.w), shape: 'ring', color: col.bad(), label: `K=${fmtN(c.K, 2)}` }); if (c.w > 0) marks.push({ s: C(0, -c.w), shape: 'ring', color: col.bad() }); }
  }
  at.forEach((z, i) => marks.push({ s: z, color: pal[i % pal.length], shape: 'dot' }));
  const f = drawSPlane(g, w, h, { ...s, poles: rl.poles, zeros: rl.zeros, locus: rl.branches, marks, asymptotes: s.showAsymptotes === false || rl.centroid === null ? undefined : { centroid: rl.centroid, anglesDeg: rl.asymptoteAngles } });
  if (s.showReadout !== false) {
    const stable = at.every((z) => z.re < -1e-9);
    text(g, `K = ${fmtN(K, 3)}  ${stable ? 'stable' : 'UNSTABLE'}`, f.box.l + 6, f.box.t + 10, stable ? col.ok() : col.bad(), 'left', 11);
  }
  return f;
}
export interface LocusDragSpec { rl: RLocus; range: number; reCenter?: number; /** called with the new gain while dragging */ onK: (K: number) => void; radius?: number }
/** Pointer hook: grab anywhere near the locus and slide the gain K along it (the closed-loop poles follow). */
export function locusDrag(d: LocusDragSpec): PanelPointer {
  let on = false;
  const nearest = (x: number, y: number, w: number, h: number) => { const f = splaneFrame(w, h, d.range, d.reCenter), s = C(f.ix(x), f.iy(y)), n = rlocusNearest(d.rl, s); return { n, px: Math.hypot(f.X(n.s.re) - x, f.Y(n.s.im) - y) }; };
  return {
    down: (x, y, w, h) => { const { px } = nearest(x, y, w, h); on = px <= (d.radius ?? 22); if (on) d.onK(nearest(x, y, w, h).n.K); return on; },
    move: (x, y, w, h) => { if (on) d.onK(nearest(x, y, w, h).n.K); },
    up: () => { on = false; },
    hover: (x, y, w, h) => nearest(x, y, w, h).px <= (d.radius ?? 22),
  };
}

/* ═════════════════════════════ Bode ═════════════════════════════ */
export interface BodeViewSpec {
  L: TF; wmin?: number; wmax?: number; /** draw gain / phase margin bars (default true) */ margins?: boolean; ghost?: TF; n?: number;
  /** vertical cursor at this ω */ cursor?: number; magRange?: V2; phaseRange?: V2;
}
/** Magnitude (dB) over phase (°) on a shared log-ω axis. Returns the margins it drew. */
export function drawBode(g: CanvasRenderingContext2D, w: number, h: number, s: BodeViewSpec): Margins {
  wipe(g, w, h);
  const wmin = s.wmin ?? 1e-2, wmax = s.wmax ?? 1e2, ws = logspace(wmin, wmax, s.n ?? 500), b = bode(s.L, ws), x = ws.map(Math.log10);
  const mg = margins(s.L, wmin, wmax, 3000);
  const gap = 8, hTop = Math.round((h - gap) * 0.52), hBot = h - gap - hTop;
  const lo = Math.log10(wmin), hi = Math.log10(wmax);
  const mr: V2 = s.magRange ?? [Math.floor(Math.min(-30, ...b.magDb.filter(Number.isFinite)) / 20) * 20, Math.ceil(Math.max(20, ...b.magDb.filter(Number.isFinite)) / 20) * 20];
  const ph = b.phaseDeg.filter(Number.isFinite), pr: V2 = s.phaseRange ?? [Math.floor(Math.min(-200, ...ph) / 90) * 90, Math.ceil(Math.max(0, ...ph) / 90) * 90];
  const fm = rangeFrame(w, hTop, [lo, hi], mr, 46, 12, 8, 6), fp = rangeFrame(w, hBot, [lo, hi], pr, 46, 12, 6, 38);
  const decade = (f: Frame, yr: V2, ystep: number, ylab: string, bottom: boolean) => {
    g.lineWidth = 1; g.setLineDash([]);
    for (let d = Math.ceil(lo); d <= hi; d++) { g.strokeStyle = col.grid(); g.beginPath(); g.moveTo(f.X(d), f.box.t); g.lineTo(f.X(d), f.box.b); g.stroke(); if (bottom) text(g, d === 0 ? '1' : d === 1 ? '10' : d === -1 ? '0.1' : `10^${d}`, f.X(d), f.box.b + 10, col.muted(), 'center', 10); }
    for (let y = Math.ceil(yr[0] / ystep) * ystep; y <= yr[1]; y += ystep) { g.strokeStyle = col.grid(); g.beginPath(); g.moveTo(f.box.l, f.Y(y)); g.lineTo(f.box.r, f.Y(y)); g.stroke(); text(g, String(y), f.box.l - 4, f.Y(y), col.muted(), 'right', 10); }
    g.save(); g.translate(10, (f.box.t + f.box.b) / 2); g.rotate(-Math.PI / 2); text(g, ylab, 0, 0, col.text(), 'center', 11); g.restore();
  };
  const top = (fn: () => void) => { g.save(); fn(); g.restore(); };
  const bottom = (fn: () => void) => { g.save(); g.translate(0, hTop + gap); fn(); g.restore(); };
  const ghost = s.ghost ? bode(s.ghost, ws) : null;
  top(() => {
    decade(fm, mr, niceStep(mr[1] - mr[0], 4), '|L| (dB)', false);
    tline(g, fm, [lo, 0], [hi, 0], col.strong(), 1.5);
    if (ghost) curve(g, fm, x, ghost.magDb, col.muted(), 2, [6, 4]);
    curve(g, fm, x, b.magDb, col.a(), 2.4);
  });
  bottom(() => {
    decade(fp, pr, pr[1] - pr[0] > 360 ? 90 : 45, 'phase (°)', true);
    text(g, 'ω (rad/s)', (fp.box.l + fp.box.r) / 2, fp.h - 6, col.text(), 'center', 11);
    tline(g, fp, [lo, -180], [hi, -180], col.bad(), 1.2, [5, 4]);
    if (ghost) curve(g, fp, x, ghost.phaseDeg, col.muted(), 2, [6, 4]);
    curve(g, fp, x, b.phaseDeg, col.b(), 2.4);
  });
  if (s.margins !== false) {
    if (mg.wcp !== null && mg.pm !== null) { // gain crossover |L| = 1 → the phase margin is the bar from −180° up to the phase there
      const xl = Math.log10(mg.wcp), pm = mg.pm, pc = -180 + pm;
      top(() => { tline(g, fm, [xl, 0], [xl, mr[0]], col.ok(), 1, [3, 3]); dot(g, fm, [xl, 0], col.ok(), 3.5); });
      bottom(() => { tline(g, fp, [xl, pr[1]], [xl, -180], col.ok(), 1, [3, 3]); tline(g, fp, [xl, -180], [xl, pc], col.ok(), 4); dot(g, fp, [xl, pc], col.ok(), 3.5); text(g, `PM ${fmtN(pm, 1)}°`, fp.X(xl) + 7, fp.Y(pc) - 9, pm > 0 ? col.ok() : col.bad(), 'left', 11); });
    }
    if (mg.wcg !== null && mg.gmDb !== null) { // phase crossover −180° → the gain margin is the bar from the curve up to 0 dB
      const xl = Math.log10(mg.wcg), gmDb = mg.gmDb, d = -gmDb;
      top(() => { tline(g, fm, [xl, 0], [xl, d], col.c(), 4); dot(g, fm, [xl, d], col.c(), 3.5); text(g, `GM ${fmtN(gmDb, 1)} dB`, fm.X(xl) + 6, fm.Y(d / 2), gmDb > 0 ? col.c() : col.bad(), 'left', 11); });
      bottom(() => tline(g, fp, [xl, -180], [xl, pr[1]], col.c(), 1, [3, 3]));
    }
  }
  if (s.cursor && s.cursor >= wmin && s.cursor <= wmax) { const xl = Math.log10(s.cursor); top(() => tline(g, fm, [xl, mr[0]], [xl, mr[1]], col.e(), 1.2, [4, 3])); bottom(() => tline(g, fp, [xl, pr[0]], [xl, pr[1]], col.e(), 1.2, [4, 3])); }
  return mg;
}

/* ═════════════════════════════ |G(s)| as a height map ═════════════════════════════ */
export interface HeightMapSpec {
  G: TF; range: number; reCenter?: number; /** colour range in dB (default [−30, 30]) */ dbRange?: V2;
  /** probe point on the jω axis: draws s = jω and reads |G(jω)| */ omega?: number; cell?: number;
}
/** dB → [r, g, b] on a navy → blue → teal → yellow → white ramp (deep valleys are zeros, tall peaks are poles). */
export function heightColor(t: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [[0, [6, 12, 40]], [0.3, [28, 78, 160]], [0.55, [30, 160, 170]], [0.78, [240, 210, 70]], [1, [255, 250, 240]]];
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i], u = (x - a) / (b - a); return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * u)) as [number, number, number]; }
  return stops[stops.length - 1][1];
}
export function drawHeightMap(g: CanvasRenderingContext2D, w: number, h: number, s: HeightMapSpec): Frame {
  wipe(g, w, h);
  const f = splaneFrame(w, h, s.range, s.reCenter), [lo, hi] = s.dbRange ?? [-36, 18];
  heat(g, f, (re, im) => { const db = 20 * Math.log10(Math.max(1e-9, cabs(tfEval(s.G, C(re, im))))), [r, gg, b] = heightColor((db - lo) / (hi - lo)); return [r, gg, b, 255]; }, s.cell ?? 4);
  g.save(); clipBox(g, f);
  g.strokeStyle = col.e(); g.lineWidth = 2; g.beginPath(); g.moveTo(f.X(0), f.box.t); g.lineTo(f.X(0), f.box.b); g.stroke();
  for (const z of tfZeros(s.G)) dot(g, f, [z.re, z.im], '#ffffff', 5, true);
  for (const p of tfPoles(s.G)) cross(g, f, [p.re, p.im], '#ffffff', 6);
  if (s.omega !== undefined) {
    const jw = freqresp(s.G, s.omega), mag = cabs(jw);
    for (const sg of [1, -1]) dot(g, f, [0, sg * s.omega], col.e(), 5);
    text(g, `|G(j${fmtN(s.omega)})| = ${fmtN(mag, 3)}  = ${fmtN(20 * Math.log10(mag), 1)} dB`, f.box.l + 6, f.box.t + 10, '#ffffff', 'left', 11);
  }
  g.restore();
  for (let k = Math.ceil(f.ix(f.box.l)); k <= f.ix(f.box.r); k++) if (k !== 0) text(g, String(k), f.X(k), f.Y(0) + 9, '#ffffff', 'center', 9);
  text(g, 'σ', f.box.r - 8, f.Y(0) - 8, '#ffffff', 'right', 11); text(g, 'jω', f.X(0) + 6, f.box.t + 24, col.e(), 'left', 11);
  return f;
}
export interface JwSliceSpec { G: TF; wmax: number; /** probe */ omega?: number; /** plot dB instead of linear magnitude (default false) */ db?: boolean; ghost?: TF }
/** |G(jω)| along the imaginary axis: exactly the cut through the height map along its yellow line. */
export function drawJwSlice(g: CanvasRenderingContext2D, w: number, h: number, s: JwSliceSpec) {
  wipe(g, w, h);
  const ws = Array.from({ length: 400 }, (_, i) => (s.wmax * i) / 399), val = (G: TF) => ws.map((x) => { const m = cabs(freqresp(G, x)); return s.db ? 20 * Math.log10(Math.max(1e-9, m)) : Math.min(m, 1e6); });
  const ys = val(s.G), fin = ys.filter(Number.isFinite), top = Math.max(...fin), bot = Math.min(...fin);
  const yr: V2 = s.db ? [Math.floor((bot - 3) / 10) * 10, Math.ceil((top + 3) / 10) * 10] : [0, Math.max(1e-6, top * 1.12)];
  const f = rangeFrame(w, h, [0, s.wmax], yr, 46, 12, 10, 32);
  graphAxes(g, f, [0, s.wmax], yr, 'ω (rad/s) along the jω axis', s.db ? '|G(jω)| (dB)' : '|G(jω)|');
  if (s.ghost) curve(g, f, ws, val(s.ghost), col.muted(), 2, [6, 4]);
  curve(g, f, ws, ys, col.e(), 2.4);
  if (s.omega !== undefined) { const m = s.db ? 20 * Math.log10(cabs(freqresp(s.G, s.omega))) : cabs(freqresp(s.G, s.omega)); tline(g, f, [s.omega, yr[0]], [s.omega, m], col.e(), 1, [3, 3]); dot(g, f, [s.omega, m], col.e(), 5); }
  return f;
}
