/**
 * Continuous-time transfer functions, polynomials, time responses and step metrics.
 *
 * CONVENTIONS (read these before using the API)
 *  - A polynomial is a number[] with the HIGHEST power first: [1, 3, 2] = s² + 3s + 2 (MATLAB order).
 *  - A transfer function is G(s) = num(s)/den(s) as `TF {num, den}`. `tf()` trims leading zeros and makes `den` monic
 *    (the gain moves into `num`). Everything here is single-input single-output, continuous time, real coefficients.
 *  - Phase is in degrees and UNWRAPPED (continuous in ω), starting from the principal value at the first frequency.
 *    Magnitude is linear, `magDb = 20·log10|G|`. Frequencies are rad/s unless a name says Hz.
 *  - State space is controllable canonical form; `lsim`/`step`/`impulse` discretise it with the EXACT zero-order-hold
 *    map Ad = e^{A·dt}, so a step input is simulated exactly (not Euler/RK error). A non-constant input is treated as
 *    piecewise constant between samples (first-order accurate; use a small dt).
 *  - `stepMetrics`/`stepinfo` follow MATLAB's definitions: rise time 10→90 % of the final value, settling time = last
 *    time the response is outside ±2 % of the final value, overshoot relative to the final value.
 *
 * NUMERIC LIMITS
 *  - Root finding (Aberth–Ehrlich + Newton polish) is for low/moderate degree (≲ 12) with well-scaled coefficients.
 *    A root of multiplicity m is only accurate to about ε^(1/m) (e.g. (s+1)³ gives ~1e-5), which is normal for any
 *    double-precision polynomial root finder. Conjugate pairs are returned exactly symmetric.
 *  - Improper TFs (deg num > deg den) have a frequency response but no state space; `tf2ss`, `step`, `impulse`, `lsim` throw.
 *    A biproper TF (D ≠ 0) has an impulse response with a Dirac term D·δ(t); `impulse` omits it (documented, not hidden).
 *  - No pure delays (use a Padé approximation yourself); no MIMO; no discrete time.
 */
import { C, cadd, cmul, cdiv, cabs, TAU, type Cx } from './complex';
import { expm, type Mat } from './lti';

export type Poly = number[];
export interface TF { num: Poly; den: Poly }
export interface SS { A: Mat; B: number[]; C: number[]; D: number }

export class TFError extends Error { constructor(msg: string) { super(msg); this.name = 'TFError'; } }

const assertFinitePoly = (p: Poly, what: string) => {
  if (!Array.isArray(p) || p.length === 0) throw new TFError(`${what}: polynomial must be a non-empty array`);
  for (const c of p) if (typeof c !== 'number' || !Number.isFinite(c)) throw new TFError(`${what}: coefficients must be finite numbers`);
};

/* ───────────────────────── polynomials ───────────────────────── */
/** Drop leading coefficients with |c| ≤ tol (default exactly zero); never returns an empty array ([0] for the zero polynomial). */
export function polyTrim(p: Poly, tol = 0): Poly { let i = 0; while (i < p.length - 1 && Math.abs(p[i]) <= tol) i++; return p.slice(i); }
export function polyAdd(a: Poly, b: Poly): Poly { const n = Math.max(a.length, b.length), r = new Array<number>(n).fill(0); a.forEach((x, i) => (r[n - a.length + i] += x)); b.forEach((x, i) => (r[n - b.length + i] += x)); return polyTrim(r); }
export function polyScale(a: Poly, k: number): Poly { return a.map((x) => x * k); }
export function polySub(a: Poly, b: Poly): Poly { return polyAdd(a, polyScale(b, -1)); }
export function polyMul(a: Poly, b: Poly): Poly { const r = new Array<number>(a.length + b.length - 1).fill(0); for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j]; return polyTrim(r); }
export const polyDeg = (p: Poly): number => polyTrim(p).length - 1;
export function polyDeriv(p: Poly): Poly { const n = p.length - 1; return n < 1 ? [0] : p.slice(0, n).map((c, i) => c * (n - i)); }
/** Horner evaluation at a complex point. */
export function polyEval(p: Poly, s: Cx): Cx { let r = C(0); for (const c of p) r = cadd(cmul(r, s), C(c)); return r; }
export function polyEvalReal(p: Poly, x: number): number { let r = 0; for (const c of p) r = r * x + c; return r; }
/** Real polynomial from roots (complex roots must come in conjugate pairs; `k` is the leading coefficient). */
export function polyFromRoots(roots: Cx[], k = 1): Poly {
  let p: Cx[] = [C(k)];
  for (const r of roots) { const q: Cx[] = new Array(p.length + 1).fill(null).map(() => C(0)); p.forEach((c, i) => { q[i] = cadd(q[i], c); q[i + 1] = cadd(q[i + 1], cmul(c, C(-r.re, -r.im))); }); p = q; }
  const scale = Math.max(1, ...p.map(cabs));
  for (const c of p) if (Math.abs(c.im) > 1e-8 * scale) throw new TFError('polyFromRoots: complex roots must come in conjugate pairs');
  return p.map((c) => c.re);
}

