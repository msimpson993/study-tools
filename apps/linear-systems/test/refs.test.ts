/** The Example bubbles' specs (subject.yaml runningExample.refs, Nov 19): every number recomputed from the models. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { SPK, SPEAKER } from '../../../packages/core/src/sceneLsModels';
import { CAR } from '../../../packages/core/src/carModel';
import { carModes } from '../src/figs/car';

const subj = parse(fs.readFileSync(path.resolve(import.meta.dirname, '..', 'subject.yaml'), 'utf8'));
const refs: { id: string; at: string; specs: string }[] = subj.runningExample.refs;
const spec = (id: string) => refs.find((r) => r.id === id)!.specs;
const thou = (x: number) => Math.round(x).toLocaleString('en-US');

describe('linear-systems Example bubbles', () => {
  it('sit on SYS (earbud) and STATE (car)', () => { expect(refs.map((r) => `${r.id}@${r.at}`)).toEqual(['earbud@SYS', 'car@STATE']); });
  it('earbud: 717 Hz undamped, rings at 688 Hz, decay 0.8 ms, ζ 0.28, poles −1,266 ± j4,322, the parts', () => {
    const s = spec('earbud');
    expect(s).toContain(`fₙ ≈ ${Math.round(SPK.fs)} Hz`); expect(Math.round(SPK.fs)).toBe(717);
    expect(s).toContain(`rings at ≈ ${Math.round(SPK.fd)} Hz`); expect(Math.round(SPK.fd)).toBe(688);
    expect(s).toContain(`decay time ≈ ${(1000 / SPK.sigma).toFixed(1)} ms`);
    expect(s).toContain(`ζ ≈ ${SPK.zeta.toFixed(2)}`);
    expect(s).toContain(`poles −${thou(SPK.sigma)} ± j${thou(SPK.wd)} rad/s`);
    expect(s).toContain(`M_ms = ${+(SPEAKER.Mms * 1e3).toFixed(4)} g`); expect(s).toContain(`C_ms = ${+(SPEAKER.Cms * 1e3).toFixed(4)} mm/N`); expect(s).toContain(`Bl = ${SPEAKER.Bl} T·m`); expect(s).toContain(`R_e = ${SPEAKER.Re} Ω`);
  });
  it('car: bounce 1.15 Hz (ζ 0.29), pitch 1.42 Hz (ζ 0.36), the body, and the 0.18 s bump delay at 15 m/s', () => {
    const s = spec('car'), [b, p] = carModes(CAR);
    expect(s).toContain(`bounce ${b.fn.toFixed(2)} Hz (ζ ${b.zeta.toFixed(2)})`); expect(s).toContain(`pitch ${p.fn.toFixed(2)} Hz (ζ ${p.zeta.toFixed(2)})`);
    expect(s).toContain(`m = ${CAR.m} kg`); expect(s).toContain(`J = ${CAR.J} kg·m²`); expect(s).toContain(`${CAR.a} m ahead`); expect(s).toContain(`rear ${CAR.b} m behind`);
    expect(s).toContain(`${((CAR.a + CAR.b) / 15).toFixed(2)} s after the front`);
  });
});
