import { figureOf, planeFrame, rangeFrame, gridT, spanLine, arrow, dot, polyline, fillPoly, text, tline, axes2, wipe, curve, graphAxes, fillBetween, col, mulV, deg, linspace, type M2, type V2 } from '@study/core';
import { stateTransition, companion2, ctrbMatrix, rank, type Mat } from '@study/core/dsp';
import { CART_A, eigPairs, fmt, num, clampN } from './common';

/* ───────────── ss: the running example itself, animated ───────────── */
function simulate(k: number, cdamp: number, x0: number, input: string, amp: number, tmax: number) {
  const dt = 0.01, n = Math.round(tmax / dt), ts = new Float64Array(n + 1), x = new Float64Array(n + 1), v = new Float64Array(n + 1), u = new Float64Array(n + 1);
  const force = (t: number) => (input === 'none' ? 0 : input === 'step' ? amp : input === 'pulse' ? (t < 1 ? amp : 0) : amp * Math.sin(2 * Math.PI * 0.35 * t));
  let p = x0, q = 0;
  const f = (t: number, a: number, b: number): [number, number] => [b, -k * a - cdamp * b + force(t)];
  for (let i = 0; i <= n; i++) {
    const t = i * dt; ts[i] = t; x[i] = p; v[i] = q; u[i] = force(t);
    const k1 = f(t, p, q), k2 = f(t + dt / 2, p + dt / 2 * k1[0], q + dt / 2 * k1[1]), k3 = f(t + dt / 2, p + dt / 2 * k2[0], q + dt / 2 * k2[1]), k4 = f(t + dt, p + dt * k3[0], q + dt * k3[1]);
    p += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); q += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    if (!Number.isFinite(p) || Math.abs(p) > 1e4) { p = 1e4; q = 0; }
  }
  return { ts, x, v, u };
}
const TMAX_SS = 10;
export const ssFigure = figureOf((c) => {
  const sim = () => simulate(num(c.values, 'k'), num(c.values, 'cd'), num(c.values, 'x0'), String(c.values.input), num(c.values, 'amp'), TMAX_SS);
  return [
    {
      id: 'cart', title: 'The running example: a cart on a spring and damper', x: 'position x (m)', y: 'schematic',
      draw(g, w, h) {
        wipe(g, w, h);
        const t = num(c.values, 't'), s = sim(), i = Math.min(s.ts.length - 1, Math.round(t / 0.01));
        const X0 = 34, scale = (w - 80) / 3.2, px = (x: number) => X0 + 16 + (x + 0.8) * scale; // x in [-0.8, 2.4]
        const gy = h * 0.72, bw = 54, bh = 38, cx = clampN(s.x[i], 2.4) * scale + px(0), cy = gy - bh;
        g.strokeStyle = col.strong(); g.lineWidth = 2; g.setLineDash([]); g.beginPath(); g.moveTo(8, gy); g.lineTo(w - 8, gy); g.stroke();
        g.fillStyle = col.strong(); g.fillRect(X0 - 10, gy - 90, 8, 90);
        // rest-position tick and ghost
        g.setLineDash([3, 3]); g.strokeStyle = col.muted(); g.beginPath(); g.moveTo(px(0), gy - 4); g.lineTo(px(0), cy - 10); g.stroke(); g.setLineDash([]);
        text(g, 'x = 0', px(0), gy + 26, col.muted(), 'center', 10);
        // spring (zigzag) and damper
        const xl = X0 - 2, xr = cx - bw / 2, ys = gy - bh * 0.7;
        g.strokeStyle = col.a(); g.lineWidth = 2; g.beginPath(); g.moveTo(xl, ys);
        const nz = 9, seg = (xr - xl) / (nz + 2); g.lineTo(xl + seg, ys);
        for (let z = 0; z < nz; z++) g.lineTo(xl + seg * (z + 1.5), ys + (z % 2 ? 9 : -9));
        g.lineTo(xr, ys); g.stroke();
        text(g, `spring k = ${fmt(num(c.values, 'k'), 1)}`, (xl + xr) / 2, ys - 18, col.a(), 'center', 10);
        const yd = gy - bh * 0.25, mid = (xl + xr) / 2;
        g.strokeStyle = col.b(); g.beginPath(); g.moveTo(xl, yd); g.lineTo(mid - 12, yd); g.moveTo(mid - 12, yd - 7); g.lineTo(mid - 12, yd + 7); g.moveTo(mid - 12, yd - 7); g.lineTo(mid + 14, yd - 7); g.moveTo(mid - 12, yd + 7); g.lineTo(mid + 14, yd + 7); g.moveTo(mid + 4, yd); g.lineTo(xr, yd); g.stroke();
        text(g, `damper c = ${fmt(num(c.values, 'cd'), 1)}`, (xl + xr) / 2, gy + 12, col.b(), 'center', 10);
        // mass
        g.fillStyle = col.accent(); g.globalAlpha = 0.85; g.fillRect(cx - bw / 2, cy, bw, bh); g.globalAlpha = 1;
        text(g, 'm = 1 kg', cx, cy + bh / 2, col.text(), 'center', 11);
        // wheels
        g.fillStyle = col.strong(); for (const dx of [-16, 16]) { g.beginPath(); g.arc(cx + dx, gy - 3, 4, 0, 7); g.fill(); }
        // force arrow
        const u = s.u[i]; if (Math.abs(u) > 0.02) { const L = clampN(u * 36, 90); const f = planeFrame(w, h, 1); void f; g.strokeStyle = col.e(); g.fillStyle = col.e(); g.lineWidth = 3; const y0 = cy + bh / 2 - 22, x1 = cx + bw / 2 + 4; g.beginPath(); g.moveTo(x1, y0); g.lineTo(x1 + L, y0); g.stroke(); const d = Math.sign(L) * 8; g.beginPath(); g.moveTo(x1 + L + d, y0); g.lineTo(x1 + L, y0 - 5); g.lineTo(x1 + L, y0 + 5); g.fill(); text(g, `u = ${fmt(u)} N`, x1 + L / 2, y0 - 12, col.e(), 'center', 11); }
        // sensor
        text(g, `sensor reads y = x = ${fmt(s.x[i])} m     velocity ẋ = ${fmt(s.v[i])} m/s`, 8, 12, col.text(), 'left', 11);
        text(g, 'ẋ = Ax + Bu,  A = [[0, 1], [−k, −c]],  B = [0, 1]ᵀ,  y = [1 0] x', 8, 28, col.muted(), 'left', 10);
      },
    },
    {
      id: 'traces', title: 'What the state and the output do over time', x: 'time t (s)', y: 'x, ẋ (m, m/s), u (N)',
      draw(g, w, h) {
        wipe(g, w, h);
        const s = sim(), t = num(c.values, 't');
        let lo = 0, hi = 0.2; for (let i = 0; i < s.x.length; i += 5) for (const a of [s.x[i], s.v[i], s.u[i]]) { lo = Math.min(lo, a); hi = Math.max(hi, a); }
        lo = Math.max(lo, -10); hi = Math.min(hi, 10); const pad = (hi - lo) * 0.1 + 0.05;
        const f = rangeFrame(w, h, [0, TMAX_SS], [lo - pad, hi + pad], 40, 10, 8, 30);
        graphAxes(g, f, [0, TMAX_SS], [lo - pad, hi + pad], 'time t (s)', 'state and input');
        const upto = Math.round(t / 0.01);
        curve(g, f, s.ts, s.u, col.muted(), 1.2, [5, 4]);
        for (const [arr, color] of [[s.x, col.a()], [s.v, col.b()]] as const) {
          g.globalAlpha = 0.28; curve(g, f, s.ts, arr, color, 2); g.globalAlpha = 1;
          curve(g, f, s.ts.subarray(0, upto + 1), arr.subarray(0, upto + 1), color, 2.8);
          dot(g, f, [t, arr[Math.min(upto, arr.length - 1)]], color, 4);
        }
        tline(g, f, [t, f.iy(f.box.t)], [t, f.iy(f.box.b)], col.muted(), 1, [4, 3]);
      },
    },
  ];
});

