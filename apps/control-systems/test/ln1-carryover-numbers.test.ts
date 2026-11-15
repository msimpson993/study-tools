import { describe, it, expect } from 'vitest';

/**
 * Numbers quoted in the "LN1 carry-over" section of the Mini exam 2 review page (Lecture Notes 1, slides 50-72).
 * Each is checked against an RK4 step response of the stated transfer function, not just against the formula.
 */
function stepResponse(num: number[], den: number[], T: number, dt: number) {
  const n = den.length - 1, a = den.slice(1).map((v) => v / den[0]);
  const b = Array(n).fill(0); for (let i = 0; i < num.length; i++) b[n - num.length + i] = num[i] / den[0];
  const f = (x: number[]) => { const d = x.slice(1); let last = 1; for (let i = 0; i < n; i++) last -= a[n - 1 - i] * x[i]; d.push(last); return d; };
  const out = (x: number[]) => { let y = 0; for (let i = 0; i < n; i++) y += b[n - 1 - i] * x[i]; return y; };
  let x = Array(n).fill(0); const ys = [0];
  for (let k = 0; k < Math.round(T / dt); k++) {
    const k1 = f(x), k2 = f(x.map((v, i) => v + dt / 2 * k1[i])), k3 = f(x.map((v, i) => v + dt / 2 * k2[i])), k4 = f(x.map((v, i) => v + dt * k3[i]));
    x = x.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); ys.push(out(x));
  }
  return ys;
}
const DT = 0.0005;
const peak = (ys: number[]) => { let m = 0, k = 0; ys.forEach((v, i) => { if (v > m) { m = v; k = i; } }); return { v: m, t: k * DT }; };
const settle = (ys: number[], fv: number, band: number) => { for (let i = ys.length - 1; i >= 0; i--) if (Math.abs(ys[i] - fv) > band * Math.abs(fv)) return (i + 1) * DT; return 0; };
const rise = (ys: number[], fv: number) => { const t = (lvl: number) => ys.findIndex((v) => v >= lvl * fv) * DT; return t(0.9) - t(0.1); };
const os = (z: number) => 100 * Math.exp(-z * Math.PI / Math.sqrt(1 - z * z));

describe('carry-over problem 1: 3/(s^2 + 2s + 3)', () => {
  const wn = Math.sqrt(3), z = 1 / Math.sqrt(3), ys = stepResponse([3], [1, 2, 3], 20, DT);
  it('wn = sqrt3, zeta = 1/sqrt3 = 0.577, wd = sqrt2 from matching the coefficients', () => {
    expect(wn ** 2).toBeCloseTo(3, 12); expect(2 * z * wn).toBeCloseTo(2, 12);
    expect(z).toBeCloseTo(0.577, 3); expect(wn * Math.sqrt(1 - z * z)).toBeCloseTo(Math.SQRT2, 12);
  });
  it('percent overshoot 10.8 % (10.85), peak time pi/sqrt2 = 2.22 s, final value 1: formula and simulation agree', () => {
    expect(os(z)).toBeCloseTo(10.85, 2);
    const pk = peak(ys); expect((pk.v - 1) * 100).toBeCloseTo(os(z), 1); expect(pk.t).toBeCloseTo(Math.PI / Math.SQRT2, 2); expect(pk.t).toBeCloseTo(2.22, 2);
    expect(ys[ys.length - 1]).toBeCloseTo(1, 6);
  });
  it('Ts = 4/(zeta wn) = 4 s (the simulated 2 % settling time is close: the formula is an approximation); 10-90 % rise 1.07 s vs the slide formula', () => {
    expect(4 / (z * wn)).toBeCloseTo(4, 12);
    expect(Math.abs(settle(ys, 1, 0.02) - 4)).toBeLessThan(0.6);
    const tr = (2.16 * z + 0.6) / wn; expect(tr).toBeCloseTo(1.07, 2); expect(Math.abs(rise(ys, 1) - tr)).toBeLessThan(0.12);
  });
});

