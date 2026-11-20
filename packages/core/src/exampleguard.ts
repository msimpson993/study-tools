/** Example-order guard (reusable, keyed by example): a running example must not show up on a reading path before the box that
 *  introduces it (its Example node's host). Walks every path from the root along the main lines (Next/Back; side paths included,
 *  the dashed "same idea" cross-links not) and reports each box or line passed before the host whose text names the example.
 *  Works on raw graph.yaml maps (markdown) or built ones (HTML). Pure; used by the apps' unit tests. */

export interface ExampleGuard {
  /** the Example node's id (runningExample.refs[].id) */
  id: string;
  /** its host box: the example is introduced there */
  at: string;
  /** words that name the example (whole words, any case), e.g. car, suspension, heave */
  words: string[];
  /** numbers only this example uses, written as in the text ("1400 kg", "0.18 s", "1.151"); a space may be missing */
  numbers?: string[];
  /** figure ids that draw the example (their pictures say it even when no caption does) */
  figureIds?: RegExp;
  /** words that also mean something else (a tone's pitch): they count only in a field that already names the example otherwise */
  weak?: string[];
  /** more texts a box shows (e.g. its quiz items: the quick check and "quiz this box"), as [field, text] pairs */
  boxExtra?: (n: GNode) => [string, string][];
  /** phrases where a word means something else (e.g. a tone's pitch, not the car's): blanked before matching */
  ignore?: RegExp[];
}
export interface Leak { map: string; kind: 'box' | 'line'; id: string; field: string; term: string; snippet: string; path: string[]; /** reached before the host only by taking a side path (a shortcut that skips the host) */ sideOnly: boolean }

export interface GNode { id: string; quizTag?: string; label?: string; detail?: string; short?: string; why?: string; recognize?: string; trap?: string; predict?: string; addsToExample?: string;
  pop?: { ask?: string; rough?: string; eqKey?: string; figures?: { id: string; alt?: string; caption?: string }[]; figCaption?: string; example?: string; next?: string } }
interface GEdge { from: string; to: string; label?: string; dashed?: boolean; reverse?: boolean; side?: boolean; question?: string; idea?: string; why?: string; whyFigures?: { id: string; alt?: string; caption?: string }[]; whyFigCaption?: string }
interface GMap { id: string; nodes: GNode[]; edges: GEdge[] }

