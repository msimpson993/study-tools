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
  it('1.5 kW heater with C_th = 1 MJ/K settles at (14.7, 12.3) K above outdoors', () => {
    const b = 1500 * 3600 / 1e6; // K/h per room-1 input
    const dt = det(A); const x = [(-(A[1][1]) * b) / dt, (A[1][0] * b) / dt]; // −A⁻¹ B u
    expect(x[0]).toBeCloseTo(14.73, 2); expect(x[1]).toBeCloseTo(12.27, 2);
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