/* ───────────── flow: e^{At} as a movie of the plane ───────────── */
const TMAXF = 8;
function flowState(a1: number, a0: number) { const A = companion2(a1, a0) as Mat; return A; }
export const flowFigure = figureOf((c) => {
  const A = () => flowState(num(c.values, 'a1'), num(c.values, 'a0'));
  const clampV = (v: V2): V2 => [clampN(v[0], 1e3), clampN(v[1], 1e3)];
  const at = (P: Mat, v: V2): V2 => clampV([P[0][0] * v[0] + P[0][1] * v[1], P[1][0] * v[0] + P[1][1] * v[1]]);
  return [
    {
      id: 'phase', title: 'Phase portrait: every point flows by e^{At}', x: 'x₁ = position', y: 'x₂ = velocity',
      draw(g, w, h) {
        wipe(g, w, h);
        const M = A(), f = planeFrame(w, h, 2.6), t = num(c.values, 't'), P = stateTransition(M, t) as Mat;
        axes2(g, f);
        // vector field
        for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const p: V2 = [i * 0.6, j * 0.6], d = [M[0][0] * p[0] + M[0][1] * p[1], M[1][0] * p[0] + M[1][1] * p[1]], n = Math.hypot(d[0], d[1]) || 1; g.globalAlpha = 0.35; arrow(g, f, p, [p[0] + (d[0] / n) * 0.2, p[1] + (d[1] / n) * 0.2], col.muted(), 1.2); g.globalAlpha = 1; }
        for (const [i, e] of eigPairs(M as unknown as M2).entries()) spanLine(g, f, e.v, i ? col.b() : col.c(), 1.8, [7, 5]);
        // the ring of initial states and where e^{At} has taken it
        const ring = linspace(0, Math.PI * 2, 120).map((a): V2 => [1.2 * Math.cos(a), 1.2 * Math.sin(a)]);
        polyline(g, f, ring, col.muted(), 1, [3, 3], true);
        polyline(g, f, ring.map((p) => at(P, p)), col.accent(), 2, [], true);
        for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, p0: V2 = [1.2 * Math.cos(a), 1.2 * Math.sin(a)]; const path = linspace(0, t, 30).map((s): V2 => at(stateTransition(M, s) as Mat, p0)); polyline(g, f, path, col.accent(), 0.8); dot(g, f, at(P, p0), col.accent(), 2.5); }
        const x0: V2 = [num(c.values, 'x1'), num(c.values, 'x2')];
        const full = linspace(0, TMAXF, 80).map((s): V2 => at(stateTransition(M, s) as Mat, x0));
        polyline(g, f, full, col.e(), 1, [2, 3]);
        polyline(g, f, linspace(0, t, 50).map((s): V2 => at(stateTransition(M, s) as Mat, x0)), col.e(), 3);
        dot(g, f, x0, col.e(), 3, true); dot(g, f, at(P, x0), col.e(), 5);
      },
    },
    {
      id: 'states', title: 'The same motion against time', x: 'time t (s)', y: 'x₁ = position, x₂ = velocity',
      draw(g, w, h) {
        wipe(g, w, h);
        const M = A(), x0: V2 = [num(c.values, 'x1'), num(c.values, 'x2')], ts = linspace(0, TMAXF, 160), t = num(c.values, 't');
        const pts = ts.map((s) => at(stateTransition(M, s) as Mat, x0));
        let lo = Math.min(0, ...pts.map((p) => Math.min(p[0], p[1]))), hi = Math.max(0.5, ...pts.map((p) => Math.max(p[0], p[1])));
        lo = Math.max(lo, -8); hi = Math.min(hi, 8); const pad = (hi - lo) * 0.1;
        const f = rangeFrame(w, h, [0, TMAXF], [lo - pad, hi + pad], 40, 10, 8, 30);
        graphAxes(g, f, [0, TMAXF], [lo - pad, hi + pad], 'time t (s)', 'state');
        curve(g, f, ts, pts.map((p) => p[0]), col.a(), 2.5); curve(g, f, ts, pts.map((p) => p[1]), col.b(), 2.5);
        const now = at(stateTransition(M, t) as Mat, x0);
        tline(g, f, [t, f.iy(f.box.t)], [t, f.iy(f.box.b)], col.muted(), 1, [4, 3]);
        dot(g, f, [t, now[0]], col.a(), 4); dot(g, f, [t, now[1]], col.b(), 4);
      },
    },
  ];
});

