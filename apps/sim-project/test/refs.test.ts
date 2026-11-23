/** Example-node introductions: numbers already introduced at the host, no later teasers. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { MOTOR, ENGINE } from '../src/model/params';

const subj = parse(fs.readFileSync(path.resolve(import.meta.dirname, '..', 'subject.yaml'), 'utf8'));
const refs: { id: string; at: string; question?: string; about: string; numbers: string; figure?: string }[] = subj.runningExample.refs;
const ref = (id: string) => refs.find((r) => r.id === id)!;
const all = (id: string) => `${ref(id).about}\n${ref(id).numbers}`;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

describe('sim-project Example nodes', () => {
  it('four machines, staged motor → boring machine → disk head → engine', () => {
    expect(refs.map((r) => `${r.id}@${r.at}`)).toEqual(['motor@BLOCKS', 'borer@PRICE', 'disk@DISK', 'engine@TUNER']);
    expect(refs.map((r) => r.figure)).toEqual(['motor', 'borer', 'disk', 'tuner']);
  });
  it('are short bullet lists (under 400 words, no block paragraphs)', () => {
    for (const r of refs) {
      expect(words(all(r.id))).toBeLessThan(400);
      for (const k of ['about', 'numbers'] as const) for (const line of r[k].trim().split('\n')) expect(line, `${r.id}.${k}`).toMatch(/^- /);
    }
  });
  it('motor at BLOCKS: Table 4.2 only; no closed-loop sag, ratio or τ yet', () => {
    const s = ref('motor').numbers;
    expect(s).toContain(`Ra = ${MOTOR.Ra} Ω`);
    expect(s).toContain(`Km = ${MOTOR.Km}`);
    expect(s).toContain(`J = ${MOTOR.J}`);
    expect(s).toContain(`b = ${MOTOR.b}`);
    expect(s).toContain(`Kb = ${MOTOR.Kb}`);
    for (const bad of ['−0.00185', '0.0028', '3.69 ms', 'Ka = 54', 'loop gain']) expect(all('motor'), bad).not.toContain(bad);
  });
  it('borer at PRICE: no loop or gains yet (those arrive in the next box)', () => {
    expect(ref('borer').numbers).toMatch(/Nothing yet/i);
    for (const bad of ['K = 20', 'K = 100', '11s', 'ζ', '0.05']) expect(all('borer'), bad).not.toContain(bad);
  });
  it('disk at DISK: coil and arm, no Ka overshoot or ceiling', () => {
    const s = ref('disk').numbers;
    expect(s).toContain('5000/(s + 1000)');
    expect(s).toContain('1/(s(s + 20))');
    for (const bad of ['Ka = 80', '17.1', '4080', '1.17']) expect(all('disk'), bad).not.toContain(bad);
  });
  it('engine at TUNER: the 5 s goal, no tuner table P/I yet', () => {
    expect(ref('engine').numbers).toContain('under 5 s');
    for (const bad of ['0.0042253', '0.0092411', String(ENGINE.K), '3.42']) expect(all('engine'), bad).not.toContain(bad);
  });
});
