import { describe, it, expect, beforeEach } from 'vitest';
import { Progress } from '../src/progress';
import type { MapDef } from '../src/types';

const node = (id: string) => ({ id, label: id, short: id });
const maps = [
  { id: 'big', title: 'Big', nodes: [node('root'), node('A'), node('B')], edges: [] },
  { id: 'full', title: 'Full', nodes: [node('root'), node('A'), node('B'), node('C')], edges: [] },
] as unknown as MapDef[];

describe('Progress counts unique boxes across maps', () => {
  beforeEach(() => { (globalThis as any).localStorage?.clear?.(); });
  it('a box on both maps counts once, and seen on either map means seen', () => {
    const p = new Progress('progress-test-' + Math.random(), [], maps);
    expect(p.summary().total).toBe(4);
    p.markSeen('full', 'A');
    expect(p.status('big', maps[0].nodes[1])).toBe('seen');
    expect(p.status('full', maps[1].nodes[1])).toBe('seen');
    const s = p.summary();
    expect(s.seen).toBe(1); expect(s.unseen).toBe(3);
    p.markSeen('big', 'A');
    expect(p.summary().seen).toBe(1);
    p.markSeen('full', 'C');
    expect(p.summary()).toMatchObject({ total: 4, seen: 2, unseen: 2 });
  });
});
