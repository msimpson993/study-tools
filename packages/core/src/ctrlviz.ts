import { C, cabs, type Cx } from './dsp/complex';
import { type TF, type StepMetrics, type Margins, type Bode, bode, margins, stepMetrics, tfEval, logspace, tfPoles, tfZeros, freqresp } from './dsp/tf';
import { type RLocus, rlocusPolesAt, rlocusNearest } from './dsp/rlocus';
import { col, planeFrame, rangeFrame, wipe, text, tline, polyline, dot, cross, graphAxes, curve, clipBox, withClip, beginClip, endClip, heat, axes2, tickLabel, isThumb, isTileCanvas, isPortraitPhone, isLandscapePhone, logInsetFrame, forTicks, goodStep, type Frame, type V2 } from './viz';
import { withLabelRole, withAnchor, labelsOn } from './labels';
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
const ANCHOR_GAP = 12;
const MIN_FONT = 9;
type TextBox = { x: number; y: number; align: CanvasTextAlign; a: number; b2: number; c: number; d: number; z: number };
const textBox = (x: number, y: number, tw: number, th: number, align: CanvasTextAlign, z: number): TextBox => {
  const a = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2;
  // match text()'s default middle baseline (logText extents ±0.55·size)
  return { x, y, align, a, b2: a + tw, c: y - z * 0.55, d: y + z * 0.55, z };
};
/** Grow a box the same way the local overlap e2e does (9% + 2 px width, 2 px height). */
const inflateBox = (b: TextBox): TextBox => {
  const dx = ((b.b2 - b.a) * 0.09 + 2) / 2, dy = 1;
  return { ...b, a: b.a - dx, b2: b.b2 + dx, c: b.c - dy, d: b.d + dy };
};
/** Closest-edge distance from a box to a point. */
const edgeDist = (b: TextBox, X: number, Y: number) => {
  const cx = Math.max(b.a, Math.min(X, b.b2)), cy = Math.max(b.c, Math.min(Y, b.d));
  return Math.hypot(cx - X, cy - Y);
};
/** Candidate boxes whose closest edge stays about `gap` px from (X, Y), around the clock. */
const aroundMarker = (X: number, Y: number, tw: number, th: number, z: number, preferRight = true, gap = ANCHOR_GAP): TextBox[] => {
  const out: TextBox[] = [];
  const cardinal: TextBox[] = preferRight
    ? [textBox(X + gap, Y, tw, th, 'left', z), textBox(X - gap, Y, tw, th, 'right', z), textBox(X, Y - gap - z * 0.55, tw, th, 'center', z), textBox(X, Y + gap + z * 0.55, tw, th, 'center', z)]
    : [textBox(X - gap, Y, tw, th, 'right', z), textBox(X + gap, Y, tw, th, 'left', z), textBox(X, Y - gap - z * 0.55, tw, th, 'center', z), textBox(X, Y + gap + z * 0.55, tw, th, 'center', z)];
  for (const b of cardinal) if (edgeDist(b, X, Y) <= 15.5 && edgeDist(b, X, Y) >= 8) out.push(b);
  const start = preferRight ? 0 : Math.PI;
  for (let i = 0; i < 16; i++) {
    const ang = start + (i % 2 === 0 ? i / 2 : -Math.ceil(i / 2)) * (Math.PI / 8);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const align: CanvasTextAlign = ca > 0.35 ? 'left' : ca < -0.35 ? 'right' : 'center';
    let x = X + ca * (gap + 8), y = Y + sa * (gap + 8);
    let box = textBox(x, y, tw, th, align, z);
    for (let k = 0; k < 8; k++) {
      const d = edgeDist(box, X, Y), adj = gap - d;
      if (Math.abs(adj) < 0.4) break;
      x += ca * adj; y += sa * adj;
      box = textBox(x, y, tw, th, align, z);
    }
    if (edgeDist(box, X, Y) <= 15.5 && edgeDist(box, X, Y) >= 8) out.push(box);
  }
  return out;
};
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
  const tight = h < 260, needHead = !!(s.ghost?.label || show.overshoot);
  // slim pads: anchored OS / Tr stay by their markers, not in a reserved two-row band (BUG-51)
  const topPad = needHead ? pad(s.pads?.t, 24, 24) : pad(s.pads?.t, 14, 8);
  const f = rangeFrame(w, h, [0, tEnd], yr, pad(s.pads?.l, 72, 32), pad(s.pads?.r, 14, 10), topPad, pad(s.pads?.b, 38, 20));
  const m = stepMetrics(t, y, { ref, final: s.final, band });
  const avoid = (show.overshoot && Number.isFinite(m.peak) && m.overshootPct > 0.05)
    ? [{ x: f.X(m.peakTime), y: f.Y(m.peak), r: 12 }] : [];
  const ySpan = yr[1] - yr[0], plotH = f.box.b - f.box.t;
  const yWant = (yr[0] <= 0.05 && yr[1] >= 0.95 && ySpan <= 2.6) ? (ySpan <= 1.4 ? 0.5 : 1) : 0;
  const yStep = yWant && plotH / ySpan * yWant >= 12 ? yWant : 0;
  // ±2% lives in the bottom-right pad. When the pad is deep enough it sits below the
  // x-tick row; on a tight pad it shares the tick baseline and the last tick gives way.
  const padB = f.h - f.box.b;
  const bandY = padB >= 34 ? f.box.b + 26 : f.box.b + 9;
  if (show.band && bandY <= f.box.b + 12) avoid.push({ x: f.box.r - 4, y: f.box.b + 9, r: 30 });
  graphAxes(g, f, [0, tEnd], yr, s.xLabel ?? 'time (s)', s.yLabel ?? 'output', 0, yStep, undefined, undefined, avoid);
  const yf = m.yFinal;
  if (show.band && Number.isFinite(yf)) {
    g.save(); clipBox(g, f); g.fillStyle = col.ok(); g.globalAlpha = 0.14; g.fillRect(f.box.l, f.Y(yf * (1 + band)), f.box.r - f.box.l, f.Y(yf * (1 - band)) - f.Y(yf * (1 + band))); g.restore();
    const bandLab = `±${fmtN(band * 100, 0)}%`;
    withLabelRole('axis', () => { text(g, bandLab, f.box.r - 4, bandY, col.ok(), 'right', 10); });
  }
  tline(g, f, [0, ref], [tEnd, ref], col.muted(), 1, [5, 4]);
  if (s.ghost) curve(g, f, Array.from(s.ghost.t), Array.from(s.ghost.y), s.ghost.color ?? col.muted(), 2, [6, 4]);
  curve(g, f, t, y, s.color ?? col.a(), 2.4);
  const tile = isTileCanvas(g);
  // other markers' verticals are obstacles for each label (BUG-58)
  const barY0 = f.Y(yr[0]) - 14;
  const footY = (show.timing && Number.isFinite(m.riseTime)) ? barY0 - 4 : f.Y(yr[0]);
  const vertSegs: { x: number; y0: number; y1: number }[] = [];
  if (show.timing && Number.isFinite(m.riseTime)) {
    vertSegs.push({ x: f.X(m.t10), y0: f.Y(yf * 0.1), y1: footY });
    vertSegs.push({ x: f.X(m.t90), y0: f.Y(yf * 0.9), y1: footY });
  }
  if (show.overshoot && Number.isFinite(m.peak) && m.overshootPct > 0.05)
    vertSegs.push({ x: f.X(m.peakTime), y0: f.Y(m.peak), y1: footY });
  if (show.settling && Number.isFinite(m.settlingTime))
    vertSegs.push({ x: f.X(m.settlingTime), y0: f.Y(yr[1]), y1: footY });
  const hitsOtherVert = (a: number, b2: number, c: number, d: number, own: number[] = []) =>
    vertSegs.some((s) => own.some((o) => Math.abs(s.x - o) < 1.5) ? false
      : (s.x > a - 2 && s.x < b2 + 2 && d > Math.min(s.y0, s.y1) - 2 && c < Math.max(s.y0, s.y1) + 2));
  const hitsCurve = (x0: number, x1: number, y0: number, y1: number) => {
    // match the local overlap e2e (9%+2 px width, 2 px height) plus the stroke half-width
    const dx = ((x1 - x0) * 0.09 + 2) / 2, dy = 1;
    const a = x0 - dx, b2 = x1 + dx, c = y0 - dy, d = y1 + dy;
    for (let i = 1; i < t.length; i++) {
      const ax = f.X(t[i - 1]), ay = f.Y(y[i - 1]), bx = f.X(t[i]), by = f.Y(y[i]);
      if (Math.max(ax, bx) < a - 10 || Math.min(ax, bx) > b2 + 10 || Math.max(ay, by) < c - 10 || Math.min(ay, by) > d + 10) continue;
      const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 3));
      for (let k = 0; k <= steps; k++) {
        const u = k / steps, px = ax + (bx - ax) * u, py = ay + (by - ay) * u;
        if (px > a - 2 && px < b2 + 2 && py > c - 2 && py < d + 2) return true;
      }
    }
    return false;
  };
  const inPlot = (a: number, b2: number, c: number, d: number, extraB = 0) => a > f.box.l + 2 && b2 < f.box.r - 2 && c > f.box.t - 2 && d < f.box.b + extraB;
  // OS may sit in the figure header band above this translated frame, as long as it stays on the canvas and off the readout
  const osFits = (a: number, b2: number, c: number, d: number) => {
    if (d >= f.box.b + 14) return false;
    const m = typeof g.getTransform === 'function' ? g.getTransform() : { a: 1, d: 1, e: 0, f: 0 };
    const x0 = m.a * a + m.e, x1 = m.a * b2 + m.e, y0 = m.d * c + m.f, y1 = m.d * d + m.f;
    const cw = g.canvas.width || w, ch = g.canvas.height || h;
    if (x0 < 2 || x1 > cw - 2 || y0 < 2 || y1 > ch - 2) return false;
    // below the header, stay in the plot; the header itself may use the full canvas width
    if (d > f.box.t + 2 && (a <= f.box.l + 2 || b2 >= f.box.r - 2)) return false;
    return labelsOn(g.canvas).every((r) => !r || x1 < r.x0 - 4 || x0 > r.x1 + 4 || y1 < r.y0 - 4 || y0 > r.y1 + 4);
  };
  const lbl = (str: string, px: number, py: number, color: string, align: CanvasTextAlign = 'left', z = 10.5) => text(g, str, px, py, color, align, z);
  let ghostBox: { x0: number; x1: number; y0: number; y1: number } | null = null;
  let dropGhost = false;
  let osBox: { x0: number; x1: number; y: number } | null = null;
  let trBox: { x0: number; x1: number; y0: number; y1: number } | null = null;
  let tsBox: { x0: number; x1: number; y0: number; y1: number } | null = null;
  const ghostWouldHit = (a: number, b2: number, c: number, d: number) => !!(ghostBox && b2 > ghostBox.x0 - 4 && a < ghostBox.x1 + 4 && d > ghostBox.y0 - 4 && c < ghostBox.y1 + 4);
  if (show.timing && Number.isFinite(m.riseTime)) {
    const y10 = yf * 0.1, y90 = yf * 0.9;
    const barAt = f.Y(yr[0]) - 14;
    tline(g, f, [m.t10, y10], [m.t10, f.iy(barAt - 2)], col.e(), 1, [2, 3], false); tline(g, f, [m.t90, y90], [m.t90, f.iy(barAt - 2)], col.e(), 1, [2, 3], false);
    g.strokeStyle = col.e(); g.lineWidth = 2; g.beginPath(); g.moveTo(f.X(m.t10), barAt); g.lineTo(f.X(m.t90), barAt); g.stroke();
    const trLab = `Tr ${fmtN(m.riseTime)} s`;
    const midX = (f.X(m.t10) + f.X(m.t90)) / 2, barY = f.Y(yr[0]) - 14, yRef = f.Y(ref);
    const x0Bar = f.X(m.t10), x1Bar = f.X(m.t90);
    let trPick: TextBox | null = null;
    for (const z of [10.5, 10, MIN_FONT]) {
      g.font = `${z}px system-ui,sans-serif`;
      const tw = g.measureText(trLab).width, th = z + 3;
      const padYOf = (c: TextBox) => Math.abs(((c.c + c.d) / 2) - barY) <= 24 ? 12 : 0;
      const hitsOriginTick = (c: TextBox) => c.a < f.box.l + 18 && c.d > f.box.b - 6;
      const nearTs = !!(Number.isFinite(m.settlingTime) && show.settling && f.X(m.settlingTime) - x1Bar < tw + 16);
      const leftBar = midX < f.box.l + (f.box.r - f.box.l) * 0.28;
      const spots: TextBox[] = leftBar && !nearTs
        ? [
          textBox(x1Bar + 6, barY - 10, tw, th, 'left', z),
          textBox(x1Bar + 6, barY + 10, tw, th, 'left', z),
          textBox(midX + tw * 0.7, barY - 10, tw, th, 'center', z),
          textBox(midX + tw * 0.7, barY + 10, tw, th, 'center', z),
          textBox(midX, barY - 10, tw, th, 'center', z),
          textBox(midX, barY + 10, tw, th, 'center', z),
        ]
        : leftBar
        ? [
          // Ts is just to the right: stay under the rise, above the tick row so the 0 tick is clear
          textBox(midX, barY - 10, tw, th, 'center', z),
          textBox(Math.max(midX, f.box.l + 22 + tw / 2), barY - 10, tw, th, 'center', z),
          textBox(midX + tw * 0.5, barY - 10, tw, th, 'center', z),
          textBox(midX, barY + 10, tw, th, 'center', z),
        ]
        : [
          textBox(midX, barY - 10, tw, th, 'center', z),
          textBox(midX, barY + 10, tw, th, 'center', z),
          textBox(x0Bar - 6, barY, tw, th, 'right', z),
          textBox(x1Bar + 6, barY, tw, th, 'left', z),
          textBox(midX, barY - 18, tw, th, 'center', z),
          textBox(midX, barY + 16, tw, th, 'center', z),
          textBox(midX - tw * 0.6, barY + 10, tw, th, 'center', z),
          textBox(midX + tw * 0.6, barY + 10, tw, th, 'center', z),
          textBox(midX - tw * 0.6, barY - 10, tw, th, 'center', z),
          textBox(midX + tw * 0.6, barY - 10, tw, th, 'center', z),
        ];
      for (const c of spots) {
        if (!inPlot(c.a, c.b2, c.c, c.d, padYOf(c))) continue;
        if (c.c < yRef + 6 && c.d > yRef - 6) continue;
        if (hitsCurve(c.a, c.b2, c.c, c.d)) continue;
        if (hitsOtherVert(c.a, c.b2, c.c, c.d, [x0Bar, x1Bar])) continue;
        if (hitsOriginTick(c)) continue;
        trPick = c; break;
      }
      if (trPick) break;
    }
    if (!trPick) {
      // required Tr stays just under the bar, off the x-tick row and the curve
      g.font = `${MIN_FONT}px system-ui,sans-serif`;
      const tw = g.measureText(trLab).width, th = MIN_FONT + 3;
      const ys = [barY + 10, barY + 16, barY - 10];
      const nearTs = !!(Number.isFinite(m.settlingTime) && show.settling && f.X(m.settlingTime) - x1Bar < tw + 16);
      const leftBar = midX < f.box.l + (f.box.r - f.box.l) * 0.28;
      const xs: [number, CanvasTextAlign][] = leftBar && !nearTs
        ? [[x1Bar + 6, 'left'], [midX + tw * 0.7, 'center'], [x1Bar + 14, 'left'], [midX, 'center']]
        : leftBar
        ? [[midX, 'center'], [Math.max(midX, f.box.l + 22 + tw / 2), 'center'], [midX + tw * 0.5, 'center']]
        : [[midX, 'center'], [x1Bar + 6, 'left'], [x0Bar - 6, 'right'], [midX + tw * 0.55, 'center'], [midX - tw * 0.55, 'center']];
      for (const yy of ys) for (const [xx, al] of xs) {
        const c = textBox(xx, yy, tw, th, al, MIN_FONT);
        if (c.a < f.box.l + 2 || c.b2 > f.box.r - 2) continue;
        if (c.d > f.box.b + 4) continue;
        if (hitsOtherVert(c.a, c.b2, c.c, c.d, [x0Bar, x1Bar])) continue;
        if (hitsCurve(c.a, c.b2, c.c, c.d)) continue;
        if (c.a < f.box.l + 18 && c.d > f.box.b - 6) continue;
        trPick = c; break;
      }
    }
    if (trPick) {
      trBox = { x0: trPick.a, x1: trPick.b2, y0: trPick.c, y1: trPick.d };
      withAnchor({ kind: 'bar', x: x0Bar, y: barY, x2: x1Bar, y2: barY }, () => {
        withLabelRole('axis', () => { lbl(trLab, trPick!.x, trPick!.y, col.e(), trPick!.align, trPick!.z); });
      });
    }
  }
  if (show.overshoot && Number.isFinite(m.peak) && m.overshootPct > 0.05) {
    const tpFoot = (show.timing && Number.isFinite(m.riseTime)) ? f.iy(f.Y(yr[0]) - 18) : yr[0];
    tline(g, f, [m.peakTime, m.peak], [m.peakTime, tpFoot], col.b(), 1, [2, 3], false); dot(g, f, [m.peakTime, m.peak], col.b(), 4);
    const osFull = `${fmtN(m.overshootPct, 1)}% overshoot  (Tp ${fmtN(m.peakTime)} s)`;
    const osShort = `OS ${fmtN(m.overshootPct, 1)}%  Tp ${fmtN(m.peakTime)} s`;
    const peakX = f.X(m.peakTime), peakY = f.Y(m.peak), yRef = f.Y(ref);
    const tryOs = (ignoreGhost: boolean) => {
      g.font = '10.5px system-ui,sans-serif';
      const fullWide = ((g.measureText(osFull).width * 0.09 + 2) / 2) > 3;
      for (const word of (tight || w < 420 || fullWide ? [osShort, osFull] : [osFull, osShort])) {
        for (const z of [10.5, 10, MIN_FONT]) {
          g.font = `${z}px system-ui,sans-serif`;
          const tw = g.measureText(word).width, th = z + 3;
          const above: TextBox[] = [];
          for (const gap of [12, 16]) for (const al of ['center', 'right', 'left'] as CanvasTextAlign[])
            above.push(textBox(peakX, peakY - gap - z * 0.55, tw, th, al, z));
          for (const c of [...above, ...aroundMarker(peakX, peakY, tw, th, z, true)]) {
            const I = inflateBox(c);
            if (!osFits(c.a, c.b2, c.c, c.d)) continue;
            if (!ignoreGhost && ghostWouldHit(I.a, I.b2, I.c, I.d)) continue;
            const cx = Math.max(I.a, Math.min(peakX, I.b2)), cy = Math.max(I.c, Math.min(peakY, I.d));
            if (Math.hypot(cx - peakX, cy - peakY) < 8) continue;
            if (I.c < yRef + 3 && I.d > yRef - 3) continue;
            const hitsV = (tx: number) => tx > I.a - 2 && tx < I.b2 + 2 && I.d > Math.min(peakY, f.Y(yr[0])) - 2 && I.c < Math.max(peakY, f.box.b) + 2;
            if (show.timing && (hitsV(f.X(m.t10)) || hitsV(f.X(m.t90)))) continue;
            if (hitsOtherVert(I.a, I.b2, I.c, I.d, [peakX])) continue;
            if (hitsCurve(c.a, c.b2, c.c, c.d)) continue;
            return { word, c };
          }
        }
      }
      return null;
    };
    let osHit = tryOs(false);
    if (!osHit && s.ghost?.label && tile) { dropGhost = true; ghostBox = null; osHit = tryOs(true); }
    if (osHit) {
      const { word, c } = osHit;
      withAnchor({ kind: 'marker', x: peakX, y: peakY }, () => {
        withLabelRole('axis', () => { lbl(word, c.x, c.y, col.b(), c.align, c.z); });
      });
      osBox = { x0: c.a, x1: c.b2, y: c.y };
    } else {
      // required OS/Tp stays next to the peak on tiles and expanded views; still skip the curve and the reference line
      let c: TextBox | null = null;
      g.font = `${MIN_FONT}px system-ui,sans-serif`;
      const tw = g.measureText(osShort).width, th = MIN_FONT + 3;
      for (const cand of aroundMarker(peakX, peakY, tw, th, MIN_FONT, true)) {
        const I = inflateBox(cand);
        if (!osFits(cand.a, cand.b2, cand.c, cand.d)) continue;
        const cx = Math.max(I.a, Math.min(peakX, I.b2)), cy = Math.max(I.c, Math.min(peakY, I.d));
        if (Math.hypot(cx - peakX, cy - peakY) < 8) continue;
        if (I.c < yRef + 3 && I.d > yRef - 3) continue;
        if (hitsCurve(cand.a, cand.b2, cand.c, cand.d)) continue;
        c = cand; break;
      }
      if (!c) {
        const z = MIN_FONT;
        const above: TextBox[] = [];
        for (const gap of [12, 16]) for (const al of ['center', 'right', 'left'] as CanvasTextAlign[])
          above.push(textBox(peakX, peakY - gap - z * 0.55, tw, th, al, z));
        const pool = [...above, ...aroundMarker(peakX, peakY, tw, th, z, true), ...aroundMarker(peakX, peakY, tw, th, z, false)];
        const okish = (cand: TextBox) => {
          const I = inflateBox(cand);
          if (!osFits(cand.a, cand.b2, cand.c, cand.d)) return false;
          const cx = Math.max(I.a, Math.min(peakX, I.b2)), cy = Math.max(I.c, Math.min(peakY, I.d));
          if (Math.hypot(cx - peakX, cy - peakY) < 8) return false;
          if (I.c < yRef + 3 && I.d > yRef - 3) return false;
          if (hitsCurve(cand.a, cand.b2, cand.c, cand.d)) return false;
          return true;
        };
        c = pool.find(okish) ?? null;
      }
      if (c) {
        withAnchor({ kind: 'marker', x: peakX, y: peakY }, () => {
          withLabelRole('axis', () => { lbl(osShort, c!.x, c!.y, col.b(), c!.align, MIN_FONT); });
        });
        osBox = { x0: c.a, x1: c.b2, y: c.y };
      }
    }
  }
  // assignments to osBox / trBox inside the branches above stay narrow for CFA
  const osPlaced = osBox as { x0: number; x1: number; y: number } | null;
  const trPlaced = trBox as { x0: number; x1: number; y0: number; y1: number } | null;
  const hitsTr = (a: number, b2: number, c: number, d: number) =>
    !!(trPlaced && b2 > trPlaced.x0 - 6 && a < trPlaced.x1 + 6 && d > trPlaced.y0 - 6 && c < trPlaced.y1 + 6);
  if (show.settling && m.settled && Number.isFinite(m.settlingTime)) {
    // the dashed Ts line stops just under the overshoot label when it would run through it (it made "15.7 %" read "5.7 %")
    const tx = f.X(m.settlingTime), cut = osPlaced && tx > osPlaced.x0 - 3 && tx < osPlaced.x1 + 3 ? Math.min(yr[1], f.iy(osPlaced.y + 8)) : yr[1];
    const tsFoot = (show.timing && Number.isFinite(m.riseTime)) ? f.iy(f.Y(yr[0]) - 18) : yr[0];
    tline(g, f, [m.settlingTime, tsFoot], [m.settlingTime, cut], col.c(), 1.5, [5, 4], false);
    {
      const tsLab = s.settlingLabel ?? `Ts ${fmtN(m.settlingTime)} s`;
      const lineX = f.X(m.settlingTime), yRef = f.Y(ref);
      const yLo = f.Y(yr[0]), yHi = osPlaced && lineX > osPlaced.x0 - 3 && lineX < osPlaced.x1 + 3 ? osPlaced.y + 8 : f.Y(Math.min(yr[1], cut));
      let tsPick: TextBox | null = null;
      for (const z of [10.5, 10, MIN_FONT]) {
        g.font = `${z}px system-ui,sans-serif`;
        const tw = g.measureText(tsLab).width, th = z + 3;
        const yTop = Math.min(yLo, yHi), yBot = Math.max(yLo, yHi);
        const tsNear = (c: TextBox) => {
          const dx = lineX < c.a ? c.a - lineX : lineX > c.b2 ? lineX - c.b2 : 0;
          const dy = c.d < yTop ? yTop - c.d : c.c > yBot ? c.c - yBot : 0;
          return Math.hypot(dx, dy) <= 23;
        };
        const ys = [yLo - 8, yLo - 4, yBot - 18, (yTop + yBot) / 2, yTop + 14, yHi - 12];
        for (const yy of ys) for (const [x, al] of [[lineX + 8, 'left'], [lineX + 12, 'left'], [lineX - 8, 'right']] as [number, CanvasTextAlign][]) {
          const c = textBox(x, yy, tw, th, al, z);
          if (!inPlot(c.a, c.b2, c.c, c.d, 8)) continue;
          if (Math.abs(yy - yRef) < 8) continue;
          if (!tsNear(c)) continue;
          if (osPlaced && c.b2 > osPlaced.x0 - 6 && c.a < osPlaced.x1 + 6 && c.d > osPlaced.y - 12 && c.c < osPlaced.y + 12) continue;
          if (hitsTr(c.a, c.b2, c.c, c.d)) continue;
          if (hitsCurve(c.a, c.b2, c.c, c.d)) continue;
          if (hitsOtherVert(c.a, c.b2, c.c, c.d, [lineX])) continue;
          tsPick = c; break;
        }
        if (tsPick) break;
      }
      if (!tsPick) {
        g.font = `${MIN_FONT}px system-ui,sans-serif`;
        const tw = g.measureText(tsLab).width, th = MIN_FONT + 3;
        const yTop = Math.min(yLo, yHi), yBot = Math.max(yLo, yHi);
        const tsNear = (c: TextBox) => {
          const dx = lineX < c.a ? c.a - lineX : lineX > c.b2 ? lineX - c.b2 : 0;
          const dy = c.d < yTop ? yTop - c.d : c.c > yBot ? c.c - yBot : 0;
          return Math.hypot(dx, dy) <= 23;
        };
        const ys = [yLo - 8, yLo - 4, yBot - 18, (yTop + yBot) / 2, yTop + 14, yHi - 12];
        const xs: [number, CanvasTextAlign][] = [[lineX + 8, 'left'], [lineX + 12, 'left'], [lineX - 8, 'right']];
        for (const yy of ys) for (const [x, al] of xs) {
          const c = textBox(x, yy, tw, th, al, MIN_FONT);
          if (!inPlot(c.a, c.b2, c.c, c.d, 12)) continue;
          if (!tsNear(c)) continue;
          if (osPlaced && c.b2 > osPlaced.x0 - 6 && c.a < osPlaced.x1 + 6 && c.d > osPlaced.y - 12 && c.c < osPlaced.y + 12) continue;
          if (hitsTr(c.a, c.b2, c.c, c.d)) continue;
          if (hitsOtherVert(c.a, c.b2, c.c, c.d, [lineX])) continue;
          if (hitsCurve(c.a, c.b2, c.c, c.d)) continue;
          tsPick = c; break;
        }
      }
      if (tsPick) {
        withAnchor({ kind: 'line', x: lineX, y: yLo, x2: lineX, y2: yHi }, () => {
          withLabelRole('axis', () => { lbl(tsLab, tsPick!.x, tsPick!.y, col.c(), tsPick!.align, tsPick!.z); });
        });
        tsBox = { x0: tsPick.a, x1: tsPick.b2, y0: tsPick.c, y1: tsPick.d };
      }
    }
  }
  // required Ts / OS / Tr first; the stand-in legend then takes a free corner (CI fonts can be slightly wider)
  const tsPlaced = tsBox as { x0: number; x1: number; y0: number; y1: number } | null;
  const GHOST_GAP = 8;
  const ghostBlocked = (a: number, b2: number, c: number, d: number) => {
    if (osPlaced && b2 > osPlaced.x0 - 4 && a < osPlaced.x1 + 4 && d > osPlaced.y - 10 && c < osPlaced.y + 10) return true;
    if (tsPlaced && b2 > tsPlaced.x0 - GHOST_GAP && a < tsPlaced.x1 + GHOST_GAP && d > tsPlaced.y0 - GHOST_GAP && c < tsPlaced.y1 + GHOST_GAP) return true;
    if (hitsCurve(a, b2, c, d)) return true;
    if (hitsOtherVert(a, b2, c, d)) return true;
    if (show.overshoot && Number.isFinite(m.peak)) {
      const px0 = f.X(m.peakTime), py0 = f.Y(m.peak);
      const cx = Math.max(a, Math.min(px0, b2)), cy = Math.max(c, Math.min(py0, d));
      if (Math.hypot(cx - px0, cy - py0) < 8) return true;
    }
    return false;
  };
  if (s.ghost?.label && !dropGhost) {
    const gl = s.ghost, gLab = `┄ ${gl.label}`;
    g.font = '10px system-ui,sans-serif';
    const gw = g.measureText(gLab).width;
    const px = (show.overshoot && Number.isFinite(m.peak) && m.overshootPct > 0.05) ? f.X(m.peakTime) : (f.box.l + f.box.r) / 2;
    const farFrom = (show.settling && Number.isFinite(m.settlingTime)) ? f.X(m.settlingTime) : px;
    const mk = (x: number, y: number, align: CanvasTextAlign) => ({ x, y, align });
    const topL = mk(f.box.l + 4, Math.max(8, f.box.t - 10), 'left'), topR = mk(f.box.r - 4, Math.max(8, f.box.t - 10), 'right');
    const inR = [mk(f.box.r - 4, f.box.t + 14, 'right'), mk(f.box.r - 4, f.box.t + 28, 'right')];
    const inL = [mk(f.box.l + 4, f.box.t + 14, 'left'), mk(f.box.l + 4, f.box.t + 28, 'left')];
    const midR = mk(f.box.r - 4, (f.box.t + f.box.b) / 2, 'right'), midL = mk(f.box.l + 4, (f.box.t + f.box.b) / 2, 'left');
    const farFirst = Math.abs(topR.x - farFrom) >= Math.abs(topL.x - farFrom);
    // tiles: only the top pad — if those fail, drop the ghost rather than park it on the curve
    const spots = tile
      ? (farFirst ? [topR, topL] : [topL, topR])
      : (farFirst ? [topR, topL, ...inR, midR, ...inL, midL] : [topL, topR, ...inL, midL, ...inR, midR]);
    let placed = false;
    for (const sp of spots) {
      const a = sp.align === 'right' ? sp.x - gw : sp.x, b2 = a + gw, c = sp.y - 6, d = sp.y + 6;
      if (ghostBlocked(a, b2, c, d)) continue;
      ghostBox = { x0: a, x1: b2, y0: c, y1: d };
      withLabelRole('axis', () => { text(g, gLab, sp.x, sp.y, gl.color ?? col.muted(), sp.align, 10); });
      placed = true; break;
    }
    if (!placed && !tile) {
      g.font = `${MIN_FONT}px system-ui,sans-serif`;
      const gw9 = g.measureText(gLab).width;
      const extra = [
        midR, midL,
        mk(f.box.r - 4, f.box.t + 44, 'right'), mk(f.box.l + 4, f.box.t + 44, 'left'),
        mk(f.box.r - 4, f.box.t + (f.box.b - f.box.t) * 0.65, 'right'), mk(f.box.l + 4, f.box.t + (f.box.b - f.box.t) * 0.65, 'left'),
      ];
      for (const sp of [...spots, ...extra]) {
        const a = sp.align === 'right' ? sp.x - gw9 : sp.x, b2 = a + gw9, c0 = sp.y - 6, d0 = sp.y + 6;
        if (ghostBlocked(a, b2, c0, d0)) continue;
        ghostBox = { x0: a, x1: b2, y0: c0, y1: d0 };
        withLabelRole('axis', () => { text(g, gLab, sp.x, sp.y, gl.color ?? col.muted(), sp.align, MIN_FONT); });
        placed = true; break;
      }
    }
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
    const hits = (yy: number, half = 12) => {
      if (Math.abs(yy - yRef) < 12 || Math.abs(yy - ySag) < 10) return true;
      for (let i = 0; i < t.length; i++) {
        const px = f.X(t[i]);
        if (px < x0 - 4 || px > x1 + 4) continue;
        if (Math.abs(f.Y(y[i]) - yy) < half) return true;
      }
      return false;
    };
    const cands = [ySag + 18, ySag - 18, ySag + 28, ySag - 28, ySag + 38, ySag - 38, f.box.t + 12, f.box.b - 16];
    const essY = cands.find((yy) => yy > f.box.t + 6 && yy < f.box.b - 6 && !hits(yy))
      ?? Math.max(8, f.box.t - 10);
    withLabelRole('axis', () => { lbl(essText, xLab, essY, col.bad(), 'right'); });
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
  const tileCanvas = isTileCanvas(g);
  const pad = s.pad ?? (tileCanvas ? 12 : 18);
  let vw = w, vh = h, ox = 0, oy = 0;
  let reserved: { ix: number; iy: number; iw: number; ih: number } | null = null;
  // leave a side band for the zoom inset so a mid-size tile can show it without covering the main plane
  if (s.inset && s.clear !== false) {
    const sw = Math.round(Math.max(110, Math.min(200, h - 16, w * 0.36)));
    if (sw >= 110 && w >= sw + 130 && h >= sw + 8) {
      reserved = { iw: sw, ih: sw, ix: w - sw - 4, iy: Math.max(4, Math.min(h - sw - 4, (h - sw) / 2)) };
      vw = reserved.ix - 6;
    }
  }
  if (s.maxAspect && s.maxAspect > 0 && vw > 2 * pad && h > 2 * pad) {
    const cap = tileCanvas ? Math.max(s.maxAspect, 1.8) : s.maxAspect;
    const iw = vw - 2 * pad, ih = h - 2 * pad;
    if (iw / ih > cap) { const nw = cap * ih + 2 * pad; ox += (vw - nw) / 2; vw = nw; }
    else if (ih / iw > cap) { vh = cap * iw + 2 * pad; oy = (h - vh) / 2; }
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
    const realPx = (s.poles ?? []).filter((p) => Math.abs(p.im) < 1e-6).map((p) => f.X(p.re));
    const underPole = (px: number) => realPx.some((mx) => Math.abs(mx - px) < 16);
    forTicks(Math.ceil(f.ix(f.box.l) / st) * st, f.ix(f.box.r), st, (x) => {
      const lab = tickLabel(x, st), px = f.X(x), tw = 5.6 * (lab ? lab.length : 0);
      if (lab && lab !== lastX && px + tw / 2 <= f.box.r && Math.abs(px - lastPx) >= 26 && !hitsMark(px, f.box.b + 9, tw) && !underPole(px)) { text(g, lab, px, f.box.b + 9, col.muted(), 'center', 9); lastX = lab; lastPx = px; }
    });
    let lastY = '', lastPy = Infinity;
    forTicks(Math.ceil(f.iy(f.box.b) / st) * st, f.iy(f.box.t), st, (y) => {
      const lab = tickLabel(y, st), py = f.Y(y), tw = 5.6 * (lab ? lab.length : 0);
      if (lab && lab !== '0' && lab !== lastY && py > f.box.t - 2 && py < f.box.b + 2 && Math.abs(py - lastPy) >= 16 && !hitsMark(f.box.l - 4 - tw, py, tw)) { text(g, lab, f.box.l - 4, py, col.muted(), 'right', 9); lastY = lab; lastPy = py; }
    });
  });
  // "unstable" is unanchored: placed after pole and ζ labels, and dropped on a tile if it will not fit.
  // allowed region
  if (s.region) {
    const r = s.region; g.save(); clipBox(g, f);
    if (r.sigma !== undefined) { g.beginPath(); g.rect(f.box.l, f.box.t, f.X(-r.sigma) - f.box.l, f.box.b - f.box.t); g.clip(); }
    if (r.zeta !== undefined) { const th = Math.acos(Math.min(1, Math.max(0, r.zeta))); g.beginPath(); g.moveTo(x0, y0); g.lineTo(f.X(-Math.cos(th) * R), f.Y(Math.sin(th) * R)); g.lineTo(f.X(-R), f.Y(0)); g.lineTo(f.X(-Math.cos(th) * R), f.Y(-Math.sin(th) * R)); g.closePath(); g.clip(); }
    if (r.wn !== undefined) { g.beginPath(); g.arc(x0, y0, r.wn * f.sx, 0, 2 * Math.PI); g.clip(); }
    g.fillStyle = col.ok(); g.globalAlpha = 0.13; g.fillRect(f.box.l, f.box.t, f.box.r - f.box.l, f.box.b - f.box.t); g.restore();
  }
  beginClip(g, f.box);
  g.strokeStyle = col.strong(); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, f.box.t); g.lineTo(x0, f.box.b); g.stroke(); // the jω axis: the edge of stability
  for (const wn of s.wnCircles ?? []) { g.strokeStyle = col.d(); g.globalAlpha = 0.7; g.lineWidth = 1; g.setLineDash([3, 4]); g.beginPath(); g.arc(x0, y0, wn * f.sx, Math.PI / 2, (3 * Math.PI) / 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; text(g, `ωn ${fmtN(wn)}`, x0 - wn * f.sx + 3, y0 + 10, col.d(), 'left', 10); }
  const zetaNames: (() => void)[] = [], taken: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const z of s.zetaRays ?? []) {
    const th = Math.acos(Math.min(1, Math.max(0, z)));
    for (const sg of [1, -1]) tline(g, f, [0, 0], [-Math.cos(th) * R, sg * Math.sin(th) * R], col.e(), 1, [5, 4]);
    zetaNames.push(() => {
      // ζ name stays beside its upper ray (not on the stroke), and only in the left half-plane (BUG-49)
      const marksZ = [...(s.poles ?? []), ...(s.zeros ?? []), ...(s.marks ?? []).map((mk) => mk.s)], name = `ζ ${fmtN(z)}`;
      const rays = (s.zetaRays ?? []).map((zz) => Math.acos(Math.min(1, Math.max(0, zz))));
      const qMax = Math.min(s.range, R);
      const ax0 = x0, ay0 = y0, ax1 = f.X(-Math.cos(th) * qMax), ay1 = f.Y(Math.sin(th) * qMax);
      const rayHits = (b: { a: number; b2: number; c: number; d: number }, t2: number, pad = 3) =>
        [1, -1].some((sg) => { for (let k = 0; k <= 80; k++) { const q = (k / 80) * R, X = f.X(-Math.cos(t2) * q), Y = f.Y(sg * Math.sin(t2) * q); if (X > b.a - pad && X < b.b2 + pad && Y > b.c - pad && Y < b.d + pad) return true; } return false; });
      const otherRay = (b: { a: number; b2: number; c: number; d: number }) => rays.some((t2) => Math.abs(t2 - th) >= 1e-6 && rayHits(b, t2));
      const ok = (c: TextBox, relaxOther = false, rawOwn = false, relaxTaken = false) => {
        const I = inflateBox(c);
        const own = rawOwn ? c : I;
        return c.a > f.box.l + 2 && c.b2 < Math.min(f.box.r - 2, x0 - 3) && c.c > f.box.t + 2 && c.d < f.box.b - 2
        && marksZ.every((p) => { const X = f.X(p.re), Y = f.Y(p.im); const cx = Math.max(I.a, Math.min(X, I.b2)), cy = Math.max(I.c, Math.min(Y, I.d)); return Math.hypot(cx - X, cy - Y) >= 8; })
        && (relaxTaken || taken.every((t) => I.b2 < t.x0 - 4 || I.a > t.x1 + 4 || I.d < t.y0 - 4 || I.c > t.y1 + 4))
        && !rayHits(own, th, rawOwn ? 2 : 3) && (relaxOther || !otherRay(I));
      };
      const along = Math.hypot(ax1 - ax0, ay1 - ay0) || 1;
      const nx = -(ay1 - ay0) / along, ny = (ax1 - ax0) / along;
      let pick: TextBox | null = null;
      const collect = (zsz: number, X: number, Y: number): TextBox[] => {
        const twz = g.measureText(name).width, thz = zsz + 3;
        // axis-aligned box on a diagonal ray needs a larger perpendicular offset than the half-height (BUG-54)
        const need = (twz / 2) * Math.abs(nx) + (zsz * 0.55) * Math.abs(ny) + 3;
        const offs = [Math.max(zsz * 0.55 + 7, Math.min(need, 16)), Math.max(zsz * 0.55 + 7, need), need + 4];
        const out: TextBox[] = [];
        for (const off of offs) for (const sg of [1, -1]) {
          const px = X + nx * off * sg, py = Y + ny * off * sg;
          for (const al of ['center', 'left', 'right'] as CanvasTextAlign[]) out.push(textBox(px, py, twz, thz, al, zsz));
        }
        return out;
      };
      const ks = [0.22, 0.3, 0.38, 0.45, 0.52, 0.6, 0.68, 0.75, 0.82, 0.9, 0.15, 0.08, 0.12, 0.95];
      const nearMark = (X: number, Y: number, lim: number) => marksZ.some((p) => Math.hypot(X - f.X(p.re), Y - f.Y(p.im)) < lim);
      const walk = (zsz: number, relax: boolean, raw: boolean, skipNear: number, relaxTaken = false) => {
        g.font = `${zsz}px system-ui,sans-serif`;
        for (const k of ks) {
          const q = Math.min(s.range * k, R), X = f.X(-Math.cos(th) * q), Y = f.Y(Math.sin(th) * q);
          if (X >= x0 - 4) continue;
          if (skipNear && nearMark(X, Y, skipNear)) continue;
          for (const c of collect(zsz, X, Y)) if (ok(c, relax, raw, relaxTaken)) return c;
        }
        return null;
      };
      for (const zsz of [10, MIN_FONT]) { pick = walk(zsz, false, false, 16); if (pick) break; }
      if (!pick) pick = walk(MIN_FONT, true, false, 14);
      if (!pick) pick = walk(MIN_FONT, true, true, 12);
      if (!pick) pick = walk(MIN_FONT, true, true, 8);
      // required ζ names stay on tiles and expanded views (BUG-54 / 55 / 56), still off the stroke
      if (!pick) {
        g.font = `${MIN_FONT}px system-ui,sans-serif`;
        const twz = g.measureText(name).width;
        const need = (twz / 2) * Math.abs(nx) + (MIN_FONT * 0.55) * Math.abs(ny) + 5;
        let best: TextBox | null = null;
        for (const k of ks) {
          const q = Math.min(s.range * k, R), X = f.X(-Math.cos(th) * q), Y = f.Y(Math.sin(th) * q);
          if (X >= x0 - 4 || nearMark(X, Y, 14)) continue;
          for (const off of [need, need + 4, need + 8, 14, 18]) {
            for (const sg of [1, -1]) {
              const px = X + nx * off * sg, py = Y + ny * off * sg;
              for (const al of ['center', 'left', 'right'] as CanvasTextAlign[]) {
                const c = textBox(px, py, twz, MIN_FONT + 3, al, MIN_FONT);
                if (ok(c, true, true)) { pick = c; break; }
                if (!best && c.a > f.box.l + 1 && c.b2 < Math.min(f.box.r - 1, x0 - 1) && c.c > f.box.t + 1 && c.d < f.box.b - 1
                    && !rayHits(inflateBox(c), th, 3) && !otherRay(inflateBox(c))
                    && taken.every((t) => c.b2 < t.x0 - 3 || c.a > t.x1 + 3 || c.d < t.y0 - 3 || c.c > t.y1 + 3)
                    && marksZ.every((p) => { const Xz = f.X(p.re), Yz = f.Y(p.im); const cx = Math.max(c.a, Math.min(Xz, c.b2)), cy = Math.max(c.c, Math.min(Yz, c.d)); return Math.hypot(cx - Xz, cy - Yz) >= 7; }))
                  best = c;
              }
              if (pick) break;
            }
            if (pick) break;
          }
          if (pick) break;
        }
        if (!pick) pick = best;
      }
      if (pick) {
        withAnchor({ kind: 'ray', x: ax0, y: ay0, x2: ax1, y2: ay1 }, () => {
          withLabelRole('axis', () => { text(g, name, pick!.x, pick!.y, col.e(), pick!.align, pick!.z); });
        });
        taken.push({ x0: pick.a, x1: pick.b2, y0: pick.c, y1: pick.d });
      }

    });
  }
  if (s.asymptotes) for (const a of s.asymptotes.anglesDeg) { const r = (a * Math.PI) / 180; tline(g, f, [s.asymptotes.centroid, 0], [s.asymptotes.centroid + Math.cos(r) * R, Math.sin(r) * R], col.muted(), 1.2, [6, 4]); }
  const pal = BRANCH_COLORS();
  (s.locus ?? []).forEach((br, i) => polyline(g, f, br.map((z): V2 => [z.re, z.im]), pal[i % pal.length], 2));
  for (const m of s.marks ?? []) {
    const c = m.color ?? col.accent(), p: V2 = [m.s.re, m.s.im];
    if (m.shape === 'ring') dot(g, f, p, c, 5, true); else if (m.shape === 'diamond') { const X = f.X(p[0]), Y = f.Y(p[1]); g.fillStyle = c; g.beginPath(); g.moveTo(X, Y - 6); g.lineTo(X + 5, Y); g.lineTo(X, Y + 6); g.lineTo(X - 5, Y); g.closePath(); g.fill(); } else dot(g, f, p, c, 5);
    if (m.label) {
      const X = f.X(p[0]), Y = f.Y(p[1]);
      g.font = '10px system-ui,sans-serif';
      const tw = g.measureText(m.label).width, th = 13;
      let pick: TextBox | null = null;
      for (const cand of aroundMarker(X, Y, tw, th, 10, true)) {
        if (cand.a < f.box.l + 2 || cand.b2 > f.box.r - 2 || cand.c < f.box.t + 2 || cand.d > f.box.b - 2) continue;
        if (taken.some((t) => cand.b2 > t.x0 - 4 && cand.a < t.x1 + 4 && cand.d > t.y0 - 4 && cand.c < t.y1 + 4)) continue;
        pick = cand; break;
      }
      const at = pick ?? textBox(X + 8, Y - 9, tw, th, 'left', 10);
      withAnchor({ kind: 'marker', x: X, y: Y }, () => {
        withLabelRole('axis', () => { text(g, m.label!, at.x, at.y, c, at.align, at.z); });
      });
      taken.push({ x0: at.a, x1: at.b2, y0: at.c, y1: at.d });
    }
  }
  for (const hd of s.handles ?? []) for (const sg of Math.abs(hd.im) < 1e-9 ? [1] : [1, -1]) { g.strokeStyle = col.accent(); g.globalAlpha = sg === 1 ? 0.9 : 0.4; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.arc(f.X(hd.re), f.Y(sg * hd.im), 11, 0, 2 * Math.PI); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
  for (const z of s.zeros ?? []) dot(g, f, [z.re, z.im], col.c(), 5, true);
  // pole crosses and zero rings are recorded with the labels (role 'axis'), so notes drawn afterwards slide clear of them
  if (cv && m && Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9 && m.d > 0) for (const p of [...(s.poles ?? []), ...(s.zeros ?? [])]) {
    const X = f.X(p.re), Y = f.Y(p.im); if (X < f.box.l || X > f.box.r || Y < f.box.t || Y > f.box.b) continue;
    labelsOn(cv).push({ x0: m.a * (X - 12) + m.e, x1: m.a * (X + 12) + m.e, y0: m.d * (Y - 12) + m.f, y1: m.d * (Y + 12) + m.f, role: 'axis' });
  }
  // a pole's value goes right of it, or left when a ζ ray runs through that spot (pass 3: a pole on a ray had its value on the ray)
  const zr = (s.zetaRays ?? []).map((zz) => Math.acos(Math.min(1, Math.max(0, zz))));
  const onRay = (x0b: number, x1b: number, y0b: number, y1b: number) => zr.some((t2) => [1, -1].some((sg) => {
    const ax = x0, ay = y0, bx = f.X(-Math.cos(t2) * R), by = f.Y(sg * Math.sin(t2) * R);
    const dx = ((x1b - x0b) * 0.09 + 2) / 2, dy = 1;
    const pad = 2, a = x0b - dx - pad, b2 = x1b + dx + pad, c = y0b - dy - pad, d = y1b + dy + pad;
    if (Math.max(ax, bx) < a || Math.min(ax, bx) > b2 || Math.max(ay, by) < c || Math.min(ay, by) > d) return false;
    const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
    for (let k = 0; k <= n; k++) { const u = k / n, X = ax + (bx - ax) * u, Y = ay + (by - ay) * u; if (X > a && X < b2 && Y > c && Y < d) return true; }
    return false;
  }));
  g.font = '11px system-ui, sans-serif';
  const xLab = s.xLabel ?? 'σ (1/s)', jwLab = s.yLabel ?? 'jω (rad/s)', jwW = g.measureText(jwLab).width, jwX = f.X(0) + 6;
  const sigY = y0 - 18, sigX1 = f.box.r - 2, sigRoom = sigX1 - (f.X(0) + 14);
  let sigZ = 11; g.font = '11px system-ui,sans-serif'; let sw = g.measureText(xLab).width;
  while (sigZ > 9 && sw > sigRoom && sigRoom > 0) { sigZ -= 1; g.font = `${sigZ}px system-ui,sans-serif`; sw = g.measureText(xLab).width; }
  if (sw > sigRoom) { g.font = '11px system-ui,sans-serif'; sw = g.measureText('σ').width; }
  const sigX0 = sigX1 - sw;
  const onSigma = (a: number, b2: number, c: number, d: number) => b2 > sigX0 - 5 && a < sigX1 + 5 && d > sigY - 10 && c < sigY + 10;
  const onJw = (a: number, b2: number, c: number, d: number) => b2 > jwX - 2 && a < jwX + jwW + 2 && d > f.box.t - 18 && c < f.box.t + 4;
  const hitsTaken = (a: number, b2: number, c: number, d: number) => taken.some((t) => b2 > t.x0 - 3 && a < t.x1 + 3 && d > t.y0 - 3 && c < t.y1 + 3);
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
  const allMarks = [...(s.poles ?? []), ...(s.zeros ?? []), ...(s.marks ?? []).map((mk) => mk.s)].map((z) => ({ X: f.X(z.re), Y: f.Y(z.im) }));
  const hitsOtherMark = (X0: number, Y0: number, a: number, b2: number, c: number, d: number) => allMarks.some((mk) => {
    if (Math.hypot(mk.X - X0, mk.Y - Y0) < 4) return false; // the anchor itself
    const cx = Math.max(a, Math.min(mk.X, b2)), cy = Math.max(c, Math.min(mk.Y, d));
    return Math.hypot(cx - mk.X, cy - mk.Y) < 10;
  });
  const tile = isTileCanvas(g);
  endClip(g);
  for (const { p, lab } of labelled) {
    const X = f.X(p.re), Yp = f.Y(p.im);
    if (X < f.box.l - 6 || X > f.box.r + 6 || Yp < f.box.t - 6 || Yp > f.box.b + 6) continue;
    const others = allMarks.filter((mk) => Math.hypot(mk.X - X, mk.Y - Yp) >= 4);
    const rightBusy = others.some((mk) => mk.X >= X - 2 && Math.abs(mk.Y - Yp) < 24 && mk.X - X < 48);
    const preferRight = f.box.r - X >= 28 && !rightBusy;
    const realPole = Math.abs(p.im) < 1e-9;
    let pick: TextBox | null = null;
    const poleSpots = (sz: number, tw0: number, th0: number): TextBox[] => {
      const out: TextBox[] = [];
      // LHP: 'right' alignment extends the value left of the ×, clear of ζ rays that rise toward the origin
      for (const gap of [14, 12]) for (const al of (['right', 'left', 'center'] as CanvasTextAlign[])) {
        out.push(textBox(X, Yp - gap - sz * 0.55, tw0, th0, al, sz));
        out.push(textBox(X, Yp + gap + sz * 0.55, tw0, th0, al, sz));
      }
      return out;
    };
    for (const z of [10, MIN_FONT]) {
      g.font = `${z}px system-ui,sans-serif`;
      const tw = g.measureText(lab).width, th = z + 4;
      const explicit: TextBox[] = poleSpots(z, tw, th);
      const cands = aroundMarker(X, Yp, tw, th, z, preferRight);
      const ranked = [...explicit, ...cands];
      for (const c of ranked) {
        const I = inflateBox(c);
        if (c.a < 1 || c.b2 > vw - 1 || c.c < 1 || c.d > vh - 1) continue;
        if (onSigma(I.a, I.b2, I.c, I.d) || onJw(I.a, I.b2, I.c, I.d) || hitsTaken(I.a, I.b2, I.c, I.d)) continue;
        if (hitsOtherMark(X, Yp, I.a, I.b2, I.c, I.d)) continue;
        if (onRay(c.a, c.b2, c.c, c.d)) continue;
        pick = c; break;
      }
      if (pick) break;
    }
    // only Disk 5's long pole value may hide on a tile (BUG-55 / 57)
    const mayHide = tile && /−0\.23.*j139\.73/.test(lab);
    if (!pick && !mayHide) {
      // expanded (and every other tile) must keep the value beside the ×
      g.font = `${MIN_FONT}px system-ui,sans-serif`;
      const tw = g.measureText(lab).width, th = MIN_FONT + 4;
      const explicit = poleSpots(MIN_FONT, tw, th);
      const raw = [...explicit, ...aroundMarker(X, Yp, tw, th, MIN_FONT, preferRight), ...aroundMarker(X, Yp, tw, th, MIN_FONT, preferRight, 14), ...aroundMarker(X, Yp, tw, th, MIN_FONT, !preferRight)];
      const inClip = (c: TextBox) => c.a >= 1 && c.b2 <= vw - 1 && c.c >= 1 && c.d <= vh - 1;
      for (const c of raw) {
        const I = inflateBox(c);
        if (!inClip(c)) continue;
        if (hitsOtherMark(X, Yp, I.a, I.b2, I.c, I.d) || hitsTaken(I.a, I.b2, I.c, I.d)) continue;
        if (onRay(c.a, c.b2, c.c, c.d)) continue;
        pick = c; break;
      }
      if (!pick) {
        // last try: uninflated mark clearance, still off every ζ ray (required values may not sit on a dashed line)
        for (const c of raw) {
          if (!inClip(c)) continue;
          if (hitsOtherMark(X, Yp, c.a, c.b2, c.c, c.d)) continue;
          if (onRay(c.a, c.b2, c.c, c.d)) continue;
          pick = c; break;
        }
      }
    }
    if (!pick) continue;
    withAnchor({ kind: 'marker', x: X, y: Yp }, () => {
      withLabelRole('axis', () => { text(g, lab, pick!.x, pick!.y, col.b(), pick!.align, pick!.z); });
    });
    taken.push({ x0: pick.a, x1: pick.b2, y0: pick.c, y1: pick.d });
  }
  for (const zn of zetaNames) zn();
  // unanchored "unstable": in the shade if a free spot remains; drop it on a tile rather than move a pole value
  if (s.shadeUnstable !== false && !isThumb(g)) {
    const shadeL = Math.max(x0, f.box.l), shadeR = f.box.r, word = 'unstable';
    // an inset (or a view) whose window is entirely left of 0 has no shade and must not say "unstable"
    if (shadeR - shadeL <= 8) { /* no visible unstable region */ } else {
    const blocked = (a: number, b2: number, c: number, d: number) =>
      onRay(a, b2, c, d)
      || taken.some((t) => b2 > t.x0 - 6 && a < t.x1 + 6 && d > t.y0 - 6 && c < t.y1 + 6)
      || allMarks.some((mk) => { const cx = Math.max(a, Math.min(mk.X, b2)), cy = Math.max(c, Math.min(mk.Y, d)); return Math.hypot(cx - mk.X, cy - mk.Y) < 12; });
    let placed = false;
    const tryPut = (z0: number, x: number, ys: number[]) => {
      g.font = `${z0}px system-ui,sans-serif`;
      const tw = g.measureText(word).width, th = z0 * 1.15;
      for (const y of ys) {
        const a = x - tw, b2 = x, c = y - th / 2, d = y + th / 2;
        if (c < f.box.t + 2 || d > f.box.b - 2) continue;
        if (onJw(a, b2, c, d) || onSigma(a, b2, c, d) || blocked(a, b2, c, d)) continue;
        withLabelRole('axis', () => { text(g, word, x, y, col.bad(), 'right', z0); });
        placed = true; return;
      }
    };
    if (shadeR - shadeL > 8) {
      tryPut(10, shadeR - 6, [f.box.t + 16, f.box.t + 28, (f.box.t + f.box.b) / 2, f.box.b - 16]);
      if (!placed) tryPut(MIN_FONT, shadeR - 6, [f.box.t + 16, f.box.t + 28, f.box.b - 16]);
    }
    if (!placed && !isTileCanvas(g)) {
      // expanded must keep the word: top-right pad, then a last shade slot off the jω title
      tryPut(MIN_FONT, f.box.r - 2, [Math.max(9, f.box.t - 8), f.box.t + 16]);
      if (!placed) {
        g.font = `${MIN_FONT}px system-ui,sans-serif`;
        const tw = g.measureText(word).width;
        const spots = [f.box.t + 14, f.box.t + 24, f.box.b - 14, (f.box.t + f.box.b) / 2];
        let yPut: number | null = null;
        for (const y of spots) {
          const a = shadeR - 6 - tw, c = y - MIN_FONT * 0.55, d = y + MIN_FONT * 0.55;
          if (c >= f.box.t + 1 && d <= f.box.b - 1 && !blocked(a, shadeR - 6, c, d)) { yPut = y; break; }
        }
        if (yPut === null) yPut = f.box.t + 14;
        withLabelRole('axis', () => { text(g, word, shadeR - 6, yPut, col.bad(), 'right', MIN_FONT); });
      }
    }
    }
  }
  g.restore();
  if (s.inset && s.clear !== false) {
    let ix: number, iy: number, iw: number, ih: number;
    if (reserved) ({ ix, iy, iw, ih } = reserved);
    else {
      iw = Math.round(Math.max(110, Math.min(220, h - 16, w * 0.32)));
      ih = iw;
      const right = w - (ox + vw), left = ox;
      if (right >= iw + 10) { ix = ox + vw + 6; iy = Math.max(4, Math.min(h - ih - 4, oy + (vh - ih) / 2)); }
      else if (left >= iw + 10) { ix = 8; iy = Math.max(4, Math.min(h - ih - 4, oy + (vh - ih) / 2)); }
      else { ix = -1; iy = -1; iw = 0; ih = 0; } // no side room: hide the inset on this tile (BUG-44)
    }
    if (ix >= 0 && iy >= 0 && ix + iw <= w - 2 && iy + ih <= h - 2 && iw >= 110 && ih >= 110) {
      g.save();
      g.strokeStyle = col.strong(); g.lineWidth = 1; g.setLineDash([]);
      g.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
      logInsetFrame(g, ix + 0.5, iy + 0.5, iw - 1, ih - 1);
      g.translate(ix, iy);
      const insetHi = (s.inset.reCenter ?? 0) + s.inset.range;
      drawSPlane(g, iw, ih, {
        range: s.inset.range, reCenter: s.inset.reCenter, poles: s.poles, zeros: s.zeros, labels: true,
        pad: 16, maxAspect: 1, clear: false,
        // never label or shade "unstable" in a zoom box that stays left of 0 (BUG-53)
        shadeUnstable: s.shadeUnstable !== false && insetHi > 1e-9, xLabel: '', yLabel: '',
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
  const fm = rangeFrame(w, hTop, [lo, hi], mr, 72, 12, 8, 6), fp = rangeFrame(w, hBot, [lo, hi], pr, 72, 12, 6, 38);
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
  const f = rangeFrame(w, h, [0, s.wmax], yr, 72, 12, 10, 32);
  graphAxes(g, f, [0, s.wmax], yr, s.xLabel ?? 'ω (rad/s) along the jω axis', s.db ? '|G(jω)| (dB)' : '|G(jω)|');
  if (s.ghost) curve(g, f, ws, val(s.ghost), col.muted(), 2, [6, 4]);
  curve(g, f, ws, ys, col.e(), 2.4);
  if (s.omega !== undefined) { const m = s.db ? 20 * Math.log10(cabs(freqresp(s.G, s.omega))) : cabs(freqresp(s.G, s.omega)); tline(g, f, [s.omega, yr[0]], [s.omega, m], col.e(), 1, [3, 3]); dot(g, f, [s.omega, m], col.e(), 5); }
  return f;
}