/* ───────────── stab: pole location ⇄ decay ───────────── */
export const stabFigure = figureOf((c) => {
  const T = 0.4;
  const poles = () => { const s = num(c.values, 'sigma'), wv = num(c.values, 'omega'); return c.values.dom === 'z' ? { re: Math.exp(s * T) * Math.cos(wv * T), im: Math.exp(s * T) * Math.sin(wv * T) } : { re: s, im: wv }; };
  return [
    {
      id: 'poles', title: 'Where the poles sit', x: 'Re of the pole (s or z)', y: 'Im of the pole',
      draw(g, w, h) {
        wipe(g, w, h);
        const z = c.values.dom === 'z', p = poles(), f = planeFrame(w, h, z ? 1.6 : 4);
        if (z) {
          g.fillStyle = 'rgba(110,226,110,.16)'; g.beginPath(); g.arc(f.X(0), f.Y(0), f.sx, 0, 7); g.fill();
          g.strokeStyle = col.ok(); g.lineWidth = 2; g.beginPath(); g.arc(f.X(0), f.Y(0), f.sx, 0, 7); g.stroke();
          axes2(g, f);
          text(g, 'stable: inside the unit circle', f.X(0), f.box.b - 6, col.ok(), 'center', 11);
        } else {
          g.fillStyle = 'rgba(110,226,110,.16)'; g.fillRect(f.box.l, f.box.t, f.X(0) - f.box.l, f.box.b - f.box.t);
          g.fillStyle = 'rgba(239,91,91,.14)'; g.fillRect(f.X(0), f.box.t, f.box.r - f.X(0), f.box.b - f.box.t);
          axes2(g, f);
          text(g, 'stable', f.X(-2), f.box.t + 12, col.ok(), 'center', 12); text(g, 'unstable', f.X(2), f.box.t + 12, col.bad(), 'center', 12);
        }
        const crossAt = (re: number, im: number, color: string) => { const x = f.X(re), y = f.Y(im); g.strokeStyle = color; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 6, y - 6); g.lineTo(x + 6, y + 6); g.moveTo(x - 6, y + 6); g.lineTo(x + 6, y - 6); g.stroke(); };
        const stable = z ? Math.hypot(p.re, p.im) < 1 : p.re < 0;
        crossAt(p.re, p.im, stable ? col.c() : col.bad()); if (p.im > 1e-6) crossAt(p.re, -p.im, stable ? col.c() : col.bad());
      },
    },
    {
      id: 'resp', title: 'What a mode does: e^{σt} cos ωt', x: 'time t (s)', y: 'mode amplitude',
      draw(g, w, h) {
        wipe(g, w, h);
        const s = num(c.values, 'sigma'), wv = num(c.values, 'omega'), tm = 8, ts = linspace(0, tm, 400);
        const env = ts.map((t) => Math.exp(s * t)), ys = ts.map((t) => Math.exp(s * t) * Math.cos(wv * t));
        const top = Math.min(4, Math.max(1.2, ...env)), f = rangeFrame(w, h, [0, tm], [-top, top], 40, 10, 8, 30);
        graphAxes(g, f, [0, tm], [-top, top], 'time t (s)', 'mode e^{σt}cos ωt');
        curve(g, f, ts, env, col.muted(), 1.2, [5, 4]); curve(g, f, ts, env.map((e) => -e), col.muted(), 1.2, [5, 4]);
        curve(g, f, ts, ys, s < 0 ? col.c() : col.bad(), 2.8);
        if (c.values.dom === 'z') { const ks = Array.from({ length: Math.floor(tm / T) + 1 }, (_, k) => k * T); ks.forEach((t) => dot(g, f, [t, Math.exp(s * t) * Math.cos(wv * t)], col.e(), 3.5)); text(g, `dots: samples every T = ${T} s (z = e^{sT})`, f.box.r - 4, f.box.t + 10, col.e(), 'right', 10); }
      },
    },
  ];
});

