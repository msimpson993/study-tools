import { describe, it, expect } from 'vitest';
import { tf, TFError, polyMul, polyAdd, polySub, polyRoots, polyFromRoots, polyEvalReal, polyTrim, polyDeriv, tfSeries, tfParallel, tfFeedback, tfClosedLoop, tfPoles, tfZeros, tfSecondOrder, dcGain, isStable, freqresp, bode, margins, logspace, tf2ss, c2dZoh, lsim, step, impulse, stepMetrics, stepinfo, timeGrid, C, cabs } from '../src/dsp';

const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('polynomials', () => {
  it('multiplies, adds and trims with highest power first', () => {
    expect(polyMul([1, 1], [1, 2])).toEqual([1, 3, 2]);
    expect(polyAdd([1, 0, 0], [2, 1])).toEqual([1, 2, 1]);
    expect(polySub([1, 2], [1, 2])).toEqual([0]);
    expect(polyTrim([0, 0, 3, 1])).toEqual([3, 1]);
    expect(polyDeriv([1, 3, 2])).toEqual([2, 3]);
  });
  it('roots: real, complex pair, zero root, degree 5', () => {
    const r = polyRoots([1, 3, 2]); close(r[0].re, -2); close(r[1].re, -1);
    const c = polyRoots([1, 1, 1]); close(c[0].re, -0.5); close(Math.abs(c[0].im), Math.sqrt(3) / 2); expect(c[0].im).toBe(-c[1].im);
    const z = polyRoots([1, 1, 0]); expect(z.map((x) => x.re).sort()).toEqual([-1, 0]);
    const five = polyFromRoots([C(-1), C(-2), C(-3), C(-0.5, 2), C(-0.5, -2)]);
    const rr = polyRoots(five);
    for (const x of rr) close(polyEvalReal(five, x.re) * (x.im === 0 ? 1 : 0) + 0, 0, 1e-6 * 100);
    expect(rr.map((x) => +x.re.toFixed(6)).sort((a, b) => a - b)).toEqual([-3, -2, -1, -0.5, -0.5]);
  });
  it('a triple root is found to about ε^(1/3) (documented limit)', () => {
    const r = polyRoots([1, 3, 3, 1]);
    for (const x of r) expect(Math.hypot(x.re + 1, x.im)).toBeLessThan(1e-4);
  });
  it('round-trips polyFromRoots', () => { expect(polyFromRoots([C(-1), C(-2)])).toEqual([1, 3, 2]); expect(() => polyFromRoots([C(-1, 1)])).toThrow(TFError); });
});

describe('TF algebra and validation', () => {
  it('tf() makes den monic and trims', () => { const g = tf([0, 2], [2, 4]); expect(g.num).toEqual([1]); expect(g.den).toEqual([1, 2]); });
  it('rejects bad input', () => {
    expect(() => tf([], [1])).toThrow(TFError); expect(() => tf([1], [0])).toThrow(TFError); expect(() => tf([NaN], [1, 1])).toThrow(TFError);
    expect(() => polyRoots([0])).toThrow(TFError);
  });
  it('series, parallel and feedback', () => {
    const a = tf([1], [1, 1]), b = tf([1], [1, 2]);
    expect(tfSeries(a, b).den).toEqual([1, 3, 2]);
    const p = tfParallel(a, b); expect(p.num).toEqual([2, 3]);
    const cl = tfClosedLoop(tf([1], [1, 1])); expect(cl.den).toEqual([1, 2]); close(dcGain(cl), 0.5);
    const pos = tfFeedback(tf([1], [1, 1]), tf([1], [1]), 1); expect(pos.den).toEqual([1, 0]); // positive feedback: pole moves to 0
  });
  it('poles, zeros, DC gain, stability', () => {
    const g = tf([1, 3], [1, 3, 2]); expect(tfZeros(g)[0].re).toBeCloseTo(-3); expect(tfPoles(g).length).toBe(2);
    expect(dcGain(g)).toBeCloseTo(1.5); expect(isStable(g)).toBe(true); expect(isStable(tf([1], [1, 0, 1]))).toBe(false); expect(dcGain(tf([1], [1, 0]))).toBe(Infinity);
  });
});

describe('frequency response', () => {
  it('1/(s+1): |G(j1)| = 1/√2 and phase −45°', () => {
    const g = tf([1], [1, 1]); close(cabs(freqresp(g, 1)), Math.SQRT1_2); const b = bode(g, [0.001, 1, 1000]);
    close(b.phaseDeg[1], -45, 1e-6); close(b.magDb[1], -3.0103, 1e-3); close(b.phaseDeg[2], -90, 0.1);
  });
  it('phase is unwrapped through −180° for 1/(s+1)³ and a pole at the origin starts at −90°', () => {
    const b = bode(tf([1], [1, 3, 3, 1]), logspace(0.01, 100, 400)); close(b.phaseDeg[b.phaseDeg.length - 1], (-3 * Math.atan(100) * 180) / Math.PI, 1e-6);
    const i = bode(tf([1], [1, 1, 0]), [0.001, 1000]); close(i.phaseDeg[0], -90, 0.1); close(i.phaseDeg[1], -180, 0.2);
    expect(bode(tf([-1], [1, 1]), [0.001]).phaseDeg[0]).toBeCloseTo(180, 0);
  });
  it('margins of L = K/(s(s+1)(s+2)): wcg = √2 and GM = 6/K (closed form)', () => {
    const L = tf([1], polyMul([1, 0], polyMul([1, 1], [1, 2]))); // K = 1: GM at K = 6 → 15.56 dB; wcg = √2
    const m = margins(L); close(m.wcg!, Math.SQRT2, 2e-3); close(m.gm!, 6, 0.02); close(m.gmDb!, 15.563, 0.02);
    const L10 = tf([10], polyMul([1, 0], polyMul([1, 1], [1, 2])));
    const m10 = margins(L10); close(m10.gmDb!, 15.563 - 20, 0.05); expect(m10.pm!).toBeLessThan(0); // unstable at K = 10
  });
  it('PM of a 1/s integrator plant with first-order lag: L = 1/(s(s+1)) has wc=0.786 and PM=51.8°', () => {
    const m = margins(tf([1], [1, 1, 0])); close(m.wcp!, 0.7862, 2e-3); close(m.pm!, 51.83, 0.05); expect(m.gm).toBeNull();
  });
});

