/** Per-box example usage (stage-pass2 S1–S4, Nov 21; mirrors LS examples.test.ts): house only until Two poles, the corner from
 *  there to Turn up the gain, the dish through tuning, the house again at A push we didn't command and the corner at Look inside.
 *  The map's glyphs and each Example node's "Where this example comes back" come from these values. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { exampleComesBack } from '../../../packages/core/src/maplayout';

const app = path.resolve(import.meta.dirname, '..');
const graph = parse(fs.readFileSync(path.join(app, 'content', 'graph.yaml'), 'utf8'));
const refs = parse(fs.readFileSync(path.join(app, 'subject.yaml'), 'utf8')).runningExample.refs as { id: string; at: string; comesBack?: Record<string, string[]> }[];
const PRE = ['root', 'MODEL', 'TF', 'POLES', 'FIRST', 'ORDER', 'CIRC', 'INV', 'PLANE', 'REDUCE'];
const AFTER: Record<string, string[]> = {
  SECOND: ['corner'], SPECS: ['corner'], LOOP: ['corner'], DOM: ['corner'], BLOCKALG: ['corner'],
  PGAIN: ['dish'], MENU: ['dish'], SPEED: ['dish'], SSE: ['dish'], TYPE: ['dish'], INT: ['dish'], WINDUP: ['dish'], DER: ['dish'], TUNE: ['dish'],
  LAB: ['dish'], METHODS: ['dish'], FAIL: ['dish'], INDEX: ['dish'],
  DIST: ['house'], SENS: ['house'], NOISE: ['house'],
  STATE: ['corner'], SS2TF: ['house', 'corner'], CC: ['house', 'corner'], SF: ['corner'], ACK: ['corner'], OBS: ['corner'], SEP: ['corner'], REF: ['corner'],
};
const COMES_BACK: Record<string, Record<string, string[]>> = {
  house: { big: ['DIST', 'SENS', 'NOISE', 'CC'], detail: ['DIST', 'SENS', 'NOISE', 'SS2TF', 'CC'] },
  corner: { big: ['STATE', 'CC', 'SF', 'OBS', 'SEP', 'REF'], detail: ['STATE', 'SS2TF', 'CC', 'SF', 'ACK', 'OBS', 'SEP', 'REF'] },
  dish: { big: ['SSE', 'INT', 'DER', 'TUNE'], detail: ['MENU', 'SPEED', 'SSE', 'TYPE', 'INT', 'WINDUP', 'DER', 'TUNE', 'LAB', 'METHODS', 'FAIL', 'INDEX'] },
};
/** side boxes the derived rule counts as "coming back" because its first-stretch walk follows main lines only; the explicit
 *  comesBack lists leave them out (they hang off the host's own stretch) */
const DERIVED_EXTRA: Record<string, Record<string, string[]>> = {
  house: { big: [], detail: ['REDUCE', 'INV', 'PLANE', 'ORDER', 'CIRC'] },
  corner: { big: [], detail: ['BLOCKALG', 'DOM'] },
  dish: { big: [], detail: [] },
};

describe('CS per-box examples (stage-pass2)', () => {
  it('the three hosts are where the switches happen', () => {
    expect(Object.fromEntries(refs.map((r) => [r.id, r.at]))).toEqual({ house: 'MODEL', corner: 'SECOND', dish: 'PGAIN' });
  });
  for (const m of graph.maps as { id: string; nodes: { id: string; examples?: string[]; exampleWhy?: string }[]; edges: never[] }[]) {
    it(`${m.id}: house before Two poles, the tutor's choice after; every post-switch box has its one-line why`, () => {
      for (const n of m.nodes) {
        expect(n.examples, n.id).toEqual(PRE.includes(n.id) ? ['house'] : AFTER[n.id]);
        if (!PRE.includes(n.id)) expect((n.exampleWhy ?? '').length, `${n.id} why`).toBeGreaterThan(10); else expect(n.exampleWhy).toBeUndefined();
      }
    });
    it(`${m.id}: "Where this example comes back" is the tutor's list; the derived rule finds the same boxes plus the host-stretch side boxes`, () => {
      for (const id of ['house', 'corner', 'dish']) {
        expect(refs.find((r) => r.id === id)!.comesBack?.[m.id], id).toEqual(COMES_BACK[id][m.id]);
        expect([...exampleComesBack(m, refs, id)].sort(), `${id} derived`).toEqual([...COMES_BACK[id][m.id], ...DERIVED_EXTRA[id][m.id]].sort());
      }
    });
  }
});