/**
 * Roots of a real polynomial (any order of coefficients' magnitude; exact zero roots are removed first, degree ≤ 2 uses
 * the closed form). Sorted by real part then imaginary part. See NUMERIC LIMITS above for multiplicity accuracy.
 */
export function polyRoots(pIn: Poly): Cx[] {
  assertFinitePoly(pIn, 'polyRoots');
  let p = polyTrim(pIn);
  if (p.length === 1) { if (p[0] === 0) throw new TFError('polyRoots: the zero polynomial has no defined roots'); return []; }
  const out: Cx[] = [];
  while (p.length > 1 && p[p.length - 1] === 0) { out.push(C(0)); p = p.slice(0, -1); }
  const n = p.length - 1;
  if (n === 1) out.push(C(-p[1] / p[0]));
  else if (n === 2) {
    const [a, b, c] = p, disc = b * b - 4 * a * c;
    if (disc >= 0) { const q = -0.5 * (b + Math.sign(b || 1) * Math.sqrt(disc)); const r1 = q / a, r2 = q !== 0 ? c / q : 0; out.push(C(r1), C(r2)); }
    else { const re = -b / (2 * a), im = Math.sqrt(-disc) / (2 * Math.abs(a)); out.push(C(re, im), C(re, -im)); }
  } else if (n > 2) out.push(...aberth(p));
  const scale = Math.max(1, ...out.map(cabs));
  const snapped = out.map((z) => (Math.abs(z.im) < 1e-9 * scale ? C(z.re, 0) : z));
  // enforce exact conjugate symmetry: pair each upper-half root with its nearest lower-half mate
  const up = snapped.filter((z) => z.im > 0), dn = snapped.filter((z) => z.im < 0), re = snapped.filter((z) => z.im === 0);
  const pairs: Cx[] = [];
  for (const z of up) { let bi = -1, bd = Infinity; dn.forEach((w, i) => { const d = Math.hypot(z.re - w.re, z.im + w.im); if (d < bd) { bd = d; bi = i; } }); if (bi >= 0) { const w = dn.splice(bi, 1)[0]; const r = (z.re + w.re) / 2, m = (z.im - w.im) / 2; pairs.push(C(r, m), C(r, -m)); } else pairs.push(z); }
  const all = [...re, ...pairs, ...dn];
  return all.sort((x, y) => x.re - y.re || x.im - y.im);
}
function aberth(p: Poly): Cx[] {
  const n = p.length - 1, a = p.map((c) => c / p[0]), dp = polyDeriv(a);
  const R = 1 + Math.max(...a.slice(1).map(Math.abs)); // Cauchy bound
  const z: Cx[] = Array.from({ length: n }, (_, k) => { const ang = (TAU * k) / n + 0.4, r = R * 0.5 * (1 + 0.1 * (k % 3)); return C(r * Math.cos(ang), r * Math.sin(ang)); });
  for (let it = 0; it < 500; it++) {
    let md = 0;
    for (let i = 0; i < n; i++) {
      const f = polyEval(a, z[i]), df = polyEval(dp, z[i]);
      if (cabs(f) === 0) continue;
      const ratio = cdiv(f, df); // Newton step
      let s = C(0); for (let k = 0; k < n; k++) if (k !== i) { const d = C(z[i].re - z[k].re, z[i].im - z[k].im); if (cabs(d) > 0) s = cadd(s, cdiv(C(1), d)); }
      const denom = C(1 - (ratio.re * s.re - ratio.im * s.im), -(ratio.re * s.im + ratio.im * s.re));
      const w = cabs(denom) > 1e-300 ? cdiv(ratio, denom) : ratio;
      z[i] = C(z[i].re - w.re, z[i].im - w.im); md = Math.max(md, cabs(w) / Math.max(1, cabs(z[i])));
    }
    if (md < 1e-15) break;
  }
  return z;
}

