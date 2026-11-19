/** Small fixed pictures for the map pop-ups (quiz-figure renderers, no controls). Every number comes from ex.ts. */
import { rangeFrame, graphAxes, curve, tline, text, dot, cross, col, linspace, type QuizFigureDef } from '@study/core';
import { hImp, Hf, cabs, TAU, ltCompare, XMAX_UM, spk, houseA, heaterB, simHouse } from './ex';

const P = (p: Record<string, number | string | boolean>, k: string, d: number) => (p[k] === undefined ? d : Number(p[k]));
const fr = (g: CanvasRenderingContext2D, w: number, h: number, xr: [number, number], yr: [number, number], xl: string, yl: string, L = 30) => {
  g.clearRect(0, 0, w, h); const f = rangeFrame(w, h, xr, yr, L, 6, 16, 24); graphAxes(g, f, xr, yr, xl, yl); return f;
};
const title = (g: CanvasRenderingContext2D, s: string, w: number, color = col.text()) => text(g, s, w / 2, 8, color, 'center', 10.5);

/** Box 3: homogeneity test on the earbud at drive a: T{2u₁} (solid) vs 2·T{u₁} (dashed). */
const lintest: QuizFigureDef = { aspect: 1.25, maxWidth: 260, draw(g, w, h, p) {
  const a = P(p, 'a', 0.2), r = ltCompare('spk', 'hom', a), ts = linspace(0, 6, 241), L = ts.map(r.lhs), R = ts.map(r.rhs);
  const m = Math.max(...L.map(Math.abs), ...R.map(Math.abs)) * 1.15;
  const f = fr(g, w, h, [0, 6], [-m, m], 't (ms)', 'µm');
  if (a > 1) { tline(g, f, [0, XMAX_UM], [6, XMAX_UM], col.muted(), 1, [2, 3]); tline(g, f, [0, -XMAX_UM], [6, -XMAX_UM], col.muted(), 1, [2, 3]); }
  curve(g, f, ts, R, col.e(), 1.6, [5, 3]); curve(g, f, ts, L, col.c(), 2);
  title(g, `${a} V: ${r.pass ? 'twice in → twice out' : `${(r.err * 100).toFixed(0)}% short (clips)`}`, w, r.pass ? col.ok() : col.bad());
} };

/** Box 4: the earbud's (illustrative) excursion curve and its straight-line approximation near rest. */
const linearize: QuizFigureDef = { aspect: 2.2, maxWidth: 420, draw(g, w, h) {
  const xs = linspace(0, 300, 151), f = fr(g, w, h, [0, 300], [0, 130], 'linear-model motion (µm)', 'actual (µm)', 34);
  g.save(); g.fillStyle = 'rgba(110,226,110,.16)'; const x0 = f.X(0), x1 = f.X(25); g.fillRect(x0, f.box.t, x1 - x0, f.box.b - f.box.t); g.restore();
  tline(g, f, [0, 0], [130, 130], col.muted(), 1.4, [5, 4]);
  curve(g, f, xs, xs.map((x) => XMAX_UM * Math.tanh(x / XMAX_UM)), col.a(), 2.4);
  text(g, 'normal volume: straight', f.X(4), f.box.t + 10, col.c(), 'left', 10);
  text(g, 'loud: bends (clips)', f.X(170), f.Y(108), col.a(), 'left', 10);
} };

/** Box 5: one click → the ring h(t); a 1 ms pulse = 4 clicks → the sum of 4 shifted rings. */
const kick: QuizFigureDef = { aspect: 1.25, maxWidth: 260, draw(g, w, h, p) {
  const fr2 = P(p, 'frame', 1), ts = linspace(0, 5, 251);
  if (fr2 === 1) {
    const ys = ts.map((t) => hImp(t)), m = Math.max(...ys.map(Math.abs)) * 1.2, f = fr(g, w, h, [0, 5], [-m, m], 't (ms)', 'h');
    tline(g, f, [0.05, 0], [0.05, m * 0.9], col.e(), 2.5); curve(g, f, ts, ys, col.a(), 2);
    title(g, 'one click → ring h(t)', w);
  } else {
    const shifts = [0, 0.25, 0.5, 0.75], parts = shifts.map((s) => ts.map((t) => 0.25 * hImp(t - s)));
    const tot = ts.map((_, i) => parts.reduce((a, q) => a + q[i], 0)), m = Math.max(...tot.map(Math.abs)) * 1.2, f = fr(g, w, h, [0, 5], [-m, m], 't (ms)', 'x');
    parts.forEach((q) => curve(g, f, ts, q, col.muted(), 1)); curve(g, f, ts, tot, col.a(), 2.2);
    shifts.forEach((s) => tline(g, f, [s + 0.03, 0], [s + 0.03, m * 0.45], col.e(), 2));
    title(g, '1 ms pulse = 4 clicks → sum of rings', w);
  }
} };

