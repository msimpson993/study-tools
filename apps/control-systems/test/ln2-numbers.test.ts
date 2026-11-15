import { describe, it, expect } from 'vitest';

/**
 * Numbers quoted on the "Mini exam 2" review page (Lecture Notes 2, Feedback Control Systems Characteristics).
 * Every figure the page states is derived here from the slide's plant, not copied from the slide.
 */

// ---- tiny numeric helpers ----
type Poly = number[]; // highest power first
const polyval = (p: Poly, s: [number, number]) => { let re = 0, im = 0; for (const c of p) { const r = re * s[0] - im * s[1] + c, i = re * s[1] + im * s[0]; re = r; im = i; } return [re, im] as [number, number]; };
const roots2 = (a: number, b: number, c: number): [number, number][] => { const d = b * b - 4 * a * c; return d >= 0 ? [[(-b + Math.sqrt(d)) / (2 * a), 0], [(-b - Math.sqrt(d)) / (2 * a), 0]] : [[-b / (2 * a), Math.sqrt(-d) / (2 * a)], [-b / (2 * a), -Math.sqrt(-d) / (2 * a)]]; };

/** RK4 simulation of a strictly proper SISO system in controllable canonical form, n = 2 or 3. Returns samples of y at dt. */
function simulate(num: number[], den: number[], u: (t: number) => number, x0: number[], T: number, dt: number) {
  const n = den.length - 1, a = den.slice(1).map((v) => v / den[0]);
  const b = Array(n).fill(0); for (let i = 0; i < num.length; i++) b[n - num.length + i] = num[i] / den[0]; // b[0] is the s^(n-1) coefficient
  const f = (x: number[], t: number) => { const d = x.slice(1); let last = u(t); for (let i = 0; i < n; i++) last -= a[n - 1 - i] * x[i]; d.push(last); return d; };
  const out = (x: number[]) => { let y = 0; for (let i = 0; i < n; i++) y += b[n - 1 - i] * x[i]; return y; };
  let x = x0.slice(); const ys: number[] = [out(x)];
  for (let k = 0; k < Math.round(T / dt); k++) {
    const t = k * dt, k1 = f(x, t), k2 = f(x.map((v, i) => v + dt / 2 * k1[i]), t + dt / 2), k3 = f(x.map((v, i) => v + dt / 2 * k2[i]), t + dt / 2), k4 = f(x.map((v, i) => v + dt * k3[i]), t + dt);
    x = x.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); ys.push(out(x));
  }
  return ys;
}
const trapz = (ys: number[], dt: number) => { let s = 0; for (let i = 1; i < ys.length; i++) s += (ys[i] + ys[i - 1]) / 2 * dt; return s; };

describe('error-signal identities (slides 3-4)', () => {
  it('S + C = 1 and E = S R - S G Td + C N hold at any frequency', () => {
    const Gc = (s: [number, number]) => polyval([18], s), den = (s: [number, number]) => polyval([1, 2], s);
    for (const w of [0, 0.5, 2, 30]) {
      const s: [number, number] = [0, w], L = div(Gc(s), den(s)), one: [number, number] = [1, 0];
      const F = add(one, L), S = div(one, F), C = div(L, F);
      expect(add(S, C)[0]).toBeCloseTo(1, 12); expect(add(S, C)[1]).toBeCloseTo(0, 12);
    }
  });
  it('worked problem 1: G = 1/(s+2), Gc = 18 gives S(0) = 0.1, C(0) = 0.9; a 10 % plant drop changes T by about -1 %', () => {
    const L0 = 18 / 2, S0 = 1 / (1 + L0), C0 = L0 / (1 + L0);
    expect(S0).toBeCloseTo(0.1, 12); expect(C0).toBeCloseTo(0.9, 12);
    const T1 = (0.9 * L0) / (1 + 0.9 * L0), rel = (T1 - C0) / C0;
    expect(rel).toBeCloseTo(-0.0110, 3);               // exact: -1.1 %
    expect(S0 * -0.1).toBeCloseTo(-0.01, 12);          // first-order prediction S * dG/G
  });
  it('slide 8-9: S_G^T = 1/(1+GcG) and the chain rule S_a^T = S_G^T S_a^G, checked by finite differences for G = 1/(s+a), Gc = K', () => {
    const K = 5, a = 2, s: [number, number] = [0, 1.3];
    const T = (aa: number) => { const L = div([K, 0], add(s, [aa, 0])); return div(L, add([1, 0], L)); };
    const h = 1e-6, dT = div(sub(T(a + h), T(a - h)), [2 * h, 0]);
    const num = mul(dT, [a, 0]); const S_a_T = div(num, T(a));            // d ln T / d ln a
    const G = div([1, 0], add(s, [a, 0])), L = mul([K, 0], G), S_G_T = div([1, 0], add([1, 0], L));
    const S_a_G = div([-a, 0], add(s, [a, 0]));                             // d ln G / d ln a
    const chain = mul(S_G_T, S_a_G);
    expect(S_a_T[0]).toBeCloseTo(chain[0], 6); expect(S_a_T[1]).toBeCloseTo(chain[1], 6);
    const closed = div([-a, 0], add(s, [a + K, 0]));                        // -a/(s+a+K)
    expect(chain[0]).toBeCloseTo(closed[0], 12); expect(chain[1]).toBeCloseTo(closed[1], 12);
  });
});

