/**
 * State-feedback design on small dense matrices (SISO): controllability / observability matrices, Ackermann's formula,
 * observer gain by duality, the reference gain N̄, and a simulator for u = −K x̂ + N̄ r with a Luenberger observer.
 * Pure and dependency-free so content tests can check worked numbers against it.
 */
import type { Cx } from './complex';
import { polyFromRoots } from './tf';
import { type Mat, eye, matMul, matAdd, matScale, ctrbMatrix, obsvMatrix } from './lti';

const transpose = (a: Mat): Mat => a[0].map((_, j) => a.map((r) => r[j]));
const plus = (a: Mat, b: Mat, kb = 1): Mat => matAdd(a, matScale(b, kb));
/** column vector from a list */

export function det(a: Mat): number {
  const n = a.length, m = a.map((r) => r.slice()); let d = 1;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-14) return 0;
    if (p !== c) { [m[p], m[c]] = [m[c], m[p]]; d = -d; }
    d *= m[c][c];
    for (let r = c + 1; r < n; r++) { const f = m[r][c] / m[c][c]; for (let k = c; k < n; k++) m[r][k] -= f * m[c][k]; }
  }
  return d;
}
export function inv(a: Mat): Mat {
  const n = a.length, m = a.map((r, i) => [...r, ...eye(n)[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-14) throw new Error('singular matrix');
    [m[p], m[c]] = [m[c], m[p]];
    const d = m[c][c]; for (let k = 0; k < 2 * n; k++) m[c][k] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = m[r][c]; for (let k = 0; k < 2 * n; k++) m[r][k] -= f * m[c][k]; }
  }
  return m.map((r) => r.slice(n));
}

/** Pc = [B AB … A^(n−1)B] (B is n×1). */
export const ctrb = (A: Mat, B: Mat): Mat => ctrbMatrix(A, B.map((r) => r[0]));
/** Po = [C; CA; …; CA^(n−1)] (C is 1×n). */
export const obsv = (A: Mat, Cm: Mat): Mat => obsvMatrix(A, Cm[0]);
/** q(A) for a monic polynomial q (descending coefficients, q[0] = 1). */
export function polyOfMat(q: number[], A: Mat): Mat {
  let R = matScale(eye(A.length), 0);
  for (const c of q) R = matAdd(matMul(R, A), matScale(eye(A.length), c));
  return R;
}
/** Ackermann: K = [0 … 0 1] Pc⁻¹ q(A), placing the eigenvalues of A − BK at `poles`. Returns K as a row (length n). */
export function acker(A: Mat, B: Mat, poles: Cx[]): number[] {
  const n = A.length, q = polyFromRoots(poles), e = [Array.from({ length: n }, (_, i) => (i === n - 1 ? 1 : 0))];
  return matMul(matMul(e, inv(ctrb(A, B))), polyOfMat(q, A))[0];
}
/** Observer gain L (column, length n) placing the eigenvalues of A − LC at `poles` (duality: acker on Aᵀ, Cᵀ). */
export function observerGain(A: Mat, Cm: Mat, poles: Cx[]): number[] {
  return acker(transpose(A), transpose(Cm), poles);
}
/** N̄ such that the DC gain from r to y of ẋ = (A − BK)x + B N̄ r, y = Cx is 1. */
export function refGain(A: Mat, B: Mat, Cm: Mat, K: number[]): number {
  const Acl = plus(A, matMul(B, [K]), -1), dc = matMul(matMul(Cm, inv(Acl)), B)[0][0];
  return -1 / dc;
}
/** Characteristic polynomial coefficients of a 2×2 or 3×3 matrix via Faddeev–LeVerrier (descending, monic). */
export function charPoly(A: Mat): number[] {
  const n = A.length; let M = eye(n); const c = [1];
  for (let k = 1; k <= n; k++) {
    const AM = matMul(A, M), ck = -AM.reduce((s, r, i) => s + r[i], 0) / k;
    c.push(ck); M = matAdd(AM, matScale(eye(n), ck));
  }
  return c;
}

export interface SfbRun { t: number[]; x: number[][]; xh: number[][]; u: number[] }
/**
 * Simulate ẋ = Ax + Bu, y = Cx (+ optional sensor noise) under u = −K·(x̂ or x) + N̄·r, with a Luenberger observer
 * x̂' = Ax̂ + Bu + L(y − Cx̂). `useEstimate: false` feeds back the true state (full-state feedback) while the observer still runs.
 */
export function simulateSfb(o: { A: Mat; B: Mat; C: Mat; K: number[]; L?: number[]; Nbar?: number; r?: (t: number) => number; x0: number[]; xh0?: number[]; useEstimate?: boolean; T: number; dt?: number; noise?: number; seed?: number }): SfbRun {
  const n = o.A.length, dt = o.dt ?? 0.002, steps = Math.round(o.T / dt), L = o.L ?? new Array(n).fill(0), Nb = o.Nbar ?? 0, r = o.r ?? (() => 0);
  let x = o.x0.slice(), xh = (o.xh0 ?? o.x0).slice(), s = (o.seed ?? 7) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 - 0.5; };
  const out: SfbRun = { t: [], x: [], xh: [], u: [] };
  const fx = (xx: number[], u: number) => o.A.map((row, i) => row.reduce((a, v, j) => a + v * xx[j], 0) + o.B[i][0] * u);
  for (let k = 0; k <= steps; k++) {
    const t = k * dt, fb = o.useEstimate === false ? x : xh, u = -o.K.reduce((a, v, j) => a + v * fb[j], 0) + Nb * r(t);
    const y = o.C[0].reduce((a, v, j) => a + v * x[j], 0) + (o.noise ? o.noise * 2 * rnd() : 0), yh = o.C[0].reduce((a, v, j) => a + v * xh[j], 0);
    out.t.push(t); out.x.push(x.slice()); out.xh.push(xh.slice()); out.u.push(u);
    // RK4 on the plant (u held over the step), Euler-consistent observer with the same held u and y
    const k1 = fx(x, u), k2 = fx(x.map((v, i) => v + (dt / 2) * k1[i]), u), k3 = fx(x.map((v, i) => v + (dt / 2) * k2[i]), u), k4 = fx(x.map((v, i) => v + dt * k3[i]), u);
    const gh = (z: number[]) => { const f = fx(z, u), e = y - o.C[0].reduce((a, v, j) => a + v * z[j], 0); return f.map((v, i) => v + L[i] * e); };
    const h1 = gh(xh), h2 = gh(xh.map((v, i) => v + (dt / 2) * h1[i])), h3 = gh(xh.map((v, i) => v + (dt / 2) * h2[i])), h4 = gh(xh.map((v, i) => v + dt * h3[i]));
    x = x.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    xh = xh.map((v, i) => v + (dt / 6) * (h1[i] + 2 * h2[i] + 2 * h3[i] + h4[i]));
    void yh;
  }
  return out;
}
