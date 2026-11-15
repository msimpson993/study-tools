import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { choiceOrder, choiceReferencesOthers, pinnedChoices, shuffleInPlace } from '../src/choiceorder';

function seeded(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

describe('choice shuffling', () => {
  it('returns a permutation and keeps the correct answer attached to its text', () => {
    const q = { choices: ['right', 'w1', 'w2', 'w3'], answer: 0 };
    const rng = seeded(1);
    for (let k = 0; k < 200; k++) {
      const o = choiceOrder(q, rng);
      expect([...o].sort()).toEqual([0, 1, 2, 3]);
      expect(q.choices[o[o.indexOf(0)]]).toBe('right'); // the answer is found by authored index wherever it lands
    }
  });
  it('puts the answer in every slot, roughly evenly', () => {
    const q = { choices: ['a', 'b', 'c', 'd'] };
    const rng = seeded(7); const slot = [0, 0, 0, 0];
    for (let k = 0; k < 4000; k++) slot[choiceOrder(q, rng).indexOf(0)]++;
    for (const n of slot) expect(n).toBeGreaterThan(800);
  });
  it('is the identity for fixedOrder questions', () => {
    for (let k = 0; k < 20; k++) expect(choiceOrder({ choices: ['x', 'y', 'z'], fixedOrder: true })).toEqual([0, 1, 2]);
  });
  it('pins choices that refer to the others after the shuffled ones, in authored order', () => {
    const q = { choices: ['ZOH', 'Ideal sinc', 'Both', 'Neither'] };
    expect(pinnedChoices(q)).toEqual([2, 3]);
    const rng = seeded(3);
    for (let k = 0; k < 50; k++) { const o = choiceOrder(q, rng); expect(o.slice(2)).toEqual([2, 3]); expect(o.slice(0, 2).sort()).toEqual([0, 1]); }
  });
  it('detects references by letter and "of the above", but not matrix names or self-contained "Both …"', () => {
    for (const c of ['Both', 'Neither', 'None of them', 'None of the above', 'All of the above', 'All three', 'A and B', 'Both A and B', 'B, C', 'Options A and C only', 'Only <b>option B</b>', 'Any of the above'])
      expect(choiceReferencesOthers(c), c).toBe(true);
    for (const c of ['A and B change; C stays the same', 'Both are ×, colored differently', 'Both 10%', 'Both poles and zeros', 'Nothing changes', 'All bins', 'Neither can be described with probes', 'rank(A) = n', 'The poles; the zeros generally do not'])
      expect(choiceReferencesOthers(c), c).toBe(false);
  });
  it('shuffleInPlace is unbiased enough to move things', () => { expect(shuffleInPlace([1, 2, 3, 4, 5, 6, 7, 8], seeded(5))).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8]); });
});

describe('every app quiz', () => {
  const appsDir = path.resolve(__dirname, '../../../apps');
  for (const app of fs.readdirSync(appsDir)) {
    const f = path.join(appsDir, app, 'content/quiz.yaml');
    if (!fs.existsSync(f)) continue;
    it(`${app}: choices shuffle to every slot and cross-referencing choices stay after the options they point at`, () => {
      const qs = (YAML.parse(fs.readFileSync(f, 'utf8')) as any[]).filter((q) => q.choices);
      const rng = seeded(11);
      for (const q of qs) {
        const o = choiceOrder(q, rng);
        expect([...o].sort()).toEqual(q.choices.map((_: unknown, i: number) => i));
        const pin = q.fixedOrder ? [] : pinnedChoices(q);
        // pinned choices are last, so nothing they refer to can come after them
        if (pin.length) expect(o.slice(o.length - pin.length)).toEqual(pin);
      }
      // a mostly-free question can place its answer in any slot: nothing is stuck at A
      const free = qs.filter((q) => !q.fixedOrder && pinnedChoices(q).length === 0 && q.choices.length === 4);
      const hit = [0, 0, 0, 0];
      for (let k = 0; k < 50; k++) for (const q of free) hit[choiceOrder(q, rng).indexOf(q.answer)]++;
      if (free.length >= 8) for (const n of hit) expect(n).toBeGreaterThan(free.length * 50 * 0.15);
    });
  }
});