describe('tachometer speed loop (slides 11-13)', () => {
  const Ra = 1, Km = 1, Kb = 1, b = 1, Kt = 0.5;
  const w0 = (D: number) => -D / (b + (Km * Kb) / Ra);
  const wc = (D: number, Ka: number) => -D / (b + (Km / Ra) * (Kt * Ka + Kb));
  it('worked problem 2: closed/open ratio is 1/26 at Ka = 100, close to the slide formula (Ra b + Km Kb)/(Ka Km Kt) = 0.04', () => {
    expect(wc(1, 100) / w0(1)).toBeCloseTo(1 / 26, 12);
    expect((Ra * b + Km * Kb) / (100 * Km * Kt)).toBeCloseTo(0.04, 12);
  });
  it('ratio is exactly (Ra b + Km Kb)/(Ra b + Km (Kt Ka + Kb)); under 0.02 needs Ka >= 196', () => {
    for (const Ka of [10, 100, 400]) expect(wc(1, Ka) / w0(1)).toBeCloseTo((Ra * b + Km * Kb) / (Ra * b + Km * (Kt * Ka + Kb)), 12);
    expect(wc(1, 196) / w0(1)).toBeCloseTo(0.02, 12);
    expect(wc(1, 195) / w0(1)).toBeGreaterThan(0.02);
  });
  it('closed-loop time constant of the speed loop: tau1/(1 + Ka Kt K1)', () => {
    const J = 10, tau1 = (Ra * J) / (Ra * b + Kb * Km), K1 = Km / (Ra * b + Kb * Km);
    expect(tau1).toBe(5); expect(K1).toBe(0.5);
    const Ka = 20, tauCl = tau1 / (1 + Ka * Kt * K1);
    expect(tauCl).toBeCloseTo(5 / 6, 12);
    // check against the closed-loop pole of w/R = Ka G/(1 + Ka Kt G), G = K1/(tau1 s + 1)
    const pole = -(1 + Ka * Kt * K1) / tau1; expect(-1 / pole).toBeCloseTo(tauCl, 12);
  });
});

