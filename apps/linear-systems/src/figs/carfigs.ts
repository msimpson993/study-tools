/** Live figures on the car (half-car suspension model in core carModel.ts, tutor's parameters, numbers tested in test/car.test.ts). */
import { figureOf, rangeFrame, curve, tline, polyline, dot, text, wipe, col, linspace, type Frame } from '@study/core';
import { withSky, skyGains, skyEqualGain, skyBump } from './car';
import { CAR, CAR_SYM, worn, carA, forceB, roadB, carModes, sim, bumpInput, minEnergy, gramian, expm, mvec, mmul, rank, ctrbM, obsvM, mck, DEG, BUMP, type CarP, type Mat } from './car';
import { num, fmt, graph, note } from './util';

type V = Record<string, number | string | boolean>;
const carOf = (v: V): CarP => {
  const base = v.set === 'sym' ? CAR_SYM : CAR, k = v.wear === undefined ? 1 : num(v, 'wear');
  return { ...base, cf: base.cf * k, cr: base.cr * k };
};
/** proportional-damping mode shapes (real): bounce (1, tb) and pitch (zp, 1), and mass-normalised (z, θ) pairs */
function shapes(p: CarP) {
  const md = carModes(p), b = md[0], q = md[1];
  const tb = Number.isFinite(b.thPerZ[0]) ? b.thPerZ[0] : 0;
  const zp = Number.isFinite(q.node) ? -q.node : 0;
  const nb = Math.sqrt(p.m + p.J * tb * tb), np = Math.sqrt(p.m * zp * zp + p.J);
  return { md, tb, zp, phiB: [1 / nb, tb / nb] as [number, number], phiP: [zp / np, 1 / np] as [number, number] };
}
const carFrame = (w: number, h: number): Frame => rangeFrame(w, h, [-2.65, 2.25], [-0.15, 1.75], 8, 8, 18, 14);
/** side-view car on its two spring+shock pairs; z (m), th (rad), drawn with vertical gain `gn` */
function drawCar(g: CanvasRenderingContext2D, f: Frame, p: CarP, z: number, th: number, gn: number, o: { color?: string; ghost?: boolean; road?: [number, number]; labels?: boolean | 'key' } = {}) {
  const yb = 0.62, y = (x: number) => yb + gn * (z + x * th), c = o.color ?? col.text();
  const wr = 0.27, road = o.road ?? [0, 0];
  if (!o.ghost) {
    tline(g, f, [-2.65, 0], [2.25, 0], col.strong(), 1.4);
    for (const [x, u] of [[p.a, road[0]], [-p.b, road[1]]] as [number, number][]) {
      const cy = wr + u; g.beginPath(); g.ellipse(f.X(x), f.Y(cy), Math.abs(f.X(wr) - f.X(0)), Math.abs(f.Y(0) - f.Y(wr)), 0, 0, 7); g.strokeStyle = col.strong(); g.lineWidth = 2; g.stroke();
      const top = y(x), n = 6, zz: [number, number][] = []; for (let i = 0; i <= n; i++) zz.push([x - 0.12 + (i % 2 ? 0.06 : -0.06) * (i > 0 && i < n ? 1 : 0), cy + 0.05 + ((top - cy - 0.05) * i) / n]);
      polyline(g, f, zz, col.a(), 1.6); tline(g, f, [x + 0.12, cy + 0.05], [x + 0.12, top], col.c(), 3);
      if (o.labels === 'key' && x < 0) { // A4: name the rear zigzag and green bar in their own colours (front pair is the same)
        const ym = f.Y((cy + 0.05 + top) / 2);
        text(g, 'spring', f.X(x - 0.26), ym, col.a(), 'right', 10); text(g, 'shock', f.X(x + 0.2), ym, col.c(), 'left', 10);
      }
    }
  }
  const bl = -p.b - 0.75, br = p.a + 0.75, H = 0.42;
  const pts: [number, number][] = [[bl, 0], [br, 0], [br, 0.55 * H / 0.42 * 0.42], [p.a - 0.5, 0.62], [p.a - 0.95, 1.05], [-p.b + 0.55, 1.05], [-p.b + 0.05, 0.66], [bl, 0.6], [bl, 0]];
  polyline(g, f, pts.map(([x, d]) => [x, y(x) + d * 0.8] as [number, number]), c, o.ghost ? 1.2 : 2, o.ghost ? [4, 3] : []);
  if (!o.ghost) { const cx = f.X(0), cy = f.Y(y(0) + 0.25); g.strokeStyle = c; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - 5, cy); g.lineTo(cx + 5, cy); g.moveTo(cx, cy - 5); g.lineTo(cx, cy + 5); g.stroke(); }
  if (o.labels === 'key' && !o.ghost) text(g, '+ centre of gravity', f.X(0) + 8, f.Y(y(0) + 0.25) - 10, c, 'left', 10);
  if (o.labels === true && !o.ghost) { // A4: name the parts on the drawing
    text(g, '+ = centre of gravity (x = 0)', f.X(0) + 8, f.Y(y(0) + 0.25) - 10, c, 'left', 10);
    text(g, 'wheel / axle', f.X(p.a), f.Y(-0.02) + 2, col.muted(), 'center', 10, 'top');
    text(g, 'spring + shock', f.X(-p.b) + 16, f.Y(0.45), col.muted(), 'left', 10);
  }
}
const markX = (g: CanvasRenderingContext2D, f: Frame, x: number, color: string, label: string, up = true) => { tline(g, f, [x, 0.05], [x, 1.55], color, 1.2, [3, 3]); text(g, label, f.X(x), f.Y(up ? 1.62 : 0.02) + (up ? 0 : 10), color, 'center', 10); };

