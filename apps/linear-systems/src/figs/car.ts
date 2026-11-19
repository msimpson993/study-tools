/**
 * Running example for the state half: a car on its suspension, seen from the side ("half car").
 * Body = mass m with pitch inertia J; front spring+shock at x = +a, rear at x = −b from the centre of gravity (CG).
 * z = heave (m, + up), θ = pitch (rad, + nose-up); a body point at x moves z + x·θ.
 * Assumptions: small angles, linear springs and shocks, rigid tyres, no wheel mass (valid up to about 5 Hz).
 * Tutor's parameter sets (Nov 18 2026); every number the page states is re-derived from these in test/car.test.ts.
 */
export type CarP = { m: number; J: number; a: number; b: number; kf: number; kr: number; cf: number; cr: number };
export const CAR: CarP = { m: 1400, J: 2000, a: 1.2, b: 1.5, kf: 38000, kr: 42000, cf: 3040, cr: 3360 };
/** symmetric set (kf·a = kr·b, cf·a = cr·b): ONLY for the push-at-centre / sensor-at-centre story */
export const CAR_SYM: CarP = { m: 1400, J: 2000, a: 1.2, b: 1.5, kf: 44000, kr: 35200, cf: 3300, cr: 2640 };
export const worn = (p: CarP, k = 0.2): CarP => ({ ...p, cf: p.cf * k, cr: p.cr * k });
export const DEG = 180 / Math.PI;

export type Mat = number[][];
export type C = [number, number];
const cm = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cd = (a: C, b: C): C => { const q = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / q, (a[1] * b[0] - a[0] * b[1]) / q]; };
const cadd = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]];
const csub = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]];
export const cabs = (a: C) => Math.hypot(a[0], a[1]);

/** 2×2 mass, stiffness and damping matrices in (z, θ) */
export function mck(p: CarP) {
  const K = [[p.kf + p.kr, p.kf * p.a - p.kr * p.b], [p.kf * p.a - p.kr * p.b, p.kf * p.a ** 2 + p.kr * p.b ** 2]];
  const Cm = [[p.cf + p.cr, p.cf * p.a - p.cr * p.b], [p.cf * p.a - p.cr * p.b, p.cf * p.a ** 2 + p.cr * p.b ** 2]];
  return { M: [p.m, p.J], K, C: Cm };
}
/** state x = [z, θ, ż, θ̇]: ẋ = A x + B u */
export function carA(p: CarP): Mat {
  const { M, K, C: D } = mck(p);
  return [[0, 0, 1, 0], [0, 0, 0, 1],
    [-K[0][0] / M[0], -K[0][1] / M[0], -D[0][0] / M[0], -D[0][1] / M[0]],
    [-K[1][0] / M[1], -K[1][1] / M[1], -D[1][0] / M[1], -D[1][1] / M[1]]];
}
/** input matrix for vertical forces at body points xs (N, + up) */
export const forceB = (p: CarP, xs: number[]): Mat => [xs.map(() => 0), xs.map(() => 0), xs.map(() => 1 / p.m), xs.map((x) => x / p.J)];
/** road inputs [uf, ur, u̇f, u̇r] (wheel heights, m and m/s) */
export function roadB(p: CarP): Mat {
  return [[0, 0, 0, 0], [0, 0, 0, 0],
    [p.kf / p.m, p.kr / p.m, p.cf / p.m, p.cr / p.m],
    [p.kf * p.a / p.J, -p.kr * p.b / p.J, p.cf * p.a / p.J, -p.cr * p.b / p.J]];
}