describe('carry-over problem 2: the cart with K = 7', () => {
  const K = 7, den = [1, 3, 2 + K], ys = stepResponse([K], den, 20, DT), wn = Math.sqrt(2 + K), z = 3 / (2 * wn);
  it('closed loop 7/(s^2 + 3s + 9): wn = 3, zeta = 0.5, poles -1.5 +- j2.60', () => {
    expect(wn).toBe(3); expect(z).toBe(0.5); expect(wn * Math.sqrt(1 - z * z)).toBeCloseTo(2.598, 3);
  });
  it('DC gain 7/9 and e_ss = 2/9 = 1/(1 + K G(0)) with G(0) = 1/2', () => {
    expect(ys[ys.length - 1]).toBeCloseTo(7 / 9, 6);
    expect(1 - 7 / 9).toBeCloseTo(2 / 9, 12); expect(1 / (1 + K * 0.5)).toBeCloseTo(2 / 9, 12);
  });
  it('overshoot 16.3 % of the final value (peak 0.905), Tp = 1.21 s, Ts = 2.67 s, Tr1 = 0.56 s', () => {
    expect(os(z)).toBeCloseTo(16.3, 1);
    const pk = peak(ys); expect(pk.v).toBeCloseTo(7 / 9 * (1 + os(z) / 100), 4); expect(pk.v).toBeCloseTo(0.905, 3);
    expect(pk.t).toBeCloseTo(Math.PI / (3 * Math.sqrt(0.75)), 2); expect(pk.t).toBeCloseTo(1.21, 2);
    expect(4 / (z * wn)).toBeCloseTo(2.667, 3); expect((2.16 * z + 0.6) / wn).toBeCloseTo(0.56, 12);
    expect(Math.abs(settle(ys, 7 / 9, 0.02) - 2.67)).toBeLessThan(0.5);
    expect(Math.abs(rise(ys, 7 / 9) - 0.56)).toBeLessThan(0.08);
  });
});

describe('carry-over problem 3: P versus PI on G = 4/(2s + 1)', () => {
  it('P, Kp = 2: closed loop 8/(2s + 9), e_ss = 1/(1 + Kp K) = 1/9, time constant tau/(1 + Kp K) = 2/9', () => {
    const ys = stepResponse([8], [2, 9], 10, DT);
    expect(ys[ys.length - 1]).toBeCloseTo(8 / 9, 6); expect(1 - ys[ys.length - 1]).toBeCloseTo(1 / 9, 6);
    expect(1 / (1 + 2 * 4)).toBeCloseTo(1 / 9, 12);
    const tau = 2 / 9, i = Math.round(tau / DT); expect(ys[i]).toBeCloseTo((8 / 9) * (1 - Math.exp(-1)), 3);
  });
  it('PI, Gc = (2s + 3)/s: closed loop 4(2s + 3)/(2s^2 + 9s + 12) is stable, e_ss = 0, poles -2.25 +- j0.97, zeta 0.92', () => {
    // L = 4(2s+3)/(s(2s+1)); 1 + L = (2s^2 + 9s + 12)/(s(2s+1)); T = L/(1+L) = (8s + 12)/(2s^2 + 9s + 12)
    const ys = stepResponse([8, 12], [2, 9, 12], 30, DT);
    expect(ys[ys.length - 1]).toBeCloseTo(1, 6);
    const a = 2, b = 9, c = 12, re = -b / (2 * a), im = Math.sqrt(4 * a * c - b * b) / (2 * a);
    expect(re).toBeCloseTo(-2.25, 12); expect(im).toBeCloseTo(0.968, 3);
    expect((b / a) / (2 * Math.sqrt(c / a))).toBeCloseTo(0.92, 2);
  });
});

describe('slides 62-72 formulas used in the quiz', () => {
  it('PD on 1/(s(Js + B)): J = 1, B = 1, Kp = 4, Kd = 1 gives zeta = 0.5; Kd = 0 gives 0.25; ramp error B/Kp = 0.25', () => {
    const zeta = (B: number, Kd: number, Kp: number, J: number) => (B + Kd) / (2 * Math.sqrt(Kp * J));
    expect(zeta(1, 1, 4, 1)).toBe(0.5); expect(zeta(1, 0, 4, 1)).toBe(0.25); expect(1 / 4).toBe(0.25);
    // Js^2 + (B + Kd)s + Kp: the step-response overshoot of Kp/(Js^2 + (B+Kd)s + Kp) is os(zeta)
    const ys = stepResponse([4], [1, 2, 4], 20, DT); expect((peak(ys).v - 1) * 100).toBeCloseTo(os(0.5), 1);
  });
  it('critically damped c(t) = 1 - e^(-wn t)(1 + wn t) is the step response of wn^2/(s + wn)^2', () => {
    const wn = 2, ys = stepResponse([wn * wn], [1, 2 * wn, wn * wn], 8, DT);
    for (const t of [0.5, 1, 3]) expect(ys[Math.round(t / DT)]).toBeCloseTo(1 - Math.exp(-wn * t) * (1 + wn * t), 6);
    expect(Math.max(...ys)).toBeLessThanOrEqual(1 + 1e-9); // no overshoot
  });
  it('P on 1/(Js^2): poles +-j sqrt(Kp/J), the step response oscillates forever (no decay)', () => {
    const J = 2, Kp = 8, ys = stepResponse([Kp], [J, 0, Kp], 40, DT), w = Math.sqrt(Kp / J);
    expect(ys[Math.round(Math.PI / w / DT)]).toBeCloseTo(2, 4); // 1 - cos(pi) = 2, still the full amplitude
    expect(Math.max(...ys.slice(-8000))).toBeGreaterThan(1.99);
  });
});