/* ───────────── eig: the two modes drawn on the car ───────────── */
export const eigFigure = figureOf((c) => {
  const P = (): CarP => { const kf = num(c.values, 'kf'), kr = num(c.values, 'kr'); return { ...CAR, kf, kr, cf: 0.08 * kf, cr: 0.08 * kr }; };
  const panel = (which: 0 | 1) => ({
    id: which ? 'pitch' : 'bounce', title: which ? 'Pitch mode: nose dips as the tail rises' : 'Bounce mode: the body moves up and down', x: 'position along the car (m)', y: 'height (exaggerated)',
    draw(g: CanvasRenderingContext2D, w: number, h: number) {
      wipe(g, w, h); const p = P(), S = shapes(p), m = S.md[which], f = carFrame(w, h), ph = Math.sin(2 * Math.PI * num(c.values, 't'));
      const z = which ? S.zp * 0.035 : 0.05, th = which ? 0.035 : S.tb * 0.05;
      drawCar(g, f, p, 0, 0, 1, { ghost: true, color: col.muted() }); drawCar(g, f, p, z * ph, th * ph, 3, { color: which ? col.b() : col.a(), labels: !which });
      const xn = which ? -S.zp : S.tb !== 0 ? -1 / S.tb : NaN;
      const rel = (x: number) => { const d = x + p.b; return `${fmt(Math.abs(d), 2)} m ${d < 0 ? 'behind' : 'ahead of'} the rear axle`; };
      if (Number.isFinite(xn) && xn > -2.6 && xn < 2.2) { dot(g, f, [xn, 0.62], col.e(), 4); note(g, `• still point: ${rel(xn)} (x = ${fmt(xn, 2)} m from the CG)`, 8, 30, col.e(), 'left', 10); } // top-left, clear of the springs and wheels
      else note(g, Number.isFinite(xn) ? `still point: ${rel(xn)} (x = ${fmt(xn, 2)} m from the CG), off the drawing` : 'no still point: pure up-and-down', 8, 30, col.e(), 'left', 10);
      note(g, `${fmt(m.fn, 3)} Hz, ζ = ${fmt(m.zeta, 3)}`, w - 8, 12, which ? col.b() : col.a(), 'right', 11);
    },
  });
  return [panel(0), panel(1)];
});

/* ───────────── diag: any pose = some bounce + some pitch ───────────── */
export const diagFigure = figureOf((c) => {
  const split = () => { const p = CAR, S = shapes(p), z = num(c.values, 'z0') / 100, th = num(c.values, 'th0') / DEG;
    // [z; θ] = q₁(1, tb) + q₂(zp, 1)
    const det = 1 - S.tb * S.zp, q1 = (z - S.zp * th) / det, q2 = (th - S.tb * z) / det; return { p, S, z, th, q1, q2 }; };
  return [
    { id: 'pose', title: 'The pose (z, θ) and its two mode parts', x: 'position (m)', y: 'height (exaggerated)',
      draw(g, w, h) { wipe(g, w, h); const { p, S, z, th, q1, q2 } = split(), f = carFrame(w, h);
        drawCar(g, f, p, q1, q1 * S.tb, 6, { ghost: true, color: col.a() }); drawCar(g, f, p, q2 * S.zp, q2, 6, { ghost: true, color: col.b() }); drawCar(g, f, p, z, th, 6, { labels: 'key' });
        note(g, `z = ${fmt(z * 100, 1)} cm, θ = ${fmt(th * DEG, 2)}°`, 8, 12, col.text(), 'left', 11);
        note(g, 'dashed: the bounce part and the pitch part', w - 8, h - 6, col.muted(), 'right', 10); } },
    { id: 'modal', title: 'Mode coordinates: how much bounce, how much pitch', x: 'bounce amount q₁ (cm of heave)', y: 'pitch amount q₂ (°)',
      draw(g, w, h) { wipe(g, w, h); const { q1, q2 } = split(), f = graph(g, w, h, [-4, 4], [-3, 3], 'bounce amount q₁ (cm)', 'pitch amount q₂ (°)');
        tline(g, f, [0, 0], [q1 * 100, 0], col.a(), 3); tline(g, f, [q1 * 100, 0], [q1 * 100, q2 * DEG], col.b(), 3); dot(g, f, [q1 * 100, q2 * DEG], col.e(), 5);
        note(g, `q₁ = ${fmt(q1 * 100, 2)} cm, q₂ = ${fmt(q2 * DEG, 2)}°: each fades on its own`, f.box.l + 4, f.box.t + 10, col.text(), 'left', 10);
        note(g, 'blue segment: the bounce part q₁ · orange: the pitch part q₂', f.box.l + 4, f.box.b - 8, col.muted(), 'left', 10); } },
  ];
});

