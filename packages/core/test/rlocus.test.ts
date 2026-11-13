import { describe, it, expect } from 'vitest';
import { rlocus, rlocusRootsAt, rlocusPolesAt, rlocusGainAt, rlocusNearest, rlocusStableIntervals, tf, polyAdd, polyScale, polyEval, polyMul, TFError, cabs, C, type RLocus, type TF } from '../src/dsp';

const sorted = (a: number[]) => [...a].sort((x, y) => x - y);
const L3 = tf([1], polyMul(polyMul([1, 0], [1, 1]), [1, 2])); // 1/(s(s+1)(s+2))
const CART = tf([1], [1, 3, 2]); // the running cart: m = 1 kg, c = 3, k = 2

function residual(rl: RLocus, L: TF) {
  let worst = 0;
  rl.branches.forEach((br) => br.forEach((z, i) => { const v = polyEval(polyAdd(L.den, polyScale(L.num, rl.sign * rl.K[i])), z); worst = Math.max(worst, cabs(v) / (1 + cabs(z) ** L.den.length)); }));
  return worst;
}

describe('K/(s(s+1)(s+2)) — the textbook locus', () => {
  const rl = rlocus(L3);
  it('asymptotes: centroid −1, angles ±60° and 180°', () => {
    expect(rl.centroid).toBeCloseTo(-1, 12); expect(rl.asymptoteAngles.map((a) => +a.toFixed(9))).toEqual([-60, 60, 180]);
  });
  it('breakaway at s = −(3−√3)/3 = −0.42265 with K = 2√3/9 = 0.3849', () => {
    expect(rl.breakaways.length).toBe(1);
    expect(rl.breakaways[0].s).toBeCloseTo(-(3 - Math.sqrt(3)) / 3, 9); expect(rl.breakaways[0].K).toBeCloseTo((2 * Math.sqrt(3)) / 9, 9); expect(rl.breakaways[0].kind).toBe('breakaway');
  });
  it('jω crossing at ω = √2 and K = 6; stable only for 0 ≤ K < 6', () => {
    expect(rl.crossings.length).toBe(1); expect(rl.crossings[0].w).toBeCloseTo(Math.SQRT2, 9); expect(rl.crossings[0].K).toBeCloseTo(6, 9);
    expect(rlocusStableIntervals(L3, rl)).toEqual([[0, expect.closeTo(6, 8)]]);
    const p = rlocusRootsAt(L3, 6); expect(Math.max(...p.map((z) => z.re))).toBeCloseTo(0, 6); expect(Math.min(...p.map((z) => z.re))).toBeCloseTo(-3, 6);
  });
  it('every stored sample satisfies D + K·N = 0; branches start at the poles', () => {
    expect(residual(rl, L3)).toBeLessThan(1e-9);
    expect(rl.branches.map((b) => b[0].re).sort((a, b) => a - b)).toEqual([-2, -1, 0]);
    expect(rl.warnings).toEqual([]);
  });
  it('continuity: no step jumps further than the tolerance (no branch swaps)', () => {
    for (const br of rl.branches) for (let i = 1; i < br.length; i++) expect(cabs({ re: br[i].re - br[i - 1].re, im: br[i].im - br[i - 1].im })).toBeLessThanOrEqual(0.03 * rl.scale + 1e-9);
  });
  it('conjugate symmetry: the set of poles at every gain is closed under conjugation', () => {
    for (let i = 0; i < rl.K.length; i += 7) for (const b of rl.branches) { const z = b[i]; expect(rl.branches.some((c) => Math.abs(c[i].re - z.re) < 1e-9 && Math.abs(c[i].im + z.im) < 1e-9)).toBe(true); }
  });
  it('the sweep passes through the breakaway and ends past the radius limit; branch 0 (from 0) heads to the 60° asymptote', () => {
    expect(Math.max(...rl.branches.flat().map(cabs))).toBeGreaterThan(5 * rl.scale * 0.9);
    // the pole leaving s = 0 and the one leaving s = −1 collide at the breakaway then go complex
    const joint = rl.branches.filter((b) => b.some((z) => Math.abs(z.im) > 1)); expect(joint.length).toBe(2);
    const far = joint[0][joint[0].length - 1]; expect(Math.abs((Math.atan2(Math.abs(far.im), far.re + 1) * 180) / Math.PI - 60)).toBeLessThan(8);
  });
  it('rlocusPolesAt orders by branch and agrees with the sweep', () => {
    const p = rlocusPolesAt(rl, 0.1, L3); const direct = rlocusRootsAt(L3, 0.1);
    expect(sorted(p.map((z) => z.re))).toEqual(sorted(direct.map((z) => z.re)));
    const i = rl.K.findIndex((k) => k >= 0.1); rl.branches.forEach((b, j) => expect(cabs({ re: p[j].re - b[i].re, im: p[j].im - b[i].im })).toBeLessThan(0.05));
  });
});

