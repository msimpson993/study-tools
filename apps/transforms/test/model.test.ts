import { describe, it, expect } from 'vitest';
import { C, cadd, cmul, cdiv, csub, cabs, cscale, cexpj, TAU, type Cx } from '@study/core/dsp';
import { derive, xt, Xs, Xjw, Xz, type ModelParams } from '../src/model';

const DEF: ModelParams = { A: 1, wave: 'free', mode: 'under', sig: 0.6, f0: 1, dl: 1, fs: 8, M: 32, N: 64 };
// the seven cases of the original page's built-in self-check
const CASES: [string, Partial<ModelParams>][] = [
  ['under', { sig: 0.6, f0: 1 }], ['crit', { mode: 'crit', sig: 2 }], ['over', { mode: 'over', sig: 2.5, dl: 1.5 }],
  ['under_hi', { mode: 'under', sig: 0.4, f0: 3.6 }], ['cos_under', { wave: 'cos', sig: 0.6, f0: 1 }],
  ['cos_crit', { wave: 'cos', mode: 'crit', sig: 2 }], ['cos_over', { wave: 'cos', mode: 'over', sig: 2.5, dl: 1.5 }],
];
const rel = (a: Cx, b: Cx) => cabs(csub(a, b)) / Math.max(1e-12, cabs(b));

describe.each(CASES)('transform pairs agree for %s', (_name, ps) => {
  const S: ModelParams = { ...DEF, ...ps };
  const d = derive(S);

  it('DTFT: Poisson sum = closed-form X(e^{jωT}) = direct Σx[n]e^{−jωnT}', () => {
    const w = TAU * 0.37 * S.fs;
    let sm = C(0);
    for (let k = -40000; k <= 40000; k++) sm = cadd(sm, Xjw(w - TAU * k * S.fs, d, S));
    const poisson = cadd(cscale(sm, 1 / d.T), C(S.A / 2));
    const closed = Xz(cexpj(w * d.T), d, S);
    let direct = C(0);
    for (let n = 0; n < 6000; n++) direct = cadd(direct, cscale(cexpj(-w * n * d.T), xt(n * d.T, d, S)));
    expect(rel(poisson, closed)).toBeLessThan(1e-3);
    expect(rel(direct, closed)).toBeLessThan(1e-9);
  });

  it('Laplace: numerical ∫x(t)e^{−st}dt = X(s)', () => {
    const sv = C(0.7, 2.1), h = 2e-3, Nn = 30000;
    let L = C(0);
    for (let n = 0; n <= Nn; n++) {
      const t = n * h, wgt = (n === 0 || n === Nn) ? 1 : (n % 2 ? 4 : 2);
      L = cadd(L, cscale(cmul(C(xt(t, d, S)), cscale(cexpj(-sv.im * t), Math.exp(-sv.re * t))), wgt * h / 3));
    }
    expect(rel(L, Xs(sv, d, S))).toBeLessThan(1e-6);
  });

  it('Z: direct Σx[n]z^{−n} = X(z) outside the pole radius', () => {
    const zv = cscale(cexpj(0.7), 1.3);
    let Zs = C(0), zp = C(1);
    for (let n = 0; n < 600; n++) { Zs = cadd(Zs, cscale(cdiv(C(1), zp), xt(n * d.T, d, S))); zp = cmul(zp, zv); }
    expect(rel(Zs, Xz(zv, d, S))).toBeLessThan(1e-9);
  });

  it('z-poles are e^{pT}; X(z) vanishes at the zero (or the zero cancels a pole)', () => {
    if (S.mode !== 'over') expect(d.r).toBeCloseTo(Math.exp(-S.sig * d.T), 12);
    expect(cabs(csub(d.q1, cscale(cexpj(d.p1.im * d.T), Math.exp(d.p1.re * d.T))))).toBeLessThan(1e-12);
    if (d.rep && Math.abs(d.zz.re - d.q1.re) < 1e-12) return; // pole-zero cancellation
    expect(cabs(Xz(d.zz, d, S))).toBeLessThan(1e-9);
  });

  it('initial conditions x(0)=A, and x\'(0)=0 for the free response', () => {
    const e = 1e-6, x0 = xt(0, d, S), dx0 = (xt(e, d, S) - x0) / e;
    expect(x0).toBeCloseTo(S.A, 10);
    if (S.wave === 'free') expect(Math.abs(dx0)).toBeLessThan(1e-3);
  });
});

describe('derived quantities', () => {
  it('damping ratio and natural frequency', () => {
    const d = derive({ ...DEF, mode: 'over', sig: 2.5, dl: 1.5 }); // poles −1, −4 → ωn = 2, ζ = 1.25
    expect(d.wn).toBeCloseTo(2, 12); expect(d.zeta).toBeCloseTo(1.25, 12);
  });
  it('aliased tone folds to |f0 − k fs|', () => {
    const d = derive({ ...DEF, f0: 6.5, sig: 0.4 });
    expect(d.aliased).toBe(true); expect(d.fa).toBeCloseTo(1.5, 12);
  });
  it('critical case matches the worked numbers (r ≈ 0.779, zero ≈ 0.584)', () => {
    const d = derive({ ...DEF, mode: 'crit', sig: 2 });
    expect(d.r).toBeCloseTo(Math.exp(-0.25), 12); expect(d.zz.re).toBeCloseTo(0.5841, 3);
  });
});