/* ───────────── expm: free motion x(t) = e^{At}x(0) ───────────── */
export const expmFigure = figureOf((c) => {
  const run = () => { const p = carOf(c.values), A = carA(p), x0 = [num(c.values, 'z0') / 100, num(c.values, 'th0') / DEG, 0, 0], T = num(c.values, 'tmax'), ts = linspace(0, T, 161);
    return { ts, xs: ts.map((t) => mvec(expm(A, t), x0)), T }; };
  const pane = (k: 0 | 1) => ({ id: k ? 'th' : 'z', title: k ? 'Pitch θ(t) from e^(At)x(0)' : 'Heave z(t) from e^(At)x(0)', x: 'time t (s)', y: k ? 'θ (°)' : 'z (mm)',
    draw(g: CanvasRenderingContext2D, w: number, h: number) { wipe(g, w, h); const { ts, xs, T } = run(), sc = k ? DEG : 1000, ys = xs.map((x) => x[k] * sc), m = Math.max(0.5, ...ys.map(Math.abs)) * 1.15;
      const f = graph(g, w, h, [0, T], [-m, m], 'time t (s)', k ? 'θ (°)' : 'z (mm)'); tline(g, f, [0, 0], [T, 0], col.muted(), 1); curve(g, f, ts, ys, k ? col.b() : col.a(), 2.4); } });
  return [pane(0), pane(1)];
});

/* ───────────── flow: the bump, front response + delayed rear copy ───────────── */
export const flowFigure = figureOf((c) => {
  const run = () => { const p = carOf(c.values), v = num(c.values, 'v'), bp = { ...BUMP, v }, b = bumpInput(p, bp), A = carA(p), B = roadB(p), T = 3, dt = 2e-3;
    const front = sim(A, B, (t) => { const u = b.u(t); return [u[0], 0, u[2], 0]; }, [0, 0, 0, 0], T, dt), rear = sim(A, B, (t) => { const u = b.u(t); return [0, u[1], 0, u[3]]; }, [0, 0, 0, 0], T, dt);
    return { b, front, rear, T }; };
  return [
    { id: 'road', title: 'Road height under each wheel', x: 'time t (s)', y: 'mm',
      draw(g, w, h) { wipe(g, w, h); const { b, T } = run(), ts = linspace(0, Math.min(T, 1), 401), f = graph(g, w, h, [0, 1], [-5, 60], 'time t (s)', 'road (mm)');
        curve(g, f, ts, ts.map((t) => b.u(t)[0] * 1000), col.a(), 2); curve(g, f, ts, ts.map((t) => b.u(t)[1] * 1000), col.b(), 2, [5, 3]);
        note(g, `rear wheel ${fmt(b.Td, 2)} s after the front`, f.box.r - 4, f.box.t + 10, col.b(), 'right', 10); } },
    { id: 'heave', title: 'Heave = front response + rear response (a delayed copy)', x: 'time t (s)', y: 'z (mm)',
      draw(g, w, h) { wipe(g, w, h); const { front, rear, T } = run(), zf = front.xs.map((x) => x[0] * 1000), zr = rear.xs.map((x) => x[0] * 1000), zs = zf.map((v, i) => v + zr[i]);
        const m = Math.max(2, ...zs.map(Math.abs), ...zf.map(Math.abs)) * 1.15, f = graph(g, w, h, [0, T], [-m, m], 'time t (s)', 'heave (mm)');
        tline(g, f, [0, 0], [T, 0], col.muted(), 1); curve(g, f, front.ts, zf, col.a(), 1.4, [4, 3]); curve(g, f, rear.ts, zr, col.b(), 1.4, [2, 3]); curve(g, f, front.ts, zs, col.text(), 2.4);
        let im = 0; zs.forEach((v, i) => { if (Math.abs(v) > Math.abs(zs[im])) im = i; }); dot(g, f, [front.ts[im], zs[im]], col.e(), 4);
        note(g, `peak ${fmt(zs[im], 1)} mm at ${fmt(front.ts[im], 2)} s`, f.box.r - 4, f.box.t + 10, col.e(), 'right', 10); } },
  ];
});

