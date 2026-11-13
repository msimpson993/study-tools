/**
 * Root locus of a single-input single-output loop: the closed-loop poles of  D(s) + K·N(s) = 0  as K sweeps 0 → ∞.
 *
 * CONVENTIONS
 *  - L(s) = N(s)/D(s) is a `TF` (see tf.ts). N includes ITS OWN gain: the locus is D + K·N = 0 for K ≥ 0 (`sign = +1`,
 *    the usual negative-feedback locus 1 + K·L = 0), or D − K·N = 0 for the complementary locus (`negative: true`,
 *    i.e. K ≤ 0 in 1 + K·L = 0, positive feedback). The returned gains `K` are always magnitudes ≥ 0.
 *  - L must be STRICTLY proper (deg N < deg D) so that there are n finite branches and n − m asymptotes.
 *  - Branch b is a sequence of closed-loop poles `branches[b][i]` at gain `K[i]`; branch b starts at pole b of L (K = 0).
 *
 * HOW THE LOCUS IS TRACED
 *  - A numeric sweep: roots of D + K·N by `polyRoots` at an adaptive sequence of gains. Each step is accepted only when
 *    the largest root displacement (after an optimal minimum-cost matching of old to new roots, Kuhn–Munkres) is below
 *    `tol·scale` AND below 0.4× the smallest root separation (so two roots cannot swap branches). Otherwise dK is halved;
 *    easy steps grow dK by 1.6×. The sweep ends when a root leaves radius `rmax` (default 5·scale), at `kmax`, or when
 *    `maxSteps` is hit. `scale = max(1, |poles|, |zeros|, |breakaways|, |crossings|)`.
 *  - Special points are computed ALGEBRAICALLY (independent of the sweep), for any degree the root finder can handle:
 *      · asymptote centroid (Σp − Σz)/(n−m) from coefficients, angles (2k+1)·180°/(n−m) (K·b0 > 0) or 2k·180°/(n−m) (K·b0 < 0);
 *      · real breakaway / break-in points: real roots s of D'N − D N' = 0 with K(s) = −D/N ≥ 0 on the locus;
 *      · jω-axis crossings: ω ≥ 0 from the real polynomial Re D·Im N − Im D·Re N = 0 (ω = 0 handled separately), K from
 *        the real/imag parts, each candidate verified by the residual |D(jω) + K·N(jω)|.
 *
 * LIMITATIONS (honest list)
 *  - Everything rests on `polyRoots` (Aberth + Newton): intended for degree ≲ 10 with sane scaling. The crossing polynomial
 *    has degree up to 2n − 1, so crossings are good to n ≈ 6; beyond that they may be missed or inaccurate (verified
 *    candidates only: it never reports a crossing it cannot verify, but it can fail to find one).
 *  - Repeated open-loop poles/zeros (e.g. 1/(s+1)³) start from roots accurate only to ≈ ε^(1/m); the first steps can hit the
 *    step floor and then a warning is returned. The shape is still right (tested), the K≈0 end is noisy at the 1e-5 level.
 *  - Real breakaways are exact roots of a polynomial, but complex-plane "break points" (branches that merge off the axis) do
 *    not exist for rational root loci, so none are looked for. Points where branches touch on the jω axis are crossings.
 *  - No delays (Padé yourself), no MIMO, no discrete-time (use the same maths in z with the unit circle yourself).
 *  - `rlocusPolesAt(rl, K)` orders poles by matching against the nearest stored sweep gain: reliable inside the swept range,
 *    best-effort beyond it.
 */
import { C, cabs, cadd, cdiv, csub, cmul, type Cx } from './complex';
import { TFError, type TF, type Poly, polyAdd, polyScale, polyDeg, polyDeriv, polyEval, polyEvalReal, polyMul, polySub, polyRoots, polyTrim } from './tf';