/** roots of the quartic det(M s² + C s + K) by Durand–Kerner */
function quarticRoots(c: number[]): C[] {
  const n = c.length - 1, lead = c[0], a = c.map((v) => v / lead);
  const f = (s: C): C => a.reduce<C>((acc, v) => cadd(cm(acc, s), [v, 0]), [0, 0]);
  let r: C[] = Array.from({ length: n }, (_, k) => { const ang = (2 * Math.PI * k) / n + 0.4; return [9 * Math.cos(ang), 9 * Math.sin(ang)]; });
  for (let it = 0; it < 500; it++) {
    r = r.map((ri, i) => { let den: C = [1, 0]; r.forEach((rj, j) => { if (j !== i) den = cm(den, csub(ri, rj)); }); return csub(ri, cd(f(ri), den)); });
  }
  return r;
}
export type Mode = { s: C; fn: number; fd: number; zeta: number; thPerZ: C; node: number };
/** the two modes (upper-half-plane poles), sorted bounce (lower fn) first. node = body point that does not move (m from CG, + forward) */
export function carModes(p: CarP): Mode[] {
  const { M, K, C: D } = mck(p);
  const pm = (x: number[], y: number[]) => [x[0] * y[0], x[0] * y[1] + x[1] * y[0], x[0] * y[2] + x[1] * y[1] + x[2] * y[0], x[1] * y[2] + x[2] * y[1], x[2] * y[2]];
  const d1 = pm([M[0], D[0][0], K[0][0]], [M[1], D[1][1], K[1][1]]), d2 = pm([0, D[0][1], K[0][1]], [0, D[0][1], K[0][1]]);
  const roots = quarticRoots(d1.map((v, i) => v - d2[i])).filter((s) => s[1] > 0);
  const modes = roots.map((s) => {
    const wn = cabs(s);
    const off: C = [D[0][1] * s[0] + K[0][1], D[0][1] * s[1]];
    const diag: C = cadd(cadd(cm([M[0], 0], cm(s, s)), [D[0][0] * s[0], D[0][0] * s[1]]), [K[0][0], 0]);
    let thPerZ: C, node: number;
    if (cabs(off) < 1e-9) {
      // decoupled (symmetric car): heave-only or pitch-only
      const isHeave = cabs(diag) < 1e-6 * K[0][0];
      thPerZ = isHeave ? [0, 0] : [Infinity, 0]; node = isHeave ? Infinity : 0;
    } else { thPerZ = cd([-diag[0], -diag[1]], off); node = -cd([1, 0], thPerZ)[0]; }
    return { s, fn: wn / (2 * Math.PI), fd: s[1] / (2 * Math.PI), zeta: -s[0] / wn, thPerZ, node };
  });
  return modes.sort((x, y) => x.fn - y.fn);
}
/** heave and pitch response to a sine of the FRONT wheel height (m per m, rad per m) */
export function frontFR(p: CarP, fHz: number): { z: C; th: C } {
  const { M, K, C: D } = mck(p); const w = 2 * Math.PI * fHz;
  const A11: C = [K[0][0] - M[0] * w * w, D[0][0] * w], A12: C = [K[0][1], D[0][1] * w], A22: C = [K[1][1] - M[1] * w * w, D[1][1] * w];
  const r1: C = [p.kf, p.cf * w], r2: C = [p.kf * p.a, p.cf * p.a * w];
  const det = csub(cm(A11, A22), cm(A12, A12));
  return { z: cd(csub(cm(r1, A22), cm(A12, r2)), det), th: cd(csub(cm(A11, r2), cm(A12, r1)), det) };
}
/** local maxima of |G(f)| on a fine grid */
export function peaks(g: (f: number) => number, f0 = 0.05, f1 = 10, n = 20000): { f: number; g: number }[] {
  const out: { f: number; g: number }[] = []; let a = g(f0), b = g(f0 + (f1 - f0) / n);
  for (let i = 2; i <= n; i++) { const f = f0 + ((f1 - f0) * i) / n, c = g(f); if (b > a && b > c) out.push({ f: f - (f1 - f0) / n, g: b }); a = b; b = c; }
  return out;
}

// ---- small dense linear algebra ----
export const mmul = (a: Mat, b: Mat): Mat => a.map((r) => b[0].map((_, j) => r.reduce((s, v, k) => s + v * b[k][j], 0)));
export const mvec = (a: Mat, v: number[]) => a.map((r) => r.reduce((s, x, k) => s + x * v[k], 0));
export const T = (a: Mat): Mat => a[0].map((_, j) => a.map((r) => r[j]));
const madd = (a: Mat, b: Mat, k = 1): Mat => a.map((r, i) => r.map((v, j) => v + k * b[i][j]));
const mscale = (a: Mat, k: number): Mat => a.map((r) => r.map((v) => v * k));
const eye = (n: number): Mat => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)));
export function expm(A: Mat, t = 1): Mat {
  const At = mscale(A, t), nrm = Math.max(...At.map((r) => r.reduce((s, v) => s + Math.abs(v), 0)));
  const sq = Math.max(0, Math.ceil(Math.log2(nrm + 1e-300)) + 1), X = mscale(At, 2 ** -sq);
  let term = eye(A.length), sum = eye(A.length);
  for (let k = 1; k < 24; k++) { term = mscale(mmul(term, X), 1 / k); sum = madd(sum, term); }
  for (let i = 0; i < sq; i++) sum = mmul(sum, sum);
  return sum;
}
export function solve(A: Mat, b: number[]): number[] {
  const n = b.length, m = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(m[i][c]) > Math.abs(m[p][c])) p = i;
    [m[c], m[p]] = [m[p], m[c]];
    for (let i = c + 1; i < n; i++) { const f = m[i][c] / m[c][c]; for (let j = c; j <= n; j++) m[i][j] -= f * m[c][j]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = m[i][n]; for (let j = i + 1; j < n; j++) s -= m[i][j] * x[j]; x[i] = s / m[i][i]; }
  return x;
}
/** numerical rank with column scaling (columns normalised first) */
export function rank(a: Mat, tol = 1e-8): number {
  const cols = T(a).map((c) => { const n = Math.hypot(...c); return n > 1e-300 ? c.map((v) => v / n) : c.map(() => 0); });
  const m = T(cols).map((r) => r.slice()); let r = 0;
  for (let c = 0; c < m[0].length && r < m.length; c++) {
    let p = r; for (let i = r + 1; i < m.length; i++) if (Math.abs(m[i][c]) > Math.abs(m[p][c])) p = i;
    if (Math.abs(m[p][c]) < tol) continue;
    [m[r], m[p]] = [m[p], m[r]];
    for (let i = 0; i < m.length; i++) if (i !== r) { const f = m[i][c] / m[r][c]; for (let j = c; j < m[0].length; j++) m[i][j] -= f * m[r][j]; }
    r++;
  }
  return r;
}
export function ctrbM(A: Mat, B: Mat): Mat { let P = B; const blocks = [B]; for (let i = 1; i < A.length; i++) { P = mmul(A, P); blocks.push(P); } return A.map((_, i) => blocks.flatMap((bl) => bl[i])); }
export function obsvM(A: Mat, Cm: Mat): Mat { let P = Cm; const rows = [...Cm]; for (let i = 1; i < A.length; i++) { P = mmul(P, A); rows.push(...P); } return rows; }