/* ───────────── cayley: e^{At} = α₀I + α₁A + α₂A² + α₃A³ ───────────── */
function alphas(A: Mat, t: number): number[] {
  const P: Mat[] = [A.map((r, i) => r.map((_, j) => +(i === j)))]; for (let k = 1; k < 4; k++) P.push(mmul(P[k - 1], A));
  const E = expm(A, t), rows: number[][] = [], rhs: number[] = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { rows.push(P.map((Pk) => Pk[i][j])); rhs.push(E[i][j]); }
  // least squares (exact: Cayley–Hamilton) via normal equations
  const N = [0, 1, 2, 3].map((a) => [0, 1, 2, 3].map((b) => rows.reduce((s, r) => s + r[a] * r[b], 0))), y = [0, 1, 2, 3].map((a) => rows.reduce((s, r, k) => s + r[a] * rhs[k], 0));
  const m = N.map((r, i) => [...r, y[i]]);
  for (let col_ = 0; col_ < 4; col_++) { let pv = col_; for (let i = col_ + 1; i < 4; i++) if (Math.abs(m[i][col_]) > Math.abs(m[pv][col_])) pv = i; [m[col_], m[pv]] = [m[pv], m[col_]]; for (let i = 0; i < 4; i++) if (i !== col_) { const fct = m[i][col_] / m[col_][col_]; for (let j = col_; j < 5; j++) m[i][j] -= fct * m[col_][j]; } }
  return m.map((r, i) => r[4] / r[i]);
}
export const cayleyFigure = figureOf((c) => {
  const A = () => carA(carOf(c.values));
  return [
    { id: 'alpha', title: 'The four coefficient functions αₖ(t)', x: 'time t (s)', y: 'αₖ(t) (scaled)',
      draw(g, w, h) { wipe(g, w, h); const a = A(), ts = linspace(0, 3, 121), al = ts.map((t) => alphas(a, t)), sc = [1, 10, 100, 1000];
        const top = Math.max(1, ...al.flatMap((v) => v.map((q, k) => Math.abs(q * sc[k])))) * 1.1, f = graph(g, w, h, [0, 3], [-top, top], 'time t (s)', 'α₀, 10α₁, 100α₂, 1000α₃'); const cs = [col.a(), col.b(), col.c(), col.d()];
        for (let k = 0; k < 4; k++) curve(g, f, ts, al.map((v) => v[k] * sc[k]), cs[k], 2);
        const t0 = num(c.values, 't'); tline(g, f, [t0, -top], [t0, top], col.e(), 1.2, [4, 3]);
        note(g, 'blue α₀ · orange 10α₁ · green 100α₂ · purple 1000α₃', f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10); } },
    { id: 'check', title: 'Same motion two ways: e^(At)x(0) (line) and Σ αₖAᵏx(0) (dots)', x: 'time t (s)', y: 'θ (°)',
      draw(g, w, h) { wipe(g, w, h); const a = A(), x0 = [0, -2 / DEG, 0, 0], ts = linspace(0, 3, 121), f = graph(g, w, h, [0, 3], [-2.4, 2.4], 'time t (s)', 'pitch θ (°)');
        curve(g, f, ts, ts.map((t) => mvec(expm(a, t), x0)[1] * DEG), col.b(), 2.2);
        const P: Mat[] = [a.map((r, i) => r.map((_, j) => +(i === j)))]; for (let k = 1; k < 4; k++) P.push(mmul(P[k - 1], a));
        for (const t of linspace(0, 3, 16)) { const al = alphas(a, t); let s = 0; for (let k = 0; k < 4; k++) s += al[k] * mvec(P[k], x0)[1]; dot(g, f, [t, s * DEG], col.e(), 3.5); }
        const t0 = num(c.values, 't'); dot(g, f, [t0, mvec(expm(a, t0), x0)[1] * DEG], col.text(), 5);
        note(g, 'released 2° nose-down', f.box.r - 4, f.box.t + 10, col.muted(), 'right', 10); } },
  ];
});

/* ───────────── stab: worn (or wrongly wired) shocks ───────────── */
export const stabFigure = figureOf((c) => {
  const P = () => carOf(c.values);
  return [
    { id: 'poles', title: 'The four poles as the shocks wear', x: 'Re s (1/s)', y: 'Im s (1/s)',
      draw(g, w, h) { wipe(g, w, h); const f = graph(g, w, h, [-4.5, 1.5], [-10, 10], 'Re s (1/s)', 'Im s (1/s)');
        g.save(); g.globalAlpha = 0.1; g.fillStyle = col.bad(); g.fillRect(f.X(0), f.box.t, f.box.r - f.X(0), f.box.b - f.box.t); g.restore();
        for (const k of linspace(-0.3, 1.5, 37)) for (const m of carModes({ ...CAR, cf: CAR.cf * k, cr: CAR.cr * k })) { dot(g, f, [m.s[0], m.s[1]], col.muted(), 1.6); dot(g, f, [m.s[0], -m.s[1]], col.muted(), 1.6); }
        const md = carModes(P()); md.forEach((m, i) => { const cc = m.s[0] > 0 ? col.bad() : i ? col.b() : col.a(); for (const sg of [1, -1]) { dot(g, f, [m.s[0], sg * m.s[1]], cc, 5); } });
        note(g, `ζ bounce ${fmt(md[0].zeta, 3)}, pitch ${fmt(md[1].zeta, 3)}`, f.box.l + 4, f.box.t + 10, col.text(), 'left', 10); } },
    { id: 'bump', title: 'Heave after the 5 cm bump at 15 m/s', x: 'time t (s)', y: 'z (mm)',
      draw(g, w, h) { wipe(g, w, h); const p = P(), b = bumpInput(p), r = sim(carA(p), roadB(p), b.u, [0, 0, 0, 0], 5, 2e-3), zs = r.xs.map((x) => x[0] * 1000);
        const f = graph(g, w, h, [0, 5], [-15, 15], 'time t (s)', 'heave (mm)'); tline(g, f, [0, 1], [5, 1], col.muted(), 1, [2, 3]); tline(g, f, [0, -1], [5, -1], col.muted(), 1, [2, 3]);
        g.save(); g.beginPath(); g.rect(f.box.l, f.box.t, f.box.r - f.box.l, f.box.b - f.box.t); g.clip(); curve(g, f, r.ts, zs, col.a(), 2.2); g.restore();
        let last = 0; zs.forEach((v, i) => { if (Math.abs(v) > 1) last = r.ts[i]; });
        note(g, last >= 4.99 ? 'still above 1 mm at 5 s' : `above 1 mm until ${fmt(last, 1)} s`, f.box.r - 4, f.box.t + 10, col.e(), 'right', 10); } },
  ];
});

