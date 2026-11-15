import { h, s } from './dom';
import { pathToRoot, edgeKey } from './maplayout';
import type { AppContent, ControlDef, Dive, FigureDef, MapEdge, MapNode, Question } from './types';
import type { Values } from './controls';

export const CONTEXT_MAX = 300;

export interface ReferenceInput {
  pageTitle: string;
  /** Headline after the page title (node question, dive title, figure title, …). */
  title: string;
  url: string;
  path: string[];
  viewing: string;
  context?: string;
}

let pageContent: AppContent | null = null;

/** Called once from mountApp so figures and quizzes can build a path without a new argument. */
export function setRefContent(content: AppContent | null): void { pageContent = content; }
export function refContent(): AppContent | null { return pageContent; }

export function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function trimContext(s: string, max = CONTEXT_MAX): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trim()}…`;
}

export function formatNum(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(4).replace(/\.?0+$/, '');
}

/** Compact `K=2, zeta=0.5` list of current control values (ids, so a bot can match sliders). */
export function formatValues(values?: Values, defs?: ControlDef[]): string {
  if (!values) return '';
  const keys = defs?.length ? defs.map((d) => d.id) : Object.keys(values);
  const parts: string[] = [];
  for (const id of keys) {
    const v = values[id];
    if (v === undefined) continue;
    if (typeof v === 'number') parts.push(`${id}=${formatNum(v)}`);
    else if (typeof v === 'boolean') parts.push(`${id}=${v ? 'on' : 'off'}`);
    else parts.push(`${id}=${v}`);
  }
  return parts.join(', ');
}

export function viewingFigure(title: string, values?: Values, prefix?: string): string {
  const vals = formatValues(values);
  const fig = vals ? `figure '${title}' (${vals})` : `figure '${title}'`;
  return prefix ? `${prefix}, ${fig}` : fig;
}

export function buildReference(input: ReferenceInput): string {
  const lines = [`[study-tools] ${input.pageTitle} > ${input.title}`];
  if (input.path.length) lines.push(`Path: ${input.path.join(' > ')}`);
  lines.push(`Viewing: ${input.viewing}`);
  lines.push(`Link: ${input.url}`);
  const ctx = trimContext(stripHtml(input.context ?? ''));
  if (ctx) lines.push(`Context: ${ctx}`);
  return lines.join('\n');
}

/** Canonical URL of this page plus a hash path (`#/node/id`, `#/dive/x`, …). */
export function liveUrl(hash: string): string {
  const hsh = `#/${hash.replace(/^#?\/?/, '')}`;
  if (typeof location === 'undefined') return hsh;
  return `${location.origin}${location.pathname}${hsh}`;
}

export function pathLabels(content: AppContent, nodeId: string, mapId?: string): string[] {
  const maps = mapId ? content.maps.filter((m) => m.id === mapId) : content.maps;
  for (const m of maps) {
    if (!m.nodes.some((n) => n.id === nodeId)) continue;
    return pathToRoot(nodeId, m.edges).map((id) => m.nodes.find((n) => n.id === id)?.label ?? id);
  }
  if (mapId) return pathLabels(content, nodeId);
  return content.subject.centralQuestion ? [content.subject.centralQuestion] : [];
}

export function nodeForDive(content: AppContent, diveId: string): MapNode | undefined {
  return content.maps.flatMap((m) => m.nodes).find((n) => n.dive === diveId);
}

export function pathForDive(content: AppContent, dive: Dive): string[] {
  if (dive.chain.length) return dive.chain.map((s) => s.title);
  const n = nodeForDive(content, dive.id);
  return n ? pathLabels(content, n.id) : [content.subject.centralQuestion, dive.title].filter(Boolean);
}

export function pathForFigure(content: AppContent, figId: string): string[] {
  const live = content.maps.flatMap((m) => m.nodes).find((n) => (n.live ?? '').startsWith(`figure:${figId}`));
  if (live) return pathLabels(content, live.id);
  const dive = content.dives.find((d) => d.html.includes(`data-figure="${figId}"`) || d.html.includes(`figure:${figId}`));
  if (dive) return pathForDive(content, dive);
  return content.subject.centralQuestion ? [content.subject.centralQuestion] : [];
}