/* ───────────── ctrl: the reachable set ───────────── */
export const ctrlFigure = figureOf((c) => {
  const sys = () => { const A = companion2(num(c.values, 'a1'), num(c.values, 'a0')) as Mat; const b = deg(num(c.values, 'beta')); const B: V2 = [Math.cos(b), Math.sin(b)]; return { A, B }; };
  const reach = (A: Mat, B: V2, T: number): V2[] => {
    const n = 160, dt = T / n, cols: V2[] = [];
    for (let i = 0; i < n; i++) { const P = stateTransition(A, (i + 0.5) * dt); cols.push([P[0][0] * B[0] + P[0][1] * B[1], P[1][0] * B[0] + P[1][1] * B[1]]); }
    const out: V2[] = [];
    for (let k = 0; k < 120; k++) { const a = (k / 120) * Math.PI * 2, d: V2 = [Math.cos(a), Math.sin(a)]; let sx = 0, sy = 0; for (const q of cols) { const sg = Math.sign(d[0] * q[0] + d[1] * q[1]); sx += sg * q[0] * dt; sy += sg * q[1] * dt; } out.push([sx, sy]); }
    return out;
  };
  return [
    {
      id: 'reach', title: 'Everywhere the input can take the state in time T (|u| ≤ 1)', x: 'x₁ = position', y: 'x₂ = velocity',
      draw(g, w, h) {
        wipe(g, w, h);
        const { A, B } = sys(), T = num(c.values, 'T'), f = planeFrame(w, h, 1.6);
        axes2(g, f);
        for (const [i, e] of eigPairs(A as unknown as M2).entries()) spanLine(g, f, e.v, i ? col.b() : col.c(), 1.6, [7, 5]);
        const set = reach(A, B, T);
        fillPoly(g, f, set, 'rgba(79,195,247,.28)'); polyline(g, f, set, col.a(), 4, [], true);
        arrow(g, f, [0, 0], B, col.e(), 2.5, 'B');
        const AB: V2 = [A[0][0] * B[0] + A[0][1] * B[1], A[1][0] * B[0] + A[1][1] * B[1]];
        arrow(g, f, [0, 0], [AB[0], AB[1]], col.d(), 2, 'AB');
        const thin = Math.max(...set.map((p) => Math.abs(p[0] * -B[1] + p[1] * B[0]))) < 0.02;
        text(g, thin ? 'a line: the input cannot leave it' : 'a full 2-D region: every state is reachable', f.box.l + 4, f.box.b - 6, thin ? col.bad() : col.ok(), 'left', 11);
      },
    },
    {
      id: 'ctrb', title: 'Controllability matrix [B AB]', x: 'x₁', y: 'x₂',
      draw(g, w, h) {
        wipe(g, w, h);
        const { A, B } = sys(), f = planeFrame(w, h, 3.2);
        const AB: V2 = [A[0][0] * B[0] + A[0][1] * B[1], A[1][0] * B[0] + A[1][1] * B[1]];
        axes2(g, f);
        const C2 = ctrbMatrix(A, B), r = rank(C2, 1e-3), det = C2[0][0] * C2[1][1] - C2[0][1] * C2[1][0];
        fillPoly(g, f, [[0, 0], B, [B[0] + AB[0], B[1] + AB[1]], AB], r === 2 ? 'rgba(110,226,110,.25)' : 'rgba(239,91,91,.25)');
        arrow(g, f, [0, 0], B, col.e(), 2.5, 'B'); arrow(g, f, [0, 0], AB, col.d(), 2.5, 'AB');
        text(g, `area |det[B AB]| = ${fmt(Math.abs(det))}   rank = ${r}`, f.box.l + 4, f.box.t + 8, r === 2 ? col.ok() : col.bad(), 'left', 12);
        text(g, r === 2 ? 'B and AB span the plane: controllable' : 'B and AB are parallel: some mode is out of reach', f.box.l + 4, f.box.b - 6, col.muted(), 'left', 10);
      },
    },
  ];
});