/* ───────────── ctrl / obs / kalman: where you push and where you look ───────────── */
/** slider positions within 6 mm of the pitch still point snap onto it (the node is exact for proportional damping) */
const snap = (p: CarP, x: number) => { const n = carModes(p)[1].node; return Number.isFinite(n) && Math.abs(x - n) < 0.006 ? n : x; };
const modeAt = (p: CarP, x: number) => { const S = shapes(p); return { b: S.phiB[0] + x * S.phiB[1], q: S.phiP[0] + x * S.phiP[1], S }; };
function shapesPanel(c: { values: V }, key: string, label: string, color: string) {
  return { id: 'car', title: `The two mode shapes and the ${label}`, x: 'position (m)', y: 'height (exaggerated)',
    draw(g: CanvasRenderingContext2D, w: number, h: number) { wipe(g, w, h); const p = carOf(c.values), S = shapes(p), f = carFrame(w, h), x = snap(p, num(c.values, key));
      drawCar(g, f, p, 0, 0, 1, { labels: 'key' }); drawCar(g, f, p, 0.06, 0.06 * S.tb, 3, { ghost: true, color: col.a() }); drawCar(g, f, p, 0.04 * S.zp, 0.04, 3, { ghost: true, color: col.b() });
      markX(g, f, x, color, `${label} x = ${fmt(x, 2)} m`);
      if (Number.isFinite(S.zp)) { const xn = -S.zp; if (xn > -2.6 && xn < 2.2) { dot(g, f, [xn, 0.62], col.e(), 3.5); text(g, 'still point', f.X(xn), f.Y(0.62) + 12, col.e(), 'center', 10); } }
      note(g, 'dashed: bounce (blue), pitch (orange)', 8, h - 6, col.muted(), 'left', 10); } };
}
const bars = (g: CanvasRenderingContext2D, w: number, h: number, vals: [string, number, string][], ylab: string, msg: string, msgColor: string) => {
  const m = Math.max(0.02, ...vals.map((v) => Math.abs(v[1]))) * 1.2, f = graph(g, w, h, [0, vals.length], [-m, m], 'mode', ylab, 1, 0, 44, () => '');
  tline(g, f, [0, 0], [vals.length, 0], col.muted(), 1);
  vals.forEach(([name, v, cc], i) => { g.fillStyle = cc; const x0 = f.X(i + 0.25), x1 = f.X(i + 0.75), y0 = f.Y(0), y1 = f.Y(v); g.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.max(1, Math.abs(y1 - y0))); text(g, name, (x0 + x1) / 2, f.box.b - 6, col.text(), 'center', 10); });
  note(g, msg, f.box.l + 4, f.box.t + 10, msgColor, 'left', 10);
};
export const ctrlFigure = figureOf((c) => [
  shapesPanel(c, 'xp', 'push at', col.bad()),
  { id: 'push', title: 'How hard a push there drives each mode (the PBH number wᵀB)', x: 'mode', y: 'push on the mode',
    draw(g, w, h) { wipe(g, w, h); const p = carOf(c.values), x = snap(p, num(c.values, 'xp')), { b, q } = modeAt(p, x), r = rank(ctrbM(carA(p), forceB(p, [x])), 1e-6);
      bars(g, w, h, [['bounce', b, col.a()], ['pitch', q, col.b()]], 'push per newton on the mode (1/√kg)', r === 4 ? 'rank [B AB A²B A³B] = 4: controllable' : `rank ${r} of 4: a mode is out of reach`, r === 4 ? col.ok() : col.bad()); } },
]);
export const obsFigure = figureOf((c) => {
  const reading = (p: CarP, x: number, gyro: boolean) => (gyro ? [0, 0, 0, 1] : [1, x, 0, 0]);
  return [
    shapesPanel(c, 'xs', 'sensor at', col.c()),
    { id: 'read', title: 'What the sensor reads after a pure-bounce start and a pure-pitch start', x: 'time t (s)', y: 'height (mm) or pitch rate (°/s)',
      draw(g, w, h) { wipe(g, w, h); const p = carOf(c.values), S = shapes(p), x = snap(p, num(c.values, 'xs')), gyro = c.values.sensor === 'gyro', Cr = reading(p, x, gyro), A = carA(p), ts = linspace(0, 3, 151);
        const xb = [0.02, 0.02 * S.tb, 0, 0], xp = [S.zp * (1 / DEG), 1 / DEG, 0, 0];
        const u = gyro ? DEG : 1000, yb = ts.map((t) => mvec([Cr], mvec(expm(A, t), xb))[0] * u), yp = ts.map((t) => mvec([Cr], mvec(expm(A, t), xp))[0] * u);
        const m = Math.max(1e-6, ...yb.map(Math.abs), ...yp.map(Math.abs)) * 1.15, f = graph(g, w, h, [0, 3], [-m, m], 'time t (s)', gyro ? 'pitch rate read (°/s)' : 'height read (mm)');
        curve(g, f, ts, yb, col.a(), 2.2); curve(g, f, ts, yp, col.b(), 2.2, [5, 3]);
        const r = rank(obsvM(A, [Cr]), 1e-6);
        note(g, r === 4 ? 'rank [C; CA; CA²; CA³] = 4: observable' : `rank ${r} of 4: a mode is invisible`, f.box.l + 4, f.box.t + 10, r === 4 ? col.ok() : col.bad(), 'left', 10);
        note(g, 'solid: bounce start · dashed: pitch start', f.box.r - 4, f.box.b - 8, col.muted(), 'right', 10); } },
  ];
});
export const kalmanFigure = figureOf((c) => {
  const G = (p: CarP, xp: number, xs: number, fHz: number) => { const { M, K, C: D } = mck(p), w = 2 * Math.PI * fHz;
    const a11: [number, number] = [K[0][0] - M[0] * w * w, D[0][0] * w], a12: [number, number] = [K[0][1], D[0][1] * w], a22: [number, number] = [K[1][1] - M[1] * w * w, D[1][1] * w];
    const cm = (a: [number, number], b: [number, number]): [number, number] => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
    const det = [cm(a11, a22)[0] - cm(a12, a12)[0], cm(a11, a22)[1] - cm(a12, a12)[1]] as [number, number];
    const zN: [number, number] = [a22[0] - xp * a12[0], a22[1] - xp * a12[1]], tN: [number, number] = [xp * a11[0] - a12[0], xp * a11[1] - a12[1]];
    const num_: [number, number] = [zN[0] + xs * tN[0], zN[1] + xs * tN[1]]; return Math.hypot(...num_) / Math.hypot(...det); };
  return [
    { id: 'fr', title: 'Force at the push point → height at the sensor: |G(j2πf)|', x: 'frequency f (Hz)', y: '|G| (mm per kN)',
      draw(g, w, h) { wipe(g, w, h); const p = carOf(c.values), xp = snap(p, num(c.values, 'xp')), xs = snap(p, num(c.values, 'xs')), fs = linspace(0.1, 3, 291), gs = fs.map((f) => G(p, xp, xs, f) * 1e6);
        const f = graph(g, w, h, [0, 3], [0, Math.max(0.1, ...gs) * 1.15], 'frequency f (Hz)', '|G| (mm per kN)'); curve(g, f, fs, gs, col.e(), 2.4);
        const md = carModes(p); md.forEach((m, i) => tline(g, f, [m.fn, 0], [m.fn, Math.max(...gs) * 1.1], i ? col.b() : col.a(), 1, [3, 3])); } },
    { id: 'table', title: 'Which modes are reached (by the push) and seen (by the sensor)', x: 'mode', y: 'reached / seen (yes or no)',
      draw(g, w, h) { wipe(g, w, h); const p = carOf(c.values), xp = snap(p, num(c.values, 'xp')), xs = snap(p, num(c.values, 'xs')), r = modeAt(p, xp), s = modeAt(p, xs), tol = 1e-6;
        const rows: [string, boolean, boolean, string][] = [['bounce', Math.abs(r.b) > tol, Math.abs(s.b) > tol, col.a()], ['pitch', Math.abs(r.q) > tol, Math.abs(s.q) > tol, col.b()]];
        text(g, 'mode', 16, 30, col.muted(), 'left', 11); text(g, 'reached', w * 0.45, 30, col.muted(), 'center', 11); text(g, 'seen', w * 0.7, 30, col.muted(), 'center', 11); text(g, 'in G(s)?', w * 0.9, 30, col.muted(), 'center', 11);
        rows.forEach(([n, a, b, cc], i) => { const y = 60 + i * 30; text(g, n, 16, y, cc, 'left', 12); text(g, a ? 'yes' : 'no', w * 0.45, y, a ? col.ok() : col.bad(), 'center', 12); text(g, b ? 'yes' : 'no', w * 0.7, y, b ? col.ok() : col.bad(), 'center', 12); text(g, a && b ? 'yes' : 'no', w * 0.9, y, a && b ? col.ok() : col.bad(), 'center', 12); });
        const order = rows.filter((r_) => r_[1] && r_[2]).length * 2;
        text(g, `G(s) has ${order} poles; the model has 4 states`, 16, 60 + 2 * 30 + 6, col.text(), 'left', 11); } },
  ];
});