/* ───────────────────────── transfer functions ───────────────────────── */
/** Build a validated TF. Leading zeros are trimmed and `den` is made monic. Throws TFError on bad input. */
export function tf(num: Poly, den: Poly): TF {
  assertFinitePoly(num, 'tf num'); assertFinitePoly(den, 'tf den');
  const d = polyTrim(den), n = polyTrim(num);
  if (d.length === 1 && d[0] === 0) throw new TFError('tf: denominator is zero');
  const k = d[0];
  return { num: n.map((c) => c / k), den: d.map((c) => c / k) };
}
export const tfFromPolesZeros = (zeros: Cx[], poles: Cx[], gain = 1): TF => tf(polyFromRoots(zeros, gain), polyFromRoots(poles));
/** ωn²/(s² + 2ζωn s + ωn²). */
export function tfSecondOrder(wn: number, zeta: number): TF { if (!(wn > 0)) throw new TFError('tfSecondOrder: wn must be > 0'); return tf([wn * wn], [1, 2 * zeta * wn, wn * wn]); }
export const tfPoles = (G: TF): Cx[] => polyRoots(G.den);
export const tfZeros = (G: TF): Cx[] => (polyTrim(G.num).length > 1 ? polyRoots(G.num) : []);
export const tfSeries = (a: TF, b: TF): TF => tf(polyMul(a.num, b.num), polyMul(a.den, b.den));
export const tfParallel = (a: TF, b: TF): TF => tf(polyAdd(polyMul(a.num, b.den), polyMul(b.num, a.den)), polyMul(a.den, b.den));
/** Closed loop G/(1 + sign·G·H); `sign = -1` (default) is NEGATIVE feedback, `+1` positive. H defaults to 1. */
export function tfFeedback(G: TF, H: TF = tf([1], [1]), sign: 1 | -1 = -1): TF {
  const num = polyMul(G.num, H.den), den = polyAdd(polyMul(G.den, H.den), polyScale(polyMul(G.num, H.num), -sign));
  return tf(num, den);
}
/** Unity negative feedback of a loop transfer function L: T = L/(1+L). */
export const tfClosedLoop = (L: TF): TF => tfFeedback(L, tf([1], [1]), -1);
/** Sensitivity S = 1/(1+L). */
export const tfSensitivity = (L: TF): TF => tf(L.den, polyAdd(L.den, L.num));
export const isProper = (G: TF): boolean => polyDeg(G.num) <= polyDeg(G.den);
export const isStrictlyProper = (G: TF): boolean => polyDeg(G.num) < polyDeg(G.den);
/** G(0); ±Infinity if there is a pole at the origin. */
export function dcGain(G: TF): number { const n = polyEvalReal(G.num, 0), d = polyEvalReal(G.den, 0); return d === 0 ? (n === 0 ? NaN : Math.sign(n) * Infinity) : n / d; }
/** True when every pole has Re < −tol (strictly stable). Marginal poles (Re within tol of 0) count as NOT stable. */
export const isStable = (G: TF, tol = 1e-9): boolean => tfPoles(G).every((p) => p.re < -tol);

