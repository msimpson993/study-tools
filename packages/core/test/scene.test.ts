import { describe, it, expect } from 'vitest';
import { simulateCart, simulateCartLoop, resolveLoop, CART_TF, cartEigs, tineX, tineSpectrum, TINE, CART, sceneLayout, sceneRestTime, sceneDuration } from '../src/scene';
import { SCENES, insetsOf, sceneProblems, expandOverlays, isLoopScene, LOOP_OVERLAYS, MAX_INSETS } from '../src/scenedefs';
import { freqresp, tf, step, pidClosedLoopTF, pidClosedLoopPoles } from '../src/dsp';

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

describe('closed-loop cart overlays: the picture is the real simulation', () => {
  const at = (S: ReturnType<typeof simulateCartLoop>) => (i: number) => S.at(i * S.dt);
  it('loop with gain K: x(t) is the step response of K·G/(1 + K·G)', () => {
    for (const K of [1, 6, 20]) {
      const S = simulateCartLoop(['loop'], { K }), ref = step(pidClosedLoopTF(CART_TF, { Kp: K, Ki: 0, Kd: 0, N: 20 }), Array.from({ length: S.n }, (_, i) => i * S.dt));
      let worst = 0; for (let i = 0; i < S.n; i += 7) worst = Math.max(worst, Math.abs(S.x[i] - ref.y[i]));
      expect(worst, `K=${K}`).toBeLessThan(2e-6);
    }
  });
  it('the push is u = K·e = K(r − y); the velocity is dx/dt', () => {
    const S = simulateCartLoop(['loop'], { K: 6, r: 1 }), a = at(S);
    for (const t of [0.3, 1, 3]) { const s = a(Math.round(t / S.dt)); expect(Math.abs(s.u - 6 * (1 - s.x))).toBeLessThan(1e-6); expect(Math.abs(s.e - (1 - s.x))).toBeLessThan(1e-9); }
    const i = 200; expect(Math.abs(S.v[i] - (S.x[i + 1] - S.x[i - 1]) / (2 * S.dt))).toBeLessThan(1e-12);
    expect(Math.abs(S.v[i] - 0)).toBeGreaterThan(0.01);
  });
  it('the steady state of P control is K/(K + k) of the target (the cart still leans on its spring)', () => {
    const S = simulateCartLoop(['loop'], { K: 6, r: 1 }); expect(Math.abs(S.x[S.n - 1] - 6 / 8)).toBeLessThan(1e-3);
  });
  it('closed-loop poles in the panel are the roots of s² + 3s + 2 + K', () => {
    const S = simulateCartLoop(['loop'], { K: 6 }), re = S.loop!.poles.map((z) => z.re).sort(), im = S.loop!.poles.map((z) => Math.abs(z.im));
    expect(re[0]).toBeCloseTo(-1.5, 8); expect(re[1]).toBeCloseTo(-1.5, 8); expect(Math.max(...im)).toBeCloseTo(Math.sqrt(8 - 2.25), 6);
    const ref = pidClosedLoopPoles(CART_TF, { Kp: 6, Ki: 0, Kd: 0, N: 20 }); expect(S.loop!.poles.length).toBe(ref.length);
    expect(S.loop!.locus[0].poles.map((z) => z.re).filter((x) => Math.abs(x) < 9).sort((a, b) => a - b)[0]).toBeCloseTo(-2, 6); // K = 0 → the open-loop poles
  });
  it('pid: P + I + D add up to the demanded push, and I removes the offset', () => {
    const S = simulateCartLoop(['pid'], {}), L = S.loop!;
    for (const i of [100, 800, 1500]) expect(Math.abs(L.up[i] + L.ui[i] + L.ud[i] - S.u[i])).toBeLessThan(1e-9);
    expect(Math.abs(S.x[S.n - 1] - 1)).toBeLessThan(2e-3); expect(L.ui[S.n - 1]).toBeGreaterThan(1);
    expect(Math.max(...L.ud)).toBeGreaterThan(0.5);
  });
  it('limit: u never leaves ±umax, the demand does, and the plain loop is unchanged without the overlay', () => {
    const S = simulateCartLoop(['limit'], { K: 10, umax: 2 }), L = S.loop!;
    let mu = 0, md = 0; for (let i = 0; i < S.n; i++) { mu = Math.max(mu, Math.abs(S.u[i])); md = Math.max(md, Math.abs(L.uc[i])); }
    expect(mu).toBeLessThanOrEqual(2 + 1e-12); expect(mu).toBeGreaterThan(1.999); expect(md).toBeGreaterThan(5);
    const free = simulateCartLoop(['loop'], { K: 10, umax: 2 }); expect(Math.max(...free.u)).toBeGreaterThan(5); // umax is ignored without `limit`
  });
  it('disturb: nothing happens before t_d, the plant is pushed by d after it, and the loop only partly rejects it', () => {
    const S = simulateCartLoop(['disturb'], { K: 6, d: 1, td: 4 }), base = simulateCartLoop(['loop'], { K: 6 });
    for (const i of [0, 400, 790]) expect(Math.abs(S.x[i] - base.x[i])).toBeLessThan(1e-12);
    expect(S.at(3.9).d).toBe(0); expect(S.at(4.1).d).toBe(1);
    expect(Math.abs(S.x[S.n - 1] - base.x[S.n - 1])).toBeGreaterThan(0.05);
    expect(Math.abs((S.x[S.n - 1] - base.x[S.n - 1]) - 1 / 8)).toBeLessThan(2e-3); // d·G/(1 + K·G) at s = 0: 1/(2 + 6)
  });
  it('noise: y_m = y + noise, same seed same picture, another seed another one, u jitters', () => {
    const a = simulateCartLoop(['noise'], { seed: 3 }), b = simulateCartLoop(['noise'], { seed: 3 }), c = simulateCartLoop(['noise'], { seed: 4 });
    expect(Array.from(a.u.slice(0, 500))).toEqual(Array.from(b.u.slice(0, 500))); expect(a.u[1500]).not.toBe(c.u[1500]);
    let dev = 0; for (let i = 0; i < a.n; i++) dev += (a.loop!.ym[i] - a.x[i]) ** 2; expect(Math.sqrt(dev / a.n)).toBeGreaterThan(0.01);
    const quiet = simulateCartLoop(['loop'], {}); let ju = 0, jq = 0; for (let i = 1200; i < 1900; i++) { ju += Math.abs(a.u[i] - a.u[i - 1]); jq += Math.abs(quiet.u[i] - quiet.u[i - 1]); }
    expect(ju).toBeGreaterThan(20 * jq + 0.5);
  });
  it('delay and lag: the controller sees y later; the true x differs from what it reads', () => {
    const d = simulateCartLoop(['delay'], { K: 6, delay: 0.3 }), L = d.loop!, i = Math.round(1.0 / d.dt), j = Math.round(0.7 / d.dt);
    expect(Math.abs(L.ym[i] - d.x[j])).toBeLessThan(2e-3);
    const g = simulateCartLoop(['lag'], { K: 6, lag: 0.4 }); expect(g.loop!.ym[Math.round(0.5 / g.dt)]).toBeLessThan(g.x[Math.round(0.5 / g.dt)]);
    const plain = simulateCartLoop(['loop'], { K: 6 }); expect(Math.abs(d.x[400] - plain.x[400])).toBeGreaterThan(0.01);
  });
  it('a param only acts with its overlay; defaults are stable', () => {
    expect(resolveLoop(['loop'], { noise: 1, d: 5 })).toMatchObject({ noise: 0, d: 0, delay: 0, lag: 0, K: 6, Ki: 0, Kd: 0 });
    expect(resolveLoop(['pid'])).toMatchObject({ K: 6, Ki: 6, Kd: 1.5 });
    expect(resolveLoop(['pid'], { Ki: 0 }).Ki).toBe(0);
    expect(resolveLoop(['limit'], {}).umax).toBe(2.5);
  });
  it('closed-loop overlays imply loop, share the sim, run 10 s and rest on the final state', () => {
    for (const o of LOOP_OVERLAYS) { expect(expandOverlays('cart', [o])).toContain('loop'); expect(isLoopScene('cart', [o])).toBe(true); }
    expect(isLoopScene('cart', ['forces'])).toBe(false); expect(isLoopScene('tine', ['loop'])).toBe(false);
    expect(sceneDuration('cart', ['pid'])).toBe(10); expect(sceneRestTime('cart', ['loop'], { K: 6 })).toBeGreaterThan(1);
  });
  it('panels: the push/controller panel is one of the two; a third panel is refused', () => {
    expect(insetsOf('cart', ['loop'])).toEqual(['trace']); expect(insetsOf('cart', ['pid']).sort()).toEqual(['ctrl', 'trace']); expect(insetsOf('cart', ['limit', 'poles'])).toHaveLength(3);
    expect(sceneProblems('cart', ['limit', 'poles'], 'x').join()).toMatch(/at most 2/); expect(sceneProblems('cart', ['pid', 'phase'], 'x').join()).toMatch(/at most 2/);
    expect(sceneProblems('cart', ['loop', 'poles'], 'x')).toEqual([]); expect(sceneProblems('cart', ['noise', 'delay'], 'x')).toEqual([]);
  });
  it('validation: open-loop overlays cannot mix with loop ones; params are range-checked and need a loop overlay', () => {
    expect(sceneProblems('cart', ['push', 'loop'], 'w').join()).toMatch(/push.*closed-loop/);
    expect(sceneProblems('cart', ['pid', 'hammer'], 'w').join()).toMatch(/hammer/);
    expect(sceneProblems('cart', ['loop'], 'w', { K: 8, r: 0.5 })).toEqual([]);
    expect(sceneProblems('cart', ['loop'], 'w', { K: -1 }).join()).toMatch(/outside/);
    expect(sceneProblems('cart', ['loop'], 'w', { Q: 1 }).join()).toMatch(/unknown param "Q"/);
    expect(sceneProblems('cart', ['loop'], 'w', { K: Number.NaN }).join()).toMatch(/must be a number/);
    expect(sceneProblems('cart', ['forces'], 'w', { K: 3 }).join()).toMatch(/only apply to the closed-loop/);
    expect(sceneProblems('tine', ['envelope'], 'w', { K: 3 }).join()).toMatch(/unknown param/);
  });
  it('layout: loop scenes get a taller main picture, every inset still fits', () => {
    for (const w of [340, 390, 760]) { const L = sceneLayout('cart', ['pid'], w, false), F = sceneLayout('cart', ['forces'], w, false); expect(L.main.h).toBeGreaterThan(F.main.h); for (const { rect } of L.insets) expect(rect.x + rect.w).toBeLessThanOrEqual(w + 0.5); }
  });
});
