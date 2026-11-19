/** Numbers and links added in the pass-2 review edits, recomputed from the models and the content. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { spk, Hf, cabs } from '../src/figs/ex';
import { earbudBiquad } from '../src/figs/sounds';
import { biquadMag } from '../../../packages/core/src/audioDsp';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../content', p), 'utf8');

describe('Box 8: the poles set the 688 Hz ring and its 0.79 ms decay', () => {
  it('poles −1,267 ± j4,322 rad/s; time constant 1/σ = 0.79 ms; ring ω_d/2π = 688 Hz', () => {
    const s = spk();
    // the model gives σ = 1,266.4 /s; the site's long-standing "1,267" is within 1 /s (flagged for the tutor)
    expect(Math.abs(s.sigma * 1000 - 1267)).toBeLessThan(1); expect(Math.round(s.wd * 1000)).toBe(4322);
    expect((1 / s.sigma).toFixed(2)).toBe('0.79');
    expect(Math.round((s.wd * 1000) / (2 * Math.PI))).toBe(688);
  });
});

describe('sampling dive: the earbud sound is a bilinear biquad prewarped at 717 Hz', () => {
  it('at 48 kHz the biquad matches the analog gain exactly at fₙ', () => {
    const fn = spk().fn, c = earbudBiquad(48000);
    expect(Math.round(fn)).toBe(717);
    expect(biquadMag(c, fn, 48000)).toBeCloseTo(cabs(Hf(fn)), 6);
  });
});

describe('board: every Try-this card links to a map box that exists', () => {
  it('box ids resolve', () => {
    const ex = parse(read('examples.yaml'));
    const g = parse(read('graph.yaml'));
    const ids = new Set(g.maps.flatMap((m: { nodes: { id: string }[] }) => m.nodes.map((n) => n.id)));
    for (const t of ex.tryThis) { expect(t.box, t.id).toBeTruthy(); expect(ids.has(t.box), t.box).toBe(true); }
  });
});