/* ───────────────────────── frequency response ───────────────────────── */
/** G(s) at a complex point. */
export function tfEval(G: TF, s: Cx): Cx { return cdiv(polyEval(G.num, s), polyEval(G.den, s)); }
/** G(jω) for ω in rad/s. */
export const freqresp = (G: TF, w: number): Cx => tfEval(G, C(0, w));
export interface Bode { w: number[]; mag: number[]; magDb: number[]; phaseDeg: number[] }
/** Log-spaced frequency vector (rad/s). */
export function logspace(wmin: number, wmax: number, n: number): number[] { if (!(wmin > 0 && wmax > wmin && n >= 2)) throw new TFError('logspace: need 0 < wmin < wmax and n ≥ 2'); return Array.from({ length: n }, (_, i) => wmin * Math.pow(wmax / wmin, i / (n - 1))); }
/** Bode data with continuously unwrapped phase: arg K + Σ arg(jω − zᵢ) − Σ arg(jω − pᵢ), each unwrapped along ω. */
export function bode(G: TF, w: number[]): Bode {
  if (!w.length || w.some((x) => !(x >= 0) || !Number.isFinite(x))) throw new TFError('bode: ω must be finite and ≥ 0');
  const zs = tfZeros(G), ps = tfPoles(G), lead = polyTrim(G.num)[0] ?? 0;
  const roots = [...zs.map((z) => ({ z, s: 1 })), ...ps.map((z) => ({ z, s: -1 }))];
  const last = roots.map(() => NaN), off = roots.map(() => 0);
  const mag: number[] = [], ph: number[] = [];
  for (const om of w) {
    let m = Math.abs(lead), p = lead < 0 ? Math.PI : 0;
    roots.forEach((r, i) => {
      const dist = Math.hypot(om - r.z.im, r.z.re);
      let a = Math.atan2(om - r.z.im, -r.z.re);
      if (!Number.isNaN(last[i])) { while (a + off[i] - last[i] > Math.PI) off[i] -= TAU; while (a + off[i] - last[i] < -Math.PI) off[i] += TAU; }
      a += off[i]; last[i] = a;
      m *= r.s === 1 ? dist : 1 / dist; p += r.s * a;
    });
    mag.push(m); ph.push((p * 180) / Math.PI);
  }
  return { w: w.slice(), mag, magDb: mag.map((m) => 20 * Math.log10(m)), phaseDeg: ph };
}
export interface Margins { gm: number | null; gmDb: number | null; wcg: number | null; pm: number | null; wcp: number | null; all: { gainCrossovers: { w: number; pmDeg: number }[]; phaseCrossovers: { w: number; gmDb: number }[] } }
/**
 * Gain/phase margins of an OPEN-LOOP transfer function L from a dense Bode grid (default 1e-3…1e3 rad/s, 4000 pts).
 * wcp/pm: gain crossover (|L|=1) and PM = 180° + phase there; wcg/gm: phase crossover (phase = −180° mod 360) and GM = 1/|L|.
 * `pm`/`gm` report the WORST (smallest) margin when there are several crossings; `all` lists every crossing.
 * Crossings are located by linear interpolation in log ω; margins are only meaningful for L with a stable closed loop
 * interpretation (this does NOT run a Nyquist test). null when no crossing exists in the grid.
 */
