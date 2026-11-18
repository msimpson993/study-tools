/**
 * Numbers the linear-systems page states, re-derived from scratch.
 * - Running examples: earbud speaker (Thiele–Small set) and two-room house.
 * - Practice exam A1–A4, B1–B3 and the 21 variants: the answers in the Review pages
 *   (checked in Python by /workspace/ls-review/verify.py) recomputed here in TypeScript.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

type M = number[][];
const eye = (n: number): M => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
const mul = (a: M, b: M): M => a.map((r) => b[0].map((_, j) => r.reduce((s, v, k) => s + v * b[k][j], 0)));
const add = (a: M, b: M, k = 1): M => a.map((r, i) => r.map((v, j) => v + k * b[i][j]));
const scale = (a: M, k: number): M => a.map((r) => r.map((v) => v * k));
const col = (v: number[]): M => v.map((x) => [x]);
const hcat = (...ms: M[]): M => ms[0].map((_, i) => ms.flatMap((m) => m[i]));
const vcat = (...ms: M[]): M => ms.flat();
/** e^(A t) by scaling and squaring with a 30-term Taylor series. */
function expm(A: M, t = 1): M {
  const At = scale(A, t); const nrm = Math.max(...At.map((r) => r.reduce((s, v) => s + Math.abs(v), 0)));
  const sq = Math.max(0, Math.ceil(Math.log2(nrm + 1e-300)) + 1); const X = scale(At, 2 ** -sq);
  let term = eye(A.length), sum = eye(A.length);
  for (let k = 1; k < 30; k++) { term = scale(mul(term, X), 1 / k); sum = add(sum, term); }
  for (let i = 0; i < sq; i++) sum = mul(sum, sum);
  return sum;
}
function rank(a: M, tol = 1e-9): number {
  const m = a.map((r) => r.slice()); let r = 0;
  for (let c = 0; c < m[0].length && r < m.length; c++) {
    let p = r; for (let i = r + 1; i < m.length; i++) if (Math.abs(m[i][c]) > Math.abs(m[p][c])) p = i;
    if (Math.abs(m[p][c]) < tol) continue;
    [m[r], m[p]] = [m[p], m[r]];
    for (let i = 0; i < m.length; i++) if (i !== r) { const f = m[i][c] / m[r][c]; for (let j = c; j < m[0].length; j++) m[i][j] -= f * m[r][j]; }
    r++;
  }
  return r;
}
const det = (a: M): number => { // Gaussian elimination
  const m = a.map((r) => r.slice()); let d = 1;
  for (let c = 0; c < m.length; c++) {
    let p = c; for (let i = c + 1; i < m.length; i++) if (Math.abs(m[i][c]) > Math.abs(m[p][c])) p = i;
    if (m[p][c] === 0) return 0; if (p !== c) { [m[p], m[c]] = [m[c], m[p]]; d = -d; }
    d *= m[c][c]; for (let i = c + 1; i < m.length; i++) { const f = m[i][c] / m[c][c]; for (let j = c; j < m.length; j++) m[i][j] -= f * m[c][j]; }
  }
  return d;
};
const ctrb = (A: M, B: M): M => { const out = [B]; for (let i = 1; i < A.length; i++) out.push(mul(A, out[i - 1])); return hcat(...out); };
const obsv = (A: M, C: M): M => { const out = [C]; for (let i = 1; i < A.length; i++) out.push(mul(out[i - 1], A)); return vcat(...out); };
/** Complex helpers for transfer functions G(s) = C (sI − A)⁻¹ B at a complex s. */
type Cx = [number, number];
const cmul = (a: Cx, b: Cx): Cx => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a: Cx, b: Cx): Cx => { const d = b[0] ** 2 + b[1] ** 2; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
function tfAt(A: M, B: number[], C: number[], s: Cx, D = 0): Cx {
  const n = A.length; const m: Cx[][] = A.map((r, i) => r.map((v, j) => [(i === j ? s[0] : 0) - v, i === j ? s[1] : 0] as Cx));
  const x: Cx[] = B.map((b) => [b, 0] as Cx);
  for (let c = 0; c < n; c++) { for (let i = c + 1; i < n; i++) { const f = cdiv(m[i][c], m[c][c]); for (let j = c; j < n; j++) { const p = cmul(f, m[c][j]); m[i][j] = [m[i][j][0] - p[0], m[i][j][1] - p[1]]; } const p = cmul(f, x[c]); x[i] = [x[i][0] - p[0], x[i][1] - p[1]]; } }
  for (let i = n - 1; i >= 0; i--) { let acc = x[i]; for (let j = i + 1; j < n; j++) { const p = cmul(m[i][j], x[j]); acc = [acc[0] - p[0], acc[1] - p[1]]; } x[i] = cdiv(acc, m[i][i]); }
  return x.reduce<Cx>((s2, xi, i) => [s2[0] + C[i] * xi[0], s2[1] + C[i] * xi[1]], [D, 0]);
}
const poly = (c: number[], s: Cx): Cx => c.reduce<Cx>((acc, k) => { const p = cmul(acc, s); return [p[0] + k, p[1]]; }, [0, 0]);
const S_PTS: Cx[] = [[0.3, 0.7], [1.7, -0.4], [-0.6, 2.2], [3.1, 1.3]];
function expectTf(A: M, B: number[], C: number[], num: number[], den: number[], D = 0) {
  for (const s of S_PTS) { const g = tfAt(A, B, C, s, D); const r = cdiv(poly(num, s), poly(den, s)); expect(g[0]).toBeCloseTo(r[0], 9); expect(g[1]).toBeCloseTo(r[1], 9); }
}
const close = (a: M, b: M, d = 9) => a.forEach((r, i) => r.forEach((v, j) => expect(v).toBeCloseTo(b[i][j], d)));
const eig2 = (a: M): [number, number] => { const tr = a[0][0] + a[1][1], dt = a[0][0] * a[1][1] - a[0][1] * a[1][0]; const q = Math.sqrt(tr * tr / 4 - dt); return [tr / 2 + q, tr / 2 - q]; };
const u = (k: number) => (k >= 0 ? 1 : 0);

// -------------------------------------------------------------------------------------------
describe('earbud speaker (Mms 0.084 g, Rms 0.173 kg/s, Cms 0.587 mm/N, Bl 0.545 T·m, Re 7.47 Ω, Le 0.04 mH)', () => {
  const Mms = 0.084e-3, Rms = 0.173, Cms = 0.587e-3, Bl = 0.545, Re = 7.47, Le = 0.04e-3;
  const k = 1 / Cms, ws = Math.sqrt(k / Mms);
  it('stiffness k ≈ 1704 N/m and resonance fs ≈ 717 Hz', () => {
    expect(k).toBeCloseTo(1703.6, 1);
    expect(ws).toBeCloseTo(4503, 0);
    expect(ws / (2 * Math.PI)).toBeCloseTo(716.7, 1);
  });
  it('ζ ≈ 0.23 from Rms alone, ≈ 0.28 once the voltage-driven coil adds Bl²/Re', () => {
    const zm = Rms / (2 * Math.sqrt(k * Mms)); const ze = (Rms + Bl * Bl / Re) / (2 * Math.sqrt(k * Mms));
    expect(zm).toBeCloseTo(0.229, 3);
    expect(Bl * Bl / Re).toBeCloseTo(0.0398, 4);
    expect(ze).toBeCloseTo(0.281, 3);
  });
  it('mechanical poles −σ ± jωd (ring ≈ 688 Hz) and the fast coil pole −Re/Le ≈ −186,750 rad/s', () => {
    const R = Rms + Bl * Bl / Re; const sig = R / (2 * Mms); const wd = Math.sqrt(ws * ws - sig * sig);
    expect(sig).toBeCloseTo(1266.6, 0);
    expect(wd).toBeCloseTo(4322, 0);
    expect(wd / (2 * Math.PI)).toBeCloseTo(688, 0);
    expect(-Re / Le).toBeCloseTo(-186750, 0);
    // the 3-state model (current, position, velocity) has exactly these eigenvalues
    const A: M = [[-Re / Le, 0, -Bl / Le], [0, 0, 1], [Bl / Mms, -k / Mms, -Rms / Mms]];
    // characteristic polynomial of A evaluated at each predicted root ≈ 0 (relative to its scale)
    const ch = (s: Cx) => { const m = A.map((r, i) => r.map((v, j) => [(i === j ? s[0] : 0) - v, i === j ? s[1] : 0] as Cx));
      const t1 = cmul(m[0][0], [cmul(m[1][1], m[2][2])[0] - cmul(m[1][2], m[2][1])[0], cmul(m[1][1], m[2][2])[1] - cmul(m[1][2], m[2][1])[1]]);
      const t3 = cmul(m[0][2], [cmul(m[1][0], m[2][1])[0] - cmul(m[1][1], m[2][0])[0], cmul(m[1][0], m[2][1])[1] - cmul(m[1][1], m[2][0])[1]]);
      return Math.hypot(t1[0] + t3[0], t1[1] + t3[1]); };
    // full coupled roots: coil pole barely moves, mechanical pair matches the voltage-drive damping to < 1 %
    const scaleC = (Re / Le) * ws * ws;
    expect(ch([-sig, wd]) / (scaleC * ws)).toBeLessThan(0.02);
    expect(ch([-Re / Le, 0]) / (scaleC * Re / Le)).toBeLessThan(0.01);
  });
  it('critically damped version (Jordan dive) needs R = 2√(k·Mms) ≈ 0.757 kg/s', () => {
    const Rc = 2 * Math.sqrt(k * Mms); expect(Rc).toBeCloseTo(0.7566, 4);
    const A: M = [[0, 1], [-k / Mms, -Rc / Mms]]; const [l1, l2] = eig2(A); expect(l1 - l2).toBeCloseTo(0, 3); expect(l1).toBeCloseTo(-ws, 2);
  });
  it('sampled at the drawn 8 kHz, the poles land at r ≈ 0.853, angle ≈ 31°', () => {
    const R = Rms + Bl * Bl / Re; const sig = R / (2 * Mms); const wd = Math.sqrt(ws * ws - sig * sig); const T = 1 / 8000;
    expect(Math.exp(-sig * T)).toBeCloseTo(0.8536, 4);
    expect((wd * T * 180) / Math.PI).toBeCloseTo(30.95, 1);
  });
});

describe('two-room house: A = [[−1.2, 1], [1, −1.2]] /h, B = (3600/C_th, 0)ᵀ, C = [1 0]', () => {
  const A: M = [[-1.2, 1], [1, -1.2]];
  it('modes: average λ = −0.2 /h (τ = 5 h), difference λ = −2.2 /h (τ ≈ 27 min)', () => {
    const [l1, l2] = eig2(A); expect(l1).toBeCloseTo(-0.2, 12); expect(l2).toBeCloseTo(-2.2, 12);
    expect(-1 / l1).toBeCloseTo(5, 12); expect((-1 / l2) * 60).toBeCloseTo(27.27, 2);
    close(mul(A, col([1, 1])), col([-0.2, -0.2]), 12); close(mul(A, col([1, -1])), col([-2.2, 2.2]), 12);
  });
  it('2.5 kW heater with C_th = 1 MJ/K (B = (3.6, 0) K/h per kW) settles at (24.55, 20.45) K above outdoors', () => {
    const b = 3.6 * 2.5; // K/h from the room-1 heater
    const dt = det(A); const x = [(-(A[1][1]) * b) / dt, (A[1][0] * b) / dt]; // −A⁻¹ B u
    expect(x[0]).toBeCloseTo(24.55, 2); expect(x[1]).toBeCloseTo(20.45, 2);
  });
  it('heater in room 1 + sensor in room 1: controllable and observable', () => {
    expect(rank(ctrb(A, col([3.6, 0])))).toBe(2); expect(rank(obsv(A, [[1, 0]]))).toBe(2);
  });
  it('heating both rooms equally loses the difference mode; an average thermostat cannot see it', () => {
    expect(rank(ctrb(A, col([1, 1])))).toBe(1); expect(rank(obsv(A, [[0.5, 0.5]]))).toBe(1);
    // PBH: left eigenvector of λ = −2.2 is (1, −1); it is orthogonal to B = (1, 1)
    expect(mul([[1, -1]], col([1, 1]))[0][0]).toBe(0);
  });
});

// -------------------------------------------------------------------------------------------
describe('practice exam part A', () => {
  it('A1: 1/((z−½)(z+2)(z+3)) = (4/35)/(z−½) − (2/5)/(z+2) + (2/7)/(z+3); right-sided samples match long division', () => {
    const X = (zz: number) => 1 / ((zz - 0.5) * (zz + 2) * (zz + 3)); const pf = (zz: number) => 4 / 35 / (zz - 0.5) - 2 / 5 / (zz + 2) + 2 / 7 / (zz + 3);
    for (const zz of [1.3, -0.7, 5, 11]) expect(pf(zz)).toBeCloseTo(X(zz), 12);
    const xa = (k: number) => (4 / 35 * 0.5 ** (k - 1) - 2 / 5 * (-2) ** (k - 1) + 2 / 7 * (-3) ** (k - 1)) * u(k - 1);
    // long division: X(z) = z^-3 / ((1−½z⁻¹)(1+2z⁻¹)(1+3z⁻¹)) → recursion with denominator 1 + 4.5 z⁻¹ + 3.5 z⁻² − 3 z⁻³
    const d = [1, 4.5, 3.5, -3]; const y: number[] = [];
    for (let k = 0; k < 12; k++) { const num = k === 3 ? 1 : 0; y.push(num - d.slice(1).reduce((s, c, i) => s + c * (y[k - 1 - i] ?? 0), 0)); }
    y.forEach((v, k) => expect(v).toBeCloseTo(xa(k), 9));
    // two-sided ROC 2 < |z| < 3: the (z+3) term becomes left-sided
    const xb = (k: number) => (4 / 35 * 0.5 ** (k - 1) - 2 / 5 * (-2) ** (k - 1)) * u(k - 1) - 2 / 7 * (-3) ** (k - 1) * u(-k);
    // the samples n = −3…4 printed on the Review page
    [-0.003527, 0.010582, -0.031746, 0.095238, -0.285714, 0.857143, -1.571429, 3.214286].forEach((v, i) => expect(xb(i - 3)).toBeCloseTo(v, 6));
  });
  it('A2: e^(−3t)u ∗ e^(−3t)u = t e^(−3t) u (numerical convolution)', () => {
    const t = 1.3, N = 20000, dt = t / N; let s = 0; for (let i = 0; i < N; i++) { const tau = (i + 0.5) * dt; s += Math.exp(-3 * tau) * Math.exp(-3 * (t - tau)) * dt; }
    expect(s).toBeCloseTo(t * Math.exp(-3 * t), 6);
  });
  it('A3: y(n) = −¾y(n−1) − ⅛y(n−2) + (½)ⁿ: closed form ⅓(½)ⁿ − ⅓(−¼)ⁿ + (−½)ⁿ and y(0…5)', () => {
    const yc = (k: number) => 0.5 ** k / 3 - (-0.25) ** k / 3 + (-0.5) ** k;
    let a = 0, b = 0; const ys: number[] = [];
    for (let k = 0; k < 20; k++) { const y = -0.75 * a - 0.125 * b + 0.5 ** k; ys.push(y); expect(y).toBeCloseTo(yc(k), 12); b = a; a = y; }
    [1, -0.25, 0.3125, -0.078125, 0.082031, -0.020508].forEach((v, k) => expect(ys[k]).toBeCloseTo(v, 6));
  });
  it('A4: ẋ = 6x + u, J = ∫(x² + 2u²), x(0)=1, x(1)=2 → λ(0) ≈ 47.94, u°(0) ≈ −11.98, u°(1) ≈ 0.0545, J° ≈ 24.19', () => {
    const Mh: M = [[6, -0.25], [-2, -6]];
    close(mul(Mh, Mh), scale(eye(2), 36.5), 12); // M² = ω² I with ω² = 73/2
    const P1 = expm(Mh, 1); const l0 = (2 - P1[0][0]) / P1[0][1];
    expect(l0).toBeCloseTo(47.9365, 3);
    const at = (t: number) => { const P = expm(Mh, t); return [P[0][0] + P[0][1] * l0, P[1][0] + P[1][1] * l0]; };
    expect(at(1)[0]).toBeCloseTo(2, 9);
    expect(-at(0)[1] / 4).toBeCloseTo(-11.984, 2);
    expect(-at(0.5)[1] / 4).toBeCloseTo(-0.580, 2);
    expect(-at(1)[1] / 4).toBeCloseTo(0.0545, 3);
    let J = 0; const N = 4000; for (let i = 0; i < N; i++) { const [x, l] = at((i + 0.5) / N); J += (x * x + 2 * (l / 4) ** 2) / N; }
    expect(J).toBeCloseTo(24.19, 1);
    // the straight path x = 1 + t is feasible but costs more
    let Jl = 0; for (let i = 0; i < N; i++) { const t = (i + 0.5) / N; Jl += ((1 + t) ** 2 + 2 * (1 - 6 * (1 + t)) ** 2) / N; }
    expect(Jl).toBeCloseTo(136.3, 0); expect(J).toBeLessThan(Jl);
  });
});

describe('practice exam part B', () => {
  it('B1: companion A (char poly (s−1)(s+1)(s+2)), impulse response e^t/3 − e^(−t) + (5/3)e^(−2t)', () => {
    const A: M = [[0, 1, 0], [0, 0, 1], [2, 1, -2]];
    for (const l of [1, -1, -2]) expect(det(add(A, eye(3), -l))).toBeCloseTo(0, 12);
    for (const t of [0, 0.4, 1.1, 2]) {
      const y = mul([[1, 0, 1]], mul(expm(A, t), col([0, 0, 1])))[0][0];
      expect(y).toBeCloseTo(Math.exp(t) / 3 - Math.exp(-t) + (5 / 3) * Math.exp(-2 * t), 8);
    }
    // eigenvectors are (1, λ, λ²)
    for (const l of [1, -1, -2]) close(mul(A, col([1, l, l * l])), col([l, l * l, l ** 3]), 12);
  });
  it('B2: controllable for every b; input 2 alone needs b ≠ 0 and b ≠ 2/3; observable iff g ≠ 0, f+g ≠ 0, 4f+g ≠ 0', () => {
    const A: M = [[-1, 0, 0], [-2, -2, 0], [1, 1, -3]];
    for (const l of [-1, -2, -3]) expect(det(add(A, eye(3), -l))).toBeCloseTo(0, 12);
    for (const b of [-2, -1, 0, 0.5, 2 / 3, 1, 2, 3]) expect(rank(ctrb(A, [[-1, b], [1, 0], [1, 1]]))).toBe(3);
    for (const b of [0, 2 / 3]) expect(rank(ctrb(A, col([b, 0, 1])))).toBeLessThan(3);
    for (const b of [1, -1, 0.5]) expect(rank(ctrb(A, col([b, 0, 1])))).toBe(3);
    const cases: [number, number, boolean][] = [[1, 1, true], [1, -1, false], [1, -4, false], [0, 1, true], [1, 0, false], [0, 0, false], [2, 3, true]];
    for (const [f, g, ok] of cases) expect(rank(obsv(A, [[0, 0, 0], [0, f, g]])) === 3).toBe(ok);
  });
  it('B3: phase-variable realization of (6s+1)(4s+3)/(s³+8s²+19s+2) has C = [3 22 24]', () => {
    expectTf([[0, 1, 0], [0, 0, 1], [-2, -19, -8]], [0, 0, 1], [3, 22, 24], [24, 22, 3], [1, 8, 19, 2]);
  });
});

// -------------------------------------------------------------------------------------------
describe('the 21 practice variants', () => {
  it('Z1–Z3: inverse Z answers satisfy X(z) = Σ x[n] z⁻ⁿ inside their ROC', () => {
    const sumZ = (x: (k: number) => number, zz: number) => { let s = 0; for (let k = -200; k <= 200; k++) s += x(k) * zz ** -k; return s; };
    expect(sumZ((k) => -3 / 5 * (1 / 3) ** k * u(k) - 3 / 5 * 2 ** k * u(-k - 1), 1)).toBeCloseTo(1 / ((1 - 1 / 3) * (1 - 2)), 9);
    expect(sumZ((k) => (2 / 9 * (-0.5) ** (k - 1) - 2 / 9 * 4 ** (k - 1)) * u(-k), 0.3)).toBeCloseTo(1 / ((0.3 + 0.5) * (0.3 - 4)), 9);
    expect(sumZ((k) => 1 / 7 * 0.5 ** k * u(k) - 6 / 7 * (-3) ** k * u(-k - 1), 1.5)).toBeCloseTo(1.5 ** 2 / ((1.5 - 0.5) * (1.5 + 3)), 9);
  });
  it('L1–L3: convolution answers', () => {
    const conv = (h: (t: number) => number, x: (t: number) => number, t: number, a = -30, bnd = 30, dt = 1e-3) => { let s = 0; for (let tau = a; tau < bnd; tau += dt) s += h(tau + dt / 2) * x(t - tau - dt / 2) * dt; return s; };
    const st = (f: (t: number) => number) => (t: number) => (t >= 0 ? f(t) : 0);
    expect(conv(st((t) => Math.exp(-2 * t)), st((t) => Math.exp(-5 * t)), 0.8, 0, 1)).toBeCloseTo((Math.exp(-1.6) - Math.exp(-4)) / 3, 5);
    expect(conv(st((t) => t * Math.exp(-t)), st((t) => Math.exp(-t)), 1.5, 0, 2)).toBeCloseTo(1.5 ** 2 / 2 * Math.exp(-1.5), 5);
    const xl = (t: number) => (t < 0 ? Math.exp(2 * t) : 0);
    expect(conv(st((t) => Math.exp(-t)), xl, 0.7, 0, 30)).toBeCloseTo(Math.exp(-0.7) / 3, 4);
    expect(conv(st((t) => Math.exp(-t)), xl, -0.9, 0, 30)).toBeCloseTo(Math.exp(-1.8) / 3, 4);
  });
  it('D1–D3: difference equations by recursion', () => {
    const run = (a: [number, number], x: (k: number) => number, y: (k: number) => number, ic: [number, number] = [0, 0]) => { let [p, q] = ic; for (let k = 0; k < 20; k++) { const v = a[0] * p + a[1] * q + x(k); expect(v).toBeCloseTo(y(k), 12); q = p; p = v; } };
    run([5 / 6, -1 / 6], () => 1, (k) => 3 - 3 * 0.5 ** k + (1 / 3) ** k);
    run([1, -0.25], (k) => (k === 0 ? 1 : 0), (k) => (k + 1) * 0.5 ** k);
    run([0.5, 0], () => 1, (k) => 2 - 0.5 ** (k + 1), [1, 0]);
  });
  it('P1–P3: minimum-principle answers hit their boundary conditions', () => {
    // P1: ẋ = −x + u, x(0)=1, x(1)=0; M = [[−1, −½], [−2, 1]], M² = 2I
    const M1: M = [[-1, -0.5], [-2, 1]]; close(mul(M1, M1), scale(eye(2), 2), 12);
    const P = expm(M1, 1); const l0 = -P[0][0] / P[0][1]; expect(P[0][0] + P[0][1] * l0).toBeCloseTo(0, 12);
    // P2: ẋ = u, x(0)=0, x(T)=1 → u = 1/T (T = 2 → 0.5): x(T) = ∫u = 1
    expect(2 * 0.5).toBe(1);
    // P3: ẋ = 2x + u, x(1) free → λ(1) = 0; M² = 7I
    const M3: M = [[2, -0.5], [-6, -2]]; close(mul(M3, M3), scale(eye(2), 7), 12);
    const Q = expm(M3, 1); const m0 = -Q[1][0] / Q[1][1]; expect(Q[1][0] + Q[1][1] * m0).toBeCloseTo(0, 12);
  });
  it('R1–R3: realizations reproduce their transfer functions', () => {
    expectTf([[0, 1, 0], [0, 0, 1], [-6, -11, -6]], [0, 0, 1], [40, 10, 0], [10, 40], [1, 6, 11, 6]);
    expectTf([[0, 1], [-5, -4]], [0, 1], [-4, -1], [1, 3, 1], [1, 4, 5], 1);
    expectTf([[0, 1, 0], [0, 0, 1], [-2, -5, -4]], [0, 0, 1], [1, 0, 3], [3, 0, 1], [1, 4, 5, 2]);
  });
  it('CO1–CO3: controllability / observability conditions', () => {
    // CO1: controllable ⇔ b ≠ 1; observable ⇔ c₂ ≠ 0 and c₁ + c₂ ≠ 0
    const A1: M = [[-1, 0], [1, -2]];
    for (const b of [-2, 0, 0.5, 1, 3]) expect(rank(ctrb(A1, col([1, b]))) === 2).toBe(b !== 1);
    for (const [c1, c2] of [[1, 1], [1, 0], [2, -2], [0, 3], [-1, 2]]) expect(rank(obsv(A1, [[c1, c2]])) === 2).toBe(c2 !== 0 && c1 + c2 !== 0);
    // CO2: observable ⇔ c₁ ≠ 1, 2, and G = (s + c₁)/((s+1)(s+2))
    const A2: M = [[0, 1], [-2, -3]];
    for (const c1 of [0, 1, 2, 3, -1]) expect(rank(obsv(A2, [[c1, 1]])) === 2).toBe(c1 !== 1 && c1 !== 2);
    expectTf(A2, [0, 1], [3, 1], [1, 3], [1, 3, 2]);
    // CO3: det Ctrb = −b², controllable ⇔ b ≠ 0
    const A3: M = [[-1, 1], [0, -1]];
    for (const b of [0, 0.3, -2]) expect(det(ctrb(A3, col([1, b])))).toBeCloseTo(-b * b, 12);
  });
  it('E1–E3: transition matrices and impulse responses', () => {
    for (const t of [0.3, 0.9, 2]) {
      const e1 = Math.exp(-t), e2 = Math.exp(-2 * t), e3 = Math.exp(-3 * t);
      close(expm([[0, 1], [-2, -3]], t), [[2 * e1 - e2, e1 - e2], [-2 * e1 + 2 * e2, -e1 + 2 * e2]], 9);
      const h = mul([[1, 1, 0]], mul(expm([[0, 1, 0], [0, 0, 1], [-6, -11, -6]], t), col([0, 0, 1])))[0][0];
      expect(h).toBeCloseTo(e2 - e3, 9);
      const c = Math.cos(2 * t), sn = Math.sin(2 * t);
      close(expm([[0, 1], [-5, -2]], t), [[e1 * (c + sn / 2), e1 * sn / 2], [-e1 * 2.5 * sn, e1 * (c - sn / 2)]], 9);
    }
    // E2: the −1 mode is unobservable from C = [1 1 0]
    expect(rank(obsv([[0, 1, 0], [0, 0, 1], [-6, -11, -6]], [[1, 1, 0]]))).toBe(2);
  });
});

describe('the page states the numbers tested above', () => {
  const app = path.resolve(__dirname, '..');
  const read = (p: string) => fs.readFileSync(path.join(app, p), 'utf8');
  it('subject details and review pages carry the tested values', () => {
    const subj = read('subject.yaml'); const a = read('content/review/part-a.md');
    for (const v of ['717', '186', '0.28', '−0.2', '−2.2', '27 min', '5 h']) expect(subj).toContain(v);
    for (const v of ['{4}{35}', '47.9', '0.3125', '−0.003527']) expect(a).toContain(v);
  });
});

import { houseOptimalU, houseGramian, simulateHouse, HOUSE } from '../../../packages/core/src/sceneLsModels';
describe('house: least-energy warm-up to the illustrative (10, 7) K target in 3 h, and the 3-hour Gramian', () => {
  const u = houseOptimalU([0, 0], [10, 7], 3); // W
  it('heater profile: 1.78 kW at 0 h, peak ≈ 2.41 kW near 2 h, 0.97 kW at 3 h; energy ∫u² ≈ 13.43 kW²·h', () => {
    expect(u(0) / 1000).toBeCloseTo(1.7787, 3); expect(u(2) / 1000).toBeCloseTo(2.4054, 3); expect(u(3) / 1000).toBeCloseTo(0.9655, 3);
    let peak = 0, tp = 0, E = 0; const N = 3000;
    for (let i = 0; i <= N; i++) { const t = (3 * i) / N, v = u(t) / 1000; if (v > peak) { peak = v; tp = t; } if (i < N) E += (u((3 * (i + 0.5)) / N) / 1000) ** 2 * (3 / N); }
    expect(peak).toBeCloseTo(2.4057, 3); expect(tp).toBeCloseTo(1.98, 1); expect(E).toBeCloseTo(13.43, 2);
    expect(peak).toBeLessThan(HOUSE.P / 1000); // the 2.5 kW heater can deliver it
  });
  it('it lands on (10, 7) K; room 1 peaks just above the target, ≈ 10.10 K at ≈ 2.85 h (10.06 K on a 0.25 h grid at 2.75 h)', () => {
    const S = simulateHouse([0, 0], (t) => [u(t), 0], 3, 0.001);
    expect(S.x1[S.n - 1]).toBeCloseTo(10, 2); expect(S.x2[S.n - 1]).toBeCloseTo(7, 2);
    let m = 0, im = 0; for (let i = 0; i < S.n; i++) if (S.x1[i] > m) { m = S.x1[i]; im = i; }
    expect(m).toBeCloseTo(10.105, 2); expect(im * S.dt).toBeCloseTo(2.85, 1);
    expect(S.x1[2750]).toBeCloseTo(10.06, 2);
  });
  it('W(3) in K²/(kW²·h): eigenvalues 0.78 and 12.0, thin axis ≈ (0.51, −0.86), major axis ≈ 31° up; reaching costs 31.4 and 60.3 kW²·h', () => {
    const Ww = houseGramian(3), W = Ww.map((r) => r.map((v) => v * 1e6)); // per W² → per kW²
    const tr = (W[0][0] + W[1][1]) / 2, df = Math.sqrt(((W[0][0] - W[1][1]) / 2) ** 2 + W[0][1] ** 2);
    expect(tr - df).toBeCloseTo(0.782, 3); expect(tr + df).toBeCloseTo(12.011, 3);
    const v = [W[0][1], (tr - df) - W[0][0]], n = Math.hypot(v[0], v[1]); expect(Math.abs(v[0] / n)).toBeCloseTo(0.51, 2); expect(Math.abs(v[1] / n)).toBeCloseTo(0.86, 2);
    expect((Math.atan2((tr + df) - W[0][0], W[0][1]) * 180) / Math.PI).toBeCloseTo(30.6, 0);
    const E = (x: number[]) => { const d = W[0][0] * W[1][1] - W[0][1] ** 2; return (W[1][1] * x[0] * x[0] - 2 * W[0][1] * x[0] * x[1] + W[0][0] * x[1] * x[1]) / d; };
    expect(E([10, 10])).toBeCloseTo(31.36, 1); expect(E([5, -5])).toBeCloseTo(60.26, 1); expect(E([10, 7])).toBeCloseTo(13.43, 2);
  });
});

describe('leakage vs damping (window and DFT dives)', () => {
  const k = 1 / 0.587e-3, m = 0.084e-3, R = 0.173 + 0.545 ** 2 / 7.47;
  it('the click ring has died to ≈ 4 × 10⁻⁵ after 64 samples at 8 kHz, and its spectrum is ≈ 400–850 Hz wide (peak ≈ 660 Hz)', () => {
    expect(Math.exp((-R / (2 * m)) * 0.008)).toBeCloseTo(3.98e-5, 6);
    const mag = (f: number) => { const w = 2 * Math.PI * f; return k / Math.hypot(k - m * w * w, R * w); };
    let pk = 0, fp = 0; for (let f = 1; f < 3000; f += 0.5) if (mag(f) > pk) { pk = mag(f); fp = f; }
    expect(fp).toBeCloseTo(657.6, 0);
    let lo = 0, hi = 0; for (let f = 1; f < 3000; f += 0.5) if (mag(f) >= pk / Math.SQRT2) { if (!lo) lo = f; hi = f; }
    expect(lo).toBeGreaterThan(390); expect(lo).toBeLessThan(410); expect(hi).toBeGreaterThan(835); expect(hi).toBeLessThan(850);
  });
  it('a steady 690 Hz hum, 64 samples at 8 kHz: bins 5 and 6 read −4.7 and −3.2 dB; exactly halfway (687.5 Hz) both read −3.9 dB', () => {
    const bins = (f: number) => [5, 6].map((kk) => { let re = 0, im = 0; for (let n = 0; n < 64; n++) { const x = Math.cos((2 * Math.PI * f * n) / 8000), a = (-2 * Math.PI * kk * n) / 64; re += x * Math.cos(a); im += x * Math.sin(a); } return 20 * Math.log10(Math.hypot(re, im) / 32); });
    const [b5, b6] = bins(690); expect(b5).toBeCloseTo(-4.7, 1); expect(b6).toBeCloseTo(-3.24, 1);
    // one-sided (complex) tone exactly halfway: sinc(½) = 2/π → −3.92 dB on both bins
    expect(20 * Math.log10(2 / Math.PI)).toBeCloseTo(-3.92, 2);
  });
});

describe('house difference mode (Φ wording)', () => {
  it('τ = 1/2.2 h ≈ 27 min, and e^(−2.2·1) ≈ 0.11, so about 90% of the gap is gone in 1 h', () => {
    expect(60 / 2.2).toBeCloseTo(27.3, 1);
    expect(1 - Math.exp(-2.2)).toBeCloseTo(0.889, 3);
  });
});

import * as ex from '../src/figs/ex';
describe('figure models (src/figs/ex.ts): numbers the live figures draw', () => {
  it('speaker in ms units: a₀ = 20.28 (1/ms)², a₁ = 2.533 /ms, ζ = 0.281, ring 688 Hz, poles −1.266 ± 4.32j /ms', () => {
    const p = ex.spk();
    expect(p.a0).toBeCloseTo(20.28, 2); expect(p.a1).toBeCloseTo(2.533, 3); expect(p.zeta).toBeCloseTo(0.281, 3);
    expect(p.fd).toBeCloseTo(687.8, 1); expect(p.poles[0][0]).toBeCloseTo(-1.266, 3); expect(p.poles[0][1]).toBeCloseTo(4.322, 3);
    expect(ex.DAMP_CRIT).toBeCloseTo(3.556, 3); expect(ex.UM_PER_V).toBeCloseTo(42.8, 1);
  });
  it('h(t) integrates to the DC gain 1 and matches its two pole terms; the residue is a₀/(2j ω_d)', () => {
    let s = 0; for (let t = 0; t < 12; t += 0.001) s += ex.hImp(t) * 0.001; expect(s).toBeCloseTo(1, 2);
    for (const d of [1, ex.DAMP_CRIT, 5]) for (const t of [0.3, 1, 2.5]) { const [a, b] = ex.hTerms(t, d); expect(a + b).toBeCloseTo(ex.hImp(t, d), 9); }
    const c = ex.residue(); expect(c[0]).toBeCloseTo(0, 9); expect(c[1]).toBeCloseTo(-20.28 / (2 * 4.3216), 3);
  });
  it('|H| peaks near 658 Hz, −3 dB band ≈ 394–842 Hz; at 690 Hz (just below the 717 Hz natural frequency) the cone lags by about 82°', () => {
    const b = ex.peakBand(); expect(b.fPeak).toBeCloseTo(657.5, 0); expect(b.lo).toBeCloseTo(394, -1); expect(b.hi).toBeCloseTo(842, -1);
    const H = ex.Hf(690); expect((Math.atan2(H[1], H[0]) * 180) / Math.PI).toBeCloseTo(-82.3, 0);
  });
  it('digital model at 8 kHz: r = 0.854, θ = 0.540 rad (688 Hz); the difference equation reproduces T·h(nT) and its DTFT closed form', () => {
    const d = ex.ringDigital(8); expect(d.r).toBeCloseTo(0.8536, 4); expect(d.th).toBeCloseTo(0.5402, 4);
    const imp = [1, ...Array(30).fill(0)], y = ex.diffEq(imp);
    for (let n = 0; n < 30; n++) expect(y[n]).toBeCloseTo(ex.ringSample(n), 9);
    for (const Om of [0.2, 0.54, 1.5]) { let re = 0, im = 0; for (let n = 0; n < 400; n++) { const x = ex.ringSample(n); re += x * Math.cos(Om * n); im -= x * Math.sin(Om * n); } const X = ex.ringDTFT(Om); expect(X[0]).toBeCloseTo(re, 6); expect(X[1]).toBeCloseTo(im, 6); }
  });
  it('steady hum DFT, 64 samples at 8 kHz: 750 Hz is one 0 dB spike; 690 Hz reads −4.7 / −3.2 dB in bins 5 / 6', () => {
    const on = ex.humDFT(750); expect(on[6]).toBeCloseTo(1, 6); expect(on[5]).toBeLessThan(1e-9);
    const off = ex.humDFT(690); expect(ex.dB(off[5])).toBeCloseTo(-4.70, 1); expect(ex.dB(off[6])).toBeCloseTo(-3.24, 1);
    const hn = ex.humDFT(690, 64, 8000, true); expect(ex.dB(hn[12])).toBeLessThan(ex.dB(off[12]) - 20); // Hann: far skirts much lower
  });
  it('aliasing at 8 kHz and the square wave’s Parseval shares', () => {
    expect(ex.aliasOf(6500, 8000)).toBe(1500); expect(ex.aliasOf(690, 8000)).toBe(690); expect(ex.aliasOf(7310, 8000)).toBe(690);
    expect(ex.squarePowerShare(1)).toBeCloseTo(0.8106, 4); expect(ex.squarePowerShare(3)).toBeCloseTo(0.9006, 4); expect(ex.squarePowerShare(2001)).toBeCloseTo(1, 3);
  });
  it('house: B = (3.6, 0) K/h per kW, modes −0.2 and −2.2 /h, Cayley–Hamilton e^{At} = α₀I + α₁A equals the modal form', () => {
    expect(ex.heaterB(1)).toEqual([3.6, 0]); expect(ex.houseEig()).toEqual({ avg: -0.2, diff: -2.2 });
    for (const t of [0, 0.5, 1, 3]) { const P = ex.expm2(ex.houseA(), t), Q = ex.houseExpm(t); for (const i of [0, 1]) for (const j of [0, 1]) expect(P[i][j]).toBeCloseTo(Q[i][j], 10); }
    const c = ex.cayley(ex.houseA(), 1); expect(c.a1).toBeCloseTo((Math.exp(-0.2) - Math.exp(-2.2)) / 2, 10); expect(c.a0).toBeCloseTo((-0.2 * Math.exp(-2.2) + 2.2 * Math.exp(-0.2)) / 2, 10);
    const cx = ex.expm2([[0, 1], [-4, 0]], Math.PI / 4); expect(cx[0][1]).toBeCloseTo(0.5, 10); // complex branch: sin(2t)/2
  });
  it('house controllability/observability: heater split ½ or sensor ½ loses the difference mode; det [B, AB] = 12.96(1 − 2s)·… ', () => {
    expect(ex.ctrb(1).det).toBeCloseTo(12.96, 6); expect(ex.ctrb(0.5).det).toBeCloseTo(0, 10);
    expect(ex.obsv(1).det).toBeCloseTo(1, 10); expect(ex.obsv(0.5).det).toBeCloseTo(0, 10);
    const m = ex.modeWeights(0.5, 0.5); expect(m.bDiff).toBe(0); expect(m.cDiff).toBe(0); expect(ex.modeWeights(1, 1).bDiff).toBeCloseTo(1.8, 10);
  });
  it('house Gramian and least energy (in kW): W(3 h) eigenvalues 0.782 / 12.01, thin axis (0.51, −0.86); (10, 7) K costs 13.43 kW²·h', () => {
    const W = ex.gramian(3); expect(W[0][0]).toBeCloseTo(9.0947, 3); expect(W[0][1]).toBeCloseTo(4.924, 3); expect(W[1][1]).toBeCloseTo(3.6987, 3);
    const e = ex.symEig(W); expect(e.l[0]).toBeCloseTo(0.782, 3); expect(e.l[1]).toBeCloseTo(12.011, 2);
    expect(Math.abs(e.v[0][0])).toBeCloseTo(0.51, 2); expect(Math.abs(e.v[0][1])).toBeCloseTo(0.86, 2); expect(e.v[0][0] * e.v[0][1]).toBeLessThan(0);
    expect(ex.reachCost([10, 7], 3)).toBeCloseTo(13.43, 2); expect(ex.reachCost([10, 10], 3)).toBeCloseTo(31.36, 1); expect(ex.reachCost([5, -5], 3)).toBeCloseTo(60.26, 1);
    const u = ex.leastEnergyU([10, 7], 3); expect(u(0)).toBeCloseTo(1.7787, 3); expect(u(3)).toBeCloseTo(0.9655, 3);
    const s = ex.simHouse(ex.houseA(), ex.heaterB(1), u, [0, 0], 3, 600), xT = s.x[s.x.length - 1]; expect(xT[0]).toBeCloseTo(10, 3); expect(xT[1]).toBeCloseTo(7, 3);
  });
  it('thermostat loop u = −kp·T₁ is unstable for kp < −0.102 kW/K (a heater wired backwards)', () => {
    expect(ex.KP_UNSTABLE).toBeCloseTo(-0.1019, 4);
    expect(ex.eigs(ex.thermostatA(-0.09))[0][0]).toBeLessThan(0); expect(ex.eigs(ex.thermostatA(-0.11))[0][0]).toBeGreaterThan(0);
    expect(ex.eigs(ex.thermostatA(0.5)).map((l) => +l[0].toFixed(3))).toEqual([-0.755, -3.445]);
  });
});

describe('figure captions (figures.yaml) state these', () => {
  const ph = (H: number[]) => (Math.atan2(H[1], H[0]) * 180) / Math.PI;
  it('speaker gain/lag: 200 Hz ×1.07 / 10°, 690 Hz ×1.83 / 82°, 2 kHz ×0.14 / 167°; peak +5.4 dB', () => {
    expect(ex.cabs(ex.Hf(200))).toBeCloseTo(1.069, 2); expect(ph(ex.Hf(200))).toBeCloseTo(-9.7, 0);
    expect(ex.cabs(ex.Hf(690))).toBeCloseTo(1.83, 2); expect(ex.cabs(ex.Hf(2000))).toBeCloseTo(0.144, 2); expect(ph(ex.Hf(2000))).toBeCloseTo(-167, 0);
    expect(ex.dB(ex.peakBand().peak)).toBeCloseTo(5.36, 1);
  });
  it('house: α₀(1 h) = 0.890, α₁(1 h) = 0.354; (10, 10) K in 3 h needs a 3.8 kW peak, (10, 7) K in 1.5 h 5.6 kW and 28.9 kW²·h', () => {
    const a = ex.cayley(ex.houseA(), 1); expect(a.a0).toBeCloseTo(0.8895, 4); expect(a.a1).toBeCloseTo(0.354, 3);
    const peak = (d: [number, number], T: number) => { const u = ex.leastEnergyU(d, T); let m = 0; for (let t = 0; t <= T + 1e-9; t += 0.005) m = Math.max(m, u(t)); return m; };
    expect(peak([10, 10], 3)).toBeCloseTo(3.80, 1); expect(peak([10, 7], 1.5)).toBeCloseTo(5.56, 1); expect(ex.reachCost([10, 7], 1.5)).toBeCloseTo(28.93, 1);
    expect(ex.aliasOf(690, 1200)).toBe(510); expect(ex.residue()[1]).toBeCloseTo(-2.346, 3); expect(ex.spk(-0.3).poles[0][0]).toBeCloseTo(0.38, 2);
  });
});