export function diveContext(content: AppContent, dive: Dive): string {
  const n = nodeForDive(content, dive.id);
  if (n?.short) return n.short;
  if (dive.addsToExample) return dive.addsToExample;
  return dive.html;
}

export function pickFromHash(content: AppContent, path: string[]): { mapId: string; pick: { kind: 'node' | 'edge'; id: string } } | null {
  const [a, b] = path;
  if (!b) return null;
  const id = decodeURIComponent(b);
  if (a === 'node') {
    const m = content.maps.find((m) => m.nodes.some((n) => n.id === id));
    return m ? { mapId: m.id, pick: { kind: 'node', id } } : null;
  }
  if (a === 'edge') {
    const m = content.maps.find((m) => m.edges.some((e) => edgeKey(e.from, e.to) === id));
    return m ? { mapId: m.id, pick: { kind: 'edge', id } } : null;
  }
  return null;
}

export function mapHashFor(pick: { kind: 'node' | 'edge'; id: string } | null): string {
  if (!pick) return '#/';
  return pick.kind === 'node' ? `#/node/${encodeURIComponent(pick.id)}` : `#/edge/${encodeURIComponent(pick.id)}`;
}

export function isMapHash(hash: string): boolean {
  const h = hash || '#/';
  return h === '' || h === '#' || h === '#/' || h.startsWith('#/map') || h.startsWith('#/node/') || h.startsWith('#/edge/');
}

export function figureUrl(figId: string, query = ''): string {
  const hash = typeof location !== 'undefined' ? (location.hash || '') : '';
  if (hash.startsWith('#/dive/')) return liveUrl(hash);
  return liveUrl(`/figure/${figId}${query ? `?${query}` : ''}`);
}

export function nodeReference(content: AppContent, n: MapNode, mapId?: string): string {
  return buildReference({
    pageTitle: content.subject.title,
    title: n.label,
    url: liveUrl(`/node/${n.id}`),
    path: pathLabels(content, n.id, mapId),
    viewing: 'node panel',
    context: n.short,
  });
}

export function edgeReference(content: AppContent, e: MapEdge, from: MapNode, to: MapNode, mapId?: string): string {
  const path = pathLabels(content, e.from, mapId);
  if (path[path.length - 1] !== to.label) path.push(to.label);
  return buildReference({
    pageTitle: content.subject.title,
    title: `${from.label} → ${to.label}`,
    url: liveUrl(`/edge/${edgeKey(e.from, e.to)}`),
    path,
    viewing: `edge from "${from.label}" to "${to.label}"`,
    context: `${e.question} ${e.idea}`,
  });
}

export function diveReference(content: AppContent, d: Dive): string {
  return buildReference({
    pageTitle: content.subject.title,
    title: d.title,
    url: liveUrl(`/dive/${d.id}`),
    path: pathForDive(content, d),
    viewing: 'deep dive',
    context: diveContext(content, d),
  });
}

export function figureReference(content: AppContent | null, def: FigureDef, values?: Values, viewingPrefix?: string): string {
  const title = def.title;
  const pageTitle = content?.subject.title ?? 'study page';
  const path = content ? pathForFigure(content, def.id) : [];
  const ctx = def.lookFor || def.howToRead || '';
  return buildReference({
    pageTitle,
    title,
    url: figureUrl(def.id, ''), // caller should pass a url if controls are serialised; see figureRefWithControls
    path,
    viewing: viewingFigure(title, values, viewingPrefix),
    context: ctx,
  });
}

export function figureRefWithControls(content: AppContent | null, def: FigureDef, values: Values, query: string, viewingPrefix?: string): string {
  const title = def.title;
  return buildReference({
    pageTitle: content?.subject.title ?? 'study page',
    title,
    url: figureUrl(def.id, query),
    path: content ? pathForFigure(content, def.id) : [],
    viewing: viewingFigure(title, values, viewingPrefix),
    context: def.lookFor || def.howToRead || '',
  });
}

