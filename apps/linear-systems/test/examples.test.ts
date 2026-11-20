/** Per-box example usage (tutor's usage.json, Nov 20): earbud only until STATE, where the car joins; after that whichever shows
 *  the box's idea best. The map's glyphs and each Example node's "Where this example comes back" come from these values. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { exampleComesBack } from '../../../packages/core/src/maplayout';

const app = path.resolve(import.meta.dirname, '..');
const graph = parse(fs.readFileSync(path.join(app, 'content', 'graph.yaml'), 'utf8'));
const refs = parse(fs.readFileSync(path.join(app, 'subject.yaml'), 'utf8')).runningExample.refs as { id: string; at: string; comesBack?: Record<string, string[]> }[];
const PRE = ['root', 'SYS', 'SUP', 'LIN', 'NEAR', 'KICK', 'TONE', 'FOUR', 'LAP', 'PZ', 'ROC', 'INV', 'DE', 'ORTHO', 'FS', 'PARS', 'SAMP', 'DTFT', 'DFT', 'WIN'];
const AFTER: Record<string, string> = { STATE: 'car', RE: 'earbud', MODES: 'car', DIAG: 'car', JOR: 'earbud', PHI: 'car', CH: 'both', STAB: 'both', INOUT: 'car', CO: 'car', OBS: 'car', PBH: 'car', GRAM: 'car', WORK: 'both', OPT: 'car', FILT: 'earbud', FB: 'car' };
const COMES_BACK: Record<string, Record<string, string[]>> = {
  earbud: { big: ['STAB', 'WORK'], full: ['RE', 'JOR', 'CH', 'STAB', 'WORK', 'FILT'] },
  car: { big: ['MODES', 'STAB', 'INOUT', 'WORK'], full: ['MODES', 'DIAG', 'PHI', 'CH', 'STAB', 'INOUT', 'CO', 'OBS', 'PBH', 'GRAM', 'WORK', 'OPT', 'FB'] },
};

describe('LS per-box examples (usage.json)', () => {
  for (const m of graph.maps as { id: string; nodes: { id: string; examples?: string[]; exampleWhy?: string }[]; edges: never[] }[]) {
    it(`${m.id}: earbud before STATE, the tutor's choice after; every post-switch box has its one-line why`, () => {
      for (const n of m.nodes) {
        const want = PRE.includes(n.id) ? ['earbud'] : AFTER[n.id] === 'both' ? ['earbud', 'car'] : [AFTER[n.id]];
        expect(n.examples, n.id).toEqual(want);
        if (!PRE.includes(n.id)) expect((n.exampleWhy ?? '').length, `${n.id} why`).toBeGreaterThan(10); else expect(n.exampleWhy).toBeUndefined();
      }
    });
    it(`${m.id}: "Where this example comes back" is the tutor's list, in the tutor's order; the derived rule finds the same boxes`, () => {
      for (const id of ['earbud', 'car']) {
        expect(refs.find((r) => r.id === id)!.comesBack?.[m.id], id).toEqual(COMES_BACK[id][m.id]);
        expect([...exampleComesBack(m, refs, id)].sort(), `${id} derived`).toEqual([...COMES_BACK[id][m.id]].sort());
      }
    });
  }
});