export function margins(L: TF, wmin = 1e-3, wmax = 1e3, n = 4000): Margins {
  const w = logspace(wmin, wmax, n), b = bode(L, w);
  const gc: { w: number; pmDeg: number }[] = [], pc: { w: number; gmDb: number }[] = [];
  const lerpAt = (i: number, f: number, arr: number[]) => arr[i] + f * (arr[i + 1] - arr[i]);
  for (let i = 0; i < n - 1; i++) {
    const d0 = b.magDb[i], d1 = b.magDb[i + 1];
    if (d0 === 0 || d0 * d1 < 0) { const f = d0 === d1 ? 0 : d0 / (d0 - d1), wc = Math.exp(Math.log(w[i]) + f * (Math.log(w[i + 1]) - Math.log(w[i]))); gc.push({ w: wc, pmDeg: 180 + lerpAt(i, f, b.phaseDeg) }); }
    // phase crossing of −180 + 360k, searched over every integer k spanned by the segment
    const p0 = b.phaseDeg[i], p1 = b.phaseDeg[i + 1];
    for (let k = Math.ceil((Math.min(p0, p1) + 180) / 360); k <= Math.floor((Math.max(p0, p1) + 180) / 360); k++) {
      const target = -180 + 360 * k; if ((p0 - target) * (p1 - target) > 0 || p0 === p1) continue;
      const f = (target - p0) / (p1 - p0), wp = Math.exp(Math.log(w[i]) + f * (Math.log(w[i + 1]) - Math.log(w[i])));
      pc.push({ w: wp, gmDb: -lerpAt(i, f, b.magDb) });
    }
  }
  const worstPm = gc.length ? gc.reduce((a, c) => (Math.abs(c.pmDeg) < Math.abs(a.pmDeg) ? c : a)) : null;
  const worstGm = pc.length ? pc.reduce((a, c) => (Math.abs(c.gmDb) < Math.abs(a.gmDb) ? c : a)) : null;
  return { gm: worstGm ? Math.pow(10, worstGm.gmDb / 20) : null, gmDb: worstGm?.gmDb ?? null, wcg: worstGm?.w ?? null, pm: worstPm?.pmDeg ?? null, wcp: worstPm?.w ?? null, all: { gainCrossovers: gc, phaseCrossovers: pc } };
}

