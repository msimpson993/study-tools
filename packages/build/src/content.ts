import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import { createMarkdown, MathErrors } from './markdown';
import type { AppContent, MapDef, Dive, Question, Term, FigureDef, Subject } from '../../core/src/types';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const schemaDir = path.join(repoRoot, 'schemas');

const ajv = new Ajv({ allErrors: true, strict: false });
const validators: Record<string, ReturnType<typeof ajv.compile>> = {};
function validator(name: string) {
  if (!validators[name]) {
    validators[name] = ajv.compile(JSON.parse(fs.readFileSync(path.join(schemaDir, `${name}.schema.json`), 'utf8')));
  }
  return validators[name];
}

function readYaml(file: string): unknown {
  return parseYaml(fs.readFileSync(file, 'utf8'));
}
function exists(p: string) { return fs.existsSync(p); }

export class ContentError extends Error {
  constructor(public problems: string[], app: string) {
    super(`Content errors in ${app}:\n - ${problems.join('\n - ')}`);
  }
}

function checkSchema(problems: string[], name: string, data: unknown, file: string) {
  const v = validator(name);
  if (!v(data)) {
    for (const e of v.errors ?? []) problems.push(`${file}${e.instancePath || '/'} ${e.message}${e.params && 'additionalProperty' in e.params ? ` (${e.params.additionalProperty})` : ''}`);
  }
}

function splitFrontMatter(src: string): { fm: unknown; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
  if (!m) throw new Error('missing YAML front matter');
  return { fm: parseYaml(m[1]), body: m[2] };
}