export interface Breakaway { /** real location */ s: number; /** gain at that point (≥ 0) */ K: number; kind: 'breakaway' | 'break-in' }
export interface Crossing { /** ω ≥ 0 (rad/s); the mirror −ω is implied */ w: number; /** gain at which a pole pair sits at ±jω (w = 0: a single pole at the origin) */ K: number }
export interface RLocus {
  /** open-loop poles / zeros of L */
  poles: Cx[]; zeros: Cx[]; n: number; m: number;
  /** +1: D + K·N (K ≥ 0); −1: D − K·N */ sign: 1 | -1;
  /** swept gains (magnitudes, ascending, K[0] = 0) */ K: number[];
  /** branches[b][i] = closed-loop pole of branch b at gain K[i] */ branches: Cx[][];
  centroid: number | null; /** degrees in (−180, 180], sorted ascending */ asymptoteAngles: number[];
  breakaways: Breakaway[]; crossings: Crossing[];
  /** the scale used for steps and radius limits */ scale: number;
  warnings: string[];
}
export interface RLocusOptions { negative?: boolean; kmax?: number; rmax?: number; /** max root jump per step as a fraction of `scale` (default 0.03) */ tol?: number; maxSteps?: number }

const K_EPS = 1e-12;

/** Closed-loop poles of D + sign·K·N for one gain (K ≥ 0 magnitude, sign = +1 by default). */
export function rlocusRootsAt(L: TF, K: number, sign: 1 | -1 = 1): Cx[] { return polyRoots(polyAdd(L.den, polyScale(L.num, sign * K))); }