/* ───────────── gramian / optimal: active suspension levelling the body ───────────── */
const acts = (v: V, p: CarP) => (v.act === 'front' ? [p.a] : v.act === 'rear' ? [-p.b] : [p.a, -p.b]);
const X0 = [0, -2 / DEG, 0, 0];
export const gramianFigure = figureOf((c) => [
  { id: 'energy', title: 'Least energy ∫|u|²dt to level the body from 2° nose-down, against the time allowed', x: 'time allowed T (s)', y: 'energy (N²·s, log)',
    draw(g, w, h) { wipe(g, w, h); const p = carOf(c.values), xs = acts(c.values, p), Ts = linspace(0.25, 1.5, 26), Es = Ts.map((T) => Math.log10(minEnergy(p, xs, X0, T).energy));
      const f = graph(g, w, h, [0.25, 1.5], [Math.min(...Es) - 0.3, Math.max(...Es) + 0.3], 'time allowed T (s)', 'log₁₀ energy (N²·s)'); curve(g, f, Ts, Es, col.e(), 2.4);
      const T = num(c.values, 'T'), E = minEnergy(p, xs, X0, T).energy; dot(g, f, [T, Math.log10(E)], col.text(), 5);
      note(g, `T = ${fmt(T, 2)} s: E = ${Math.round(E).toLocaleString('en-US')} N²·s`, f.box.r - 4, f.box.t + 10, col.text(), 'right', 10); } },
  { id: 'eig', title: 'Eigenvalues of the Gramian W(T): thin directions are expensive', x: 'eigen-direction', y: 'log₁₀ eigenvalue',
    draw(g, w, h) { wipe(g, w, h); const p = carOf(c.values), xs = acts(c.values, p), W = gramian(carA(p), forceB(p, xs), num(c.values, 'T'), 800);
      // symmetric 4×4 eigenvalues by Jacobi rotations
      const a = W.map((r) => r.slice()); for (let sweep = 0; sweep < 40; sweep++) for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { if (Math.abs(a[i][j]) < 1e-30) continue; const th = 0.5 * Math.atan2(2 * a[i][j], a[j][j] - a[i][i]), cs = Math.cos(th), sn = Math.sin(th);
        for (let k = 0; k < 4; k++) { const aki = a[k][i], akj = a[k][j]; a[k][i] = cs * aki - sn * akj; a[k][j] = sn * aki + cs * akj; } for (let k = 0; k < 4; k++) { const aik = a[i][k], ajk = a[j][k]; a[i][k] = cs * aik - sn * ajk; a[j][k] = sn * aik + cs * ajk; } }
      const ev = [0, 1, 2, 3].map((i) => Math.max(1e-30, a[i][i])).sort((x, y) => x - y), lg = ev.map((e) => Math.log10(e)), lo = Math.min(...lg) - 0.5, hi = Math.max(...lg) + 0.5;
      const f = graph(g, w, h, [0, 4], [Math.floor(lo), Math.ceil(hi)], 'eigen-direction, cheapest last', 'log₁₀ eigenvalue', 1, Math.max(1, Math.ceil((hi - lo) / 5)), 44, () => '');
      const NAMES = ['hardest', '2nd', '3rd', 'easiest'];
      lg.forEach((v, i) => { g.fillStyle = i === 0 ? col.bad() : col.a(); const x0 = f.X(i + 0.25), x1 = f.X(i + 0.75); g.fillRect(x0, f.Y(v), x1 - x0, f.Y(Math.floor(lo)) - f.Y(v)); text(g, NAMES[i], (x0 + x1) / 2, f.box.b + 9, i === 0 ? col.bad() : col.muted(), 'center', 10); });
      note(g, `spread = largest ÷ smallest eigenvalue = ${(ev[3] / ev[0]).toExponential(1)}`, f.box.l + 4, f.box.t + 10, col.text(), 'left', 10);
      note(g, 'red: the hardest direction to push (costs the most energy)', f.box.l + 4, f.box.t + 26, col.bad(), 'left', 10); } },
]);
export const optimalFigure = figureOf((c) => {
  const run = () => { const p = carOf(c.values), xs = acts(c.values, p), T = num(c.values, 'T'), r = minEnergy(p, xs, X0, T), ts = linspace(0, T, 201), U = ts.map((t) => r.u(t));
    const ctl = sim(r.A, r.B, (t) => (t < T ? r.u(t) : xs.map(() => 0)), X0, Math.max(1.5, T + 0.5), 2e-3), free = sim(r.A, r.B, () => xs.map(() => 0), X0, Math.max(1.5, T + 0.5), 2e-3);
    return { p, xs, T, r, ts, U, ctl, free }; };
  return [
    { id: 'u', title: 'Least-energy actuator forces u(t)', x: 'time t (s)', y: 'force (N)',
      draw(g, w, h) { wipe(g, w, h); const { T, ts, U, xs, r } = run(), m = Math.max(10, ...U.flat().map(Math.abs)) * 1.15, f = graph(g, w, h, [0, T], [-m, m], 'time t (s)', 'force (N)');
        tline(g, f, [0, 0], [T, 0], col.muted(), 1); const cs = [col.a(), col.b()];
        xs.forEach((_, k) => curve(g, f, ts, U.map((u) => u[k]), xs.length === 1 && c.values.act === 'rear' ? col.b() : cs[k], 2.2));
        const pk = xs.map((_, k) => Math.max(...U.map((u) => Math.abs(u[k]))));
        note(g, xs.length === 2 ? 'blue: front actuator · orange: rear actuator' : c.values.act === 'rear' ? 'orange: rear actuator' : 'blue: front actuator', f.box.r - 4, f.box.b - 10, col.muted(), 'right', 10);
        note(g, `peak ${pk.map((v) => `${Math.round(v).toLocaleString('en-US')} N`).join(' / ')} · E = ${Math.round(r.energy).toLocaleString('en-US')} N²·s`, f.box.l + 4, f.box.t + 10, col.text(), 'left', 10); } },
    { id: 'theta', title: 'Pitch θ(t): with the least-energy input (solid) and left alone (dashed)', x: 'time t (s)', y: 'θ (°)',
      draw(g, w, h) { wipe(g, w, h); const { ctl, free, T } = run(), Tm = ctl.ts[ctl.ts.length - 1], f = graph(g, w, h, [0, Tm], [-2.4, 1.2], 'time t (s)', 'pitch θ (°)');
        tline(g, f, [0, 0], [Tm, 0], col.muted(), 1); tline(g, f, [T, -2.4], [T, 1.2], col.e(), 1.2, [4, 3]);
        curve(g, f, free.ts, free.xs.map((x) => x[1] * DEG), col.muted(), 1.6, [5, 3]); curve(g, f, ctl.ts, ctl.xs.map((x) => x[1] * DEG), col.b(), 2.4);
        note(g, `level and still at T = ${fmt(T, 2)} s`, f.box.r - 4, f.box.b - 8, col.e(), 'right', 10); } },
  ];
});

