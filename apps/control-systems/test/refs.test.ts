/** The Example nodes' introductions (subject.yaml runningExample.refs, Nov 20): every number recomputed from the models, and
 *  NO number the path has not introduced by the host box (no circularity: the house at MODEL has no poles, τ or G(s) yet;
 *  the corner at SECOND has ωₙ and ζ but no specs yet; the dish at PGAIN has specs and the loop, not I or D). */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { HOUSE, houseB, houseSteady } from '@study/core/models';
import { CORNER, DISH } from '../src/model/params';

const subj = parse(fs.readFileSync(path.resolve(import.meta.dirname, '..', 'subject.yaml'), 'utf8'));
const refs: { id: string; at: string; question?: string; about: string; numbers: string; figure?: string; scene?: { id: string } }[] = subj.runningExample.refs;
const ref = (id: string) => refs.find((r) => r.id === id)!;
const all = (id: string) => `${ref(id).about}\n${ref(id).numbers}`;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

describe('control-systems Example nodes', () => {
  it('house beside the first box, car at second order, dish where P control enters; their questions', () => {
    expect(refs.map((r) => `${r.id}@${r.at}`)).toEqual(['house@MODEL', 'corner@SECOND', 'dish@PGAIN']);
    expect(refs.map((r) => r.scene?.id ?? `figure:${r.figure}`)).toEqual(['house', 'figure:corner', 'figure:antenna']);
    expect(refs.map((r) => r.question)).toEqual(["What's the running example?", 'Meet the second running example', 'Meet the third running example']);
  });
  it('are short bullet lists (under 400 words, no block paragraphs)', () => {
    for (const r of refs) { expect(words(all(r.id))).toBeLessThan(400); for (const k of ['about', 'numbers'] as const) for (const line of r[k].trim().split('\n')) expect(line, `${r.id}.${k}`).toMatch(/^- /); }
  });
  it('house at MODEL: heat stores, wall conductances and where 2.5 kW settles; no poles, τ or transfer function yet', () => {
    const s = ref('house').numbers, Gin = (HOUSE.A[0][1] * HOUSE.Cth) / 3600, Gout = ((-HOUSE.A[0][0] - HOUSE.A[0][1]) * HOUSE.Cth) / 3600;
    expect(s).toContain(`C_th = ${HOUSE.Cth / 1e6} MJ/K`); expect(s).toContain(`shared wall passes ${Gin.toFixed(1)} W/K`); expect(s).toContain(`leaks ${Gout.toFixed(1)} W/K`);
    const [x1, x2] = houseSteady([houseB() * HOUSE.P, 0]);
    expect(s).toContain(`${HOUSE.P / 1000} kW`); expect(s).toContain(`bedroom settles ${x2.toFixed(2)} K`); expect(s).toContain(`living room ${x1.toFixed(2)} K`);
    for (const bad of ['pole', 'τ', 'G(s)', '−0.2', '−2.2', '5 h', 'overshoot', 'time constant']) expect(all('house'), bad).not.toContain(bad);
  });
  it('corner at SECOND: m, k, c and the two numbers SECOND introduces (ωₙ = 8 rad/s, ζ = 0.25); no specs yet', () => {
    const wn = Math.sqrt(CORNER.k / CORNER.m), z = CORNER.c / (2 * Math.sqrt(CORNER.k * CORNER.m));
    expect(ref('corner').numbers).toContain(`m = ${CORNER.m} kg, k = ${CORNER.k / 1000} kN/m, c = ${CORNER.c / 1000} kN·s/m`);
    expect(ref('corner').numbers).toContain(`ωₙ = ${wn} rad/s and ζ = ${z}`);
    for (const bad of ['%OS', 'overshoot', 'settling', 'Tₛ', 'Tₚ', 'state feedback', 'observer']) expect(all('corner'), bad).not.toContain(bad);
  });
  it('dish at PGAIN: J 10, B 20, ±200 N·m, Θ/T = 0.1/(s(s + 2)), closed loop s² + 2s + Kp/10; nothing of I or D', () => {
    const s = ref('dish').numbers;
    expect(s).toContain(`J = ${DISH.J} kg·m², B = ${DISH.B} N·m·s/rad, motor ±${DISH.Tmax} N·m, so Θ/T = ${1 / DISH.J}/(s(s + ${DISH.B / DISH.J}))`);
    expect(s).toContain(`s² + ${DISH.B / DISH.J}s + Kp/${DISH.J}`);
    for (const bad of ['Ki', 'Kd', 'integral', 'derivative', 'wind', 'steady-state']) expect(all('dish'), bad).not.toContain(bad);
  });
});