/** Box 6: |H(f)| with the three tones marked. */
const gain: QuizFigureDef = { aspect: 2.4, maxWidth: 440, draw(g, w, h) {
  const fs = linspace(20, 3200, 320), G = fs.map((f) => cabs(Hf(f))), f = fr(g, w, h, [0, 3200], [0, 2.1], 'pitch f (Hz)', 'gain ×', 30);
  tline(g, f, [0, 1], [3200, 1], col.muted(), 1, [4, 3]);
  curve(g, f, fs, G, col.a(), 2.4);
  for (const [fz, lab] of [[200, '×1.07'], [657.6, '×1.85'], [3000, '×0.06']] as const) { const gz = cabs(Hf(fz)); dot(g, f, [fz, gz], col.e(), 4); text(g, `${fz === 657.6 ? 658 : fz} Hz ${lab}`, f.X(fz) + (fz > 2000 ? -6 : 6), f.Y(gz) + (fz === 200 ? 13 : -9), col.e(), fz > 2000 ? 'right' : 'left', 10); }
} };

/** Box 6: the cone at one pitch: input tone (dashed) vs cone motion (solid), same pitch, scaled and delayed. */
const cone: QuizFigureDef = { aspect: 0.95, maxWidth: 150, draw(g, w, h, p) {
  const fz = P(p, 'f', 200), H = Hf(fz), G = cabs(H), ph = Math.atan2(H[1], H[0]);
  g.clearRect(0, 0, w, h);
  // cone sketch (side view): rest outline + displaced by the gain
  const cx = w * 0.42, cy = h * 0.3, s = Math.min(w, h) * 0.2, dx = Math.min(1, G / 2) * s * 0.8;
  const cone = (off: number, color: string, dash: number[]) => { g.save(); g.strokeStyle = color; g.lineWidth = 1.6; g.setLineDash(dash); g.beginPath(); g.moveTo(cx - s * 0.5 + off, cy - s * 0.35); g.lineTo(cx + s * 0.4 + off, cy - s); g.lineTo(cx + s * 0.4 + off, cy + s); g.lineTo(cx - s * 0.5 + off, cy + s * 0.35); g.closePath(); g.stroke(); g.restore(); };
  g.fillStyle = col.muted(); g.fillRect(cx - s * 0.95, cy - s * 0.35, s * 0.4, s * 0.7);
  cone(0, col.muted(), [3, 3]); cone(dx, col.a(), []);
  text(g, `${Math.round(fz)} Hz`, w * 0.5, 9, col.text(), 'center', 10.5);
  text(g, `×${G < 0.1 ? G.toFixed(2) : G.toFixed(2)}`, w * 0.5, h * 0.54, col.e(), 'center', 11);
  // waves: one period of input (dashed) and output (solid)
  const f = rangeFrame(w, h, [0, 1], [-2, 2], 6, 6, h * 0.6, 4), ts = linspace(0, 1, 81);
  curve(g, f, ts, ts.map((t) => Math.cos(TAU * t)), col.muted(), 1.3, [4, 3]);
  curve(g, f, ts, ts.map((t) => G * Math.cos(TAU * t + ph)), col.a(), 2);
} };

/** Box 7: a ±1 square wave and the sum of its first three harmonics (k = 1, 3, 5). */
const fourier: QuizFigureDef = { aspect: 2.4, maxWidth: 440, draw(g, w, h) {
  const ts = linspace(0, 10, 501), sq = ts.map((t) => (Math.sin(TAU * 0.2 * t) >= 0 ? 1 : -1)), ps = (K: number) => ts.map((t) => { let s = 0; for (let k = 1; k <= K; k += 2) s += (4 / (Math.PI * k)) * Math.sin(TAU * 0.2 * k * t); return s; });
  const f = fr(g, w, h, [0, 10], [-1.5, 1.6], 't (ms)', '', 22);
  curve(g, f, ts, sq, col.muted(), 1.4); curve(g, f, ts, ps(1), col.e(), 1.5, [5, 3]); curve(g, f, ts, ps(5), col.a(), 2.2);
  text(g, '200 Hz buzz ≈ 200 + 600 + 1000 Hz tones', f.box.l + 4, f.box.t + 2, col.a(), 'left', 10);
} };

/** Box 8: e^(st) for three s: dying (σ < 0), steady (σ = 0), growing (σ > 0). */
const est: QuizFigureDef = { aspect: 2.4, maxWidth: 440, draw(g, w, h) {
  const ts = linspace(0, 4, 301), f = fr(g, w, h, [0, 4], [-3, 3], 't', 'Re e^(st)', 26);
  curve(g, f, ts, ts.map((t) => Math.cos(TAU * t)), col.muted(), 1.4);
  curve(g, f, ts, ts.map((t) => Math.exp(-0.8 * t) * Math.cos(TAU * t)), col.c(), 2);
  curve(g, f, ts, ts.map((t) => Math.exp(0.27 * t) * Math.cos(TAU * t)), col.bad(), 2);
  text(g, 'σ < 0 dies', f.X(0.1), f.Y(-2.6), col.c(), 'left', 10); text(g, 'σ = 0 steady (Fourier)', f.X(1.3), f.Y(-2.6), col.muted(), 'left', 10); text(g, 'σ > 0 grows', f.X(3.0), f.Y(2.7), col.bad(), 'left', 10);
} };

/** Box 9: the earbud's poles in the s-plane (1/ms) and the distances to jω at 658 Hz. */
const pz: QuizFigureDef = { aspect: 1.9, maxWidth: 400, draw(g, w, h) {
  const p = spk(), f = fr(g, w, h, [-3, 1], [-5.5, 5.5], 'σ (1/ms)', 'jω', 26), wz = (TAU * 657.6) / 1000;
  tline(g, f, [0, -5.5], [0, 5.5], col.strong(), 1.2);
  for (const q of p.poles) { cross(g, f, q as [number, number], col.b(), 6); tline(g, f, q as [number, number], [0, wz], col.b(), 1, [4, 3]); }
  dot(g, f, [0, wz], col.e(), 4);
  text(g, 'poles −1.27 ± 4.32j', f.X(-2.9), f.Y(4.9), col.b(), 'left', 10);
  text(g, 'jω at 658 Hz: closest', f.X(0.08), f.Y(wz) + 12, col.e(), 'left', 10);
} };

/** Box 11: the house from (10, 0) K: average fades slowly, difference fast. */
const modes: QuizFigureDef = { aspect: 2.4, maxWidth: 440, draw(g, w, h) {
  const ts = linspace(0, 6, 241), e1 = ts.map((t) => 5 * Math.exp(-0.2 * t)), e2 = ts.map((t) => 5 * Math.exp(-2.2 * t));
  const f = fr(g, w, h, [0, 6], [-5.5, 10.5], 't (h)', 'K', 24);
  curve(g, f, ts, ts.map((_, i) => e1[i] + e2[i]), col.a(), 2); curve(g, f, ts, ts.map((_, i) => e1[i] - e2[i]), col.b(), 2);
  curve(g, f, ts, e1, col.c(), 1.4, [5, 3]); curve(g, f, ts, e2, col.d(), 1.4, [2, 3]);
  text(g, 'T₁', f.X(0.15), f.Y(9.6), col.a(), 'left', 10); text(g, 'T₂', f.X(0.3), f.Y(-0.9), col.b(), 'left', 10);
  text(g, 'average: τ = 5 h', f.X(3.2), f.Y(3.6), col.c(), 'left', 10); text(g, 'half-gap: τ ≈ 27 min', f.X(1.2), f.Y(-3.6), col.d(), 'left', 10);
} };

/** Box 12: where the pole sits decides: left → settles, on the axis → rings for ever, right → grows. */
const settle: QuizFigureDef = { aspect: 1.1, maxWidth: 150, draw(g, w, h, p) {
  const sg = P(p, 's', -1), ts = linspace(0, 4, 201), f = fr(g, w, h, [0, 4], [-3, 3], 't', '', 10);
  curve(g, f, ts, ts.map((t) => Math.exp(sg * 0.6 * t) * Math.cos(TAU * t)), sg < 0 ? col.c() : sg > 0 ? col.bad() : col.muted(), 2);
  title(g, sg < 0 ? 'Re p < 0: settles' : sg > 0 ? 'Re p > 0: grows' : 'Re p = 0: rings on', w, sg < 0 ? col.ok() : sg > 0 ? col.bad() : col.text());
} };

/** Box 13: heat both rooms equally (2.5 kW split) from a 4 K gap: the gap fades exactly as with the heater off. */
const hidden: QuizFigureDef = { aspect: 2.4, maxWidth: 440, draw(g, w, h) {
  const on = simHouse(houseA(), heaterB(0.5), () => 2.5, [4, 0], 6), off = simHouse(houseA(), heaterB(0.5), () => 0, [4, 0], 6);
  const f = fr(g, w, h, [0, 6], [-0.5, 25], 't (h)', 'K', 24);
  curve(g, f, on.t, on.x.map((x) => (x[0] + x[1]) / 2), col.c(), 2);
  curve(g, f, off.t, off.x.map((x) => x[0] - x[1]), col.muted(), 4); curve(g, f, on.t, on.x.map((x) => x[0] - x[1]), col.b(), 1.8, [5, 3]);
  text(g, 'average: the heater moves it', f.X(1.2), f.Y(15), col.c(), 'left', 10);
  text(g, 'gap T₁ − T₂: heater on = heater off', f.X(0.9), f.Y(3.2), col.b(), 'left', 10);
} };

export const popFigures: Record<string, QuizFigureDef> = { 'pop-lintest': lintest, 'pop-linearize': linearize, 'pop-kick': kick, 'pop-gain': gain, 'pop-cone': cone, 'pop-fourier': fourier, 'pop-est': est, 'pop-pz': pz, 'pop-modes': modes, 'pop-settle': settle, 'pop-hidden': hidden };