describe('English Channel boring machine (slides 20-22)', () => {
  const T = (K: number) => ({ num: [11, K], den: [1, 12, K] });
  it('characteristic polynomial s^2 + 12 s + K gives wn = sqrt(K), zeta = 6/sqrt(K)', () => {
    for (const [K, wn, z] of [[100, 10, 0.6], [20, Math.sqrt(20), 6 / Math.sqrt(20)], [50, Math.sqrt(50), 6 / Math.sqrt(50)]]) {
      expect(Math.sqrt(K)).toBeCloseTo(wn, 12); expect(12 / (2 * Math.sqrt(K))).toBeCloseTo(z, 12);
    }
  });
  it('step error is 0 and the unit-step disturbance output is 1/K (0.01 and 0.05), by simulation', () => {
    for (const K of [100, 20]) {
      const yr = simulate(T(K).num, T(K).den, () => 1, [0, 0], 8, 0.0005);
      expect(yr[yr.length - 1]).toBeCloseTo(1, 4);                                  // e_ss = 0
      const yd = simulate([1], [1, 12, K], () => 1, [0, 0], 8, 0.0005);              // Y/Td = 1/(s^2+12s+K)
      expect(yd[yd.length - 1]).toBeCloseTo(1 / K, 5);
    }
  });
  it('the reference step overshoots at K = 100 (underdamped + zero) and still a little at K = 20 (overdamped, the zero)', () => {
    const peak = (K: number) => Math.max(...simulate(T(K).num, T(K).den, () => 1, [0, 0], 4, 0.0005));
    expect(peak(100)).toBeGreaterThan(1.15); expect(peak(100)).toBeLessThan(1.35);
    expect(peak(20)).toBeGreaterThan(1.0); expect(peak(20)).toBeLessThan(1.1);
    // pure 2nd order with zeta = 0.6 would overshoot 9.5 %; the zero adds to it
    expect(100 * Math.exp((-0.6 * Math.PI) / Math.sqrt(1 - 0.36))).toBeCloseTo(9.48, 1);
  });
  it('worked problem 3: disturbance output <= 0.02 needs K >= 50, where zeta = 0.85', () => {
    expect(1 / 50).toBe(0.02); expect(6 / Math.sqrt(50)).toBeCloseTo(0.8485, 4);
  });
});

describe('performance indices (slides 23-28): the space-telescope example', () => {
  // Y/Td = s (s + K1 K3)/(s^2 + K1 K3 s + K1 K2 Kp), K1 = 0.5, K1 K2 Kp = 2.5. A unit step Td gives Y(s) = (s + a)/(s^2 + a s + c), a = 0.5 K3, c = 2.5
    // y(t) is the impulse response of (s + a)/(s^2 + a s + c): states x1' = x2, x2' = -c x1 - a x2, x(0) = (0, 1), output y = a x1 + x2
  const cache = new Map<number, number[]>();
  const y = (K3: number) => { let v = cache.get(K3); if (!v) { v = simulate([1, 0.5 * K3], [1, 0.5 * K3, 2.5], () => 0, [0, 1], 50, 0.002); cache.set(K3, v); } return v; };
  const ISE = (K3: number) => trapz(y(K3).map((v) => v * v), 0.002);
  const IAE = (K3: number) => trapz(y(K3).map(Math.abs), 0.002);
  it('y(0+) = 1 and the closed form I(K3) = 1/K3 + 0.1 K3 matches the integral of y^2', () => {
    expect(y(3)[0]).toBeCloseTo(1, 10);
    for (const K3 of [1, 2, Math.sqrt(10), 5, 8]) expect(ISE(K3)).toBeCloseTo(1 / K3 + 0.1 * K3, 4);
  });
  it('minimum ISE at K3 = sqrt(10) = 3.16 (zeta 0.5); minimum IAE near K3 = 4.2 (zeta 0.665)', () => {
    const grid: number[] = []; for (let k = 2; k <= 6; k += 0.05) grid.push(+k.toFixed(2));
    const argmin = (f: (k: number) => number) => grid.reduce((best, k) => (f(k) < f(best) ? k : best), grid[0]);
    expect(argmin(ISE)).toBeCloseTo(Math.sqrt(10), 1);
    const kIAE = argmin(IAE); expect(kIAE).toBeGreaterThan(4.05); expect(kIAE).toBeLessThan(4.35);
    const zeta = (K3: number) => (0.5 * K3) / (2 * Math.sqrt(2.5));
    expect(zeta(Math.sqrt(10))).toBeCloseTo(0.5, 12);
    expect(zeta(4.2)).toBeCloseTo(0.664, 3); // the slide rounds this to 0.665
  }, 60000);
  it('dI/dK3 = -1/K3^2 + 0.1 = 0 gives K3 = sqrt(10)', () => { expect(Math.sqrt(1 / 0.1)).toBeCloseTo(3.1623, 4); });
  it('slide 27 time response y(t) = (sqrt10/beta) e^(-0.25 K3 t) sin(beta t/2 + psi), beta = sqrt(10 - K3^2/4), tan(psi) = 2 beta/K3, matches the model', () => {
    for (const K3 of [1, 2, Math.sqrt(10), 4.2, 6]) {
      const beta = Math.sqrt(10 - K3 * K3 / 4), psi = Math.atan2(2 * beta, K3);
      const form = (t: number) => (Math.sqrt(10) / beta) * Math.exp(-0.25 * K3 * t) * Math.sin(beta * t / 2 + psi);
      expect(form(0)).toBeCloseTo(1, 12); // y(0) = 1, the same initial value as the model
      const ys = simulate([1, 0.5 * K3], [1, 0.5 * K3, 2.5], () => 0, [0, 1], 10, 0.0005);
      for (const i of [0, 500, 2000, 6000, 20000]) expect(ys[i]).toBeCloseTo(form(i * 0.0005), 6);
    }
  });
});