/* ───────────────────────── state space & time response ───────────────────────── */
/** Controllable canonical realisation of a proper TF: x1' = x2 … xn' = −a_n x1 … − a_1 xn + u, y = C x + D u. */
export function tf2ss(G: TF): SS {
  const num = polyTrim(G.num), den = polyTrim(G.den), n = den.length - 1;
  if (num.length > den.length) throw new TFError('tf2ss: improper transfer function (numerator degree > denominator degree)');
  const a0 = den[0], d = den.map((c) => c / a0), nn = num.map((c) => c / a0);
  if (n === 0) return { A: [[0]], B: [0], C: [0], D: nn[0] };
  const padded = new Array<number>(den.length - nn.length).fill(0).concat(nn); // length n+1
  const D = padded[0];
  const bq = padded.slice(1).map((c, i) => c - D * d[i + 1]); // strictly proper part, highest power first
  const A: Mat = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i < n - 1 ? (j === i + 1 ? 1 : 0) : -d[n - j])));
  const B = Array.from({ length: n }, (_, i) => (i === n - 1 ? 1 : 0));
  const Cc = Array.from({ length: n }, (_, i) => bq[n - 1 - i]); // y = b_n x1 + … + b_1 xn
  return { A, B, C: Cc, D };
}
/** Exact zero-order-hold discretisation by the augmented matrix exponential: x[k+1] = Ad x[k] + Bd u[k]. */
export function c2dZoh(ss: SS, dt: number): { Ad: Mat; Bd: number[] } {
  if (!(dt > 0)) throw new TFError('c2dZoh: dt must be > 0');
  const n = ss.A.length, M: Mat = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i < n && j < n ? ss.A[i][j] * dt : i < n && j === n ? ss.B[i] * dt : 0)));
  const E = expm(M);
  return { Ad: E.slice(0, n).map((r) => r.slice(0, n)), Bd: E.slice(0, n).map((r) => r[n]) };
}
export interface TimeResponse { t: number[]; y: number[] }
const checkGrid = (t: number[]) => {
  if (t.length < 2) throw new TFError('time vector needs at least 2 samples');
  const dt = t[1] - t[0]; if (!(dt > 0)) throw new TFError('time vector must be increasing');
  for (let i = 1; i < t.length; i++) if (Math.abs(t[i] - t[i - 1] - dt) > 1e-9 * Math.max(1, dt)) throw new TFError('time vector must be uniformly spaced');
  return dt;
};
export const timeGrid = (tEnd: number, n: number): number[] => { if (!(tEnd > 0) || n < 2) throw new TFError('timeGrid: need tEnd > 0 and n ≥ 2'); return Array.from({ length: n }, (_, i) => (tEnd * i) / (n - 1)); };
/** Simulate G with an input sampled on the uniform grid t (u[k] held over [t_k, t_k+1)); x(0) = x0 (default 0). Exact for held inputs. */
export function lsim(G: TF, u: number[], t: number[], x0?: number[]): TimeResponse {
  if (u.length !== t.length) throw new TFError('lsim: u and t must have the same length');
  const dt = checkGrid(t), ss = tf2ss(G), { Ad, Bd } = c2dZoh(ss, dt), n = ss.A.length;
  if (x0 && x0.length !== n) throw new TFError(`lsim: x0 must have ${n} entries`);
  let x = x0 ? x0.slice() : new Array<number>(n).fill(0);
  const y: number[] = [];
  for (let k = 0; k < t.length; k++) {
    y.push(ss.C.reduce((s, c, i) => s + c * x[i], 0) + ss.D * u[k]);
    x = Ad.map((r, i) => r.reduce((s, a, j) => s + a * x[j], 0) + Bd[i] * u[k]);
  }
  return { t: t.slice(), y };
}
/** Unit step response on t = timeGrid(tEnd, n) (default 2000 pts), or on an explicit uniform grid. */
export function step(G: TF, tEnd: number | number[], n = 2000): TimeResponse { const t = Array.isArray(tEnd) ? tEnd : timeGrid(tEnd, n); return lsim(G, t.map(() => 1), t); }
/** Impulse response y = C e^{At} B (strictly proper part; a biproper D·δ(t) term is omitted). */
export function impulse(G: TF, tEnd: number | number[], n = 2000): TimeResponse {
  const t = Array.isArray(tEnd) ? tEnd : timeGrid(tEnd, n), dt = checkGrid(t), ss = tf2ss(G), { Ad } = c2dZoh(ss, dt);
  let x = ss.B.slice(); const y: number[] = [];
  for (let k = 0; k < t.length; k++) { y.push(ss.C.reduce((s, c, i) => s + c * x[i], 0)); x = Ad.map((r) => r.reduce((s, a, j) => s + a * x[j], 0)); }
  return { t: t.slice(), y };
}

/* ───────────────────────── step metrics ───────────────────────── */
export interface StepOptions { /** final value; default = last sample (like MATLAB's array form) */ final?: number; /** reference level (for steady-state error); default 1 */ ref?: number; /** settling band fraction; default 0.02 */ band?: number; lo?: number; hi?: number }
export interface StepMetrics {
  yFinal: number; /** NaN when it never reaches `hi` of the final value */ riseTime: number; t10: number; t90: number;
  peak: number; peakTime: number; /** percent of |yFinal|, ≥ 0 */ overshootPct: number; /** percent of |yFinal| below 0 before settling, ≥ 0 */ undershootPct: number;
  /** last time outside the band (0 if never outside); NaN if still outside at the final sample */ settlingTime: number; settled: boolean;
  /** ref − yFinal */ ess: number; band: number;
}
/** Interpolated first time y crosses `level` going the sign(final) way. */
function crossing(t: number[], y: number[], level: number, up: boolean): number {
  for (let i = 1; i < t.length; i++) { const a = y[i - 1] - level, b = y[i] - level; if (up ? a < 0 && b >= 0 : a > 0 && b <= 0) return b === a ? t[i] : t[i - 1] + ((0 - a) / (b - a)) * (t[i] - t[i - 1]); }
  return NaN;
}
/**
 * Step metrics from sampled data (MATLAB `stepinfo` definitions; see header). Works for any final-value sign.
 * Peak and peak time are refined by a parabola through the three samples around the maximum.
 * Throws if t/y are inconsistent. Does not detect instability: use `stepinfo` for a TF (checks poles) or inspect `settled`.
 */
