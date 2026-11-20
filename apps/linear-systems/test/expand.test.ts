import { describe, it, expect } from 'vitest';
import { spk, Hf, cabs, peakBand, ringDigital, squareCoef, squarePowerShare, dB, TAU } from '../src/figs/ex';
import { CAR, CAR_SYM, worn, carA, carModes, minEnergy, rank, ctrbM, obsvM, forceB } from '../src/figs/car';
import { rocFig, rocLeft, rocLeftPeak, orthoAverages, foldCases, dtftPeak, windowBins, fbPoles } from '../src/figs/popexpand';
import { SPEAKER } from '../../../packages/core/src/sceneLsModels';

/* Nov 19 expanded map text (Linear Systems Tutor): the numbers in the new box and line bodies and in the six new pop-up
   figures, recomputed from the app's own models. A failure here means the text disagrees with the model: flag it, don't edit. */
const ph = (c: [number, number]) => (Math.atan2(c[1], c[0]) * 180) / Math.PI;
describe('expanded map numbers agree with the models', () => {
  it('earbud: poles, ζ, rings and the frequency response (LAP, PZ, KICK, TONE, DE, INV)', () => {
    const p = spk();
    expect(p.sigma * 1000).toBeCloseTo(1266.44, 1); expect(Math.round(p.sigma * 1000)).toBe(1266); // the ruling: −1,266 /s
    expect(p.wd * 1000).toBeCloseTo(4321.7, 0); expect(p.fn).toBeCloseTo(716.74, 1); expect(p.zeta).toBeCloseTo(0.2812, 4); expect(p.fd).toBeCloseTo(687.81, 1); expect(1 / p.sigma).toBeCloseTo(0.790, 3);
    expect(1000 / p.fd).toBeCloseTo(1.454, 3); expect(Math.exp(-p.sigma * (1000 / p.fd))).toBeCloseTo(0.159, 3); expect(Math.exp(-p.sigma * 5)).toBeCloseTo(0.0018, 4);
    for (const [f, g, d] of [[200, 1.069, -9.7], [657.6, 1.853, -73.0], [1000, 0.813, -140.3], [3000, 0.060, -171.9], [500, 1.548, -37.4]]) { expect(cabs(Hf(f))).toBeCloseTo(g, 3); expect(ph(Hf(f))).toBeCloseTo(d, 1); }
    const b = peakBand(); expect(b.lo).toBe(394); expect(b.hi).toBe(842); expect(dB(b.peak)).toBeCloseTo(5.36, 2);
  });
  it('earbud realization and critical damping from the SPEAKER constants (RE, JOR)', () => {
    const k = 1 / SPEAKER.Cms, R = SPEAKER.Rms + SPEAKER.Bl ** 2 / SPEAKER.Re, M = SPEAKER.Mms, p = spk();
    expect(k).toBeCloseTo(1703.6, 1); expect(R).toBeCloseTo(0.2128, 4); expect(SPEAKER.Bl / SPEAKER.Re).toBeCloseTo(0.0730, 4);
    expect(p.a0 * 1e6).toBeCloseTo(2.028e7, -4); expect(p.a1 * 1e3).toBeCloseTo(2532.9, 0); expect(SPEAKER.Bl / SPEAKER.Re / M).toBeCloseTo(868.6, 1);
    expect(SPEAKER.Re / SPEAKER.Le).toBeCloseTo(186750, 0); expect(SPEAKER.Re / SPEAKER.Le / (p.wn * 1000)).toBeCloseTo(41.5, 1);
    const Rc = 2 * Math.sqrt(k * M); expect(Rc).toBeCloseTo(0.7566, 4); expect(Rc / R).toBeCloseTo(3.56, 2); expect(1 / p.wn).toBeCloseTo(0.222, 3);
  });
  it('Fourier, sampling, DTFT and windowing (FOUR, FS, PARS, ORTHO, SAMP, DTFT, DFT, WIN) and their figures', () => {
    expect([1, 3, 5].map(squareCoef).map((v) => +v.toFixed(3))).toEqual([1.273, 0.424, 0.255]);
    expect([[1, 200], [3, 600], [5, 1000]].map(([k, f]) => +(squareCoef(k) * cabs(Hf(f))).toFixed(3))).toEqual([1.361, 0.761, 0.207]);
    expect(squarePowerShare(1)).toBeCloseTo(0.8106, 4); expect(squarePowerShare(5)).toBeCloseTo(0.933, 3);
    const o = orthoAverages(); expect(o.a).toBeCloseTo(0.6366, 3); expect(o.b).toBeCloseTo(0.2122, 3); expect(Math.abs(o.c)).toBeLessThan(1e-3); expect(2 * o.a).toBeCloseTo(o.b1, 2); expect(2 * o.b).toBeCloseTo(o.b3, 2);
    const fc = foldCases(); expect([fc.f3, fc.f5, fc.f11]).toEqual([3, 3, 3]); expect(fc.f78).toBeCloseTo(0.2, 9);
    expect(20 * Math.log10(2 / Math.PI)).toBeCloseTo(-3.92, 2); // ZOH droop at fs/2
    const d = ringDigital(8), pk = dtftPeak(); expect(d.r).toBeCloseTo(0.8536, 4); expect((d.th * 180) / Math.PI).toBeCloseTo(30.95, 2); expect(pk.om).toBeCloseTo(0.519, 3); expect(pk.hz).toBeCloseTo(661, 0);
    const wb = windowBins(); expect(wb.rect.map((v) => +v.toFixed(1))).toEqual([-4.7, -3.2, -20.7, -28.1]); expect(wb.hann.map((v) => +v.toFixed(1))).toEqual([-1.5, -1.3, -48.4, -78.7]);
    expect(690 / 125).toBeCloseTo(5.52, 2); expect(64 * Math.log2(64)).toBe(384);
  });
  it('ROC figure: the boundary sits at the poles\' real part', () => { const r = rocFig(); expect(r.sigma).toBeCloseTo(1.2664, 4); expect(r.fd).toBeCloseTo(687.8, 1); });
  it('car: modes, worn, symmetric car, A, ranks, Gramian energies, skyhook (STATE, MODES, STAB, INOUT, CO, OBS, PBH, GRAM, FB)', () => {
    const m = carModes(CAR); expect(m[0].s[0]).toBeCloseTo(-2.092, 3); expect(m[0].s[1]).toBeCloseTo(6.922, 2); expect(m[1].s[0]).toBeCloseTo(-3.178, 3); expect(m[1].s[1]).toBeCloseTo(8.328, 3);
    expect(m[0].zeta).toBeCloseTo(0.289, 3); expect(m[1].zeta).toBeCloseTo(0.357, 3); expect(m[1].node).toBeCloseTo(0.557, 3);
    const wm = carModes(worn(CAR)); expect(wm[0].s[0]).toBeCloseTo(-0.418, 3); expect(wm[0].s[1]).toBeCloseTo(7.22, 2); expect(wm[1].s[0]).toBeCloseTo(-0.636, 3); expect(wm[1].s[1]).toBeCloseTo(8.891, 3);
    const sm = carModes(CAR_SYM); expect(sm[0].fn).toBeCloseTo(1.197, 3); expect(sm[0].zeta).toBeCloseTo(0.282, 3); expect(sm[1].fn).toBeCloseTo(1.344, 3); expect(sm[1].zeta).toBeCloseTo(0.317, 3);
    const A = carA(CAR); expect(A[2][1]).toBeCloseTo(12.4286, 4); expect(A[3][0]).toBeCloseTo(8.70, 2);
    expect(Math.sqrt((CAR.kf + CAR.kr) / CAR.m) / TAU).toBeCloseTo(1.203, 3); expect(Math.sqrt((CAR.kf * CAR.a ** 2 + CAR.kr * CAR.b ** 2) / CAR.J) / TAU).toBeCloseTo(1.375, 3);
    const r = (p: typeof CAR, xs: number[]) => rank(ctrbM(carA(p), forceB(p, xs)), 1e-6);
    expect([r(CAR, [0]), r(CAR_SYM, [0]), r(CAR, [m[1].node]), r(CAR, [CAR.a]), r(CAR_SYM, [CAR.a])]).toEqual([4, 2, 2, 4, 4]);
    const o = (p: typeof CAR, c: number[]) => rank(obsvM(carA(p), [c]), 1e-6);
    expect([o(CAR_SYM, [1, 0, 0, 0]), o(CAR_SYM, [0, 0, 0, 1]), o(CAR, [1, 0, 0, 0]), o(CAR, [1, m[1].node, 0, 0])]).toEqual([2, 2, 4, 2]);
    const E = (xs: number[], T: number) => { const q = minEnergy(CAR, xs, [0, -2 / (180 / Math.PI), 0, 0], T); const us = Array.from({ length: 501 }, (_, i) => q.u((i * T) / 500)); return [q.energy, ...xs.map((_, j) => Math.max(...us.map((u) => Math.abs(u[j]))))]; };
    const e25 = E([CAR.a, -CAR.b], 0.25), e5 = E([CAR.a, -CAR.b], 0.5), e1 = E([CAR.a, -CAR.b], 1), ef = E([CAR.a], 0.5);
    expect(Math.round(e25[0] / 10) * 10).toBe(387240); expect(Math.round(e25[1])).toBe(2002); expect(Math.round(e25[2])).toBe(1750);
    expect(Math.round(e5[0] / 10) * 10).toBe(96160); expect(Math.round(e5[1])).toBe(476); expect(Math.round(e5[2])).toBe(652);
    expect(Math.round(e1[0])).toBe(4564); expect(Math.round(e1[1])).toBe(121); expect(Math.round(e1[2])).toBe(114);
    expect(ef[0] / 1e6).toBeCloseTo(6.999, 3); expect(Math.round(ef[1])).toBe(12885); expect(ef[0] / e5[0]).toBeCloseTo(72.8, 1);
    const F = fbPoles(); expect(F.gk.cf).toBeCloseTo(4316.5, 1); expect(F.gk.cr).toBeCloseTo(4770.9, 1);
    expect(F.sky[0].s[0]).toBeCloseTo(-5.062, 3); expect(F.sky[0].s[1]).toBeCloseTo(5.164, 3); expect(F.sky[1].s[0]).toBeCloseTo(-7.691, 3); expect(F.sky[1].s[1]).toBeCloseTo(4.506, 3);
    expect(F.sky[0].zeta).toBeCloseTo(0.700, 3); expect(F.sky[1].zeta).toBeCloseTo(0.863, 3);
    expect(F.peaks[0]).toBeCloseTo(8.77, 2); expect(F.peaks[1]).toBeCloseTo(6.25, 2); expect(F.settle[0]).toBeCloseTo(1.17, 2); expect(F.settle[1]).toBeCloseTo(0.50, 2);
  });
  it('noise-cancelling residual |1 − g e^(jφ)| (FILT)', () => {
    const res = (g: number, d: number) => 20 * Math.log10(Math.hypot(1 - g * Math.cos((d * Math.PI) / 180), g * Math.sin((d * Math.PI) / 180)));
    expect(res(1, 6)).toBeCloseTo(-19.6, 1); expect(res(0.9, 0)).toBeCloseTo(-20.0, 1); expect(res(1, 30)).toBeCloseTo(-5.7, 1);
  });
});

describe('ROC panel (b): the left-sided signal with the same poles (tutor fix, Nov 19)', () => {
  it('is the ring negated for t < 0, zero after, and grows into the past (×45 by −3 ms, ×2,000 by −6 ms)', async () => {
    const { spk } = await import('../src/figs/ex'); const p = spk();
    expect(rocLeft(0.5)).toBe(0); expect(rocLeft(0)).toBe(0);
    // same formula as the causal ring, negated, on the other side of t = 0 (so the same poles, −σ ± jω_d)
    for (const t of [-0.3, -1.1, -2.2]) expect(rocLeft(t)).toBeCloseTo(-(p.a0 / p.wd) * Math.exp(-p.sigma * t) * Math.sin(p.wd * t), 12);
    expect(p.sigma).toBeCloseTo(1.266, 3);
    const pk = rocLeftPeak();
    expect(Math.round(pk.env3)).toBe(45); expect(Math.round(pk.env6 / 100) * 100).toBe(2000);
    // largest |x| on the drawn window [−3, 1] ms sits at −2.61 ms (the sine's last crest before −3 ms), shown in the axis title
    expect(pk.t).toBeCloseTo(-2.61, 2);
  });
});