describe('state space and time response', () => {
  it('tf2ss: controllable canonical form of s²+3s+2 with a zero', () => {
    const ss = tf2ss(tf([1, 5], [1, 3, 2])); expect(ss.A).toEqual([[0, 1], [-2, -3]]); expect(ss.B).toEqual([0, 1]); expect(ss.C).toEqual([5, 1]); expect(ss.D).toBe(0);
    const bi = tf2ss(tf([1, 0, 0], [1, 3, 2])); expect(bi.D).toBe(1);
    expect(() => tf2ss(tf([1, 0, 0, 0], [1, 3, 2]))).toThrow(TFError);
  });
  it('c2dZoh is exact for a first-order lag', () => { const { Ad, Bd } = c2dZoh(tf2ss(tf([1], [1, 1])), 0.1); close(Ad[0][0], Math.exp(-0.1), 1e-12); close(Bd[0], 1 - Math.exp(-0.1), 1e-12); });
  it('step of 1/(s+1) equals 1 − e^{−t} to machine precision', () => {
    const r = step(tf([1], [1, 1]), 5, 501); for (let i = 0; i < r.t.length; i += 50) close(r.y[i], 1 - Math.exp(-r.t[i]), 1e-10);
  });
  it('impulse of 1/((s+1)(s+2)) equals e^{−t} − e^{−2t}', () => {
    const r = impulse(tf([1], [1, 3, 2]), 4, 401); for (let i = 0; i < r.t.length; i += 40) close(r.y[i], Math.exp(-r.t[i]) - Math.exp(-2 * r.t[i]), 1e-10);
  });
  it('lsim validates input and handles initial conditions', () => {
    const t = timeGrid(1, 11); expect(() => lsim(tf([1], [1, 1]), [1, 2], t)).toThrow(TFError); expect(() => lsim(tf([1], [1, 1]), t.map(() => 0), [0, 0.1, 0.3])).toThrow(TFError);
    const r = lsim(tf([1], [1, 1]), t.map(() => 0), t, [2]); close(r.y[10], 2 * Math.exp(-1), 1e-10);
  });
  it('zero in the numerator: step of (s+3)/(s²+3s+2) starts at 0 and ends at 1.5', () => {
    const r = step(tf([1, 3], [1, 3, 2]), 15, 3001); close(r.y[0], 0); close(r.y[3000], 1.5, 1e-5);
  });
});

describe('step metrics', () => {
  it('first order 1/(s+1): Tr = ln 9 = 2.197, Ts(2%) = ln 50 = 3.912, no overshoot, ess = 0', () => {
    const m = stepinfo(tf([1], [1, 1]), { tEnd: 12, n: 6001 });
    close(m.riseTime, Math.log(9), 2e-3); close(m.settlingTime, Math.log(50), 2e-3); close(m.overshootPct, 0, 1e-9); close(m.ess, 0, 1e-12); close(m.yFinal, 1);
  });
  it('second order ζ=0.5, ωn=1: %OS = 16.30 %, Tp = π/√(1−ζ²) = 3.628, Tr ≈ 1.67, Ts(2%) ≈ 8', () => {
    const m = stepinfo(tfSecondOrder(1, 0.5), { tEnd: 30, n: 6001 });
    close(m.overshootPct, 100 * Math.exp((-Math.PI * 0.5) / Math.sqrt(0.75)), 0.01);
    close(m.overshootPct, 16.3, 0.05); close(m.peakTime, Math.PI / Math.sqrt(0.75), 5e-3);
    close(m.riseTime, 1.6, 0.15); expect(m.settlingTime).toBeGreaterThan(6.5); expect(m.settlingTime).toBeLessThan(9);
  });
  it('closed loop with proportional control has a steady-state error ref − K/(1+K)', () => {
    const cl = tfClosedLoop(tf([4], [1, 1])); const m = stepinfo(cl); close(m.yFinal, 0.8); close(m.ess, 0.2);
  });
  it('unstable systems report stable:false and NaNs instead of misleading numbers', () => {
    const m = stepinfo(tf([1], [1, -1])); expect(m.stable).toBe(false); expect(Number.isNaN(m.settlingTime)).toBe(true);
  });
  it('stepMetrics on raw data: negative final values and unsettled records', () => {
    const t = timeGrid(10, 1001), y = t.map((x) => -(1 - Math.exp(-x))); const m = stepMetrics(t, y, { ref: -1 }); close(m.overshootPct, 0, 1e-6); close(m.riseTime, Math.log(9), 5e-3);
    const ramp = stepMetrics(t, t.map((x) => x / 10)); expect(ramp.settled).toBe(false); expect(Number.isNaN(ramp.settlingTime)).toBe(true);
    expect(() => stepMetrics([0, 1], [0, 1])).toThrow(TFError);
  });
});
