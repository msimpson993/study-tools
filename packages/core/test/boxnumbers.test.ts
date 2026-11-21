/** Labels, not numbers (CS pass 3, Nov 21): the maps show no box numbers, so reader-facing text must name a box by its label,
 *  never "Box 7" / "boxes 8–12". Scans every string (not YAML comments) in graph, quiz, glossary, subject and figures, every
 *  dive's markdown, and string literals in the apps' figure code (comments skipped). */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const RX = /\b[Bb]ox(?:es)? \d/;
const root = path.resolve(import.meta.dirname, '..', '..', '..');
const strings = (o: unknown, at: string): [string, string][] => typeof o === 'string' ? [[at, o]] : Array.isArray(o) ? o.flatMap((v, i) => strings(v, `${at}[${i}]`)) : o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => strings(v, `${at}.${k}`)) : [];
const walk = (d: string): string[] => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
/** string literals in TS source, with comments removed first */
const literals = (src: string): string[] => {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  return [...code.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map((m) => m[0]);
};

for (const app of ['control-systems', 'linear-systems']) describe(`${app}: no "Box N" in reader-facing text`, () => {
  const dir = path.join(root, 'apps', app);
  it('content YAML, subject and dives', () => {
    const hits: string[] = [];
    const files = [...walk(path.join(dir, 'content')).filter((f) => /\.ya?ml$/.test(f)), path.join(dir, 'subject.yaml')];
    for (const f of files) for (const [at, s] of strings(parse(fs.readFileSync(f, 'utf8')), path.basename(f))) if (RX.test(s)) hits.push(`${at}: ${s.slice(0, 120)}`);
    for (const f of walk(path.join(dir, 'content')).filter((f) => f.endsWith('.md'))) {
      const txt = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
      txt.split('\n').forEach((l, i) => { if (RX.test(l)) hits.push(`${path.relative(dir, f)}:${i + 1}: ${l.slice(0, 120)}`); });
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });
  it('figure code: drawn strings', () => {
    const hits: string[] = [];
    for (const f of walk(path.join(dir, 'src')).filter((f) => f.endsWith('.ts'))) for (const s of literals(fs.readFileSync(f, 'utf8'))) if (RX.test(s)) hits.push(`${path.relative(dir, f)}: ${s.slice(0, 120)}`);
    expect(hits, hits.join('\n')).toEqual([]);
  });
  it('the check itself catches a box number (sanity)', () => {
    expect(RX.test('Still open: Box 13 assumed')).toBe(true); expect(RX.test('boxes 8–12 replay')).toBe(true);
    expect(RX.test('the box labels, inbox 3')).toBe(false);
  });
});
