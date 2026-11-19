import { describe, it, expect } from 'vitest';
import { a1, a3y, a4, b1y, b2, rocY, alias56 } from '../src/figs/reviewpics';
import { spk, UM_PER_V } from '../src/figs/ex';

// the Review "Picture it." pictures and the worked-example pictures draw these; each matches the walkthrough's own numbers
describe('review pictures: numbers agree with the walkthroughs', () => {
  it('A1: x(n) for n = −3…4 with ROC 2 < |z| < 3', () => {
    const want = [-0.003527, 0.010582, -0.031746, 0.095238, -0.285714, 0.857143, -1.571429, 3.214286];
    want.forEach((v, i) => expect(a1.x(i - 3)).toBeCloseTo(v, 6));
  });
  it('A3: y(n) from the recursion = the closed form, and the listed samples', () => {
    const y = a3y(6), cf = (n: number) => (1 / 3) * 0.5 ** n - (1 / 3) * (-0.25) ** n + (-0.5) ** n;
    y.forEach((v, n) => expect(v).toBeCloseTo(cf(n), 12));
    [1, -0.25, 0.3125, -0.078125, 0.082031, -0.020508].forEach((v, n) => expect(y[n]).toBeCloseTo(v, 6));
  });
  it('A4: λ(0) ≈ 47.9365, u°(0), u°(0.5), u°(1), endpoints and the two costs', () => {
    expect(a4.l0).toBeCloseTo(47.9365, 4); expect(a4.x(0)).toBeCloseTo(1, 12); expect(a4.x(1)).toBeCloseTo(2, 9);
    expect(a4.u(0)).toBeCloseTo(-11.984, 3); expect(a4.u(0.5)).toBeCloseTo(-0.580, 3); expect(a4.u(1)).toBeCloseTo(0.0545, 3);
    const N = 20000; let J = 0, Js = 0; for (let i = 0; i < N; i++) { const t = (i + 0.5) / N; J += (a4.x(t) ** 2 + 2 * a4.u(t) ** 2) / N; Js += ((1 + t) ** 2 + 2 * (1 - 6 * (1 + t)) ** 2) / N; }
    expect(J).toBeCloseTo(24.19, 2); expect(Js).toBeCloseTo(136.3, 1);
    // the path starts on (close to) the stable eigenvector of M and the slopes are 4(6 ± ω)
    expect(a4.kStable).toBeCloseTo(48.166, 3); expect(a4.kUnstable).toBeCloseTo(-0.166, 3);
  });
  it('B1: y(t) = C e^(At) B for the companion system (RK4), y(0⁺) = 1', () => {
    const A = [[0, 1, 0], [0, 0, 1], [2, 1, -2]], f = (x: number[]) => A.map((r) => r[0] * x[0] + r[1] * x[1] + r[2] * x[2]);
    let x = [0, 0, 1]; const dt = 1e-3; for (let i = 0; i < 1500; i++) { const k1 = f(x), k2 = f(x.map((v, j) => v + (dt / 2) * k1[j])), k3 = f(x.map((v, j) => v + (dt / 2) * k2[j])), k4 = f(x.map((v, j) => v + dt * k3[j])); x = x.map((v, j) => v + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); }
    expect(b1y(0)).toBeCloseTo(1, 12); expect(b1y(1.5)).toBeCloseTo(x[0] + x[2], 8);
  });
  it('B2: the three right eigenvectors and the readings 4f + g, f + g, g', () => {
    const A = [[-1, 0, 0], [-2, -2, 0], [1, 1, -3]];
    b2.v.forEach((v, i) => A.forEach((r, k) => expect(r[0] * v[0] + r[1] * v[1] + r[2] * v[2]).toBeCloseTo(b2.lam[i] * v[k], 12)));
    expect(b2.read(1, 0)).toEqual([4, 1, 0]); expect(b2.read(2, 3)).toEqual([11, 5, 3]);
  });
  it('ROC strip: y = h ∗ x by numerical convolution equals ⅓e^(−t)u(t) + ⅓e^(2t)u(−t)', () => {
    for (const t of [-1, -0.3, 0.4, 1.5]) { let s = 0; const d = 1e-4; for (let tau = 0; tau < 40; tau += d) { const xt = t - tau; if (xt < 0) s += Math.exp(-(tau + d / 2)) * Math.exp(2 * (t - tau - d / 2)) * d; } expect(s).toBeCloseTo(rocY(t), 3); }
  });
  it('aliasing: 5 Hz sampled at 6 Hz gives the 1 Hz samples', () => {
    for (const n of alias56.n) expect(Math.cos((2 * Math.PI * alias56.f * n) / alias56.fs)).toBeCloseTo(Math.cos((2 * Math.PI * alias56.fa * n) / alias56.fs), 12);
  });
  it('the speaker chain labels: a₀ = 20.28, a₁ = 2.533 (per ms², per ms), DC gain 42.8 µm/V', () => {
    const p = spk(); expect(p.a0.toFixed(2)).toBe('20.28'); expect(p.a1.toFixed(3)).toBe('2.533'); expect(UM_PER_V.toFixed(1)).toBe('42.8');
  });
});