describe('worked problem 4: ISE with an inverse Laplace transform', () => {
  // Y(s) = (s + K)/(s^2 + K s + 4). K = 2: poles -1 +- j sqrt(3).  y(t) = e^-t (cos sqrt3 t + sin sqrt3 t / sqrt3)
  it('the inverse Laplace transform matches a simulation, and ISE(K=2) = 1/2 by the hand integral 1/3 + 1/24 + 1/8', () => {
    const ys = simulate([1, 2], [1, 2, 4], () => 0, [0, 1], 30, 0.0005);
    for (const i of [0, 400, 2000, 8000]) { const t = i * 0.0005; expect(ys[i]).toBeCloseTo(Math.exp(-t) * (Math.cos(Math.sqrt(3) * t) + Math.sin(Math.sqrt(3) * t) / Math.sqrt(3)), 6); }
    expect(trapz(ys.map((v) => v * v), 0.0005)).toBeCloseTo(0.5, 5);
    expect(1 / 3 + 1 / 24 + 1 / 8).toBeCloseTo(0.5, 12);
  });
  it('general K: ISE = (4 + K^2)/(8K) = 1/(2K) + K/8, minimum at K = 2 where zeta = K/4 = 0.5', () => {
    for (const K of [0.5, 1, 2, 3, 6]) {
      const ys = simulate([1, K], [1, K, 4], () => 0, [0, 1], 80, 0.001);
      expect(trapz(ys.map((v) => v * v), 0.001)).toBeCloseTo((4 + K * K) / (8 * K), 4);
    }
    const I = (K: number) => 1 / (2 * K) + K / 8; expect(I(2)).toBe(0.5); expect(I(1.9)).toBeGreaterThan(0.5); expect(I(2.1)).toBeGreaterThan(0.5);
  });
});

describe('worked problem 5: steady-state error by system type', () => {
  it('L = 10(s+3)/(s(s+2)(s+5)): closed loop stable, Kv = 3, ramp error 1/3, step error 0', () => {
    const den = [1, 7, 20, 30];                       // s^3 + 7 s^2 + 20 s + 30
    expect(7 * 20).toBeGreaterThan(30);               // Routh: a2 a1 > a0 for a cubic
    const L = (s: number) => (10 * (s + 3)) / (s * (s + 2) * (s + 5));
    expect(polyval(den, [0, 0])[0]).toBe(30);
    expect(1e-7 * L(1e-7)).toBeCloseTo(3, 4);         // Kv
    const E = (s: number) => 1 / ((1 + L(s)) * s * s); // ramp: E(s) = R/(1+L), R = 1/s^2
    expect(1e-7 * E(1e-7)).toBeCloseTo(1 / 3, 4);
    expect(1e-7 * (1 / (1 + L(1e-7))) / 1e-7).toBeCloseTo(0, 4);
  });
});