/* ───────────── optimal matching (Kuhn–Munkres, O(n³)) ───────────── */
/** assign[i] = index j in `b` matched to a[i], minimising Σ|a_i − b_j|². */
function matchRoots(a: Cx[], b: Cx[]): number[] {
  const n = a.length, INF = 1e300;
  const cost = (i: number, j: number) => { const dx = a[i].re - b[j].re, dy = a[i].im - b[j].im; return dx * dx + dy * dy; };
  const u = new Array<number>(n + 1).fill(0), v = new Array<number>(n + 1).fill(0), p = new Array<number>(n + 1).fill(0), way = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0; const minv = new Array<number>(n + 1).fill(INF), used = new Array<boolean>(n + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = cost(i0 - 1, j - 1) - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const assign = new Array<number>(n).fill(0);
  for (let j = 1; j <= n; j++) assign[p[j] - 1] = j - 1;
  return assign;
}

/* ───────────── algebraic special points ───────────── */
/** polynomial in ω for Re or Im of p(jω), highest power of ω first */
function jwParts(p: Poly): { re: Poly; im: Poly } {
  const d = p.length - 1, re = new Array<number>(d + 1).fill(0), im = new Array<number>(d + 1).fill(0);
  p.forEach((c, idx) => { const k = d - idx; if (k % 2 === 0) re[idx] = c * (k / 2 % 2 === 0 ? 1 : -1); else im[idx] = c * (((k - 1) / 2) % 2 === 0 ? 1 : -1); });
  return { re, im };
}
function breakawaysOf(L: TF, sign: 1 | -1): Breakaway[] {
  const { num: N, den: D } = L;
  const P = polyTrim(polySub(polyMul(polyDeriv(D), N), polyMul(D, polyDeriv(N))), 1e-14);
  if (P.length < 2) return [];
  const out: Breakaway[] = [];
  const Kof = (s: number) => -sign * polyEvalReal(D, s) / polyEvalReal(N, s);
  for (const r of polyRoots(P)) {
    if (Math.abs(r.im) > 1e-6 * (1 + Math.abs(r.re))) continue;
    const s = r.re, nv = polyEvalReal(N, s);
    if (Math.abs(nv) < 1e-12) continue;
    const K = Kof(s);
    if (!(K >= -1e-9)) continue;
    if (out.some((o) => Math.abs(o.s - s) < 1e-6 * (1 + Math.abs(s)))) continue;
    const h = 1e-3 * (1 + Math.abs(s)), k2 = Kof(s + h) - 2 * K + Kof(s - h);
    out.push({ s, K: Math.max(0, K), kind: k2 <= 0 ? 'breakaway' : 'break-in' });
  }
  return out.sort((a, b) => a.s - b.s);
}
function crossingsOf(L: TF, sign: 1 | -1): Crossing[] {
  const { num: N, den: D } = L, out: Crossing[] = [];
  const nd = polyEvalReal(N, 0), dd = polyEvalReal(D, 0);
  if (Math.abs(nd) > 1e-12) { const K = -sign * dd / nd; if (K > K_EPS) out.push({ w: 0, K }); }
  const dj = jwParts(D), nj = jwParts(N);
  const P = polyTrim(polySub(polyMul(dj.re, nj.im), polyMul(dj.im, nj.re)), 1e-14);
  if (P.length < 2) return out;
  const jw = (p: Poly, w: number): Cx => polyEval(p, C(0, w));
  for (const r of polyRoots(P)) {
    if (Math.abs(r.im) > 1e-6 * (1 + Math.abs(r.re)) || r.re < 1e-9) continue;
    const w = r.re, Nj = jw(N, w), Dj = jw(D, w);
    const K = Math.abs(Nj.re) >= Math.abs(Nj.im) ? -sign * Dj.re / Nj.re : -sign * Dj.im / Nj.im;
    if (!Number.isFinite(K) || !(K > K_EPS)) continue;
    const res = cabs(cadd(Dj, cmul(C(sign * K), Nj)));
    if (res > 1e-6 * (cabs(Dj) + K * cabs(Nj) + 1)) continue;
    if (out.some((o) => Math.abs(o.w - w) < 1e-6 * (1 + w) && Math.abs(o.K - K) < 1e-6 * (1 + K))) continue;
    out.push({ w, K });
  }
  return out.sort((a, b) => a.K - b.K);
}

/** Trace the root locus of L. Throws TFError for an improper or zero-numerator L. See the file header for method and limits. */
export function rlocus(L: TF, o: RLocusOptions = {}): RLocus {
  const num = polyTrim(L.num), n = polyDeg(L.den), m = polyDeg(num);
  if (num.length === 1 && num[0] === 0) throw new TFError('rlocus: the numerator is zero (no zeros, no gain): nothing to sweep');
  if (!(m < n)) throw new TFError('rlocus: L(s) must be strictly proper (deg numerator < deg denominator)');
  if (n > 14) throw new TFError('rlocus: degree above 14 is not supported by the root finder');
  const sign: 1 | -1 = o.negative ? -1 : 1, tol = o.tol ?? 0.03, maxSteps = o.maxSteps ?? 4000;
  const LL: TF = { num, den: L.den }, warnings: string[] = [];
  const poles = polyRoots(LL.den), zeros = m > 0 ? polyRoots(num) : [];
  const eff = sign * Math.sign(num[0]);
  const centroidC = -LL.den[1] / 1 - (m > 0 ? -num[1] / num[0] : 0); // coefficient form, exact (den is monic)
  const na = n - m, asy = Array.from({ length: na }, (_, k) => { let a = ((eff > 0 ? 2 * k + 1 : 2 * k) * 180) / na; a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; }).sort((a, b) => a - b);
  const breakaways = breakawaysOf(LL, sign), crossings = crossingsOf(LL, sign);
  const scale = Math.max(1, ...poles.map(cabs), ...zeros.map(cabs), ...breakaways.map((b) => Math.abs(b.s)), ...crossings.map((c) => c.w), Math.abs(centroidC / (n - m)));
  const rmax = o.rmax ?? 5 * scale, kmax = o.kmax ?? Infinity;
  const kref = Math.max(0, ...breakaways.map((b) => b.K), ...crossings.map((c) => c.K)) || Math.abs(polyEvalReal(LL.den, 1) / polyEvalReal(LL.num, 1)) || 1;
  const kfloor = 1e-13 * kref;

  const Ks = [0], branches: Cx[][] = poles.map((p) => [p]);
  let prev = poles.slice(), k = 0, dk = 1e-3 * kref, steps = 0, floored = 0;
  while (steps++ < maxSteps) {
    const kn = Math.min(k + dk, kmax), r = rlocusRootsAt(LL, kn, sign);
    if (r.length !== n) { warnings.push(`root count dropped to ${r.length} at K = ${kn.toExponential(3)}; sweep stopped`); break; }
    const asg = matchRoots(prev, r);
    let jump = 0; for (let i = 0; i < n; i++) jump = Math.max(jump, cabs(csub(r[asg[i]], prev[i])));
    let sep = Infinity; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) sep = Math.min(sep, cabs(csub(prev[i], prev[j])));
    const ok = jump <= tol * scale && (jump <= 0.4 * sep || sep < 1e-3 * scale);
    if (!ok && dk > kfloor) { dk /= 2; continue; }
    if (!ok) floored++;
    const next = prev.map((_, i) => r[asg[i]]);
    next.forEach((z, i) => branches[i].push(z));
    Ks.push(kn); prev = next; k = kn;
    if (ok && jump < tol * scale / 4) dk *= 1.6;
    if (k >= kmax || Math.max(...next.map(cabs)) > rmax) break;
  }
  if (steps > maxSteps) warnings.push(`stopped at maxSteps = ${maxSteps} (K = ${k.toExponential(3)}); raise maxSteps or tol to continue`);
  if (floored) warnings.push(`the step floor was reached ${floored}× (repeated or coincident roots); the traced shape is right but the local detail near those gains is coarse`);
  return { poles, zeros, n, m, sign, K: Ks, branches, centroid: centroidC / na, asymptoteAngles: asy, breakaways, crossings, scale, warnings };
}