const plain = (t: string) => t.replace(/<[^>]+>/g, ' ').replace(/\*\*|__|`/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const escRx = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function matchers(g: ExampleGuard): { term: string; rx: RegExp }[] {
  const w = [...g.words, ...(g.weak ?? [])].map((t) => ({ term: t, rx: new RegExp(`(?<![\\p{L}\\p{N}_-])${escRx(t)}(?![\\p{L}\\p{N}_])`, 'iu') }));
  const n = (g.numbers ?? []).map((t) => {
    const body = escRx(t).replace(/ /g, '\\s?');
    const after = /[\d]$/.test(t) ? '(?![\\d]|[.,]\\d)' : '(?![\\p{L}²³/])';
    return { term: t, rx: new RegExp(`(?<![\\d.,])${body}${after}`, 'u') };
  });
  return [...w, ...n];
}
/** the texts a reader sees in a box's pop-up: body, figure text and caption, and its running-example ("strip") row */
function boxFields(n: GNode): [string, string][] {
  const p = n.pop, f: [string, string][] = [['label', n.label ?? ''], ['detail', n.detail ?? ''], ['body', n.short ?? '']];
  for (const k of ['why', 'recognize', 'trap', 'predict'] as const) if (n[k]) f.push([k, n[k]!]);
  if (p) {
    f.push(['rough', p.rough ?? '']); if (p.eqKey) f.push(['eqKey', p.eqKey]);
    (p.figures ?? []).forEach((x) => { f.push([`figure ${x.id} text`, `${x.alt ?? ''} ${x.caption ?? ''}`]); });
    if (p.figCaption) f.push(['figure caption', p.figCaption]);
    if (p.next) f.push(['next', p.next]);
  }
  // the strip row: the pop's running-example line, else the box's addsToExample (what the pop shows in its place)
  const strip = p?.example ?? n.addsToExample; if (strip) f.push(['strip row', strip]);
  return f;
}
function edgeFields(e: GEdge): [string, string][] {
  const f: [string, string][] = [['label', e.label ?? ''], ['question', e.question ?? ''], ['idea', e.idea ?? ''], ['why', e.why ?? '']];
  (e.whyFigures ?? []).forEach((x) => f.push([`figure ${x.id} text`, `${x.alt ?? ''} ${x.caption ?? ''}`]));
  if (e.whyFigCaption) f.push(['figure caption', e.whyFigCaption]);
  return f;
}

/** Every box and line that a reader can reach from the root before the host, with the first path that gets there. */
export function beforeHost(map: GMap, at: string, rootId = 'root', sides = true): { boxes: Map<string, string[]>; lines: Map<string, string[]> } {
  const out = map.edges.filter((e) => !e.dashed), boxes = new Map<string, string[]>(), lines = new Map<string, string[]>();
  let walked = 0;
  const walk = (id: string, path: string[]) => {
    if (++walked > 200_000) throw new Error(`exampleguard: too many paths in map ${map.id}`);
    if (id === at) return; // introduced here: the rest of this path may use it
    if (!boxes.has(id)) boxes.set(id, path);
    for (const e of out.filter((x) => x.from === id)) {
      // a side line leaving a box is read there even when its shortcut is not taken
      const k = `${e.from}->${e.to}`; if (!lines.has(k)) lines.set(k, [...path, e.to]);
      if ((sides || !e.side) && !path.includes(e.to)) walk(e.to, [...path, e.to]);
    }
  };
  if (map.nodes.some((n) => n.id === rootId)) walk(rootId, [rootId]);
  // a dashed cross-link is not walked, but a reader at either end before the host can open it; a look-back (reversed) is
  // listed only at the box that looks back (its `to` end)
  for (const e of map.edges) if (e.dashed) { const p = e.reverse ? boxes.get(e.to) : boxes.get(e.from) ?? boxes.get(e.to); if (p) lines.set(`${e.from}->${e.to}`, p); }
  return { boxes, lines };
}

/** The leaks of one example on one map: each field of a box or line before its host that names it. */
export function exampleLeaks(map: GMap, g: ExampleGuard): Leak[] {
  const ms = matchers(g), leaks: Leak[] = [], { boxes, lines } = beforeHost(map, g.at), main = beforeHost(map, g.at, 'root', false);
  const scan = (kind: Leak['kind'], id: string, fields: [string, string][], path: string[], figs: string[]) => {
    const sideOnly = !(kind === 'box' ? main.boxes : main.lines).has(id);
    for (const fid of figs) if (g.figureIds?.test(fid)) leaks.push({ map: map.id, kind, id, field: `figure ${fid}`, term: `figure id ${fid}`, snippet: '(the figure draws it)', path, sideOnly });
    for (const [field, raw] of fields) {
      const t = (g.ignore ?? []).reduce((acc, rx) => acc.replace(new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : `${rx.flags}g`), (m) => ' '.repeat(m.length)), plain(raw)); if (!t.trim()) continue;
      const hits = ms.map(({ term, rx }) => ({ term, m: rx.exec(t) })).filter((x) => x.m);
      const strong = hits.some((x) => !(g.weak ?? []).includes(x.term));
      for (const { term, m } of hits) {
        if (!m || (!strong && (g.weak ?? []).includes(term))) continue;
        const a = Math.max(0, m.index - 40), b = Math.min(t.length, m.index + m[0].length + 40);
        leaks.push({ map: map.id, kind, id, field, term, snippet: `${a ? '…' : ''}${t.slice(a, b).trim()}${b < t.length ? '…' : ''}`, path, sideOnly });
      }
    }
  };
  for (const n of map.nodes) { const p = boxes.get(n.id); if (p) scan('box', n.id, [...boxFields(n), ...(g.boxExtra?.(n) ?? [])], p, (n.pop?.figures ?? []).map((x) => x.id)); }
  for (const e of map.edges) { const p = lines.get(`${e.from}->${e.to}`); if (p) scan('line', `${e.from}->${e.to}`, edgeFields(e), p, (e.whyFigures ?? []).map((x) => x.id)); }
  return leaks;
}

/** one line per (map, box or line, field), the terms found, and the path that reaches it */
export function formatLeaks(leaks: Leak[]): string {
  const part = (ls0: Leak[]) => {
    const by = new Map<string, Leak[]>();
    for (const l of ls0) { const k = `${l.map} ${l.kind} ${l.id} · ${l.field}`; by.set(k, [...(by.get(k) ?? []), l]); }
    return [...by.entries()].map(([k, ls]) => `${k}: [${[...new Set(ls.map((l) => l.term))].join(', ')}] "${ls[0].snippet}"  (path: ${ls[0].path.join(' → ')})`);
  };
  const a = part(leaks.filter((l) => !l.sideOnly)), b = part(leaks.filter((l) => l.sideOnly));
  return [`## on the main path (${a.length})`, ...a, '', `## only via a side path that skips the host (${b.length})`, ...b].join('\n');
}
