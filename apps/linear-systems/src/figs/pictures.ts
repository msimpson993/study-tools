/** Static "Picture it first" pictures for the dives (```picture:<id> caption``` fences). Every number comes from the models in ex.ts / carModel.ts. */
import { rangeFrame, graphAxes, curve, tline, text, dot, polyline, col, linspace, type QuizFigureDef, type Frame } from '@study/core';
import { CAR, CAR_SYM, carA, forceB, carModes, gramian, minEnergy, sim, DEG } from './car';
import { squareCoef } from './ex';
import { popFigures } from './pop';
import { reviewPictures } from './reviewpics';

const TAU = 2 * Math.PI;
const frameOf = (g: CanvasRenderingContext2D, w: number, h: number, xr: [number, number], yr: [number, number], xl: string, yl: string, L = 40) => {
  g.clearRect(0, 0, w, h); const f = rangeFrame(w, h, xr, yr, L, 8, 10, 26); graphAxes(g, f, xr, yr, xl, yl); return f;
};
const arrowTo = (g: CanvasRenderingContext2D, f: Frame, a: [number, number], b: [number, number], color: string, width = 2) => {
  const x0 = f.X(a[0]), y0 = f.Y(a[1]), x1 = f.X(b[0]), y1 = f.Y(b[1]), an = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), hd = Math.min(7, L * 0.4);
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = width; g.setLineDash([]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  if (L > 2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - hd * Math.cos(an - 0.45), y1 - hd * Math.sin(an - 0.45)); g.lineTo(x1 - hd * Math.cos(an + 0.45), y1 - hd * Math.sin(an + 0.45)); g.closePath(); g.fill(); }
};

/** Gramian: the (heave, pitch) positions reachable in 0.5 s on the 96,160 N²·s budget, both actuators vs the front one alone. */
export function reachEllipse(xs: number[], E = 96160, T = 0.5) {
  const W = gramian(carA(CAR), forceB(CAR, xs), T, 800), s = [1000, DEG];
  const P = [[W[0][0] * s[0] * s[0] * E, W[0][1] * s[0] * s[1] * E], [W[1][0] * s[1] * s[0] * E, W[1][1] * s[1] * s[1] * E]];
  // yᵀP⁻¹y = 1 with P = LLᵀ (Cholesky): y = L(cos t, sin t)
  const l11 = Math.sqrt(P[0][0]), l21 = P[1][0] / l11, l22 = Math.sqrt(Math.max(0, P[1][1] - l21 * l21));
  const tr = P[0][0] + P[1][1], det = P[0][0] * P[1][1] - P[0][1] * P[1][0], disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  return { P, pts: linspace(0, TAU, 145).map((t) => [l11 * Math.cos(t), l21 * Math.cos(t) + l22 * Math.sin(t)] as [number, number]), axes: [Math.sqrt(tr / 2 + disc), Math.sqrt(Math.max(0, tr / 2 - disc))] };
}
const gramEllipse: QuizFigureDef = { aspect: 1.9, maxWidth: 460, draw(g, w, h) {
  const both = reachEllipse([CAR.a, -CAR.b]), front = reachEllipse([CAR.a]);
  const zx = Math.max(...both.pts.map((p) => Math.abs(p[0]))) * 1.2, ty = Math.max(...both.pts.map((p) => Math.abs(p[1]))) * 1.25;
  const f = frameOf(g, w, h, [-zx, zx], [-ty, ty], 'heave z reached (mm)', 'pitch θ reached (°)', 40);
  g.save(); g.fillStyle = 'rgba(110,168,255,.15)'; g.beginPath(); both.pts.forEach((p, i) => (i ? g.lineTo(f.X(p[0]), f.Y(p[1])) : g.moveTo(f.X(p[0]), f.Y(p[1])))); g.fill(); g.restore();
  polyline(g, f, both.pts, col.a(), 2); polyline(g, f, front.pts, col.bad(), 2.2);
  text(g, 'front and rear: a wide ellipse', f.box.l + 6, f.box.t + 10, col.a(), 'left', 10);
  text(g, 'front alone: a thin sliver (one direction costs far more)', f.box.l + 6, f.box.t + 24, col.bad(), 'left', 10);
} };

/** Jordan: a repeated eigenvalue with one eigenvector shears the grid instead of stretching it. */
const jordanShear: QuizFigureDef = { aspect: 2.1, maxWidth: 460, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const half = w / 2;
  const panel = (x0: number, M: number[][], title: string, color: string) => {
    const X = (x: number) => x0 + half / 2 + x * (half / 5.4), Y = (y: number) => h / 2 + 8 - y * (h / 4.2);
    g.save(); g.lineWidth = 1;
    for (let k = -2; k <= 2; k++) {
      g.strokeStyle = col.grid(); g.setLineDash([2, 3]); g.beginPath(); g.moveTo(X(k), Y(-1.5)); g.lineTo(X(k), Y(1.5)); g.moveTo(X(-2), Y(k * 0.75)); g.lineTo(X(2), Y(k * 0.75)); g.stroke();
      g.strokeStyle = color; g.setLineDash([]); const map = (x: number, y: number) => [M[0][0] * x + M[0][1] * y, M[1][0] * x + M[1][1] * y];
      g.beginPath(); for (let i = 0; i <= 20; i++) { const [a, b] = map(k * 0.6, -1.2 + (2.4 * i) / 20); i ? g.lineTo(X(a * 0.8), Y(b * 0.8)) : g.moveTo(X(a * 0.8), Y(b * 0.8)); } g.stroke();
      g.beginPath(); for (let i = 0; i <= 20; i++) { const [a, b] = map(-1.2 + (2.4 * i) / 20, k * 0.6); i ? g.lineTo(X(a * 0.8), Y(b * 0.8)) : g.moveTo(X(a * 0.8), Y(b * 0.8)); } g.stroke();
    }
    g.restore();
    g.strokeStyle = col.e(); g.lineWidth = 2.4; g.beginPath(); g.moveTo(X(-2.2), Y(0)); g.lineTo(X(2.2), Y(0)); g.stroke();
    const [t1, t2] = title.split(': '); text(g, t1 + ':', x0 + half / 2, 7, color, 'center', 10); text(g, t2, x0 + half / 2, 19, color, 'center', 10); // two short lines, so the two titles never meet
  };
  panel(0, [[1.25, 0], [0, 0.8]], 'two eigenvectors: a pure stretch', col.a());
  panel(half, [[1, 0.9], [0, 1]], 'one eigenvector (yellow): a shear', col.b());
  text(g, 'yellow line: an eigenvector (left: one of two; right: the only one, left unchanged since λ = 1)', w / 2, h - 6, col.e(), 'center', 10);
} };

/** Fourier series: the 200 Hz square-wave drive as a chain of rotating arrows (k = 1, 3, 5) whose tip draws the partial sum. */
const fourierArrows: QuizFigureDef = { aspect: 2.3, maxWidth: 480, draw(g, w, h) {
  g.clearRect(0, 0, w, h); const t0 = 0.6, P = 5; // ms into a 5 ms (200 Hz) period
  const cx = w * 0.2, cy = h / 2 + 6, R = Math.min(h * 0.32, w * 0.14) / (4 / Math.PI);
  let x = cx, y = cy; const tips: [number, number][] = [];
  for (const k of [1, 3, 5]) {
    const a = squareCoef(k) * R, ph = (TAU * k * t0) / P, nx = x + a * Math.cos(ph), ny = y - a * Math.sin(ph);
    g.strokeStyle = col.grid(); g.lineWidth = 1; g.beginPath(); g.arc(x, y, a, 0, TAU); g.stroke();
    g.strokeStyle = k === 1 ? col.a() : k === 3 ? col.b() : col.c(); g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
    x = nx; y = ny; tips.push([x, y]);
  }
  dot(g, rangeFrame(w, h, [0, w], [h, 0], 0, 0, 0, 0), [x, y], col.e(), 4);
  // the partial sum traced against time, to the right
  const x0 = w * 0.42, x1 = w - 10, ts = linspace(0, 2 * P, 300), sum = (t: number) => [1, 3, 5].reduce((s, k) => s + squareCoef(k) * Math.sin((TAU * k * t) / P), 0);
  const X = (t: number) => x0 + ((x1 - x0) * t) / (2 * P), Yv = (v: number) => cy - v * R;
  g.strokeStyle = col.strong(); g.lineWidth = 1; g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1, cy); g.stroke();
  g.strokeStyle = col.muted(); g.setLineDash([4, 3]); g.beginPath(); ts.forEach((t, i) => { const v = Math.sin((TAU * t) / P) >= 0 ? 1 : -1; i ? g.lineTo(X(t), Yv(v)) : g.moveTo(X(t), Yv(v)); }); g.stroke(); g.setLineDash([]);
  g.strokeStyle = col.e(); g.lineWidth = 2; g.beginPath(); ts.forEach((t, i) => (i ? g.lineTo(X(t), Yv(sum(t))) : g.moveTo(X(t), Yv(sum(t))))); g.stroke();
  g.strokeStyle = col.e(); g.setLineDash([2, 3]); g.beginPath(); g.moveTo(x, y); g.lineTo(X(t0), Yv(sum(t0))); g.stroke(); g.setLineDash([]);
  text(g, 'arrows: 200, 600, 1000 Hz (lengths 4/(πk) V)', 6, 9, col.text(), 'left', 10);
  text(g, 'tip height against time: the sum (yellow) vs the square wave (dashed)', x0, h - 6, col.muted(), 'left', 10);
} };

/** Observability: the sensor sees one shadow of the state; on the symmetric car a centre height sensor casts the same shadow for every pitch. */
const obsShadow: QuizFigureDef = { aspect: 2, maxWidth: 460, draw(g, w, h) {
  const f = frameOf(g, w, h, [-2.5, 2.5], [-2.2, 2.2], 'heave z (cm): what a centre height sensor reads', 'pitch θ (°)', 40);
  const A: [number, number] = [1.2, 1.4], B: [number, number] = [1.2, -1.1];
  for (const [p, c, lab] of [[A, col.a(), 'example state 1'], [B, col.b(), 'example state 2']] as const) { tline(g, f, p as [number, number], [p[0], 0], c, 1.4, [4, 3]); dot(g, f, p as [number, number], c, 5); text(g, lab, f.X(p[0]) + 8, f.Y(p[1]), c, 'left', 10); }
  dot(g, f, [1.2, 0], col.e(), 6);
  text(g, 'same shadow: the sensor reads z = 1.2 cm for both', f.X(1.2) + 10, f.Y(0) + 14, col.e(), 'left', 10);
  text(g, 'symmetric car: pitch never shows up at the centre', f.box.l + 6, f.box.t + 10, col.muted(), 'left', 10);
} };