export function stepMetrics(t: number[], y: number[], o: StepOptions = {}): StepMetrics {
  if (t.length !== y.length || t.length < 3) throw new TFError('stepMetrics: t and y need the same length (≥ 3)');
  const band = o.band ?? 0.02, lo = o.lo ?? 0.1, hi = o.hi ?? 0.9, ref = o.ref ?? 1;
  const yf = o.final ?? y[y.length - 1], sg = yf < 0 ? -1 : 1, ay = y.map((v) => v * sg), afin = Math.abs(yf);
  const nan = Number.NaN;
  if (afin < 1e-12) return { yFinal: yf, riseTime: nan, t10: nan, t90: nan, peak: Math.max(...y), peakTime: t[y.indexOf(Math.max(...y))], overshootPct: nan, undershootPct: nan, settlingTime: nan, settled: false, ess: ref - yf, band };
  let ip = 0; for (let i = 1; i < ay.length; i++) if (ay[i] > ay[ip]) ip = i;
  let peak = ay[ip], tpk = t[ip];
  if (ip > 0 && ip < t.length - 1) { const y0 = ay[ip - 1], y1 = ay[ip], y2 = ay[ip + 1], den = y0 - 2 * y1 + y2; if (den < 0) { const d = (0.5 * (y0 - y2)) / den; peak = y1 - 0.25 * (y0 - y2) * d; tpk = t[ip] + d * (t[ip + 1] - t[ip]); } }
  const t10 = crossing(t, ay, lo * afin, true), t90 = crossing(t, ay, hi * afin, true);
  let ts = 0, settled = true;
  // final value taken from the last sample: only trust it if the record has actually flattened out (last 10 % inside the band)
  if (o.final === undefined) { const j0 = Math.floor(0.9 * (ay.length - 1)); for (let i = j0; i < ay.length; i++) if (Math.abs(ay[i] - afin) > band * afin) settled = false; }
  if (settled) for (let i = ay.length - 1; i >= 0; i--) if (Math.abs(ay[i] - afin) > band * afin) {
    if (i === ay.length - 1) { settled = false; ts = nan; break; }
    const edge = ay[i] > afin ? afin * (1 + band) : afin * (1 - band), a = ay[i] - edge, b = ay[i + 1] - edge;
    ts = t[i] + (a / (a - b)) * (t[i + 1] - t[i]); break;
  }
  if (!settled) ts = nan;
  const under = Math.min(0, ...ay.slice(0, ip + 1));
  return { yFinal: yf, riseTime: t90 - t10, t10, t90, peak: peak * sg, peakTime: tpk, overshootPct: Math.max(0, ((peak - afin) / afin) * 100), undershootPct: (-under / afin) * 100, settlingTime: ts, settled, ess: ref - yf, band };
}
export type StepInfo = StepMetrics & { stable: boolean };
/**
 * Step metrics of a TF: final value = DC gain (analytic), response length auto-chosen from the slowest stable pole
 * unless `tEnd` is given. Unstable/marginal systems return `{stable:false}` fields as NaN (no misleading numbers).
 */
export function stepinfo(G: TF, o: StepOptions & { tEnd?: number; n?: number } = {}): StepInfo {
  const stable = isStable(G), nan = Number.NaN;
  if (!stable) return { yFinal: nan, riseTime: nan, t10: nan, t90: nan, peak: nan, peakTime: nan, overshootPct: nan, undershootPct: nan, settlingTime: nan, settled: false, ess: nan, band: o.band ?? 0.02, stable: false };
  const slow = Math.min(...tfPoles(G).map((p) => Math.abs(p.re)).concat([Infinity]));
  const tEnd = o.tEnd ?? (Number.isFinite(slow) ? Math.min(1e5, 12 / slow) : 10), n = o.n ?? 4000;
  const r = step(G, tEnd, n);
  return { ...stepMetrics(r.t, r.y, { ...o, final: o.final ?? dcGain(G) }), stable: true };
}
