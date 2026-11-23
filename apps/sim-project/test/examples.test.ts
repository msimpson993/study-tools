/** Per-box examples and "Where this example comes back" lists. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { exampleComesBack } from '../../../packages/core/src/maplayout';

const app = path.resolve(import.meta.dirname, '..');
const graph = parse(fs.readFileSync(path.join(app, 'content', 'graph.yaml'), 'utf8'));
const subj = parse(fs.readFileSync(path.join(app, 'subject.yaml'), 'utf8'));
const refs: { id: string; at: string; comesBack?: { chain?: string[] } }[] = subj.runningExample.refs;

const COMES_BACK: Record<string, string[]> = {
  motor: ['PRICE', 'NEEDI', 'FOUR'],
  borer: ['KA', 'KAPUSH', 'NEEDI', 'FOUR'],
  disk: ['NEEDI', 'FOUR'],
  engine: ['FOUR'],
};

describe('sim-project per-box examples', () => {
  it('hosts are where the switches happen', () => {
    expect(Object.fromEntries(refs.map((r) => [r.id, r.at]))).toEqual({ motor: 'BLOCKS', borer: 'PRICE', disk: 'DISK', engine: 'TUNER' });
  });
  it('the tutor\'s comes-back lists match subject.yaml, and the derived rule agrees (plus any first-stretch side boxes)', () => {
    const m = graph.maps[0];
    for (const id of Object.keys(COMES_BACK)) {
      expect(refs.find((r) => r.id === id)!.comesBack?.chain, id).toEqual(COMES_BACK[id]);
      const derived = exampleComesBack(m, refs, id);
      for (const box of COMES_BACK[id]) expect(derived, `${id} derived includes ${box}`).toContain(box);
    }
  });
  it('every non-root box lists the examples it uses; a post-switch box has a one-line why when more than one is listed', () => {
    for (const n of graph.maps[0].nodes as { id: string; examples?: string[]; exampleWhy?: string }[]) {
      if (n.id === 'root') { expect(n.examples).toBeUndefined(); continue; }
      expect(n.examples?.length, n.id).toBeGreaterThan(0);
      if ((n.examples?.length ?? 0) > 1 || n.exampleWhy) expect((n.exampleWhy ?? '').length, `${n.id} why`).toBeGreaterThan(10);
    }
  });
});
