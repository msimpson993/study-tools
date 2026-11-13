import { h, s, clear } from './dom';
import type { AppContent, MapDef, MapNode, MapEdge } from './types';
import { computeGeometry, placeLabels, roundedPath, arrowHead, edgeKey, pathToRoot, mapHighlight, type Geometry, type Label } from './maplayout';
import { mountScene } from './scene';
import { Progress, quizTagOf, subtree } from './progress';

export interface MapState {
  mapId: string;
  mode: 'explore' | 'review';
  recall: boolean;
  pick: { kind: 'node' | 'edge'; id: string } | null;
  /** colour family (node.series) whose boxes are lit via the legend chips, or null */
  series: number | null;
  revealed: Set<string>;
}
export const newMapState = (content: AppContent): MapState => ({ mapId: content.maps[0].id, mode: 'explore', recall: false, pick: null, series: null, revealed: new Set() });

export interface MapNav {
  openDive(id: string): void;
  openLive(live: string): void;
  openQuiz(tags: string[], title: string): void;
  onState?(): void;
}

const SERIES = ['var(--s0)', 'var(--s1)', 'var(--s2)', 'var(--s3)'];

/** The app's home screen: question-chain map with Explore / Review modes. */
export function mountConceptMap(host: HTMLElement, content: AppContent, progress: Progress, st: MapState, nav: MapNav): () => void {
  const map = (): MapDef => content.maps.find((m) => m.id === st.mapId) ?? content.maps[0];
  let width = 960;
  const root = h('div', { class: 'cm', dataset: { testid: 'concept-map' } });
  const scroll = h('div', { class: 'cm-scroll' });
  const panel = h('aside', { class: 'cm-panel idle', 'aria-live': 'polite', dataset: { testid: 'map-panel' } });
  const top = h('div', { class: 'cm-top' });
  const reviewBar = h('div', { class: 'cm-top', dataset: { testid: 'review-bar' } });
  const caption = h('div');
  const legend = h('div', { class: 'cm-legend', role: 'group', 'aria-label': 'How to read the lines and boxes', dataset: { testid: 'map-legend' } });
  const heroScene = content.subject.runningExample?.scene;
  const hero = h('div', { class: `cm-hero${heroScene ? ' has-scene' : ''}`, dataset: { testid: 'map-hero' } },
    h('div', { class: 'cm-q', dataset: { testid: 'central-question' } }, content.subject.centralQuestion, h('small', null, 'Central question. Tap any box or line to open it.')));
  const heroHandle = heroScene ? mountScene(hero, { scene: heroScene.id, overlays: heroScene.overlays, params: heroScene.params, compact: true }) : null;
  root.append(
    hero,
    top, reviewBar, caption, legend,
    h('div', { class: 'cm-wrap' }, scroll, panel),
    h('div', { class: 'cm-pad' }),
  );
  host.append(root);

  const ro = new ResizeObserver(() => {
    const w = Math.floor(scroll.clientWidth - 8) || 960;
    if (Math.abs(w - width) > 2) { width = w; renderSvg(); }
  });
  ro.observe(scroll);
  width = Math.floor(scroll.clientWidth - 8) || 960;

  const setPick = (p: MapState['pick']) => { st.pick = p; if (p) st.series = null; renderLegend(); renderSvg(); renderPanel(); nav.onState?.(); };
  const toggleNode = (id: string) => {
    if (st.mode === 'review' && st.recall && !st.revealed.has(`${st.mapId}/${id}`)) {
      st.revealed.add(`${st.mapId}/${id}`); renderSvg(); return;
    }
    if (st.pick?.kind === 'node' && st.pick.id === id) return setPick(null);
    progress.markSeen(st.mapId, id);
    setPick({ kind: 'node', id });
  };
  const toggleEdge = (key: string) => setPick(st.pick?.kind === 'edge' && st.pick.id === key ? null : { kind: 'edge', id: key });

  function renderTop() {
    clear(top);
    const tabs = h('div', { class: 'st-seg', role: 'tablist', 'aria-label': 'Map', style: 'flex:1;min-width:220px' });
    for (const m of content.maps) {
      tabs.append(h('button', { class: m.id === st.mapId ? 'on' : '', role: 'tab', 'aria-selected': m.id === st.mapId, dataset: { map: m.id }, onclick: () => { st.mapId = m.id; st.pick = null; st.series = null; st.revealed.clear(); renderAll(); nav.onState?.(); } }, m.title));
    }
    const modes = h('div', { class: 'st-seg', style: 'flex:0 0 auto;min-width:190px', role: 'group', 'aria-label': 'Mode' },
      h('button', { class: st.mode === 'explore' ? 'on' : '', dataset: { mode: 'explore' }, onclick: () => { st.mode = 'explore'; st.recall = false; renderAll(); nav.onState?.(); } }, 'Explore'),
      h('button', { class: st.mode === 'review' ? 'on' : '', dataset: { mode: 'review' }, onclick: () => { st.mode = 'review'; renderAll(); nav.onState?.(); } }, 'Review'));
    top.append(tabs, modes);
    const m = map();
    clear(caption);
    if (m.caption) caption.append(h('details', { class: 'fold' }, h('summary', null, 'How to read this map'), h('div', { html: `<p>${m.caption}</p>` })));
    const re = content.subject.runningExample;
    if (re) caption.append(h('details', { class: 'fold', dataset: { testid: 'running-example' } }, h('summary', null, `Running example: ${re.title}`), h('div', { html: `<p>${re.summary}</p>${re.details ?? ''}` })));
  }

  function renderReview() {
    clear(reviewBar);
    reviewBar.hidden = st.mode !== 'review';
    if (st.mode !== 'review') return;
    const sm = progress.summary();
    const m = map();
    const sel = st.pick?.kind === 'node' ? m.nodes.find((n) => n.id === st.pick!.id) : undefined;
    const missed = m.nodes.filter((n) => progress.status(m.id, n) === 'missed');
    const missedTags = missed.map(quizTagOf);
    reviewBar.append(
      h('span', { class: 'cm-sum', html: `<span class="badge-dot"></span><b>${sm.unseen}</b> unseen · <span class="badge-dot seen"></span><b>${sm.seen}</b> seen · <span class="badge-dot correct"></span><b>${sm.correct}</b> correct · <span class="badge-dot missed"></span><b>${sm.missed}</b> missed (all maps, ${sm.total} boxes)` }),
      h('button', { class: `tbtn${st.recall ? ' on' : ''}`, dataset: { testid: 'recall-toggle' }, title: 'Hide box text; tap a box to reveal it, tap again to open it', onclick: () => { st.recall = !st.recall; st.revealed.clear(); renderAll(); } }, st.recall ? 'Recall: on' : 'Recall: hide text'),
      h('button', { class: 'tbtn', disabled: !missedTags.length, title: missedTags.length ? '' : 'Nothing missed yet', onclick: () => nav.openQuiz(missedTags, 'Missed boxes on this map') }, `Quiz missed (${missed.length})`),
      h('button', { class: 'tbtn', disabled: !sel, title: sel ? '' : 'Select a box first', dataset: { testid: 'quiz-branch' }, onclick: () => { if (sel) nav.openQuiz(subtree(m, sel.id).map((id) => quizTagOf(m.nodes.find((n) => n.id === id)!)), `Branch from “${sel.label}”`); } }, 'Quiz this branch'),
      h('button', { class: 'tbtn', dataset: { testid: 'reset-progress' }, onclick: () => { if (confirm('Reset all progress for this page?')) { progress.reset(); } } }, 'Reset progress'),
    );
  }

  /** One-row key to the map's drawing language. Only lists what the current map actually uses. */
  function renderLegend() {
    clear(legend);
    const m = map();
    const kinds = new Set(m.nodes.map((n) => n.kind ?? 'box'));
    const hasDashed = m.edges.some((e) => e.dashed);
    const line = (dashed: boolean) => {
      const sw = s('svg', { class: 'lg-sw', width: 34, height: 12, viewBox: '0 0 34 12', 'aria-hidden': 'true' });
      sw.append(s('path', { class: `lg-line${dashed ? ' dashed' : ''}`, d: 'M 1 6 H 27' }), s('path', { class: 'lg-head', d: 'M 23 2.5 L 28 6 L 23 9.5' }));
      return sw;
    };
    const shape = (k: string) => {
      const sw = s('svg', { class: 'lg-sw', width: 24, height: 14, viewBox: '0 0 24 14', 'aria-hidden': 'true' });
      sw.append(k === 'decision' ? s('path', { class: 'lg-shape', d: 'M 5 1 L 19 1 L 23 7 L 19 13 L 5 13 L 1 7 Z' }) : s('rect', { class: 'lg-shape', x: 1, y: 1, width: 22, height: 12, rx: k === 'terminal' ? 6 : 3 }));
      return sw;
    };
    const item = (key: string, icon: Element, text: string) => h('span', { class: 'lg-item', dataset: { legend: key } }, icon as unknown as Node, h('span', null, text));
    legend.append(
      item('solid', line(false), 'next question'),
      ...(hasDashed ? [item('dashed', line(true), 'same idea, other view')] : []),
      ...(kinds.has('decision') ? [item('decision', shape('decision'), 'a fork: the answer picks the way')] : []),
      ...(kinds.has('terminal') ? [item('terminal', shape('terminal'), 'where the map starts')] : []),
    );
    // the coloured bar on the left of a box is its chapter (node.series): name it, and let a tap light that chapter up
    const used = [...new Set(m.nodes.map((n) => n.series).filter((x): x is number => x !== undefined))].sort();
    if (used.length) {
      const chips = h('span', { class: 'lg-series', dataset: { testid: 'legend-series' } }, h('span', { class: 'lg-lead' }, 'bar colour = chapter:'));
      for (const k of used) {
        const name = m.seriesNames?.[k] ?? `group ${k + 1}`, on = st.series === k;
        chips.append(h('button', { class: `lg-chip${on ? ' on' : ''}`, type: 'button', 'aria-pressed': String(on), dataset: { series: String(k), legend: `series-${k}` }, style: `--c:${SERIES[k]}`, title: `Light up the boxes in “${name}”`,
          onclick: () => { st.series = on ? null : k; st.pick = null; renderLegend(); renderSvg(); renderPanel(); nav.onState?.(); } }, h('i', { class: 'sw' }), name));
      }
      legend.append(chips);
    }
  }

  let geom: Geometry | null = null;
  let labels: Label[] = [];
  function renderSvg() {
    const m = map();
    const byId: Record<string, MapNode> = Object.fromEntries(m.nodes.map((n) => [n.id, n]));
    geom = computeGeometry(m.nodes, m.edges, width);
    const pick = st.pick;
    const hl = mapHighlight(pick, m.edges);
    const ser = pick === null ? st.series : null;
    const selNode = hl.selected, selEdgeKey = pick?.kind === 'edge' && hl.edges.size ? pick.id : null;
    const pathSet = hl.path, neigh = hl.neigh, ends = hl.ends, pathKeys = hl.edges;
    labels = placeLabels(geom, m.edges, hl.priority);
    const recallHide = (id: string) => st.mode === 'review' && st.recall && !st.revealed.has(`${st.mapId}/${id}`);

    const svg = s('svg', { width: geom.width, height: geom.height, viewBox: `0 0 ${geom.width} ${geom.height}`, role: 'group', 'aria-label': 'Question-chain map. Tap a box, a line, or a line’s dot for more.', 'data-testid': 'map-svg' });
    svg.append(s('rect', { x: 0, y: 0, width: geom.width, height: geom.height, fill: 'transparent', onclick: () => { if (st.pick) setPick(null); } }));
    const edgeData: Record<string, MapEdge> = Object.fromEntries(m.edges.map((e) => [edgeKey(e.from, e.to), e]));
    for (const g of geom.edges) {
      const data = edgeData[g.key];
      const active = pathKeys.has(g.key);
      const dim = (pick !== null && !active) || (ser !== null && !(byId[g.from].series === ser && byId[g.to].series === ser));
      const d = roundedPath(g.points);
      const act = () => toggleEdge(g.key);
      const grp = s('g', {
        class: `qm-edge${data.dashed ? ' dashed' : ''}${active ? ' e-path' : ''}${dim ? ' e-dim' : ''}${selEdgeKey === g.key ? ' e-sel' : ''}`,
        role: 'button', tabindex: 0, 'aria-label': `Link: ${byId[g.from].label} to ${byId[g.to].label}`, 'aria-pressed': selEdgeKey === g.key,
        'data-edge': g.key, 'data-testid': 'map-edge', onclick: act,
        onkeydown: (ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } },
      });
      grp.append(
        s('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': 26, 'stroke-linejoin': 'round', 'pointer-events': 'stroke' }),
        s('path', { class: 'line', d }), s('path', { class: 'head', d: arrowHead(g.points) }),
        s('circle', { cx: g.dot.x, cy: g.dot.y, r: 14, fill: 'transparent' }),
        s('circle', { class: 'dot', cx: g.dot.x, cy: g.dot.y, r: 6 }),
      );
      svg.append(grp);
    }
    const hideEdgeText = st.mode === 'review' && st.recall;
    for (const l of hideEdgeText ? [] : labels) {
      const grp = s('g', { class: `qm-label${pathKeys.has(l.key) ? ' l-path' : ''}`, 'data-label': l.key, 'data-testid': 'map-label', 'aria-hidden': 'true', onclick: () => toggleEdge(l.key), style: 'cursor:pointer' });
      grp.append(s('rect', { x: l.x, y: l.y, width: l.w, height: l.h, rx: l.h / 2 }), s('text', { x: l.x + l.w / 2, y: l.y + l.h / 2 + 4, 'text-anchor': 'middle' }, l.text));
      svg.append(grp);
    }
    for (const id of geom.order) {
      const b = geom.boxes[id], n = byId[id];
      const selected = selNode === id, onPath = pathSet.has(id), isNeigh = neigh.has(id) && !onPath, isEnd = ends.has(id);
      const inSer = ser !== null && n.series === ser;
      const dim = (pick !== null && !selected && !onPath && !isNeigh && !isEnd) || (ser !== null && !inSer);
      const status = st.mode === 'review' ? progress.status(m.id, n) : null;
      const hide = recallHide(id);
      const cls = ['qm-node', selected ? 'n-sel' : isEnd ? 'n-end' : onPath ? 'n-path' : isNeigh ? 'n-neigh' : inSer ? 'n-ser' : dim ? 'n-dim' : '', status ? `st-${status}` : '', hide ? 'recall-hidden' : ''].filter(Boolean).join(' ');
      const act = () => toggleNode(id);
      const grp = s('g', {
        class: cls, role: 'button', tabindex: 0, 'aria-label': hide ? `Hidden box ${m.nodes.indexOf(n)}. Tap to reveal.` : `${n.label}${n.detail ? `. ${n.detail}` : ''}. Tap for more.`,
        'aria-pressed': selected, style: n.series !== undefined ? `--c:${SERIES[n.series]}` : undefined, 'data-node': id, 'data-status': status ?? undefined, 'data-testid': 'map-node', onclick: act,
        onkeydown: (ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } },
      });
      const r = 14;
      grp.append(b.kind === 'decision'
        ? s('path', { class: 'shape focus-ring', d: `M ${b.x + r} ${b.y} L ${b.x + b.w - r} ${b.y} L ${b.x + b.w} ${b.y + b.h / 2} L ${b.x + b.w - r} ${b.y + b.h} L ${b.x + r} ${b.y + b.h} L ${b.x} ${b.y + b.h / 2} Z` })
        : s('rect', { class: 'shape focus-ring', x: b.x, y: b.y, width: b.w, height: b.h, rx: b.kind === 'terminal' ? Math.min(24, b.h / 2) : 10 }));
      if (n.series !== undefined && b.kind === 'box') grp.append(s('rect', { class: 'qm-accent', x: b.x, y: b.y + 6, width: 4, height: b.h - 12, rx: 2, fill: SERIES[n.series] }));
      const cx = b.x + b.w / 2, textH = b.lines.length * 15 + b.detailLines.length * 14, top0 = b.y + (b.h - textH) / 2 + 11;
      b.lines.forEach((line, i) => grp.append(s('text', { x: cx, y: top0 + i * 15, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600 }, line)));
      b.detailLines.forEach((line, i) => grp.append(s('text', { class: 'det', x: cx, y: top0 + b.lines.length * 15 + i * 14, 'text-anchor': 'middle', 'font-size': 11 }, line)));
      if (hide) grp.append(s('text', { class: 'qmark', x: cx, y: b.y + b.h / 2 + 6, 'text-anchor': 'middle', style: 'opacity:1' }, '?'));
      if (status) grp.append(s('circle', { class: 'st', cx: b.x + b.w - 9, cy: b.y + 9, r: 6 }));
      svg.append(grp);
    }
    scroll.replaceChildren(svg);
  }

  function pathChips(ids: string[], m: MapDef) {
    const wrap = h('div', { class: 'path' }, 'Path from the central question: ');
    ids.forEach((id, i) => {
      const n = m.nodes.find((x) => x.id === id);
      if (!n) return;
      wrap.append(h('a', { href: '#', onclick: (ev: Event) => { ev.preventDefault(); toggleNode(id); } }, n.label));
      if (i < ids.length - 1) wrap.append(' → ');
    });
    return wrap;
  }

  function renderPanel() {
    clear(panel);
    const m = map();
    const pick = st.pick;
    panel.classList.toggle('idle', !pick);
    if (!pick) {
      panel.append(h('p', { class: 'st-hint' }, 'Tap a box or a line. A box opens its short answer, key equation and a way into the deep dive; a line shows the question that leads from one idea to the next. Esc closes.'));
      return;
    }
    const close = h('button', { class: 'tbtn x', 'aria-label': 'Close', dataset: { testid: 'panel-close' }, onclick: () => setPick(null) }, '✕');
    if (pick.kind === 'node') {
      const n = m.nodes.find((x) => x.id === pick.id);
      if (!n) return;
      panel.append(close, h('h3', null, n.label), ...(n.detail ? [h('div', { class: 'st-hint' }, n.detail)] : []), h('div', { html: `<p>${n.short}</p>` }));
      if (n.eqHtml) panel.append(h('div', { class: 'st-eq', html: n.eqHtml })); else if (n.eq) panel.append(h('div', { class: 'st-eq' }, n.eq));
      if (n.addsToExample) panel.append(h('aside', { class: 'callout c-example', dataset: { testid: 'adds-to-example' } }, h('b', { class: 'lead' }, 'Adds to the running example'), h('div', { class: 'cb', html: `<p>${n.addsToExample}</p>` })));
      if (n.accountsFor) panel.append(h('aside', { class: 'callout c-account', dataset: { testid: 'accounts-for' } }, h('b', { class: 'lead' }, 'Lets us account for'), h('div', { class: 'cb', html: `<p>${n.accountsFor}</p>` })));
      for (const [k, lead] of [['why', 'Why it matters'], ['recognize', 'Recognize'], ['trap', 'Trap'], ['predict', 'Predict']] as const) {
        const v = n[k];
        if (v) panel.append(h('aside', { class: `callout c-${k}` }, h('b', { class: 'lead' }, lead), h('div', { class: 'cb', html: `<p>${v}</p>` })));
      }
      panel.append(pathChips(pathToRoot(n.id, m.edges), m));
      const acts = h('div', { class: 'acts' });
      if (n.dive) acts.append(h('button', { class: 'tbtn on', dataset: { testid: 'open-dive' }, onclick: () => nav.openDive(n.dive!) }, 'Deep dive'));
      if (n.live) acts.append(h('button', { class: 'tbtn on', dataset: { testid: 'open-live' }, onclick: () => nav.openLive(n.live!) }, 'Try it live'));
      if (n.link) acts.append(h('a', { class: 'tbtn', href: n.link.href }, n.link.label));
      const own = progress.questionsFor([quizTagOf(n)]);
      const subTags = subtree(m, n.id).map((id) => quizTagOf(m.nodes.find((x) => x.id === id)!));
      const subQs = progress.questionsFor(subTags);
      acts.append(
        h('button', { class: 'tbtn', disabled: !own.length, title: own.length ? '' : 'No questions tagged to this box yet', dataset: { testid: 'quiz-node' }, onclick: () => nav.openQuiz([quizTagOf(n)], n.label) }, `Quiz this box${own.length ? ` (${own.length})` : ''}`),
        h('button', { class: 'tbtn', disabled: !subQs.length, title: subQs.length ? '' : 'No questions in this branch yet', dataset: { testid: 'quiz-subtree' }, onclick: () => nav.openQuiz(subTags, `Branch from “${n.label}”`) }, `Quiz subtree${subQs.length ? ` (${subQs.length})` : ''}`),
      );
      panel.append(acts);
    } else {
      const e = m.edges.find((x) => edgeKey(x.from, x.to) === pick.id);
      if (!e) return;
      const f = m.nodes.find((x) => x.id === e.from)!, t = m.nodes.find((x) => x.id === e.to)!;
      panel.append(close, h('h3', null, `${f.label} → ${t.label}`), h('div', { class: 'st-hint' }, e.dashed ? 'Dashed: the same idea in another language' : 'Next step in the chain of questions'),
        h('aside', { class: 'callout c-predict' }, h('b', { class: 'lead' }, 'The question this line answers'), h('div', { class: 'cb', html: `<p>${e.question}</p>` })),
        h('div', { html: `<p>${e.idea}</p>` }));
      if (e.eq) panel.append(h('div', { class: 'st-eq' }, e.eq));
      const pl = pathToRoot(e.from, m.edges); if (pl[pl.length - 1] !== e.to) pl.push(e.to);
      panel.append(pathChips(pl, m));
      const acts = h('div', { class: 'acts' },
        h('button', { class: 'tbtn', onclick: () => toggleNode(e.from) }, `Open “${f.label}”`),
        h('button', { class: 'tbtn', onclick: () => toggleNode(e.to) }, `Open “${t.label}”`));
      const dv = t.dive ?? f.dive;
      if (dv) acts.append(h('button', { class: 'tbtn on', onclick: () => nav.openDive(dv) }, 'Deep dive'));
      panel.append(acts);
    }
  }

  function renderAll() { renderTop(); renderLegend(); renderReview(); renderSvg(); renderPanel(); }
  renderAll();
  const off = progress.onChange(() => { renderReview(); renderSvg(); renderPanel(); });
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && (st.pick || st.series !== null) && !document.querySelector('.fig-overlay:not([hidden])')) { st.series = null; setPick(null); } };
  document.addEventListener('keydown', onKey);
  return () => { heroHandle?.destroy(); ro.disconnect(); off(); document.removeEventListener('keydown', onKey); root.remove(); };
}

/** Expose geometry+labels of the *current* render to tests. */
export function mapGeometryFor(map: MapDef, width: number) {
  const geom = computeGeometry(map.nodes, map.edges, width);
  return { geom, labels: placeLabels(geom, map.edges, []) };
}
