import { describe, it, expect } from 'vitest';
import { simulateCart, cartEigs, tineX, tineSpectrum, TINE, CART, sceneLayout, sceneRestTime, sceneDuration } from '../src/scene';
import { SCENES, insetsOf, sceneProblems, MAX_INSETS } from '../src/scenedefs';
import { freqresp, tf } from '../src/dsp';

const close = (a: number, b: number, tol: number, what = '') => expect(Math.abs(a - b), `${what}: ${a} vs ${b}`).toBeLessThan(tol);

describe('cart scene: the animation is the real simulation', () => {
  it('released from x(0) = 1 it follows the two modes: x = 2e^−t − e^−2t', () => {
    const S = simulateCart(['forces']);
    for (const t of [0, 0.5, 1, 2, 4, 7]) { const s = S.at(t); close(s.x, 2 * Math.exp(-t) - Math.exp(-2 * t), 2e-4, `x(${t})`); close(s.v, -2 * Math.exp(-t) + 2 * Math.exp(-2 * t), 2e-4, `v(${t})`); }
  });
  it('the modal coefficients split the state along v₁ = (1, −1), v₂ = (1, −2): a = 2e^−t, b = −e^−2t', () => {
    const S = simulateCart(['modes']);
    for (const t of [0, 1, 3]) { const s = S.at(t); close(s.a, 2 * Math.exp(-t), 2e-4); close(s.b, -Math.exp(-2 * t), 2e-4); close(s.a + s.b, s.x, 1e-9); close(S.lam[0] * s.a + S.lam[1] * s.b, s.v, 1e-9); }
    expect(S.lam).toEqual([-1, -2]);
  });
  it('a 1 N push from rest gives the step response x = ½ − e^−t + ½e^−2t after the push starts', () => {
    const S = simulateCart(['push']);
    expect(S.x[0]).toBe(0); close(S.at(CART.pushAt - 0.05).x, 0, 1e-12); close(S.at(CART.pushAt).u, 1, 1e-12);
    for (const t of [1, 2, 5]) { const tt = t - CART.pushAt; close(S.at(t).x, 0.5 - Math.exp(-tt) + 0.5 * Math.exp(-2 * tt), 3e-4, `x(${t})`); }
    close(S.at(7.9).x, 0.5, 5e-3);
  });
  it('a hammer blow (1 N·s) gives the impulse response e^−t − e^−2t, starting at the strike', () => {
    const S = simulateCart(['hammer']);
    expect(S.strike).toBe(0.5); close(S.at(0.45).v, 0, 1e-12); close(S.at(0.5 + 0.2).x, Math.exp(-0.2) - Math.exp(-0.4), 1e-3); close(S.at(0.5 + 3).x, Math.exp(-3) - Math.exp(-6), 1e-3);
    close(S.at(0.5 + 1e-9).v, 1, 0.03);
  });
  it('a sine shaker settles to |G(jω)|·sin(ωt + ∠G) with G = 1/(s² + 3s + 2)', () => {
    const S = simulateCart(['shaker']); const G = freqresp(tf([1], [1, 3, 2]), CART.shakerW), mag = Math.hypot(G.re, G.im), ph = Math.atan2(G.im, G.re);
    for (const t of [11, 12, 13.2]) close(S.at(t).x, mag * Math.sin(CART.shakerW * t + ph), 3e-3, `x(${t})`);
    expect(S.T).toBeGreaterThan(10);
  });
  it('critical damping c = 2√2 merges the poles at −√2', () => {
    const S = simulateCart(['critical']); expect(S.lam[0]).toBeCloseTo(-Math.SQRT2, 9); expect(S.lam[1]).toBeCloseTo(-Math.SQRT2, 9);
    expect(cartEigs(1, 2, 3)).toEqual([-1, -2]);
    let neg = 0; for (let i = 1; i < S.n; i++) if (S.x[i] < 0) neg++; expect(neg, 'critically damped: no overshoot').toBe(0);
  });
  it('the clock overlay carries the sample period', () => { expect(simulateCart(['clock']).Ts).toBe(0.5); expect(simulateCart(['forces']).Ts).toBe(0); });
});

describe('tine scene', () => {
  it('x(t) = e^(−σt)cos(2πf₀t), σ = 0.6, f₀ = 1 Hz', () => { close(tineX(0), 1, 1e-12); close(tineX(1), Math.exp(-0.6), 1e-12); close(tineX(0.25), 0, 1e-12); close(tineX(0.5), -Math.exp(-0.3), 1e-12); });
  it('spectrum peaks at ±f₀ (normalised to 1) and is even; its half-power width is about σ/π', () => {
    close(tineSpectrum(1), 1, 1e-12); close(tineSpectrum(-1), 1, 1e-12); expect(tineSpectrum(0.5)).toBeLessThan(0.7); expect(tineSpectrum(3)).toBeLessThan(0.2);
    close(tineSpectrum(1 + TINE.sigma / Math.PI / 2), Math.SQRT1_2, 0.1);
  });
});

describe('scene catalogue and validation', () => {
  it('knows both scenes; defaults are valid overlays', () => { for (const s of Object.values(SCENES)) expect(sceneProblems(s.id, s.defaults, s.id)).toEqual([]); expect(Object.keys(SCENES).sort()).toEqual(['cart', 'tine']); });
  it('unknown scene / overlay / duplicate / too many panels are problems', () => {
    expect(sceneProblems('bogus', [], 'x')[0]).toMatch(/unknown scene/);
    expect(sceneProblems('cart', ['forces', 'nope'], 'x')[0]).toMatch(/unknown overlay "nope"/);
    expect(sceneProblems('cart', ['forces', 'forces'], 'x')[0]).toMatch(/duplicate/);
    expect(sceneProblems('cart', ['trace', 'phase', 'poles'], 'x').join()).toMatch(/at most 2/);
    expect(sceneProblems('cart', ['trace', 'push', 'hammer', 'phase', 'modes'], 'x')).toEqual([]); // push/hammer share the trace panel, modes share phase
    expect(MAX_INSETS).toBe(2);
  });
  it('insetsOf lists distinct panels in first-use order', () => { expect(insetsOf('cart', ['modes', 'trace', 'flow'])).toEqual(['phase', 'trace']); expect(insetsOf('tine', ['sampler', 'poles', 'spectrum'])).toEqual(['poles', 'spectrum']); expect(insetsOf('nope', ['x'])).toEqual([]); });
  it('every overlay has a name and a sentence', () => { for (const s of Object.values(SCENES)) for (const o of s.overlays) { expect(o.label.length).toBeGreaterThan(1); expect(o.says.length).toBeGreaterThan(20); } });
});

describe('layout', () => {
  it('fits the width, panels side by side, compact = main picture only', () => {
    for (const w of [300, 340, 390, 420, 600]) {
      const L = sceneLayout('cart', ['modes', 'trace'], w, false);
      expect(L.insets.length).toBe(2); expect(L.insets.every((i) => i.rect.x >= 0 && i.rect.x + i.rect.w <= w + 1e-9)).toBe(true); expect(L.h).toBeGreaterThan(L.main.h);
      expect(sceneLayout('cart', ['modes', 'trace'], w, true).insets.length).toBe(0);
    }
  });
  it('rest times and durations are inside the loop', () => { for (const [s, o] of [['cart', ['hammer']], ['cart', ['shaker']], ['cart', ['push']], ['cart', ['forces']], ['tine', ['envelope']]] as [string, string[]][]) expect(sceneRestTime(s, o)).toBeLessThan(sceneDuration(s, o)); });
});