/** True if the (possibly cyclic) directed graph has a cycle. */
export function hasCycle(ids: string[], edges: { from: string; to: string }[]): boolean {
  const indeg = new Map(ids.map((i) => [i, 0]));
  for (const e of edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  const q = ids.filter((i) => indeg.get(i) === 0);
  let seen = 0;
  while (q.length) {
    const u = q.pop()!; seen++;
    for (const e of edges) if (e.from === u) { indeg.set(e.to, indeg.get(e.to)! - 1); if (indeg.get(e.to) === 0) q.push(e.to); }
  }
  return seen !== ids.length;
}

export function nodeQuizTag(n: { id: string; dive?: string; quizTag?: string }): string {
  return n.quizTag ?? n.dive ?? n.id;
}

/** Load, validate and render one app's content. Throws ContentError listing every problem. */
export function loadApp(appDir: string): { content: AppContent; warnings: string[] } {
  const appName = path.basename(appDir);
  const cdir = path.join(appDir, 'content');
  const problems: string[] = [];
  const warnings: string[] = [];
  const mathErrors = new MathErrors();
  let where = appName;
  const md = createMarkdown(mathErrors, () => where);
  const inline = (s: string | undefined, w: string) => { where = w; return s ? md.renderInline(s) : ''; };
  const block = (s: string | undefined, w: string) => { where = w; return s ? md.render(s) : ''; };

  const subject = readYaml(path.join(appDir, 'subject.yaml')) as Subject & { expect?: Record<string, number> };
  checkSchema(problems, 'subject', subject, 'subject.yaml');

  // ---------- graph ----------
  const maps: MapDef[] = [];
  const graphFile = path.join(cdir, 'graph.yaml');
  if (exists(graphFile)) {
    const g = readYaml(graphFile) as { maps: any[] };
    checkSchema(problems, 'graph', g, 'graph.yaml');
    for (const m of g.maps ?? []) {
      const ids = new Set<string>();
      for (const n of m.nodes ?? []) {
        if (ids.has(n.id)) problems.push(`graph.yaml ${m.id}: duplicate node id ${n.id}`);
        ids.add(n.id);
      }
      if (!ids.has('root')) problems.push(`graph.yaml ${m.id}: missing a node with id "root" (the central question)`);
      const pairs = new Set<string>();
      for (const e of m.edges ?? []) {
        if (!ids.has(e.from) || !ids.has(e.to)) problems.push(`graph.yaml ${m.id}: dangling edge ${e.from} -> ${e.to}`);
        const k = `${e.from}__${e.to}`;
        if (pairs.has(k)) problems.push(`graph.yaml ${m.id}: duplicate edge ${k}`);
        pairs.add(k);
      }
      if (hasCycle([...ids], m.edges ?? [])) problems.push(`graph.yaml ${m.id}: the map has a cycle`);
      // every node must be reachable from root
      const reach = new Set<string>(['root']);
      for (let i = 0; i < ids.size; i++) for (const e of m.edges ?? []) if (reach.has(e.from)) reach.add(e.to);
      for (const id of ids) if (!reach.has(id)) problems.push(`graph.yaml ${m.id}: node ${id} is not reachable from root`);
      maps.push({
        id: m.id, title: m.title, caption: m.caption,
        nodes: (m.nodes ?? []).map((n: any) => ({
          id: n.id, label: n.label, detail: n.detail, kind: n.kind, series: n.series,
          short: inline(n.short, `graph.yaml ${m.id}/${n.id}`),
          eq: n.eq,
          eqHtml: n.eqTex ? (where = `graph.yaml ${m.id}/${n.id} eqTex`, md.renderInline(`$${n.eqTex}$`)) : undefined,
          why: n.why ? inline(n.why, `${m.id}/${n.id}`) : undefined,
          recognize: n.recognize ? inline(n.recognize, `${m.id}/${n.id}`) : undefined,
          trap: n.trap ? inline(n.trap, `${m.id}/${n.id}`) : undefined,
          predict: n.predict ? inline(n.predict, `${m.id}/${n.id}`) : undefined,
          dive: n.dive, live: n.live, quizTag: n.quizTag, link: n.link,
        })),
        edges: (m.edges ?? []).map((e: any) => ({
          from: e.from, to: e.to, label: e.label, dashed: e.dashed, eq: e.eq,
          question: inline(e.question, `graph.yaml ${m.id}/${e.from}->${e.to}`),
          idea: inline(e.idea, `graph.yaml ${m.id}/${e.from}->${e.to}`),
        })),
      });
    }
  } else {
    problems.push('content/graph.yaml is required: every page opens on the question map');
  }

  // ---------- dives ----------
  const dives: Dive[] = [];
  const diveDir = path.join(cdir, 'dives');
  if (exists(diveDir)) {
    for (const f of fs.readdirSync(diveDir).filter((x) => x.endsWith('.md')).sort()) {
      try {
        const { fm, body } = splitFrontMatter(fs.readFileSync(path.join(diveDir, f), 'utf8'));
        checkSchema(problems, 'dive', fm, `dives/${f}`);
        const d = fm as any;
        if (d.id !== f.replace(/\.md$/, '')) problems.push(`dives/${f}: id "${d.id}" must equal the file name`);
        if (body.trim().length < 80) problems.push(`dives/${f}: body is empty`);
        dives.push({ id: d.id, order: d.order, title: d.title, category: d.category, chain: d.chain, neighbors: d.neighbors ?? [], matlab: d.matlab, html: block(body, `dives/${f}`) });
      } catch (e) { problems.push(`dives/${f}: ${(e as Error).message}`); }
    }
  }

  dives.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.id.localeCompare(b.id));

  // ---------- quiz / glossary / figures ----------
  const quizRaw = exists(path.join(cdir, 'quiz.yaml')) ? (readYaml(path.join(cdir, 'quiz.yaml')) as any[]) : [];
  checkSchema(problems, 'quiz', quizRaw, 'quiz.yaml');
  const quiz: Question[] = quizRaw.map((q) => ({
    id: q.id, tags: q.tags, kind: q.kind,
    q: inline(q.q, `quiz ${q.id}`), choices: q.choices?.map((c: string) => inline(c, `quiz ${q.id}`)), answer: q.answer,
    a: q.a ? block(q.a, `quiz ${q.id}`) : undefined, why: q.why ? block(q.why, `quiz ${q.id}`) : undefined,
  }));
  const qids = new Set<string>();
  for (const q of quizRaw) {
    if (qids.has(q.id)) problems.push(`quiz.yaml: duplicate id ${q.id}`);
    qids.add(q.id);
    if (q.kind !== 'recall' && q.choices && !(q.answer !== undefined && q.answer >= 0 && q.answer < q.choices.length)) {
      problems.push(`quiz.yaml ${q.id}: answer ${q.answer} is not one of the ${q.choices.length} choices`);
    }
  }

  const glossary: Term[] = exists(path.join(cdir, 'glossary.yaml')) ? (readYaml(path.join(cdir, 'glossary.yaml')) as Term[]) : [];
  checkSchema(problems, 'glossary', glossary, 'glossary.yaml');
  const glossaryR = glossary.map((t) => ({ ...t, meaning: inline(t.meaning, `glossary ${t.term}`) }));

  const figures: FigureDef[] = exists(path.join(cdir, 'figures.yaml')) ? (readYaml(path.join(cdir, 'figures.yaml')) as FigureDef[]) : [];
  checkSchema(problems, 'figures', figures, 'figures.yaml');
  const figuresR = figures.map((f) => ({ ...f, howToRead: inline(f.howToRead, `figure ${f.id}`), presets: f.presets.map((p) => ({ ...p, about: p.about ? inline(p.about, `figure ${f.id}/${p.id}`) : undefined })) }));
  for (const f of figures) {
    const ids = new Set(f.controls.map((c) => c.id));
    for (const p of f.presets) for (const k of Object.keys(p.set)) if (!ids.has(k)) problems.push(`figures.yaml ${f.id}/${p.id}: preset sets "${k}", which is not a visible control`);
  }

  // ---------- extra (examples.yaml) ----------
  const extra: Record<string, unknown> = {};
  if (exists(path.join(cdir, 'examples.yaml'))) {
    const ex = readYaml(path.join(cdir, 'examples.yaml')) as any;
    checkSchema(problems, 'examples', ex, 'examples.yaml');
    extra.examples = ex;
    const ids = new Set<string>();
    for (const e of ex.examples ?? []) {
      if (ids.has(e.id)) problems.push(`examples.yaml: duplicate id ${e.id}`);
      ids.add(e.id);
      if (e.extra && !ex.defs?.[e.extra]) problems.push(`examples.yaml ${e.id}: unknown extra "${e.extra}"`);
      if (e.cat >= ex.categories.length) problems.push(`examples.yaml ${e.id}: cat ${e.cat} out of range`);
      if (subject.board && !subject.board.pairs.includes(e.sel)) problems.push(`examples.yaml ${e.id}: sel "${e.sel}" is not a board transform`);
    }
    for (const t of ex.tryThis ?? []) if (!ids.has(t.id)) problems.push(`examples.yaml tryThis: unknown example ${t.id}`);
  }

  // ---------- sections ----------
  const sectionsR = (subject.sections ?? []).map((s: any) => {
    if (s.kind === 'md') {
      const f = path.join(cdir, 'sections', s.file ?? `${s.id}.md`);
      if (!exists(f)) { problems.push(`sections: missing ${path.relative(appDir, f)}`); return s; }
      return { id: s.id, title: s.title, kind: s.kind, html: block(fs.readFileSync(f, 'utf8'), `sections/${s.id}.md`) };
    }
    return { id: s.id, title: s.title, kind: s.kind };
  });
  if (subject.sections && subject.sections[0] && subject.sections[0].kind !== 'map') problems.push('subject.yaml: the first section must be the map (map-first rule)');

  // ---------- cross checks ----------
  const diveIds = new Set(dives.map((d) => d.id));
  const cats = new Set((subject.categories ?? []).map((c) => c.id));
  for (const d of dives) {
    if (subject.categories && !cats.has(d.category)) problems.push(`dives/${d.id}: unknown category ${d.category}`);
    for (const nb of d.neighbors) if (!diveIds.has(nb)) problems.push(`dives/${d.id}: neighbor "${nb}" is not a dive`);
  }
  const figIds = new Set(figures.map((f) => f.id));
  const tags = new Set<string>();
  for (const m of maps) {
    for (const n of m.nodes) {
      tags.add(nodeQuizTag(n));
      if (n.dive && !diveIds.has(n.dive)) problems.push(`graph.yaml ${m.id}/${n.id}: dive "${n.dive}" does not exist`);
      if (!n.short.trim()) problems.push(`graph.yaml ${m.id}/${n.id}: empty short answer`);
      if (n.live) {
        const [kind, rest] = n.live.split(':');
        const ref = rest.split('?')[0];
        if (kind === 'figure' && !figIds.has(ref)) problems.push(`graph.yaml ${m.id}/${n.id}: live figure "${ref}" not in figures.yaml`);
        if (kind === 'board') {
          if (!subject.board?.pairs.includes(ref)) problems.push(`graph.yaml ${m.id}/${n.id}: live board pair "${ref}" is not in subject.board.pairs`);
          const pre = /preset=([A-Za-z0-9_-]+)/.exec(rest);
          const exs = ((extra.examples as any)?.examples ?? []).map((e: any) => e.id);
          if (pre && !exs.includes(pre[1])) problems.push(`graph.yaml ${m.id}/${n.id}: live preset "${pre[1]}" not in examples.yaml`);
        }
      }
      if (n.link?.href && n.link.href.startsWith('../')) {
        const target = n.link.href.split('/')[1];
        if (!exists(path.join(appDir, '..', target, 'subject.yaml'))) problems.push(`graph.yaml ${m.id}/${n.id}: link to unknown app "${target}"`);
      }
    }
  }
  for (const q of quiz) {
    for (const t of q.tags) if (!tags.has(t) && !diveIds.has(t)) problems.push(`quiz.yaml ${q.id}: tag "${t}" matches no node/dive`);
  }

  // ---------- porting guard ----------
  const exp = subject.expect;
  if (exp) {
    const got = {
      maps: maps.length, nodes: maps.reduce((a, m) => a + m.nodes.length, 0), edges: maps.reduce((a, m) => a + m.edges.length, 0),
      dives: dives.length, quiz: quiz.length, examples: ((extra.examples as any)?.examples ?? []).length,
    } as Record<string, number>;
    for (const [k, v] of Object.entries(exp)) if (got[k] !== v) problems.push(`subject.yaml expect.${k} = ${v} but found ${got[k]} (content was dropped or added; update expect deliberately)`);
  }

  problems.push(...mathErrors.list);
  if (problems.length) throw new ContentError(problems, appName);

  const content: AppContent = {
    subject: { ...subject, sections: sectionsR as any },
    maps, dives, quiz, glossary: glossaryR as Term[], figures: figuresR as FigureDef[], extra,
  };
  return { content, warnings };
}

export function listApps(): string[] {
  const dir = path.join(repoRoot, 'apps');
  return fs.readdirSync(dir).filter((d) => exists(path.join(dir, d, 'subject.yaml')) && !d.startsWith('_')).sort();
}