/** Closed-loop poles at gain K ordered by branch (matched to the nearest stored sweep gain). */
export function rlocusPolesAt(rl: RLocus, K: number, L: TF): Cx[] {
  const r = rlocusRootsAt(L, K, rl.sign);
  let lo = 0, hi = rl.K.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (rl.K[mid] <= K) lo = mid; else hi = mid; }
  const i = Math.abs(rl.K[lo] - K) <= Math.abs(rl.K[hi] - K) ? lo : hi;
  const ref = rl.branches.map((b) => b[i]), asg = matchRoots(ref, r);
  return ref.map((_, b) => r[asg[b]]);
}

/**
 * Where is a clicked point on the locus? `K` = −sign·D(s)/N(s) is the (complex) gain that would put a closed-loop pole at s;
 * the point is ON the locus iff it is real and ≥ 0. `angleErrDeg` is the angle-criterion error in degrees, wrapped to (−180, 180].
 */
export function rlocusGainAt(L: TF, s: Cx, sign: 1 | -1 = 1): { K: Cx; kMag: number; angleErrDeg: number } {
  const K = cdiv(polyEval(L.den, s), polyEval(L.num, s)), Kc = C(-sign * K.re, -sign * K.im);
  const err = (Math.atan2(Kc.im, Kc.re) * 180) / Math.PI;
  return { K: Kc, kMag: cabs(Kc), angleErrDeg: err };
}

/** The nearest stored locus sample to s: which branch, which gain. Brute force over the sweep (a few thousand points). */
export function rlocusNearest(rl: RLocus, s: Cx): { branch: number; index: number; s: Cx; K: number; dist: number } {
  let best = { branch: 0, index: 0, s: rl.branches[0][0], K: 0, dist: Infinity };
  rl.branches.forEach((br, b) => br.forEach((z, i) => { const d = cabs(csub(z, s)); if (d < best.dist) best = { branch: b, index: i, s: z, K: rl.K[i], dist: d }; }));
  return best;
}

/**
 * Gain intervals [K1, K2] (K2 may be Infinity) on which every closed-loop pole is in the open left half plane, from the jω
 * crossings and a root check at each interval's midpoint. Empty when the loop is never stable.
 */
export function rlocusStableIntervals(L: TF, rl: RLocus): [number, number][] {
  const ks = [0, ...rl.crossings.map((c) => c.K).sort((a, b) => a - b), Infinity];
  const out: [number, number][] = [];
  for (let i = 0; i < ks.length - 1; i++) {
    if (ks[i + 1] - ks[i] < 1e-12) continue;
    const mid = Number.isFinite(ks[i + 1]) ? (ks[i] + ks[i + 1]) / 2 : ks[i] * 2 + 1;
    if (rlocusRootsAt(L, mid, rl.sign).every((p) => p.re < -1e-9)) { const last = out[out.length - 1]; if (last && last[1] === ks[i]) last[1] = ks[i + 1]; else out.push([ks[i], ks[i + 1]]); }
  }
  return out;
}
