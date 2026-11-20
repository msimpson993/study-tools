/** The Example nodes' introductions (subject.yaml runningExample.refs, Nov 20): every number recomputed from the models, and
 *  NO number the path has not introduced by the host box (no circularity: the earbud at SYS knows only input, output and
 *  system; the car at STATE knows poles and the state, but not its own modes, which MODES introduces). */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { SPK, SPEAKER } from '../../../packages/core/src/sceneLsModels';
import { CAR } from '../../../packages/core/src/carModel';
import { carModes } from '../src/figs/car';

const subj = parse(fs.readFileSync(path.resolve(import.meta.dirname, '..', 'subject.yaml'), 'utf8'));
const refs: { id: string; at: string; question?: string; about: string; numbers: string }[] = subj.runningExample.refs;
const ref = (id: string) => refs.find((r) => r.id === id)!;
const all = (id: string) => `${ref(id).about}\n${ref(id).numbers}`;
const thou = (x: number) => Math.round(x).toLocaleString('en-US');
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

describe('linear-systems Example nodes', () => {
  it('sit beside SYS (earbud) and STATE (car), with their restated questions', () => {
    expect(refs.map((r) => `${r.id}@${r.at}`)).toEqual(['earbud@SYS', 'car@STATE']);
    expect(ref('earbud').question).toBe("What's the running example?"); expect(ref('car').question).toBe('Meet the second running example');
  });
  it('are short bullet lists (under 400 words, no block paragraphs)', () => {
    for (const r of refs) { expect(words(all(r.id))).toBeLessThan(400); for (const k of ['about', 'numbers'] as const) for (const line of r[k].trim().split('\n')) expect(line, `${r.id}.${k}`).toMatch(/^- /); }
  });
  it('earbud at SYS: the parts and plain facts only (mass, compliance, force factor, coil resistance; 717 times a second as the first box says)', () => {
    const s = ref('earbud').numbers;
    expect(s).toContain(`M_ms = ${+(SPEAKER.Mms * 1e3).toFixed(4)} g`); expect(s).toContain(`C_ms = ${+(SPEAKER.Cms * 1e3).toFixed(4)} mm/N`);
    expect(s).toContain(`k = 1/C_ms ≈ ${thou(1 / SPEAKER.Cms)} N/m`); expect(s).toContain(`Bl = ${SPEAKER.Bl} T·m`); expect(s).toContain(`R_e = ${SPEAKER.Re} Ω`);
    expect(s).toContain(`about ${Math.round(SPK.fs)} times a second`);
    // held back until Laplace and Z / Poles and zeros introduce them
    const t = all('earbud');
    for (const bad of ['ζ', 'pole', 'Hz', 'resonan', 'damping ratio', `${Math.round(SPK.fd)}`, thou(SPK.sigma), thou(SPK.wd), `${(1000 / SPK.sigma).toFixed(1)} ms`]) expect(t, bad).not.toContain(bad);
  });
  it('car at STATE: body, axles, springs, shocks, the bump delay and the state; not its modes (MODES) or their damping', () => {
    const s = ref('car').numbers, [b, p] = carModes(CAR);
    expect(s).toContain(`m = ${CAR.m} kg`); expect(s).toContain(`J = ${CAR.J} kg·m²`); expect(s).toContain(`front ${CAR.a} m ahead`); expect(s).toContain(`rear ${CAR.b} m behind`);
    expect(s).toContain(`kf = ${thou(CAR.kf)} N/m`); expect(s).toContain(`kr = ${thou(CAR.kr)} N/m`); expect(s).toContain(`${thou(CAR.cf)} and ${thou(CAR.cr)} N·s/m`);
    expect(s).toContain(`${((CAR.a + CAR.b) / 15).toFixed(2)} s after the front`);
    expect(s).toContain(`about ${b.fn.toFixed(2)} times a second`);
    expect(ref('car').about).toContain('x = (z, θ, ż, θ̇)');
    const t = all('car');
    for (const bad of ['ζ', 'mode', 'Hz', `${p.fn.toFixed(2)}`, `${b.zeta.toFixed(2)}`, `${p.zeta.toFixed(2)}`, 'eigen']) expect(t, bad).not.toContain(bad);
  });
});