/* ───────────── obs: which state directions the output can see ───────────── */
export const obsFigure = figureOf((c) => {
  const ep = () => eigPairs(CART_A);
  const states = () => {
    const e = ep(), d = e[num(c.values, 'along') === 2 || c.values.along === '2' ? 1 : 0].v;
    const P: V2 = [1, 0], s = num(c.values, 's');
    return { P, Q: [P[0] + s * d[0], P[1] + s * d[1]] as V2, d };
  };
  const y = (x0: V2, Cv: V2, t: number) => { const Ph = stateTransition(CART_A, t); return Cv[0] * (Ph[0][0] * x0[0] + Ph[0][1] * x0[1]) + Cv[1] * (Ph[1][0] * x0[0] + Ph[1][1] * x0[1]); };
  const Cvec = (): V2 => [Math.cos(deg(num(c.values, 'gamma'))), Math.sin(deg(num(c.values, 'gamma')))];
  return [
    {
      id: 'plane', title: 'The state plane, seen through the sensor', x: 'x₁ = position', y: 'x₂ = velocity',
      draw(g, w, h) {
        wipe(g, w, h);
        const f = planeFrame(w, h, 2.2), Cv = Cvec(), { P, Q } = states();
        axes2(g, f);
        const nrm: V2 = [-Cv[1], Cv[0]];
        for (let k = -6; k <= 6; k++) { g.globalAlpha = 0.5; spanLine(g, f, nrm, col.grid(), 1, [], [Cv[0] * k * 0.5, Cv[1] * k * 0.5]); g.globalAlpha = 1; }
        for (const [i, e] of ep().entries()) spanLine(g, f, e.v, i ? col.b() : col.c(), 1.8, [7, 5]);
        arrow(g, f, [0, 0], [Cv[0] * 1.2, Cv[1] * 1.2], col.d(), 3, 'C');
        polyline(g, f, [P, Q], col.muted(), 1.5, [3, 3]);
        dot(g, f, P, col.a(), 6); dot(g, f, Q, col.b(), 6);
        text(g, 'P', f.X(P[0]) + 8, f.Y(P[1]) - 8, col.a(), 'left', 12); text(g, 'Q', f.X(Q[0]) + 8, f.Y(Q[1]) - 8, col.b(), 'left', 12);
        const e = ep();
        text(g, `C·v₁ = ${fmt(Cv[0] * e[0].v[0] + Cv[1] * e[0].v[1])}    C·v₂ = ${fmt(Cv[0] * e[1].v[0] + Cv[1] * e[1].v[1])}`, f.box.l + 4, f.box.b - 6, col.muted(), 'left', 11);
        text(g, 'grey lines: states with the same y(0)', f.box.l + 4, f.box.t + 8, col.muted(), 'left', 10);
      },
    },
    {
      id: 'out', title: 'What the sensor records from P and from Q', x: 'time t (s)', y: 'output y(t)',
      draw(g, w, h) {
        wipe(g, w, h);
        const Cv = Cvec(), { P, Q } = states(), ts = linspace(0, 6, 240);
        const yp = ts.map((t) => y(P, Cv, t)), yq = ts.map((t) => y(Q, Cv, t));
        const lim = Math.max(0.5, ...yp.map(Math.abs), ...yq.map(Math.abs)) * 1.1, f = rangeFrame(w, h, [0, 6], [-lim, lim], 40, 10, 8, 30);
        graphAxes(g, f, [0, 6], [-lim, lim], 'time t (s)', 'y(t) = C x(t)');
        const diff = ts.map((_, i) => yq[i] - yp[i]);
        fillBetween(g, f, ts, yp.map((v, i) => v + diff[i]), 'rgba(255,138,92,.0)');
        curve(g, f, ts, yp, col.a(), 3); curve(g, f, ts, yq, col.b(), 2.5, [7, 4]);
        curve(g, f, ts, diff, col.e(), 1.5);
        const mx = Math.max(...diff.map(Math.abs));
        text(g, mx < 1e-3 ? 'identical outputs: P and Q cannot be told apart' : `largest difference ${fmt(mx)}: distinguishable`, f.box.r - 4, f.box.t + 10, mx < 1e-3 ? col.bad() : col.ok(), 'right', 11);
      },
    },
  ];
});

