/** Example-order guard: later machines are not named on any main-path box before their host. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { exampleLeaks, formatLeaks, type ExampleGuard, type GNode } from '../../../packages/core/src/exampleguard';

const app = path.resolve(import.meta.dirname, '..');
const graph = parse(fs.readFileSync(path.join(app, 'content', 'graph.yaml'), 'utf8'));
const quiz = parse(fs.readFileSync(path.join(app, 'content', 'quiz.yaml'), 'utf8')) as { id: string; tags?: string[] }[];
const strings = (o: unknown): string[] => typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(strings) : o && typeof o === 'object' ? Object.entries(o).filter(([k]) => k !== 'id' && k !== 'tags' && k !== 'kind').flatMap(([, v]) => strings(v)) : [];
const quizOf = (n: GNode): [string, string][] => [
  ...quiz.filter((q) => q.id === n.pop?.ask).map((q) => [`quick check ${q.id}`, strings(q).join(' ')] as [string, string]),
  ...quiz.filter((q) => n.quizTag && q.tags?.includes(n.quizTag) && q.id !== n.pop?.ask).map((q) => [`quiz ${q.id}`, strings(q).join(' ')] as [string, string]),
];
const subj = parse(fs.readFileSync(path.join(app, 'subject.yaml'), 'utf8'));
const host = (id: string) => (subj.runningExample.refs as { id: string; at: string }[]).find((r) => r.id === id)!.at;

export const BORER_GUARD: ExampleGuard = {
  id: 'borer', at: host('borer'),
  words: ['boring', 'borer', 'tunnel', 'cutter', 'Channel'],
  numbers: [],
  figureIds: /^(borer|tradeoff|sens)$/,
  boxExtra: quizOf,
  // "rock" is also ordinary English; only count it beside a borer word
  weak: ['rock'],
};
export const DISK_GUARD: ExampleGuard = {
  id: 'disk', at: host('disk'),
  // "shock" is the borer's spring/shock-absorber analogy, not the disk's shock test — omit it.
  words: ['disk', 'disk-drive', 'seek'],
  numbers: ['5000/(s + 1000)', '5000/(s+1000)', '1/(s(s + 20))', '1/(s(s+20))'],
  figureIds: /^disk$/,
  boxExtra: quizOf,
};
export const ENGINE_GUARD: ExampleGuard = {
  id: 'engine', at: host('engine'),
  // "Simulink" and "Tuner" also appear at the root (the project is built in MATLAB/Simulink; a root
  // quick-check option already says "Let PID Tuner choose the gains") — those are reported to the
  // tutor rather than used as guard words. Keep the machine's own names and its table numbers.
  words: ['engine', 'throttle', 'scdspeedctrlpidblock'],
  numbers: ['0.0042253', '0.0092411', '0.678'],
  figureIds: /^(tuner|pi)$/,
  boxExtra: quizOf,
};

const out: string[] = [];
for (const [G, name] of [[BORER_GUARD, 'What feedback costs'], [DISK_GUARD, 'One more part'], [ENGINE_GUARD, 'Let software tune it']] as [ExampleGuard, string][]) {
  describe(`example-order guard (sim-project): the ${G.id} before its host box (${G.at}, ${name})`, () => {
    const leaks = (graph.maps as { id: string; nodes: never[]; edges: never[] }[]).flatMap((m) => exampleLeaks(m, G));
    // The tutor names the next machine on the line that arrives at its host (SENS→DISK, KAPUSH→TUNER).
    // Those are reported, not failed: do not rewrite the tutor's text. Fail only on earlier boxes/lines.
    const incoming = (l: { id: string }) => l.id.endsWith('->' + G.at);
    const mainAll = leaks.filter((l) => !l.sideOnly), side = leaks.filter((l) => l.sideOnly);
    const main = mainAll.filter((l) => !incoming(l));
    if (mainAll.some(incoming)) console.log(`[example-order ${G.id}] arriving line at ${G.at} names it (reported, not failed):\n${formatLeaks(mainAll.filter(incoming))}`);
    out.push(`# ${G.id} mentioned before ${G.at}: ${main.length} unexpected main, ${mainAll.length - main.length} on the arriving line, ${side.length} side-only\n${formatLeaks(leaks)}\n`);
    if (process.env.EXAMPLE_LEAKS_OUT) fs.writeFileSync(process.env.EXAMPLE_LEAKS_OUT, out.join('\n'));
    it('the guard sees the host box itself (sanity)', () => {
      const chain = graph.maps[0], h = chain.nodes.find((n: { id: string }) => n.id === G.at);
      expect(exampleLeaks({ id: 't', nodes: [{ ...h, id: 'root' }, { id: 'H' }], edges: [{ from: 'root', to: 'H' }] }, { ...G, at: 'H' }).length).toBeGreaterThan(0);
    });
    it(`no box body, line why, figure, caption or quiz item on the main path before ${G.at} names the ${G.id}`, () => {
      expect(main, formatLeaks(main)).toEqual([]);
    });
    it('a side path that skips the host is reported, not failed', () => {
      if (side.length) console.log(`[example-order ${G.id}] side-path-only (not failed):\n${formatLeaks(side)}`);
    });
  });
}
