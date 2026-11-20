/** The Example bubbles' specs (subject.yaml runningExample.refs, Nov 19): every number recomputed from the models. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { HOUSE } from '@study/core/models';
import { CORNER, DISH } from '../src/model/params';

const subj = parse(fs.readFileSync(path.resolve(import.meta.dirname, '..', 'subject.yaml'), 'utf8'));
const refs: { id: string; at: string; specs: string; figure?: string; scene?: { id: string } }[] = subj.runningExample.refs;
const spec = (id: string) => refs.find((r) => r.id === id)!.specs;

describe('control-systems Example bubbles', () => {
  it('house on the first box, car at second order, dish where P control enters', () => {
    expect(refs.map((r) => `${r.id}@${r.at}`)).toEqual(['house@MODEL', 'corner@SECOND', 'dish@PGAIN']);
    expect(refs.map((r) => r.scene?.id ?? `figure:${r.figure}`)).toEqual(['house', 'figure:corner', 'figure:antenna']);
  });
  it('house: poles −0.2 and −2.2 per hour, τ = 5 h', () => {
    const [[a, b]] = HOUSE.A, ev = [a + b, a - b].map((x) => +x.toFixed(3)).sort((x, y) => y - x);
    expect(ev).toEqual([-0.2, -2.2]); expect(spec('house')).toContain(`−${-ev[0]} and −${-ev[1]} per hour`); expect(spec('house')).toContain(`τ = ${1 / -ev[0]} h`);
  });
  it('corner: m 400 kg, k 25.6 kN/m, c 1.6 kN·s/m, ωₙ = 8 rad/s, ζ = 0.25', () => {
    const wn = Math.sqrt(CORNER.k / CORNER.m), z = CORNER.c / (2 * Math.sqrt(CORNER.k * CORNER.m));
    expect(spec('corner')).toContain(`m = ${CORNER.m} kg, k = ${CORNER.k / 1000} kN/m, c = ${CORNER.c / 1000} kN·s/m, so ωₙ = ${wn} rad/s and ζ = ${z}`);
  });
  it('dish: J 10, B 20, ±200 N·m, Θ/T = 0.1/(s(s + 2)), closed loop s² + 2s + Kp/10', () => {
    const s = spec('dish');
    expect(s).toContain(`J = ${DISH.J} kg·m², B = ${DISH.B} N·m·s/rad, motor ±${DISH.Tmax} N·m, so Θ/T = ${1 / DISH.J}/(s(s + ${DISH.B / DISH.J}))`);
    expect(s).toContain(`s² + ${DISH.B / DISH.J}s + Kp/${DISH.J}`);
  });
});
