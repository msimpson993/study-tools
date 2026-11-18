import { describe, it, expect } from 'vitest';
import { SPK, SPEAKER, speakerDerived, simulateSpeaker, speakerMag, HOUSE, houseExpm, houseSteady, houseB, houseGramian, houseOptimalU, simulateHouse } from '../src/sceneLsModels';
import { sceneProblems, SCENES } from '../src/scenedefs';
import { CHAIN_STAGES, chainStagesOf, chainDiagramProblems, chainStageHeight, layoutChain } from '../src/chaindiagram';
import { DIAGRAM_STAGES } from '../src/blockdiagram';

describe('earbud speaker model (Thiele–Small)', () => {
  it('fs ≈ 717 Hz, ζ ≈ 0.28 with the back-EMF (0.23 mechanical only), coil pole ≈ −186,750 rad/s', () => {
    expect(SPK.fs).toBeCloseTo(716.74, 1);
    expect(SPK.zeta).toBeCloseTo(0.2812, 3);
    expect(SPK.zetaMech).toBeCloseTo(0.2287, 3);
    expect(SPK.Qts).toBeCloseTo(1.778, 2);
    expect(SPK.coilPole).toBeCloseTo(-186750, 0);
    expect(Math.abs(SPK.coilPole) / SPK.ws).toBeGreaterThan(40); // 41.5×: two states are enough
    expect(SPK.sigma).toBeCloseTo(1266.4, 0); expect(SPK.wd).toBeCloseTo(4321.7, 0);
    expect(SPK.crit).toBeCloseTo(0.7566, 3);
  });
  it('A has eigenvalues −σ ± jωd and the impulse response rings at ωd and decays at σ', () => {
    const [[a, b], [c, d]] = SPK.A; const tr = a + d, det = a * d - b * c;
    expect(tr / 2).toBeCloseTo(-SPK.sigma, 6); expect(Math.sqrt(det - (tr * tr) / 4)).toBeCloseTo(SPK.wd, 3);
    const q = 1e-4, v0 = (SPEAKER.Bl / SPEAKER.Re) * q / SPEAKER.Mms;
    const S = simulateSpeaker(() => 0, 0.004, { click: v0, dt: 1e-6 });
    for (const t of [0.0003, 0.001, 0.0025]) { const exact = (v0 / SPK.wd) * Math.exp(-SPK.sigma * t) * Math.sin(SPK.wd * t) * 1e6; expect(S.x[Math.round(t / 1e-6)]).toBeCloseTo(exact, 3); }
  });
  it('|H| is 1 at DC, peaks ≈ 1/(2ζ√(1−ζ²)) near 658 Hz, and falls 40 dB/decade', () => {
    expect(speakerMag(1)).toBeCloseTo(1, 4);
    expect(SPK.fPeak).toBeCloseTo(657.6, 0); expect(speakerMag(SPK.fPeak)).toBeCloseTo(1 / (2 * SPK.zeta * Math.sqrt(1 - SPK.zeta ** 2)), 3);
    expect(20 * Math.log10(speakerMag(100000) / speakerMag(10000))).toBeCloseTo(-40, 0);
  });
  it('derived values recompute from the parameters', () => { expect(speakerDerived({ ...SPEAKER, Bl: 0 }).zeta).toBeCloseTo(SPK.zetaMech, 9); });
});