export function quizReference(content: AppContent, q: Question): string {
  const path = (() => {
    for (const t of q.tags) {
      const d = content.dives.find((d) => d.id === t);
      if (d) return pathForDive(content, d);
      for (const m of content.maps) {
        const n = m.nodes.find((n) => (n.quizTag ?? n.dive ?? n.id) === t);
        if (n) return pathLabels(content, n.id, m.id);
      }
    }
    return content.subject.centralQuestion ? [content.subject.centralQuestion] : [];
  })();
  const hash = typeof location !== 'undefined' && location.hash.startsWith('#/quiz')
    ? `${location.hash}${location.hash.includes('qid=') ? '' : `${location.hash.includes('?') ? '&' : '?'}qid=${encodeURIComponent(q.id)}`}`
    : `#/quiz?qid=${encodeURIComponent(q.id)}`;
  return buildReference({
    pageTitle: content.subject.title,
    title: stripHtml(q.q) || q.id,
    url: liveUrl(hash),
    path,
    viewing: `quiz question ${q.id}`,
    context: q.q,
  });
}

function copyIcon(): SVGSVGElement {
  const svg = s('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'aria-hidden': 'true' });
  svg.append(
    s('rect', { x: 5.5, y: 5.5, width: 8, height: 8, rx: 1.4 }),
    s('path', { d: 'M10.5 5.5V3.9A1.4 1.4 0 0 0 9.1 2.5H3.9A1.4 1.4 0 0 0 2.5 3.9v5.2A1.4 1.4 0 0 0 3.9 10.5H5.5' }),
  );
  return svg;
}

function checkIcon(): SVGSVGElement {
  const svg = s('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
  svg.append(s('path', { d: 'M3.5 8.5 L6.5 11.5 L12.5 4.5' }));
  return svg;
}

function showSelectable(text: string): void {
  document.querySelector('.st-copy-pop')?.remove();
  const ta = h('textarea', { readonly: true, 'aria-label': 'Reference text' }) as HTMLTextAreaElement;
  ta.value = text;
  const box = h('div', { class: 'st-copy-pop', role: 'dialog', 'aria-label': 'Copy reference' },
    h('p', { class: 'ui' }, 'Clipboard is not available here. Select and copy this reference:'),
    ta,
    h('button', { type: 'button', class: 'tbtn', onclick: () => box.remove() }, 'Close'));
  document.body.append(box);
  ta.focus();
  ta.select();
}

/** Copy plain text: Clipboard API, then textarea+execCommand, then a selectable dialog (e.g. file://). */
export async function copyText(text: string): Promise<'copied' | 'fallback'> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch { /* fall through */ }
  }
  if (typeof document === 'undefined') return 'fallback';
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  if (ok) return 'copied';
  showSelectable(text);
  return 'fallback';
}

/**
 * Small copy-icon control. Returns a wrap (button + live region) so headers can place it next to a close button.
 * `data-testid=copy-ref` is on the button.
 */
export function copyRefButton(getText: () => string): HTMLElement {
  const btn = h('button', {
    type: 'button',
    class: 'st-copy',
    'aria-label': 'Copy reference to this',
    title: 'Copy reference to this',
    dataset: { testid: 'copy-ref' },
  }, copyIcon());
  const live = h('span', { class: 'sr', role: 'status', 'aria-live': 'polite' });
  let timer = 0;
  const reset = () => {
    btn.classList.remove('copied');
    btn.setAttribute('aria-label', 'Copy reference to this');
    btn.title = 'Copy reference to this';
    btn.replaceChildren(copyIcon());
    live.textContent = '';
  };
  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const text = getText();
    void copyText(text).then((how) => {
      if (how !== 'copied') return;
      btn.classList.add('copied');
      btn.setAttribute('aria-label', 'Copied');
      btn.title = 'Copied';
      btn.replaceChildren(checkIcon(), h('span', { class: 'st-copy-lbl' }, 'Copied'));
      live.textContent = 'Copied';
      window.clearTimeout(timer);
      timer = window.setTimeout(reset, 1600);
    });
  });
  return h('span', { class: 'st-copy-wrap' }, btn, live);
}