/** controllability Gramian W(T) = ∫₀ᵀ e^{Aτ}BBᵀe^{Aᵀτ}dτ (RK4 on Ẇ = AW + WAᵀ + BBᵀ) */
export function gramian(A: Mat, B: Mat, Tend: number, n = 2000): Mat {
  const BB = mmul(B, T(B)); const f = (W: Mat) => madd(madd(mmul(A, W), mmul(W, T(A))), BB);
  let W = A.map((r) => r.map(() => 0)); const h = Tend / n;
  for (let i = 0; i < n; i++) { const k1 = f(W), k2 = f(madd(W, k1, h / 2)), k3 = f(madd(W, k2, h / 2)), k4 = f(madd(W, k3, h)); W = madd(W, madd(madd(k1, k4), madd(k2, k3), 2), h / 6); }
  return W;
}
/** least-energy input from x0 to rest at time T: u(t) = −Bᵀe^{Aᵀ(T−t)}W⁻¹e^{AT}x0 */
export function minEnergy(p: CarP, xs: number[], x0: number[], Tend: number) {
  const A = carA(p), B = forceB(p, xs), W = gramian(A, B, Tend), E = expm(A, Tend), Ex0 = mvec(E, x0);
  const eta = solve(W, Ex0.map((v) => -v));
  const u = (t: number) => mvec(T(B), mvec(T(expm(A, Tend - t)), eta));
  const energy = -Ex0.reduce((s, v, i) => s + v * eta[i], 0);
  return { u, energy, W, A, B };
}

/** RK4 simulation of ẋ = Ax + B·u(t) */
export function sim(A: Mat, B: Mat, u: (t: number) => number[], x0: number[], Tend: number, dt = 5e-4) {
  const f = (t: number, x: number[]) => { const ax = mvec(A, x), bu = mvec(B, u(t)); return ax.map((v, i) => v + bu[i]); };
  const ts = [0], xs = [x0.slice()]; let x = x0.slice();
  const n = Math.round(Tend / dt);
  for (let i = 0; i < n; i++) {
    const t = i * dt, k1 = f(t, x), k2 = f(t + dt / 2, x.map((v, j) => v + (dt / 2) * k1[j])), k3 = f(t + dt / 2, x.map((v, j) => v + (dt / 2) * k2[j])), k4 = f(t + dt, x.map((v, j) => v + dt * k3[j]));
    x = x.map((v, j) => v + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); ts.push(t + dt); xs.push(x.slice());
  }
  return { ts, xs };
}
/** 5 cm raised-cosine bump, 1 m long, at 15 m/s: front wheel at t = 0, rear wheel (a + b)/v later */
export const BUMP = { h: 0.05, len: 1, v: 15 };
export function bumpInput(p: CarP, bp = BUMP, rear = true) {
  const Tb = bp.len / bp.v, Td = (p.a + p.b) / bp.v;
  const one = (t: number): [number, number] => (t >= 0 && t <= Tb ? [(bp.h / 2) * (1 - Math.cos((2 * Math.PI * t) / Tb)), (bp.h / 2) * ((2 * Math.PI) / Tb) * Math.sin((2 * Math.PI * t) / Tb)] : [0, 0]);
  return { Td, Tb, u: (t: number) => { const [f, fd] = one(t), [r, rd] = rear ? one(t - Td) : [0, 0]; return [f, r, fd, rd]; } };
}
export function bumpResponse(p: CarP, Tend = 4, rear = true, dt = 5e-4) { const { u, Td } = bumpInput(p, BUMP, rear); return { ...sim(carA(p), roadB(p), u, [0, 0, 0, 0], Tend, dt), Td }; }
/** classic second-order figures for a damping ratio */
export const overshoot = (z: number) => 100 * Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z));
export const cyclesTo5pct = (z: number) => Math.log(20) / ((2 * Math.PI * z) / Math.sqrt(1 - z * z));
/** z-plane image of a pole at sample rate fs */
export const zPole = (s: C, fs: number) => ({ r: Math.exp(s[0] / fs), deg: (s[1] / fs) * DEG });