/* ───────────── kalman: which modes are both reachable and seen ───────────── */
const KLAM = [-1, -2, -3, 0.5];
export const kalmanFigure = figureOf((c) => {
  const cls = () => [1, 2, 3, 4].map((i) => String(c.values['m' + i]));
  const bi = (k: string) => (k === 'co' || k === 'c' ? 1 : 0), ci = (k: string) => (k === 'co' || k === 'o' ? 1 : 0);
  return [
    {
      id: 'diagram', title: 'Wiring of the four modes', x: 'signal flow', y: 'modes',
      draw(g, w, h) {
        wipe(g, w, h);
        const k = cls(), ux = 46, yx = w - 46, mx0 = w * 0.26, mw = w * 0.48, bh = Math.min(46, (h - 70) / 4), gap = 10, y0 = 34;
        const lab: Record<string, [string, string]> = { co: ['controllable + observable', 'ok'], c: ['controllable, not observable', 'bad'], o: ['observable, not controllable', 'bad'], n: ['neither', 'bad'] };
        g.fillStyle = col.accent(); g.globalAlpha = 0.2; g.fillRect(ux - 28, h / 2 - 20, 56, 40); g.globalAlpha = 1; g.strokeStyle = col.accent(); g.strokeRect(ux - 28, h / 2 - 20, 56, 40); text(g, 'u (force)', ux, h / 2, col.text(), 'center', 11);
        g.fillStyle = col.accent(); g.globalAlpha = 0.2; g.fillRect(yx - 28, h / 2 - 20, 56, 40); g.globalAlpha = 1; g.strokeRect(yx - 28, h / 2 - 20, 56, 40); text(g, 'y (sensor)', yx, h / 2, col.text(), 'center', 11);
        k.forEach((kk, i) => {
          const y = y0 + i * (bh + gap), cy = y + bh / 2, good = kk === 'co';
          const col1 = good ? col.c() : col.muted();
          g.fillStyle = col1; g.globalAlpha = good ? 0.22 : 0.08; g.fillRect(mx0, y, mw, bh); g.globalAlpha = 1; g.strokeStyle = col1; g.lineWidth = good ? 2 : 1; g.strokeRect(mx0, y, mw, bh);
          text(g, `mode ${i + 1}: λ = ${fmt(KLAM[i], 1)}`, mx0 + 8, cy - 8, col.text(), 'left', 11);
          text(g, lab[kk][0], mx0 + 8, cy + 9, good ? col.ok() : col.muted(), 'left', 10);
          const lineTo = (x1: number, y1: number, x2: number, y2: number, on: boolean) => { g.strokeStyle = on ? col.e() : col.grid(); g.lineWidth = on ? 2.5 : 1.2; g.setLineDash(on ? [] : [3, 4]); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]); if (!on) { const mxp = (x1 + x2) / 2, myp = (y1 + y2) / 2; text(g, '✕', mxp, myp, col.bad(), 'center', 12); } };
          lineTo(ux + 28, h / 2, mx0, cy, !!bi(kk)); lineTo(mx0 + mw, cy, yx - 28, h / 2, !!ci(kk));
        });
        const co = k.map((kk, i) => (kk === 'co' ? KLAM[i] : null)).filter((x) => x !== null) as number[];
        text(g, `G(s) has poles at: ${co.length ? co.map((v) => fmt(v, 1)).join(', ') : '(none: G = 0)'}`, w / 2, h - 12, col.text(), 'center', 12);
        text(g, 'wires: yellow = the input reaches / the output sees that mode', w / 2, 12, col.muted(), 'center', 10);
      },
    },
    {
      id: 'imp', title: 'Impulse response from rest: only controllable-and-observable modes appear', x: 'time t (s)', y: 'h(t)',
      draw(g, w, h) {
        wipe(g, w, h);
        const k = cls(), ts = linspace(0, 6, 240), tot = ts.map(() => 0);
        const f0 = rangeFrame(w, h, [0, 6], [-1, 1.2], 40, 10, 8, 30);
        graphAxes(g, f0, [0, 6], [-1, 1.2], 'time t (s)', 'h(t) = Σ cᵢ bᵢ e^{λᵢt}');
        k.forEach((kk, i) => {
          const live = bi(kk) && ci(kk);
          const ys = ts.map((t) => Math.exp(KLAM[i] * t)); // the 'would-be' contribution with b = c = 1
          g.globalAlpha = live ? 0.9 : 0.3; curve(g, f0, ts, ys.map((v, j) => (live ? v * [1, -1, 0.7, 0.5][i] : v * [1, -1, 0.7, 0.5][i])), [col.a(), col.b(), col.c(), col.d()][i], live ? 1.5 : 1, live ? [] : [3, 4]); g.globalAlpha = 1;
          if (live) ys.forEach((v, j) => (tot[j] += v * [1, -1, 0.7, 0.5][i]));
        });
        curve(g, f0, ts, tot, col.text(), 3.5);
        text(g, 'thick: actual output · dashed: modes that never reach it', f0.box.r - 4, f0.box.t + 10, col.muted(), 'right', 10);
      },
    },
  ];
});
