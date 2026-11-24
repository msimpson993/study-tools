import { C, cabs, type Cx } from './dsp/complex';
import { type TF, type StepMetrics, type Margins, type Bode, bode, margins, stepMetrics, tfEval, logspace, tfPoles, tfZeros, freqresp } from './dsp/tf';
import { type RLocus, rlocusPolesAt, rlocusNearest } from './dsp/rlocus';
import { col, planeFrame, rangeFrame, wipe, text, tline, polyline, dot, cross, graphAxes, curve, clipBox, heat, axes2, tickLabel, isThumb, forTicks, goodStep, type Frame, type V2 } from './viz';
import { withLabelRole, labelsOn } from './labels';
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
const fmtN = (v: number, d = 2) => (Number.isFinite(v) ? String(+v.toFixed(d)).replace('-', '−') : '—');
const fmtC = (z: Cx) => (Math.abs(z.im) < 1e-9 ? fmtN(z.re) : `${fmtN(z.re)}${z.im < 0 ? '−' : '+'}j${fmtN(Math.abs(z.im))}`);
const niceStep = (span: number, n: number) => {
  if (!(span > 0) || !(n > 0)) return span > 0 ? span : 1;
  const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
};

/* ═════════════════════════════ step response ═════════════════════════════ */
export interface StepViewSpec {
  t: ArrayLike<number>; y: ArrayLike<number>;
  /** a faint dashed second trace (e.g. the previous tuning) */ ghost?: { t: ArrayLike<number>; y: ArrayLike<number>; label?: string; color?: string };
  /** reference level (default 1) */ ref?: number; /** final value; default = last sample */ final?: number;
  /** which markers to draw; each is optional and off by default */
  show?: { timing?: boolean; overshoot?: boolean; band?: boolean; settling?: boolean; ess?: boolean };
  /** settling band fraction (default 0.02) */ band?: number;
  tEnd?: number; yRange?: V2; xLabel?: string; yLabel?: string; color?: string;
  /** override the Ts / ess marker text */ settlingLabel?: string; essLabel?: string;
  /** left, right, top, bottom pads for the plot frame */ pads?: { l?: number; r?: number; t?: number; b?: number };
}
/** Draw a step response. Returns the metrics used for the markers (or null when the data has fewer than 3 samples). */
export function drawStepResponse(g: CanvasRenderingContext2D, w: number, h: number, s: StepViewSpec): StepMetrics | null {
  wipe(g, w, h);
  const t = Array.from(s.t), y = Array.from(s.y), ref = s.ref ?? 1, band = s.band ?? 0.02, show = s.show ?? {};
  if (t.length < 3) return null;
  const tEnd = s.tEnd ?? t[t.length - 1];
  const all = [...y, ...(s.ghost ? Array.from(s.ghost.y) : []), ref];
  let lo = 0, hiY = -Infinity;
  for (const v of all) { if (v < lo) lo = v; if (v > hiY) hiY = v; }
  const yr: V2 = s.yRange ?? [lo - 0.05 * Math.abs(ref), Math.max(ref * 1.15, hiY * 1.06)];
  const thumb = isThumb(g);
  const pad = (v: number | undefined, full: number, compact: number) => thumb ? Math.min(v ?? compact, compact) : (v ?? full);
  const f = rangeFrame(w, h, [0, tEnd], yr, pad(s.pads?.l, 56, 32), pad(s.pads?.r, 14, 10), pad(s.pads?.t, 14, 8), pad(s.pads?.b, 38, 20));
  graphAxes(g, f, [0, tEnd], yr, s.xLabel ?? 'time (s)', s.yLabel ?? 'output');
  const m = stepMetrics(t, y, { ref, final: s.final, band });
  const yf = m.yFinal;
  if (show.band && Number.isFinite(yf)) { g.save(); clipBox(g, f); g.fillStyle = col.ok(); g.globalAlpha = 0.14; g.fillRect(f.box.l, f.Y(yf * (1 + band)), f.box.r - f.box.l, f.Y(yf * (1 - band)) - f.Y(yf * (1 + band))); g.restore(); text(g, `±${fmtN(band * 100, 0)}%`, f.box.r - 4, f.Y(yf * (1 - band)) + 12, col.ok(), 'right', 10) /* at the right end, where the response has settled inside the band (pass 3: at the left it sat on the rising curve) */; }
  tline(g, f, [0, ref], [tEnd, ref], col.muted(), 1, [5, 4]);
  if (s.ghost) curve(g, f, Array.from(s.ghost.t), Array.from(s.ghost.y), s.ghost.color ?? col.muted(), 2, [6, 4]);
  curve(g, f, t, y, s.color ?? col.a(), 2.4);
  if (s.ghost?.label) text(g, `┄ ${s.ghost.label}`, f.box.r - 4, Math.min(f.h - 14, f.box.b + 20), s.ghost.color ?? col.muted(), 'right', 10);
  const lbl = (str: string, px: number, py: number, color: string, align: CanvasTextAlign = 'left') => text(g, str, px, py, color, align, 10.5);
  if (show.timing && Number.isFinite(m.riseTime)) {
    const y10 = yf * 0.1, y90 = yf * 0.9;
    tline(g, f, [m.t10, y10], [m.t10, 0], col.e(), 1, [2, 3]); tline(g, f, [m.t90, y90], [m.t90, 0], col.e(), 1, [2, 3]);
    g.strokeStyle = col.e(); g.lineWidth = 2; g.beginPath(); g.moveTo(f.X(m.t10), f.Y(yr[0]) - 14); g.lineTo(f.X(m.t90), f.Y(yr[0]) - 14); g.stroke();
    const trLab = `Tr ${fmtN(m.riseTime)} s`;
    g.font = '10.5px system-ui,sans-serif';
    const trW = g.measureText(trLab).width;
    // centre on the rise, and keep the whole label left of the dotted Tp line (and of Ts)
    const trMid = (f.X(m.t10) + f.X(m.t90)) / 2, trY = f.Y((y10 + y90) / 2);
    const tpX = (show.overshoot && Number.isFinite(m.peakTime) && m.overshootPct > 0.05) ? f.X(m.peakTime) : Infinity;
    const tsX = (show.settling && m.settled && Number.isFinite(m.settlingTime)) ? f.X(m.settlingTime) : Infinity;
    const trRight = Math.min(tpX, tsX, f.box.r) - 5;
    let trX = trMid;
    if (trX + trW / 2 > trRight) trX = trRight - trW / 2;
    if (trX - trW / 2 < f.box.l + 4) trX = f.box.l + 4 + trW / 2;
    if (trX + trW / 2 > tpX - 5) trX = Math.max(f.box.l + 4 + trW / 2, tpX - 5 - trW / 2);
    lbl(trLab, trX, trY, col.e(), 'center');
  }
  let osBox: { x0: number; x1: number; y: number } | null = null;
  if (show.overshoot && Number.isFinite(m.peak) && m.overshootPct > 0.05) {
    tline(g, f, [m.peakTime, m.peak], [m.peakTime, yr[0]], col.b(), 1, [2, 3]); dot(g, f, [m.peakTime, m.peak], col.b(), 4);
    const os = `${fmtN(m.overshootPct, 1)}% overshoot  (Tp ${fmtN(m.peakTime)} s)`, ox = Math.min(f.X(m.peakTime) + 8, f.box.r - 4), oy = f.Y(m.peak) - 8, right = f.X(m.peakTime) > w * 0.6;
    lbl(os, ox, oy, col.b(), right ? 'right' : 'left');
    g.font = '10.5px system-ui,sans-serif'; const ow = g.measureText(os).width; osBox = { x0: right ? ox - ow : ox, x1: right ? ox : ox + ow, y: oy };
  }
  if (show.settling && m.settled && Number.isFinite(m.settlingTime)) {
    // the dashed Ts line stops just under the overshoot label when it would run through it (it made "15.7 %" read "5.7 %")
    const tx = f.X(m.settlingTime), cut = osBox && tx > osBox.x0 - 3 && tx < osBox.x1 + 3 ? Math.min(yr[1], f.iy(osBox.y + 8)) : yr[1];
    tline(g, f, [m.settlingTime, yr[0]], [m.settlingTime, cut], col.c(), 1.5, [5, 4]);
    lbl(s.settlingLabel ?? `Ts ${fmtN(m.settlingTime)} s`, f.X(m.settlingTime) + 4, f.box.b - 18, col.c());
  }
  if (show.ess && Number.isFinite(m.ess) && Math.abs(m.ess) > 1e-3 * Math.max(1, Math.abs(ref))) {
    const xe = tEnd * 0.985, xLine = f.X(xe);
    tline(g, f, [xe, yf], [xe, ref], col.bad(), 3);
    const essText = s.essLabel ?? `final sag ${fmtN(m.ess, 3)}`;
    // sit just above the final-value line, to the left of the red sag marker, or
    // below the line when a nearby reference / zero line or the response curve
    // would strike through the label (Motor steps 3/5/6 at a narrow width, sag ≈ 0).
    const ySag = f.Y(yf), yRef = f.Y(ref);
    g.font = '10.5px system-ui,sans-serif';
    const tw = g.measureText(essText).width;
    const xLab = Math.min(f.box.r - 4, xLine - 6), x0 = xLab - tw, x1 = xLab;
    const hits = (yy: number, half = 7) => {
      if (Math.abs(yy - yRef) < 12 || Math.abs(yy - ySag) < 6) return true;
      for (let i = 0; i < t.length; i++) {
        const px = f.X(t[i]);
        if (px < x0 - 2 || px > x1 + 2) continue;
        if (Math.abs(f.Y(y[i]) - yy) < half + 2) return true;
      }
      return false;
    };
    const cands = [ySag - 8, ySag + 14, ySag - 18, ySag + 22, ySag - 28, ySag + 32];
    const essY = cands.find((yy) => yy > f.box.t + 6 && yy < f.box.b - 6 && !hits(yy))
      ?? (Math.abs(ySag - 8 - yRef) < 12 ? ySag + 14 : ySag - 8);
    lbl(essText, xLab, essY, col.bad(), 'right');
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
  /** plane-frame pad in px (default 6); a larger pad keeps poles and the jω title apart */
  pad?: number;
  /** cap the plane's width:height so a short, wide canvas does not stretch the x-range (1 = square) */
  maxAspect?: number;
  /** when false, draw on top of the current canvas (used for a zoom inset) */
  clear?: boolean;
  /** a tight zoom window drawn in a free corner / side margin, around a close pole–zero pair */
  inset?: { range: number; reCenter?: number; label?: string };
}
/** The frame every s-plane panel with the same (w, h, range, reCenter) uses; dragging code calls this too so hits line up with pixels. */
export const splaneFrame = (w: number, h: number, range: number, reCenter = -0.3 * range, pad = 6): Frame => planeFrame(w, h, range, reCenter, 0, pad);

export function drawSPlane(g: CanvasRenderingContext2D, w: number, h: number, s: SPlaneSpec): Frame {
  const pad = Math.max(18, s.pad ?? 18);
  let vw = w, vh = h, ox = 0, oy = 0;
  if (s.maxAspect && s.maxAspect > 0 && w > 2 * pad && h > 2 * pad) {
    const iw = w - 2 * pad, ih = h - 2 * pad;
    if (iw / ih > s.maxAspect) { vw = s.maxAspect * ih + 2 * pad; ox = (w - vw) / 2; }
    else if (ih / iw > s.maxAspect) { vh = s.maxAspect * iw + 2 * pad; oy = (h - vh) / 2; }
  }
  const f0 = splaneFrame(Math.max(vw, 1), Math.max(vh, 1), Math.max(s.range, 1e-6), s.reCenter, s.pad);
  if (!(w > 0) || !(h > 0) || !Number.isFinite(s.range) || s.range <= 0) { if (s.clear !== false) wipe(g, Math.max(w, 0), Math.max(h, 0)); return f0; }
  if (s.clear !== false) wipe(g, w, h);
  g.save();
  g.translate(ox, oy);
  const f = splaneFrame(vw, vh, s.range, s.reCenter, pad), R = Math.hypot(vw, vh) / Math.max(Math.min(f.sx, f.sy), 1e-9);
  const x0 = f.X(0), y0 = f.Y(0);
  if (s.shadeUnstable !== false) { g.save(); clipBox(g, f); g.fillStyle = col.bad(); g.globalAlpha = 0.07; g.fillRect(Math.max(x0, f.box.l), f.box.t, f.box.r - Math.max(x0, f.box.l), f.box.b - f.box.t); g.restore(); }
  const cv = g.canvas as HTMLCanvasElement | undefined, m = typeof g.getTransform === 'function' ? g.getTransform() : null;
  // the axis names first, so the grid numbers and notes keep clear of them
  axes2(g, f, s.xLabel ?? 'σ (1/s)', s.yLabel ?? 'jω (rad/s)');
  // grid: at least ~26 px between numbers, so a narrow panel shows fewer of them instead of a smear
  let st = niceStep(2 * s.range, 6);
  if (goodStep(f.sx) && goodStep(st)) {
    let guard = 0;
    while (st * f.sx < 26 && guard++ < 40) {
      const nxt = niceStep(st * 2.01, 1);
      if (!goodStep(nxt) || nxt <= st) break;
      st = nxt;
    }
  } else {
    st = s.range;
  }
  const marks = [...(s.poles ?? []), ...(s.zeros ?? [])].map((z) => ({ x: f.X(z.re), y: f.Y(z.im) }));
  const hitsMark = (px: number, py: number, tw: number) =>
    marks.some((m) => m.x < px + tw + 10 && m.x > px - 8 && Math.abs(m.y - py) < 14);
  g.save(); clipBox(g, f); g.strokeStyle = col.grid(); g.lineWidth = 1;
  forTicks(Math.ceil(f.ix(f.box.l) / st) * st, f.ix(f.box.r), st, (x) => {
    g.beginPath(); g.moveTo(f.X(x), f.box.t); g.lineTo(f.X(x), f.box.b); g.stroke();
  });
  forTicks(Math.ceil(f.iy(f.box.b) / st) * st, f.iy(f.box.t), st, (y) => {
    g.beginPath(); g.moveTo(f.box.l, f.Y(y)); g.lineTo(f.box.r, f.Y(y)); g.stroke();
  });
  g.restore();
  // tick numbers sit in the pad, outside the grid, so lines never strike them
  withLabelRole('tick', () => {
    let lastX = '', lastPx = -Infinity;
    forTicks(Math.ceil(f.ix(f.box.l) / st) * st, f.ix(f.box.r), st, (x) => {
      const lab = tickLabel(x, st), px = f.X(x), tw = 5.6 * (lab ? lab.length : 0);
      if (lab && lab !== lastX && px + tw / 2 <= f.box.r && Math.abs(px - lastPx) >= 26 && !hitsMark(px, f.box.b + 9, tw)) { text(g, lab, px, f.box.b + 9, col.muted(), 'center', 9); lastX = lab; lastPx = px; }
    });
    let lastY = '', lastPy = Infinity;
    forTicks(Math.ceil(f.iy(f.box.b) / st) * st, f.iy(f.box.t), st, (y) => {
      const lab = tickLabel(y, st), py = f.Y(y), tw = 5.6 * (lab ? lab.length : 0);
      if (lab && lab !== '0' && lab !== lastY && py > f.box.t - 2 && py < f.box.b + 2 && Math.abs(py - lastPy) >= 16 && !hitsMark(f.box.l - 4 - tw, py, tw)) { text(g, lab, f.box.l - 4, py, col.muted(), 'right', 9); lastY = lab; lastPy = py; }
    });
  });
  // one row below the jω axis name, so the two never touch on a narrow panel (pass 3)
  const unstableBox = (s.shadeUnstable !== false && x0 < f.box.r - 70) ? { x0: f.box.r - 64, x1: f.box.r - 2, y0: f.box.t + 2, y1: f.box.t + 16 } : null;
  if (unstableBox) text(g, 'unstable', f.box.r - 6, f.box.t + 11, col.bad(), 'right', 10);
  // allowed region
  if (s.region) {
    const r = s.region; g.save(); clipBox(g, f);
    if (r.sigma !== undefined) { g.beginPath(); g.rect(f.box.l, f.box.t, f.X(-r.sigma) - f.box.l, f.box.b - f.box.t); g.clip(); }
    if (r.zeta !== undefined) { const th = Math.acos(Math.min(1, Math.max(0, r.zeta))); g.beginPath(); g.moveTo(x0, y0); g.lineTo(f.X(-Math.cos(th) * R), f.Y(Math.sin(th) * R)); g.lineTo(f.X(-R), f.Y(0)); g.lineTo(f.X(-Math.cos(th) * R), f.Y(-Math.sin(th) * R)); g.closePath(); g.clip(); }
    if (r.wn !== undefined) { g.beginPath(); g.arc(x0, y0, r.wn * f.sx, 0, 2 * Math.PI); g.clip(); }
    g.fillStyle = col.ok(); g.globalAlpha = 0.13; g.fillRect(f.box.l, f.box.t, f.box.r - f.box.l, f.box.b - f.box.t); g.restore();
  }
  g.save(); clipBox(g, f);
  g.strokeStyle = col.strong(); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, f.box.t); g.lineTo(x0, f.box.b); g.stroke(); // the jω axis: the edge of stability
  for (const wn of s.wnCircles ?? []) { g.strokeStyle = col.d(); g.globalAlpha = 0.7; g.lineWidth = 1; g.setLineDash([3, 4]); g.beginPath(); g.arc(x0, y0, wn * f.sx, Math.PI / 2, (3 * Math.PI) / 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; text(g, `ωn ${fmtN(wn)}`, x0 - wn * f.sx + 3, y0 + 10, col.d(), 'left', 10); }
  const zetaNames: (() => void)[] = [], taken: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const z of s.zetaRays ?? []) {
    const th = Math.acos(Math.min(1, Math.max(0, z)));
    for (const sg of [1, -1]) tline(g, f, [0, 0], [-Math.cos(th) * R, sg * Math.sin(th) * R], col.e(), 1, [5, 4]);
    zetaNames.push(() => {
      // (drawn after the pole values, below, so it can keep clear of them too) the ζ name sits beside the upper ray, part-way out, at the first spot whose text is clear of every pole and zero and of every
      // ζ ray, its own included (pass 3: the names sat on the rays at phone width); tried right of the ray first, then left
      const marks = [...(s.poles ?? []), ...(s.zeros ?? []), ...(s.marks ?? []).map((mk) => mk.s)], name = `ζ ${fmtN(z)}`;
      g.font = '10px system-ui, sans-serif'; const tw = g.measureText(name).width;
      const rays = (s.zetaRays ?? []).map((zz) => Math.acos(Math.min(1, Math.max(0, zz))));
      const boxAt = (q: number, side: 1 | -1) => { const X = f.X(-Math.cos(th) * q), Y = f.Y(Math.sin(th) * q); return side === 1 ? { x0: X + 5, x1: X + 5 + tw, y0: Y - 14, y1: Y - 3 } : { x0: X - 5 - tw, x1: X - 5, y0: Y + 3, y1: Y + 14 }; };
      const hitsRay = (b: { x0: number; x1: number; y0: number; y1: number }) => rays.some((t2) => [1, -1].some((sg) => { for (let k = 0; k <= 80; k++) { const q = (k / 80) * R, X = f.X(-Math.cos(t2) * q), Y = f.Y(sg * Math.sin(t2) * q); if (X > b.x0 - 2 && X < b.x1 + 2 && Y > b.y0 - 2 && Y < b.y1 + 2) return true; } return false; }));
      const hitsLabel = (b: { x0: number; x1: number; y0: number; y1: number }) => {
        if (!cv || !m || Math.abs(m.b) > 1e-9) return false;
        const r = { x0: m.a * b.x0 + m.e, x1: m.a * b.x1 + m.e, y0: m.d * b.y0 + m.f, y1: m.d * b.y1 + m.f };
        return labelsOn(cv).some((o) => Math.min(o.x1, r.x1) - Math.max(o.x0, r.x0) > 1 && Math.min(o.y1, r.y1) - Math.max(o.y0, r.y0) > 1);
      };
      const okBox = (b: { x0: number; x1: number; y0: number; y1: number }) => b.x0 > f.box.l + 2 && b.x1 < f.box.r - 2 && b.y0 > f.box.t + 2 && b.y1 < f.box.b - 2 && marks.every((p) => { const X = f.X(p.re), Y = f.Y(p.im); return X < b.x0 - 9 || X > b.x1 + 9 || Y < b.y0 - 9 || Y > b.y1 + 9; }) && !hitsRay(b) && taken.every((t) => b.x1 < t.x0 - 3 || b.x0 > t.x1 + 3 || b.y1 < t.y0 - 3 || b.y0 > t.y1 + 3) && !(b.x0 < x0 + 3 && b.x1 > x0 - 3) && !hitsLabel(b);
      let spot: { x0: number; y1: number } | null = null;
      for (const k of [0.45, 0.6, 0.3, 0.75, 0.9, 0.2]) { for (const side of [1, -1] as const) { const b = boxAt(Math.min(s.range * k, R), side); if (okBox(b)) { spot = b; break; } } if (spot) break; }
      if (!spot) { const rl = Math.min(s.range * 0.45, R); spot = { x0: f.X(-Math.cos(th) * rl) + 4, y1: f.Y(Math.sin(th) * rl) + 2 + 3 }; }
      text(g, name, spot.x0, spot.y1 - 3, col.e(), 'left', 10);
    });
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
  // pole crosses and zero rings are recorded with the labels (role 'axis'), so notes drawn afterwards slide clear of them
  if (cv && m && Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9 && m.d > 0) for (const p of [...(s.poles ?? []), ...(s.zeros ?? [])]) {
    const X = f.X(p.re), Y = f.Y(p.im); if (X < f.box.l || X > f.box.r || Y < f.box.t || Y > f.box.b) continue;
    labelsOn(cv).push({ x0: m.a * (X - 7) + m.e, x1: m.a * (X + 7) + m.e, y0: m.d * (Y - 7) + m.f, y1: m.d * (Y + 7) + m.f, role: 'axis' });
  }
  // a pole's value goes right of it, or left when a ζ ray runs through that spot (pass 3: a pole on a ray had its value on the ray)
  const zr = (s.zetaRays ?? []).map((zz) => Math.acos(Math.min(1, Math.max(0, zz))));
  const onRay = (x0b: number, x1b: number, y0b: number, y1b: number) => zr.some((t2) => [1, -1].some((sg) => { for (let k = 0; k <= 80; k++) { const q = (k / 80) * R, X = f.X(-Math.cos(t2) * q), Y = f.Y(sg * Math.sin(t2) * q); if (X > x0b - 2 && X < x1b + 2 && Y > y0b - 2 && Y < y1b + 2) return true; } return false; }));
  g.font = '11px system-ui, sans-serif';
  const sw = g.measureText(s.xLabel ?? 'σ (1/s)').width, jwLab = s.yLabel ?? 'jω (rad/s)', jwW = g.measureText(jwLab).width, jwX = f.X(0) + 6;
  const onSigma = (a: number, b2: number, c: number, d: number) => b2 > f.box.r - 2 - sw - 3 && a < f.box.r && d > y0 - 8 - 12 && c < y0 - 8 + 4;
  const onJw = (a: number, b2: number, c: number, d: number) => b2 > jwX - 2 && a < jwX + jwW + 2 && d > f.box.t - 18 && c < f.box.t + 4;
  const hitsUnstable = (a: number, b2: number, c: number, d: number) => !!(unstableBox && b2 > unstableBox.x0 - 2 && a < unstableBox.x1 + 2 && d > unstableBox.y0 - 2 && c < unstableBox.y1 + 2);
  const poles = s.poles ?? [];
  const labelled: { p: Cx; lab: string }[] = [];
  const used = new Set<number>();
  for (let i = 0; i < poles.length; i++) {
    const p = poles[i];
    cross(g, f, [p.re, p.im], col.b(), 6);
    if (!(s.labels && p.im >= -1e-9) || used.has(i)) continue;
    if (Math.abs(p.im) < 1e-9) {
      const pals = poles.map((q, j) => ({ q, j })).filter(({ q }) => Math.abs(q.im) < 1e-9 && Math.abs(q.re - p.re) < 1e-6);
      pals.forEach(({ j }) => used.add(j));
      const n = pals.length;
      const fold = n === 2 ? 'double' : n === 3 ? 'triple' : n > 3 ? `${n}-fold` : '';
      labelled.push({ p, lab: fold ? `${fmtN(p.re)} (${fold})` : fmtC(p) });
    } else {
      used.add(i);
      labelled.push({ p, lab: fmtC(p) });
    }
  }
  for (const { p, lab } of labelled) {
    const X = f.X(p.re), Y = f.Y(p.im) + (p.im > 1e-9 ? 14 : -12); g.font = '10px system-ui, sans-serif'; const tw = g.measureText(lab).width;
    // …and clear of the σ axis name, the jω title, and the 'unstable' tag
    const inUnstable = (a: number, b2: number) => s.shadeUnstable !== false && b2 > x0 + 2;
    const onAxis = (a: number, b2: number) => a < x0 + 4 && b2 > x0 - 4;
    const blockedR = onRay(X + 9, X + 9 + tw, Y - 9, Y + 2) || onSigma(X + 9, X + 9 + tw, Y - 9, Y + 2) || onJw(X + 9, X + 9 + tw, Y - 9, Y + 2) || hitsUnstable(X + 9, X + 9 + tw, Y - 9, Y + 2) || inUnstable(X + 9, X + 9 + tw) || onAxis(X + 9, X + 9 + tw);
    const blockedL = onRay(X - 9 - tw, X - 9, Y - 9, Y + 2) || X - 9 - tw < f.box.l + 2 || onJw(X - 9 - tw, X - 9, Y - 9, Y + 2) || hitsUnstable(X - 9 - tw, X - 9, Y - 9, Y + 2) || inUnstable(X - 9 - tw, X - 9) || onAxis(X - 9 - tw, X - 9);
    const right = !blockedR || (blockedL && !inUnstable(X + 9, X + 9 + tw) && !onAxis(X + 9, X + 9 + tw));
    text(g, lab, right ? X + 9 : X - 9, Y, col.b(), right ? 'left' : 'right', 10);
    taken.push(right ? { x0: X + 9, x1: X + 9 + tw, y0: Y - 9, y1: Y + 2 } : { x0: X - 9 - tw, x1: X - 9, y0: Y - 9, y1: Y + 2 });
  }
  for (const zn of zetaNames) zn();
  g.restore();
  g.restore();
  if (s.inset && s.clear !== false) {
    const iw = Math.round(Math.min(220, Math.max(128, Math.min(w, h) * 0.72, w * 0.36)));
    const ih = iw;
    const right = w - (ox + vw), left = ox;
    let ix: number, iy: number;
    if (right >= iw + 10) { ix = ox + vw + 6; iy = Math.max(8, oy + (vh - ih) / 2); }
    else if (left >= iw + 10) { ix = 8; iy = Math.max(8, oy + (vh - ih) / 2); }
    else { ix = Math.max(8, ox + vw - iw - 8); iy = Math.max(8, oy + vh - ih - 8); }
    if (ix + iw <= w - 2 && iy + ih <= h - 2 && iw >= 110 && ih >= 110) {
      g.save();
      g.strokeStyle = col.strong(); g.lineWidth = 1; g.setLineDash([]);
      g.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
      g.translate(ix, iy);
      drawSPlane(g, iw, ih, {
        range: s.inset.range, reCenter: s.inset.reCenter, poles: s.poles, zeros: s.zeros, labels: true,
        pad: 16, maxAspect: 1, clear: false, shadeUnstable: s.shadeUnstable, xLabel: '', yLabel: '',
      });
      text(g, s.inset.label ?? 'zoom', 8, 10, col.muted(), 'left', 9);
      g.restore();
    }
  }
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
  /** frequency axis name (default 'ω (rad/s)'); pass e.g. 'ω (rad/h)' for a plant that runs in hours */ xLabel?: string;
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
  const fm = rangeFrame(w, hTop, [lo, hi], mr, 56, 12, 8, 6), fp = rangeFrame(w, hBot, [lo, hi], pr, 56, 12, 6, 38);
  const decade = (f: Frame, yr: V2, ystep: number, ylab: string, bottom: boolean) => {
    g.lineWidth = 1; g.setLineDash([]);
    forTicks(Math.ceil(lo), hi, 1, (d) => { g.strokeStyle = col.grid(); g.beginPath(); g.moveTo(f.X(d), f.box.t); g.lineTo(f.X(d), f.box.b); g.stroke(); if (bottom) withLabelRole('tick', () => text(g, d === 0 ? '1' : d === 1 ? '10' : d === -1 ? '0.1' : `10^${d}`, f.X(d), f.box.b + 10, col.muted(), 'center', 10)); });
    forTicks(Math.ceil(yr[0] / ystep) * ystep, yr[1], ystep, (y) => { g.strokeStyle = col.grid(); g.beginPath(); g.moveTo(f.box.l, f.Y(y)); g.lineTo(f.box.r, f.Y(y)); g.stroke(); withLabelRole('tick', () => text(g, String(y), f.box.l - 4, f.Y(y), col.muted(), 'right', 10)); });
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
    withLabelRole('axis', () => text(g, s.xLabel ?? 'ω (rad/s)', (fp.box.l + fp.box.r) / 2, fp.h - 6, col.text(), 'center', 11));
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
  /** axis names (default 'σ', 'jω'); pass units for a plant that is not in seconds */ xLabel?: string; yLabel?: string;
  /** draw the dB colour scale along the right edge */ scale?: boolean;
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
  const keyL = s.scale ? f.box.r - 20 : f.box.r; // the colour key takes the right edge: names and numbers stop short of it
  withLabelRole('axis', () => { text(g, s.xLabel ?? 'σ', keyL - 8, f.Y(0) - 8, '#ffffff', 'right', 11); text(g, s.yLabel ?? 'jω', f.X(0) + 6, f.box.t + 24, col.e(), 'left', 11); });
  if (s.scale) { // the colour key: a vertical ramp from lo (bottom) to hi (top) dB
    const bw = 8, bx = f.box.r - bw - 4, by0 = f.box.t + 36, by1 = f.box.b - 22;
    if (by1 - by0 > 30) {
      for (let y = by0; y < by1; y++) { const [r, gg, b] = heightColor(1 - (y - by0) / (by1 - by0)); g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(bx, y, bw, 1.2); }
      g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.strokeRect(bx, by0, bw, by1 - by0);
      withLabelRole('axis', () => { text(g, `${fmtN(hi, 0)} dB`, bx - 3, by0 + 4, '#ffffff', 'right', 9); text(g, `${fmtN(lo, 0)} dB`, bx - 3, by1 - 4, '#ffffff', 'right', 9); });
    }
  }
  withLabelRole('tick', () => { for (let k = Math.ceil(f.ix(f.box.l)); k <= f.ix(f.box.r); k++) if (k !== 0 && f.X(k) < keyL - 8) text(g, String(k), f.X(k), f.Y(0) + 9, '#ffffff', 'center', 9); });
  return f;
}
export interface JwSliceSpec { G: TF; wmax: number; /** probe */ omega?: number; /** plot dB instead of linear magnitude (default false) */ db?: boolean; ghost?: TF; /** x-axis name (default 'ω (rad/s) along the jω axis') */ xLabel?: string }
/** |G(jω)| along the imaginary axis: exactly the cut through the height map along its yellow line. */
export function drawJwSlice(g: CanvasRenderingContext2D, w: number, h: number, s: JwSliceSpec) {
  wipe(g, w, h);
  const ws = Array.from({ length: 400 }, (_, i) => (s.wmax * i) / 399), val = (G: TF) => ws.map((x) => { const m = cabs(freqresp(G, x)); return s.db ? 20 * Math.log10(Math.max(1e-9, m)) : Math.min(m, 1e6); });
  const ys = val(s.G), fin = ys.filter(Number.isFinite);
  let top = -Infinity, bot = Infinity;
  for (const v of fin) { if (v > top) top = v; if (v < bot) bot = v; }
  const yr: V2 = s.db ? [Math.floor((bot - 3) / 10) * 10, Math.ceil((top + 3) / 10) * 10] : [0, Math.max(1e-6, top * 1.12)];
  const f = rangeFrame(w, h, [0, s.wmax], yr, 56, 12, 10, 32);
  graphAxes(g, f, [0, s.wmax], yr, s.xLabel ?? 'ω (rad/s) along the jω axis', s.db ? '|G(jω)| (dB)' : '|G(jω)|');
  if (s.ghost) curve(g, f, ws, val(s.ghost), col.muted(), 2, [6, 4]);
  curve(g, f, ws, ys, col.e(), 2.4);
  if (s.omega !== undefined) { const m = s.db ? 20 * Math.log10(cabs(freqresp(s.G, s.omega))) : cabs(freqresp(s.G, s.omega)); tline(g, f, [s.omega, yr[0]], [s.omega, m], col.e(), 1, [3, 3]); dot(g, f, [s.omega, m], col.e(), 5); }
  return f;
}