/* ───────────── feedback: skyhook active damping (u = −Kx moves the poles) ───────────── */
const skyOf = (v: V) => { const k = num(v, 'gain'), g = v.gains === 'equal' ? { cf: skyEqualGain(CAR) * k, cr: skyEqualGain(CAR) * k } : (() => { const s = skyGains(CAR); return { cf: s.cf * k, cr: s.cr * k }; })(); return g; };
export const skyhookFigure = figureOf((c) => [
  { id: 'poles', title: 'Closed-loop poles as the skyhook gain rises', x: 'Re s (1/s)', y: 'Im s (1/s)',
    draw(g, w, h) { wipe(g, w, h); const f = graph(g, w, h, [-9, 0.5], [-10, 10], 'Re s (1/s)', 'Im s (1/s)'), base = skyGains(CAR), eq = skyEqualGain(CAR);
      for (const k of linspace(0, 1.5, 31)) for (const m of carModes(withSky(CAR, c.values.gains === 'equal' ? { cf: eq * k, cr: eq * k } : { cf: base.cf * k, cr: base.cr * k }))) { dot(g, f, [m.s[0], m.s[1]], col.muted(), 1.6); dot(g, f, [m.s[0], -m.s[1]], col.muted(), 1.6); }
      for (const [m, i] of carModes(CAR).map((m, i) => [m, i] as const)) for (const sg of [1, -1]) { g.save(); g.globalAlpha = 0.45; dot(g, f, [m.s[0], sg * m.s[1]], i ? col.b() : col.a(), 4); g.restore(); }
      const md = carModes(withSky(CAR, skyOf(c.values))); md.forEach((m, i) => { for (const sg of [1, -1]) dot(g, f, [m.s[0], sg * m.s[1]], i ? col.b() : col.a(), 5.5); });
      note(g, md.length === 2 ? `ζ bounce ${fmt(md[0].zeta, 3)}, pitch ${fmt(md[1].zeta, 3)} · ${fmt(md[0].fn, 3)} / ${fmt(md[1].fn, 3)} Hz` : 'a mode is overdamped', f.box.l + 4, f.box.t + 10, col.text(), 'left', 10); } },
  { id: 'bump', title: 'Heave after the 5 cm bump: passive (dashed) and with skyhook (solid)', x: 'time t (s)', y: 'z (mm)',
    draw(g, w, h) { wipe(g, w, h); const P = skyBump(CAR, { cf: 0, cr: 0 }, 3, 5e-4), S = skyBump(CAR, skyOf(c.values), 3, 5e-4), f = graph(g, w, h, [0, 3], [-6, 10], 'time t (s)', 'heave (mm)');
      tline(g, f, [0, 1], [3, 1], col.muted(), 1, [2, 3]); tline(g, f, [0, -1], [3, -1], col.muted(), 1, [2, 3]);
      curve(g, f, P.ts, P.xs.map((x) => x[0] * 1000), col.muted(), 1.6, [5, 3]); curve(g, f, S.ts, S.xs.map((x) => x[0] * 1000), col.a(), 2.4);
      const pk = Math.max(...S.xs.map((x) => Math.abs(x[0]))) * 1000, fp = S.F.map((u) => u.map(Math.abs)).reduce((a, u) => [Math.max(a[0], u[0]), Math.max(a[1], u[1])], [0, 0]);
      let last = 0; S.xs.forEach((x, i) => { if (Math.abs(x[0]) > 1e-3) last = S.ts[i]; });
      note(g, `peak ${fmt(pk, 2)} mm · within 1 mm after ${fmt(last, 2)} s · actuators ${Math.round(fp[0]).toLocaleString('en-US')} / ${Math.round(fp[1]).toLocaleString('en-US')} N`, f.box.r - 4, f.box.b - 10, col.text(), 'right', 10); } },
]);
