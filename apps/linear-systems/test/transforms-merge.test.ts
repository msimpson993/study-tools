/** Numbers added to the linear-systems dives when the transforms page was folded in (window menu, reconstruction droop, peak width). */
import { describe, it, expect } from 'vitest';
import { windowMetrics } from '../../../packages/core/src/dsp/windows';
import { peakBand, spk, Hf, cabs } from '../src/figs/ex';

describe('window menu in the windowing dive (M = 64)', () => {
  const row = (k: Parameters<typeof windowMetrics>[0], beta?: number) => windowMetrics(k, 64, { beta });
  it.each([
    // window, peak side lobe dB, scalloping dB, ENBW bins, main lobe bins
    ['rect', -13, 3.9, 1.0, 2], ['hann', -31, 1.4, 1.5, 4], ['bh', -92, 0.8, 2.0, 8], ['flattop', -88, 0.01, 3.77, 10],
  ] as const)('%s', (k, psl, scal, enbw, ml) => {
    const m = row(k);
    expect(Math.round(m.psl)).toBe(psl);
    expect(+m.scal.toFixed(scal < 0.1 ? 2 : 1)).toBe(scal);
    expect(+m.enbw.toFixed(2)).toBe(enbw);
    expect(m.ml).toBe(ml);
  });
  it('Kaiser β = 6, periodic like the rest: −44 dB, 1.5 dB, 1.47 bins, about 4.3 bins (symmetric would be 1.49)', () => {
    const m = windowMetrics('kaiser', 64, { beta: 6, periodic: true });
    expect(Math.round(m.psl)).toBe(-44); expect(+m.scal.toFixed(1)).toBe(1.5); expect(+m.enbw.toFixed(2)).toBe(1.47); expect(+m.ml.toFixed(1)).toBe(4.3);
    expect(+windowMetrics('kaiser', 64, { beta: 6 }).enbw.toFixed(2)).toBe(1.49);
  });
  it('half-bin loss for the rectangular window is 1/(N sin(π/2N)) → 2/π, 3.9 dB (quiz tr-leak-1)', () => {
    const N = 64, g = 1 / (N * Math.sin(Math.PI / (2 * N)));
    expect(g).toBeCloseTo(2 / Math.PI, 3); expect(-20 * Math.log10(g)).toBeCloseTo(3.92, 2);
  });
});

describe('reconstruction droop in the sampling dive', () => {
  const sinc = (x: number) => Math.sin(Math.PI * x) / (Math.PI * x);
  it('ZOH is about 3.9 dB down at fs/2; the straight-chord (triangle) hold, its square, about 7.8 dB', () => {
    expect(-20 * Math.log10(sinc(0.5))).toBeCloseTo(3.92, 2);
    expect(-20 * Math.log10(sinc(0.5) ** 2)).toBeCloseTo(7.84, 2);
  });
  it('the causal extrapolating FOH (Franklin–Powell/Ogata) rises about +2.5 dB at fs/2', () => {
    // h(t) = 1 + t/T on [0, T), 1 − t/T on [T, 2T): H(jω) = T(1 + jωT)((1 − e^(−jωT))/(jωT))², DC gain T
    const w = Math.PI; // ωT at fs/2
    const closed = 20 * Math.log10(Math.hypot(1, w) * (2 / w) ** 2);
    let re = 0, im = 0; const dt = 1e-5; for (let t = dt / 2; t < 2; t += dt) { const h = t < 1 ? 1 + t : 1 - t; re += h * Math.cos(w * t) * dt; im -= h * Math.sin(w * t) * dt; }
    expect(closed).toBeCloseTo(2.517, 3); expect(20 * Math.log10(Math.hypot(re, im))).toBeCloseTo(2.517, 3);
  });
});

describe('peak width in the Fourier dive', () => {
  it('σ/π ≈ 403 Hz; the earbud half-power band is 394–842 Hz, 448 Hz wide', () => {
    expect(spk().sigma * 1000 / Math.PI).toBeCloseTo(403, 0);
    const b = peakBand();
    expect(b.lo).toBe(394); expect(b.hi).toBe(842); expect(b.hi - b.lo).toBe(448);
    expect(1 - 403 / 448).toBeCloseTo(0.10, 2); // σ/π is about 10% low at ζ ≈ 0.28
  });
  it('the band is lopsided: 264 Hz below the 658 Hz peak, 185 Hz above; a half-power band needs ζ ≲ 0.38', () => {
    let pk = 0, fp = 0; for (let f = 300; f <= 1000; f += 0.01) { const g = cabs(Hf(f)); if (g > pk) { pk = g; fp = f; } }
    let lo = 0, hi = 0; for (let f = 300; f <= 1000; f += 0.01) if (cabs(Hf(f)) >= pk / Math.SQRT2) { if (!lo) lo = f; hi = f; }
    expect(Math.round(fp)).toBe(658); expect(Math.round(fp - lo)).toBe(264); expect(Math.round(hi - fp)).toBe(185);
    // peak / bass = 1/(2ζ√(1−ζ²)) > √2  ⇔  ζ² < (1 − √½)/2
    const zmax = Math.sqrt((1 - Math.SQRT1_2) / 2); expect(zmax).toBeCloseTo(0.383, 3);
    const z = 0.38, ratio = 1 / (2 * z * Math.sqrt(1 - z * z)); expect(ratio).toBeGreaterThan(Math.SQRT2);
  });
  it('board DFT question: fs = 8 Hz, N = 32, f₀ = 1 Hz → bins 4 and 28 (quiz tr-dft-1)', () => {
    const df = 8 / 32, k = 1 / df; expect(k).toBe(4); expect(32 - k).toBe(28);
  });
});