describe('two-room house model', () => {
  it('eigenvalues −0.2/h (average, τ = 5 h) and −2.2/h (difference, τ ≈ 27.3 min)', () => {
    const [[a, b], [c, d]] = HOUSE.A; const tr = a + d, det = a * d - b * c, disc = Math.sqrt(tr * tr / 4 - det);
    expect(tr / 2 + disc).toBeCloseTo(-0.2, 12); expect(tr / 2 - disc).toBeCloseTo(-2.2, 12);
    expect(-1 / (tr / 2 + disc)).toBeCloseTo(5, 9); expect(-60 / (tr / 2 - disc)).toBeCloseTo(27.27, 2);
    // eigenvectors (1, 1) and (1, −1)
    expect(a + b).toBeCloseTo(-0.2, 12); expect(a - b).toBeCloseTo(-2.2, 12);
  });
  it('e^{At} matches RK4, and the steady state is −A⁻¹Bu', () => {
    const S = simulateHouse([3, -1], () => [0, 0], 2, 0.001), E = houseExpm(2);
    expect(S.x1[S.n - 1]).toBeCloseTo(E[0][0] * 3 - E[0][1], 8); expect(S.x2[S.n - 1]).toBeCloseTo(E[1][0] * 3 - E[1][1], 8);
    const b = houseB() * HOUSE.P, ss = houseSteady([b, 0]);
    expect(-1.2 * ss[0] + ss[1] + b).toBeCloseTo(0, 9); expect(ss[0] - 1.2 * ss[1]).toBeCloseTo(0, 9);
    const L = simulateHouse([0, 0], () => [HOUSE.P, 0], 60, 0.01); expect(L.x1[L.n - 1]).toBeCloseTo(ss[0], 3);
  });
  it('heating both rooms equally cannot change the difference (uncontrollable); an average thermostat cannot see it (unobservable)', () => {
    const S = simulateHouse([5, 1], () => [800, 800], 3, 0.001);
    for (const i of [0, 1000, 2000, 3000]) expect(S.x1[i] - S.x2[i]).toBeCloseTo(4 * Math.exp(-2.2 * i * 0.001), 6);
    // Ctrb [b, Ab] for b ∝ (1, 1) is singular; Obsv [c; cA] for c = (½, ½) is singular
    const A = HOUSE.A; const Ab = [A[0][0] + A[0][1], A[1][0] + A[1][1]]; expect(1 * Ab[1] - 1 * Ab[0]).toBeCloseTo(0, 12);
    const cA = [0.5 * A[0][0] + 0.5 * A[1][0], 0.5 * A[0][1] + 0.5 * A[1][1]]; expect(0.5 * cA[1] - 0.5 * cA[0]).toBeCloseTo(0, 12);
  });
  it('the least-energy heater profile reaches the target exactly, and costs less than another input that also gets there', () => {
    const T = HOUSE.Tf, u = houseOptimalU([0, 0], [10, 7], T), S = simulateHouse([0, 0], (t) => [u(t), 0], T, 0.001);
    expect(S.x1[S.n - 1]).toBeCloseTo(10, 3); expect(S.x2[S.n - 1]).toBeCloseTo(7, 3);
    let E = 0; for (let i = 0; i < S.n - 1; i++) E += S.u1[i] ** 2 * S.dt;
    // perturb along a direction that keeps the end state: u + ε·(something orthogonal in the Gramian sense) costs more
    const W = houseGramian(T); expect(W[0][0] * W[1][1] - W[0][1] ** 2).toBeGreaterThan(0);
    const bump = (t: number) => Math.sin((2 * Math.PI * t) / T) * 300; const S2 = simulateHouse([0, 0], (t) => [u(t) + bump(t), 0], T, 0.001);
    // the bump changes the end state, so correct it with the optimal steering of the error: cost must not go down
    const err: [number, number] = [10 - S2.x1[S2.n - 1], 7 - S2.x2[S2.n - 1]]; const fix = houseOptimalU([0, 0], err, T);
    let E2 = 0; for (let i = 0; i < S.n - 1; i++) { const t = i * 0.001; E2 += (u(t) + bump(t) + fix(t)) ** 2 * 0.001; }
    expect(E2).toBeGreaterThan(E);
    let mn = Infinity; for (let i = 0; i < S.n; i += 10) mn = Math.min(mn, S.u1[i]); expect(mn).toBeGreaterThan(0); // a heater: never cools
  });
});

describe('scene catalogue and chain diagrams for the linear-systems scenes', () => {
  it('both scenes validate; the cart stage list is untouched', () => {
    expect(DIAGRAM_STAGES.length).toBe(14);
    for (const s of ['speaker', 'house']) expect(sceneProblems(s, SCENES[s].defaults, s)).toEqual([]);
    expect(sceneProblems('speaker', ['click', 'tone', 'state', 'poles'], 'x').join()).toMatch(/at most 2/);
  });
  it('stages belong to one scene: a cart stage on the speaker, or a speaker stage on the cart, fails', () => {
    expect(sceneProblems('speaker', ['forces'], 'x', undefined, 'spk-chain')).toEqual([]);
    expect(sceneProblems('house', ['heat'], 'x', undefined, ['house-open', 'house-modal'])).toEqual([]);
    expect(sceneProblems('speaker', ['forces'], 'x', undefined, 'loop').join()).toMatch(/does not belong to scene "speaker"/);
    expect(sceneProblems('house', ['heat'], 'x', undefined, 'anc-ff').join()).toMatch(/does not belong/);
    expect(sceneProblems('cart', ['forces'], 'x', undefined, 'spk-chain').join()).toMatch(/unknown diagram stage/);
    expect(chainDiagramProblems('house', ['house-open', 'house-open'], 'x').join()).toMatch(/duplicate/);
  });
  it('every stage has a description and fits a 390 px strip', () => {
    for (const [id, st] of Object.entries(CHAIN_STAGES)) { expect(st.says.length, id).toBeGreaterThan(40); expect(chainStageHeight(id, 358)).toBeLessThan(160); for (const b of st.blocks) { expect(b.x - b.w / 2, `${id}/${b.id}`).toBeGreaterThanOrEqual(-0.5); expect(b.x + b.w / 2, `${id}/${b.id}`).toBeLessThanOrEqual(100.5); } }
    expect(chainStagesOf('speaker').length).toBe(6); expect(chainStagesOf('house').length).toBe(4);
    const two = layoutChain(['anc-ff', 'anc-fb'], 358, 100); expect(two[1].rect.y).toBeGreaterThan(two[0].rect.y + two[0].rect.h);
  });
});