describe('the running cart G = 1/(s² + 3s + 2)', () => {
  const rl = rlocus(CART);
  it('centroid −1.5, asymptotes ±90°, breakaway at −1.5 with K = 0.25, never leaves the left half plane', () => {
    expect(rl.centroid).toBeCloseTo(-1.5, 12); expect(rl.asymptoteAngles).toEqual([-90, 90]);
    expect(rl.breakaways).toEqual([{ s: expect.closeTo(-1.5, 9), K: expect.closeTo(0.25, 9), kind: 'breakaway' }]);
    expect(rl.crossings).toEqual([]); expect(rlocusStableIntervals(CART, rl)).toEqual([[0, Infinity]]);
  });
  it('past K = 0.25 the poles are −1.5 ± j√(K − 0.25)', () => {
    const p = rlocusPolesAt(rl, 4.25, CART); for (const z of p) { expect(z.re).toBeCloseTo(-1.5, 9); expect(Math.abs(z.im)).toBeCloseTo(2, 9); }
  });
});

describe('zeros, break-in, negative locus, other degrees', () => {
  it('(s+1)/s²: breakaway at the double pole (K = 0) and a break-in at s = −2 with K = 4', () => {
    const L = tf([1, 1], [1, 0, 0]), rl = rlocus(L);
    const bi = rl.breakaways.find((b) => b.kind === 'break-in')!; expect(bi.s).toBeCloseTo(-2, 9); expect(bi.K).toBeCloseTo(4, 9);
    expect(rl.breakaways.some((b) => Math.abs(b.s) < 1e-9 && b.K < 1e-9)).toBe(true);
    expect(residual(rl, L)).toBeLessThan(1e-9);
    // one branch ends on the zero at −1
    expect(rl.branches.some((b) => Math.abs(b[b.length - 1].re + 1) < 0.2 && Math.abs(b[b.length - 1].im) < 0.2)).toBe(true);
  });
  it('1/(s(s+1)(s+2)(s+3)): crossing at ω = 1 with K = 10; angles ±45°, ±135°', () => {
    const L = tf([1], polyMul(polyMul([1, 0], [1, 1]), polyMul([1, 2], [1, 3]))), rl = rlocus(L);
    expect(rl.crossings[0].w).toBeCloseTo(1, 9); expect(rl.crossings[0].K).toBeCloseTo(10, 9);
    expect(rl.asymptoteAngles.map((a) => Math.round(a))).toEqual([-135, -45, 45, 135]); expect(rl.centroid).toBeCloseTo(-1.5, 12);
    expect(residual(rl, L)).toBeLessThan(1e-9); expect(rl.warnings).toEqual([]);
  });
  it('a pole at the origin that moves into the right half plane: K(s−1)… crossing at s = 0 (ω = 0)', () => {
    const L = tf([1, -1], [1, 3, 2, 0].slice(0, 3)); // (s−1)/(s²+3s+2): the zero is in the RHP; K = 2 puts a pole at 0
    const rl = rlocus(L); expect(rl.crossings).toEqual([{ w: 0, K: expect.closeTo(2, 9) }]);
    expect(rlocusStableIntervals(L, rl)).toEqual([[0, expect.closeTo(2, 8)]]);
  });
  it('negative locus uses angles 2k·180/(n−m) and K = −D/N: 1/(s(s+1)(s+2)) complement: asymptote on the positive real axis', () => {
    const rl = rlocus(L3, { negative: true });
    expect(rl.asymptoteAngles.map((a) => Math.round(a))).toEqual([-120, 0, 120]); expect(residual(rl, L3)).toBeLessThan(1e-9);
    // the real axis is on the complement locus for s > 0 and for −2 < s < −1: its break point is the mirror image, s = −(3+√3)/3
    expect(rl.breakaways.length).toBe(1); expect(rl.breakaways[0].s).toBeCloseTo(-(3 + Math.sqrt(3)) / 3, 9); expect(rl.breakaways[0].K).toBeCloseTo((2 * Math.sqrt(3)) / 9, 9);
  });
  it('a negative numerator gain flips which side is the K > 0 locus (angles use sign(K·b0))', () => {
    const rl = rlocus(tf([-1], polyMul(polyMul([1, 0], [1, 1]), [1, 2]))); expect(rl.asymptoteAngles.map((a) => Math.round(a))).toEqual([-120, 0, 120]);
  });
  it('a repeated pole 1/(s+1)³ traces with the right shape (centroid −1, ±60°), warning allowed', () => {
    const rl = rlocus(tf([1], polyMul(polyMul([1, 1], [1, 1]), [1, 1])));
    expect(rl.centroid).toBeCloseTo(-1, 12); expect(rl.asymptoteAngles.map(Math.round)).toEqual([-60, 60, 180]);
    expect(rl.breakaways.some((b) => Math.abs(b.s + 1) < 1e-3 && b.K < 1e-6)).toBe(true);
    expect(rl.crossings[0].K).toBeCloseTo(8, 6); expect(rl.crossings[0].w).toBeCloseTo(Math.sqrt(3), 6);
    expect(Math.max(...rl.branches.flat().map(cabs))).toBeGreaterThan(4);
  });
  it('honours kmax and tol options', () => {
    const rl = rlocus(CART, { kmax: 2 }); expect(rl.K[rl.K.length - 1]).toBeCloseTo(2, 12);
    const coarse = rlocus(L3, { tol: 0.2 }), fine = rlocus(L3, { tol: 0.005 }); expect(fine.K.length).toBeGreaterThan(coarse.K.length);
  });
  it('reports (not hides) maxSteps exhaustion', () => { expect(rlocus(L3, { maxSteps: 5 }).warnings.join()).toMatch(/maxSteps/); });
});

describe('queries and validation', () => {
  it('rlocusGainAt: on the locus the complex K is real and positive; off it the angle error is non-zero', () => {
    const g = rlocusGainAt(CART, C(-1.5, 1)); expect(g.K.im).toBeCloseTo(0, 9); expect(g.K.re).toBeCloseTo(1.25, 9); expect(g.angleErrDeg).toBeCloseTo(0, 6);
    const off = rlocusGainAt(CART, C(-0.5, 1)); expect(Math.abs(off.angleErrDeg)).toBeGreaterThan(5);
  });
  it('rlocusNearest finds the closest swept sample and its gain', () => {
    const rl = rlocus(CART), n = rlocusNearest(rl, C(-1.5, 1)); expect(n.dist).toBeLessThan(0.08); expect(n.K).toBeCloseTo(1.25, 0);
  });
  it('rejects improper, biproper or zero-numerator loops', () => {
    expect(() => rlocus(tf([1, 0, 0], [1, 1]))).toThrow(TFError); expect(() => rlocus(tf([1, 1], [1, 2]))).toThrow(TFError); expect(() => rlocus(tf([0], [1, 1]))).toThrow(TFError);
  });
});