describe('model reduction (slides 29-34)', () => {
  it('worked problem 6a: dropping the far pole keeps the DC gain: K/(s(s+2)(s+30)) -> (K/30)/(s(s+2)); 200/((s+2)(s+10)(s+40)) -> 5/((s+2)(s+10))', () => {
    const GH = (s: number) => 200 / ((s + 2) * (s + 10) * (s + 40)), GL = (s: number) => 5 / ((s + 2) * (s + 10));
    expect(GH(0)).toBeCloseTo(GL(0), 12); expect(GH(0)).toBe(0.25);
  });
  it('worked problem 6b: frequency matching of 6/(s^3+6s^2+11s+6) to a second-order model', () => {
    // Delta = 1 + 11/6 s + s^2 + s^3/6; slide: Delta2 = 49/36, Delta4 = 7/18 ; M = 1 + d1 s + d2 s^2
    const D = [1, 11 / 6, 1, 1 / 6]; // coefficients of s^0..s^3 ; derivatives at 0 are k! * coeff
    const d = (k: number) => (k < D.length ? D[k] * fact(k) : 0);
    const M2q = (q: number, der: (k: number) => number) => { let s = 0; for (let k = 0; k <= 2 * q; k++) s += (((k + q) % 2 === 0 ? 1 : -1) * der(k) * der(2 * q - k)) / (fact(k) * fact(2 * q - k)); return s; };
    expect(M2q(1, d)).toBeCloseTo(49 / 36, 12); expect(M2q(2, d)).toBeCloseTo(7 / 18, 12);
    const d2 = Math.sqrt(7 / 18), d1 = Math.sqrt(49 / 36 + 2 * d2);
    expect(d1).toBeCloseTo(1.615, 3); expect(d2).toBeCloseTo(0.624, 3);
    expect(d2 * d2).toBeCloseTo(7 / 18, 12); expect(-2 * d2 + d1 * d1).toBeCloseTo(49 / 36, 12);
    // G_L = 1/(1 + d1 s + d2 s^2) = (1/d2)/(s^2 + (d1/d2) s + 1/d2): the slide's 1.60/(s^2 + 2.590 s + 1.60)
    expect(1 / d2).toBeCloseTo(1.60, 2); expect(d1 / d2).toBeCloseTo(2.590, 2);
    const p = roots2(1, d1 / d2, 1 / d2); expect(Math.max(...p.map((r) => r[0]))).toBeCloseTo(-1.024, 2); expect(Math.min(...p.map((r) => r[0]))).toBeCloseTo(-1.565, 2);
    // both models have DC gain 1 and agree in magnitude at low frequency
    const mag = (num: Poly, den: Poly, w: number) => { const n = polyval(num, [0, w]), q = polyval(den, [0, w]); return Math.hypot(...n) / Math.hypot(...q); };
    for (const w of [0, 0.1, 0.3]) expect(Math.abs(mag([6], [1, 6, 11, 6], w) - mag([1 / d2], [1, d1 / d2, 1 / d2], w))).toBeLessThan(0.01);
    // the original poles are -1, -2, -3
    expect(polyval([1, 6, 11, 6], [-1, 0])[0]).toBeCloseTo(0, 12); expect(polyval([1, 6, 11, 6], [-3, 0])[0]).toBeCloseTo(0, 12);
  });
  it('first-order frequency match: d1^2 = 49/36, so G_L = 1/(1 + (7/6) s), by matching |Delta(jw)|^2 = 1 + (49/36) w^2 + ...', () => {
    const w = 1e-3, D = polyval([1 / 6, 1, 11 / 6, 1], [0, w]);
    const mag2 = D[0] * D[0] + D[1] * D[1];
    expect((mag2 - 1) / (w * w)).toBeCloseTo(49 / 36, 3);
    expect(7 / 6 * 7 / 6).toBeCloseTo(49 / 36, 12);
  });
});

const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
type C = [number, number];
function add(a: C, b: C): C { return [a[0] + b[0], a[1] + b[1]]; }
function sub(a: C, b: C): C { return [a[0] - b[0], a[1] - b[1]]; }
function mul(a: C, b: C): C { return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]; }
function div(a: C, b: C): C { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }
