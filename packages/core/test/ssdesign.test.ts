import { describe, it, expect } from 'vitest';
import { C } from '../src/dsp/complex';
import { polyFromRoots } from '../src/dsp/tf';
import { type Mat, matAdd, matMul, matScale } from '../src/dsp/lti';
import { ctrb, obsv, det, acker, observerGain, refGain, charPoly, simulateSfb } from '../src/dsp/ssdesign';

/** Running cart: ẍ + 3ẋ + 2x = u. */
const A: Mat = [[0, 1], [-2, -3]], B: Mat = [[0], [1]], Cm: Mat = [[1, 0]];

describe('cart controllability, observability and state-feedback numbers', () => {
  it('Pc = [[0, 1], [1, −3]] has det −1, and Po is the identity', () => {
    const Pc = ctrb(A, B), Po = obsv(A, Cm);
    expect(Pc).toEqual([[0, 1], [1, -3]]);
    expect(det(Pc)).toBeCloseTo(-1, 12);
    expect(Po).toEqual([[1, 0], [0, 1]]);
    expect(det(Po)).toBeCloseTo(1, 12);
  });
  it('Ackermann places the cart poles at −4 ± 3j and returns K = [23, 5]', () => {
    const poles = [C(-4, 3), C(-4, -3)];
    expect(polyFromRoots(poles)).toEqual([1, 8, 25]);
    const K = acker(A, B, poles);
    expect(K[0]).toBeCloseTo(23, 8);
    expect(K[1]).toBeCloseTo(5, 8);
    const Acl = matAdd(A, matScale(matMul(B, [K]), -1));
    expect(charPoly(Acl).map((c) => +c.toFixed(8))).toEqual([1, 8, 25]);
  });
  it('the dual observer gain for poles −20 ± 15j is L = [37, 512]', () => {
    const L = observerGain(A, Cm, [C(-20, 15), C(-20, -15)]);
    expect(L[0]).toBeCloseTo(37, 6);
    expect(L[1]).toBeCloseTo(512, 6);
    const Alc = matAdd(A, matScale(matMul(L.map((x) => [x]), Cm), -1));
    expect(charPoly(Alc)[1]).toBeCloseTo(40, 5);
    expect(charPoly(Alc)[2]).toBeCloseTo(625, 4);
  });
  it('N̄ = 25 makes the DC gain from r to x equal 1 when K = [23, 5]', () => {
    expect(refGain(A, B, Cm, [23, 5])).toBeCloseTo(25, 8);
  });
  it('the notes’ 1/s² plant with poles −1 ± j gives K = [2, 2]', () => {
    const A2: Mat = [[0, 1], [0, 0]], B2: Mat = [[0], [1]];
    const K = acker(A2, B2, [C(-1, 1), C(-1, -1)]);
    expect(K[0]).toBeCloseTo(2, 8);
    expect(K[1]).toBeCloseTo(2, 8);
    expect(polyFromRoots([C(-1, 1), C(-1, -1)])).toEqual([1, 2, 2]);
  });
  it('with a 0.2 m initial estimate error, observer feedback catches the true-state step after a brief deviation', () => {
    const K = [23, 5], L = [37, 512], Nbar = 25, opt = { A, B, C: Cm, K, L, Nbar, r: () => 1, x0: [0, 0], xh0: [0.2, 0], T: 2, dt: 0.001 };
    const est = simulateSfb({ ...opt, useEstimate: true }), tru = simulateSfb({ ...opt, useEstimate: false });
    let maxd = 0, tmax = 0, late = 0;
    for (let i = 0; i < est.t.length; i++) {
      const d = Math.abs(est.x[i][0] - tru.x[i][0]);
      if (d > maxd) { maxd = d; tmax = est.t[i]; }
      if (est.t[i] >= 1.0) late = Math.max(late, d);
    }
    expect(maxd).toBeGreaterThan(0.04);
    expect(maxd).toBeLessThan(0.09);
    expect(tmax).toBeGreaterThan(0.15);
    expect(tmax).toBeLessThan(0.45);
    expect(late).toBeLessThan(0.015);
    expect(est.x[est.x.length - 1][0]).toBeCloseTo(1, 2);
    expect(tru.x[tru.x.length - 1][0]).toBeCloseTo(1, 2);
  });
});