/** Diagonalization: the main car's bounce and pitch shapes as the grid of the (heave, pitch) plane. */
export function modeAxes() { const md = carModes(CAR), tb = md[0].thPerZ[0], zp = -md[1].node; return { b: [1, tb * DEG / 100] as [number, number], p: [zp * 100 / DEG, 1] as [number, number] }; } // (cm, °) per unit
const diagGrid: QuizFigureDef = { aspect: 2, maxWidth: 460, draw(g, w, h) {
  const f = frameOf(g, w, h, [-3, 3], [-2.4, 2.4], 'heave z (cm)', 'pitch θ (°)', 40), { b, p } = modeAxes();
  const nb = Math.hypot(...b), np = Math.hypot(...p), ub: [number, number] = [b[0] / nb, b[1] / nb], up: [number, number] = [p[0] / np, p[1] / np];
  g.save(); g.beginPath(); g.rect(f.box.l, f.box.t, f.box.r - f.box.l, f.box.b - f.box.t); g.clip();
  for (let k = -6; k <= 6; k++) { const s = k * 0.6;
    tline(g, f, [s * up[0] - 6 * ub[0], s * up[1] - 6 * ub[1]], [s * up[0] + 6 * ub[0], s * up[1] + 6 * ub[1]], col.a(), k ? 0.8 : 2.4);
    tline(g, f, [s * ub[0] - 6 * up[0], s * ub[1] - 6 * up[1]], [s * ub[0] + 6 * up[0], s * ub[1] + 6 * up[1]], col.b(), k ? 0.8 : 2.4); }
  g.restore();
  arrowTo(g, f, [0, 0], [ub[0] * 1.8, ub[1] * 1.8], col.a(), 2.6); arrowTo(g, f, [0, 0], [up[0] * 1.6, up[1] * 1.6], col.b(), 2.6);
  text(g, 'blue: bounce axis', f.X(ub[0] * 1.9) + 4, f.Y(ub[1] * 1.9), col.a(), 'left', 10); text(g, 'orange: pitch axis', f.X(up[0] * 1.7) + 4, f.Y(up[1] * 1.7) - 6, col.b(), 'left', 10);
  text(g, 'started on either axis, the pose stays on it: it only swings and fades', f.box.l + 6, f.box.t + 10, col.muted(), 'left', 10);
} };

/** Optimal control: the least-energy path from 2° nose-down to level in 0.5 s, in the (θ, θ̇) plane, against the free motion. */
const optPath: QuizFigureDef = { aspect: 2, maxWidth: 460, draw(g, w, h) {
  const X0 = [0, -2 / DEG, 0, 0], T = 0.5, r = minEnergy(CAR, [CAR.a, -CAR.b], X0, T);
  const ctl = sim(r.A, r.B, (t) => (t < T ? r.u(t) : [0, 0]), X0, T, 2e-3), free = sim(r.A, r.B, () => [0, 0], X0, 1.5, 2e-3);
  const th = (x: number[]) => x[1] * DEG, om = (x: number[]) => x[3] * DEG;
  const all = [...ctl.xs, ...free.xs], mx = Math.max(...all.map((x) => Math.abs(om(x)))) * 1.15;
  const f = frameOf(g, w, h, [-2.4, 1.4], [-mx, mx], 'pitch θ (°)', 'pitch rate (°/s)', 40);
  curve(g, f, free.xs.map(th), free.xs.map(om), col.muted(), 1.4, [5, 3]); curve(g, f, ctl.xs.map(th), ctl.xs.map(om), col.e(), 2.6);
  dot(g, f, [-2, 0], col.bad(), 5); dot(g, f, [0, 0], col.ok(), 5);
  text(g, 'start: 2° nose-down, at rest', f.X(-2) + 6, f.Y(0) + 12, col.bad(), 'left', 10);
  text(g, 'target: level, at rest, at T = 0.5 s', f.X(0) + 6, f.Y(0) - 10, col.ok(), 'left', 10);
  text(g, 'yellow: least-energy path · dashed: left alone', f.box.l + 6, f.box.t + 10, col.muted(), 'left', 10);
} };

/** Box 5's single-click panel, moved to the lti dive: one click → the ring h(t) (pop-kick, frame 1). */
const oneClick: QuizFigureDef = { ...popFigures['pop-kick'], draw: (g, w, h) => popFigures['pop-kick'].draw(g, w, h, { frame: 1 }) };
export const pictures: Record<string, QuizFigureDef> = { 'pic-one-click': oneClick, 'pic-gram-ellipse': gramEllipse, 'pic-jordan-shear': jordanShear, 'pic-fourier-arrows': fourierArrows, 'pic-obs-shadow': obsShadow, 'pic-diag-grid': diagGrid, 'pic-opt-path': optPath, ...reviewPictures };
void CAR_SYM;
