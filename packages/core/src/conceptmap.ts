import { h, s, clear } from './dom';
import type { AppContent, MapDef, MapNode, MapEdge } from './types';
import { copyRefButton, nodeReference, edgeReference } from './copyref';
import { computeGeometry, layoutWidth, placeLabels, roundedPath, arrowHead, edgeKey, pathToRoot, mapHighlight, placeSideNodes, SIDE_TAG_H, sideFont, exampleGlyphRects, useLinkSegments, exampleComesBack, type Geometry, type Label, type MapView, type SideNode } from './maplayout';
import { storeGet, storeSet } from './store';
import { exampleGlyph } from './exglyphs';
import { mountScene } from './scene';
import { Progress, quizTagOf, subtree } from './progress';
import { mountQuizFigure, type QuizFigureRegistry } from './quizfig';
import { miniCheck } from './minicheck';

export interface MapState {
  mapId: string;
  mode: 'explore' | 'review';
  recall: boolean;
  /** the open entry: a box, a line, or an Example node (`ref`, runningExample.refs; outside the Next/Back chain) */
  pick: { kind: 'node' | 'edge' | 'ref'; id: string } | null;
  /** colour family (node.series) whose boxes are lit via the legend chips, or null */
  series: number | null;
  revealed: Set<string>;
}
export const newMapState = (content: AppContent): MapState => ({ mapId: content.maps[0].id, mode: 'explore', recall: false, pick: null, series: null, revealed: new Set() });

export interface MapNav {
  openDive(id: string): void;
  openLive(live: string): void;
  openQuiz(tags: string[], title: string): void;
  /** the map's state changed; `endTrip` = an Example side trip is being closed (✕, Esc or a second tap), so a history step it pushed is stepped back over */
  onState?(o?: { endTrip?: boolean }): void;
  /** the app hands back a Back-button (popstate) map change here, so it closes/switches the entry without remounting the map
   *  (keeps the map's scroll position and zoom); returns the unregister function */
  onPop?(fn: (pick: MapState['pick']) => void): () => void;
  /** renderers for pop-up figures (`node.pop.figures`); the same registry as quiz figures */
  figures?: QuizFigureRegistry;
  /** opt-in sound players for `node.pop.audio` (see audio.ts: audioHook) */
  audio?: PopAudioHook;
  /** mounts a live figures.yaml figure (an Example node's `figure`); returns its stop function, or null if the app has none */
  mountFigure?(host: HTMLElement, id: string, preset?: string, opts?: { intro?: { panels?: string[] } }): (() => void) | null;
}
export interface PopAudioHook { mount(id: string): { el: HTMLElement; destroy(): void } }

/** localStorage key of the map view choice; shared by every app on the origin */
export const MAP_VIEW_KEY = 'study-tools.mapView';
export const readMapView = (): MapView => (storeGet<string>(MAP_VIEW_KEY, 'fit') === 'actual' ? 'actual' : 'fit');

const SERIES = ['var(--s0)', 'var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];

/** The app's home screen: question-chain map with Explore / Review modes. */
export function mountConceptMap(host: HTMLElement, content: AppContent, progress: Progress, st: MapState, nav: MapNav): () => void {
  const map = (): MapDef => content.maps.find((m) => m.id === st.mapId) ?? content.maps[0];
  let width = 960;
  let view: MapView = readMapView();
  const root = h('div', { class: 'cm', dataset: { testid: 'concept-map' } });
  const scroll = h('div', { class: 'cm-scroll' });
  // desktop reading layout: with an entry open the map takes the left ~40% (shrunk to fit, wheel-zoomable) and the entry the right ~60%
  const WIDE = '(min-width: 700px)'; // tablets and desktops share the split; phones get the entry card
  const wide = typeof window.matchMedia === 'function' ? window.matchMedia(WIDE) : null;
  let zoom = 1, zoomFit = true; // zoomFit: the side map follows its column's fit (a narrow tablet column can be a little narrower than the map)
  const zoomPct = h('span', { class: 'cm-zoom-pct', dataset: { testid: 'map-zoom-pct' } }, '100%');
  const zoomBar = h('div', { class: 'cm-zoom', role: 'group', 'aria-label': 'Map zoom', dataset: { testid: 'map-zoom' } },
    h('button', { type: 'button', class: 'tbtn', title: 'Zoom out (or scroll the wheel / pinch on the map)', 'aria-label': 'Zoom out', dataset: { testid: 'map-zoom-out' }, onclick: () => zoomAtCentre(1 / 1.25) }, '−'),
    zoomPct,
    h('button', { type: 'button', class: 'tbtn', title: 'Zoom in (or scroll the wheel / pinch on the map)', 'aria-label': 'Zoom in', dataset: { testid: 'map-zoom-in' }, onclick: () => zoomAtCentre(1.25) }, '+'),
    // the map size: Fit to screen (the layout follows the screen; also "reset zoom") and Actual size (natural boxes, pan around),
    // one control in the zoom bar (no second copy in the legend)
    h('span', { class: 'cm-view', role: 'group', 'aria-label': 'Map size', dataset: { testid: 'map-view' } }));
  const viewBtns = zoomBar.querySelector('.cm-view') as HTMLElement;
  for (const [v, label, hint, tid] of [['fit', 'Fit to screen', 'The whole width of the map on screen (also resets the zoom)', 'map-zoom-reset'], ['actual', 'Actual size', 'Natural box size: drag, scroll or swipe to move around']] as const) {
    viewBtns.append(h('button', { type: 'button', class: 'tbtn lg-vbtn', title: hint, dataset: { view: v, testid: tid }, onclick: () => setView(v) }, label));
  }
  const syncViewBtns = () => viewBtns.querySelectorAll('button').forEach((b) => { const on = (b as HTMLElement).dataset.view === view; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  const mapCol = h('div', { class: 'cm-mapcol' }, scroll, zoomBar);
  const panel = h('aside', { class: 'cm-panel idle', 'aria-live': 'polite', dataset: { testid: 'map-panel' } });
  const wrap = h('div', { class: 'cm-wrap', dataset: { testid: 'map-wrap' } }, mapCol, panel);
  const top = h('div', { class: 'cm-top' });
  const reviewBar = h('div', { class: 'cm-top', dataset: { testid: 'review-bar' } });
  const caption = h('div', { class: 'cm-caps' });
  const legend = h('div', { class: 'cm-legend', role: 'group', 'aria-label': 'How to read the lines and boxes', dataset: { testid: 'map-legend' } });
  // the running examples live in Example nodes on the map (runningExample.refs), so the header is one slim line
  const exRefs = content.subject.runningExample?.refs ?? [];
  const hero = h('div', { class: 'cm-hero slim', dataset: { testid: 'map-hero' } },
    h('div', { class: 'cm-q', dataset: { testid: 'central-question' } }, content.subject.centralQuestion, h('small', null, exRefs.length ? 'Central question. Tap any box or line to open it; a dashed Example node beside a box introduces a running example.' : 'Central question. Tap any box or line to open it.')));
  /** the Example nodes on map m (each beside its host box) */
  const refsOn = (m: MapDef) => exRefs.filter((r) => m.nodes.some((n) => n.id === r.at));
  /** the box an Example node hangs from links to that example's introduction (Malcolm, Nov 21): one quiet link per example,
   *  near the running-example line and before Next; it opens the introduction as a side trip (a history step; Back returns here) */
  const meetLinks = (n: { id: string }, m: MapDef): HTMLElement[] => refsOn(m).filter((r) => r.at === n.id).map((r) => h('p', { class: 'pop-row pop-meet', dataset: { testid: 'pop-meet' } },
    h('a', { href: '#', class: 'item-link', dataset: { testid: 'meet-example', ref: r.id }, onclick: (ev: Event) => { ev.preventDefault(); toggleRef(r.id); } }, `Meet the example: ${r.label} →`)));
  /** example usage is opt-in: only a map whose boxes carry `examples` gets the box glyphs, the highlight and the comes-back list */
  const usesOn = (m: MapDef) => exRefs.length > 0 && m.nodes.some((n) => n.examples?.length);
  /** light (or unlight) the boxes that use example `id` and its faint links; an open introduction keeps its own lit */
  const lightUses = (id: string, on: boolean) => {
    const svg = scroll.querySelector('svg'); if (!svg) return;
    if (!on && st.pick?.kind === 'ref' && st.pick.id === id) return;
    svg.querySelectorAll(`.qm-node[data-uses~="${id}"]`).forEach((e) => e.classList.toggle('u-hl', on));
    svg.querySelector(`.qm-uselinks[data-ref="${id}"]`)?.classList.toggle('u-on', on);
    svg.querySelector(`.qm-ref[data-ref="${id}"]`)?.classList.toggle('r-hov', on);
  };
  root.append(
    hero,
    top, reviewBar, caption, legend,
    wrap,
    h('div', { class: 'cm-pad' }),
  );
  host.append(root);

  const ro = new ResizeObserver(() => {
    const w = Math.floor(scroll.clientWidth - 8) || 960;
    if (Math.abs(w - width) > 2) { width = w; renderSvg(); }
  });
  ro.observe(scroll);
  width = Math.floor(scroll.clientWidth - 8) || 960;

  const setPick = (p: MapState['pick']) => { const was = st.pick; st.pick = p; if (p) st.series = null; renderLegend(); renderSvg(); renderPanel(); nav.onState?.({ endTrip: endingTrip }); if (p && isSplit()) { revealSplit(); centerSel(); } if (!p && was) { if (wide?.matches) centerOn(was); else showWalkedTo(was); } };
  /** desktop: closing an entry returns to the full-width map (at its own zoom) centred on the box or line it showed; only the
   *  map's frame moves, not the page */
  function centerOn(was: NonNullable<MapState['pick']>) {
    const el = scroll.querySelector(was.kind === 'node' ? `.qm-node[data-node="${was.id}"]` : was.kind === 'ref' ? `.qm-ref[data-ref="${was.id}"]` : `.qm-edge[data-edge="${was.id}"]`) as SVGGraphicsElement | null;
    if (!el) return;
    const a = el.getBoundingClientRect(), b = scroll.getBoundingClientRect();
    scroll.scrollLeft += a.left - b.left - (b.width - a.width) / 2; scroll.scrollTop += a.top - b.top - (b.height - a.height) / 2;
  }
  /** phone: closing the entry card returns to the map AT the box or line the reader walked to; if it is already in view
   *  nothing moves (so a box opened and closed keeps the map exactly where it was) */
  function showWalkedTo(was: NonNullable<MapState['pick']>) {
    const find = () => scroll.querySelector(was.kind === 'node' ? `.qm-node[data-node="${was.id}"]` : was.kind === 'ref' ? `.qm-ref[data-ref="${was.id}"]` : `.qm-edge[data-edge="${was.id}"]`) as SVGGraphicsElement | null;
    const el = find();
    if (!el) return;
    const a = el.getBoundingClientRect(), b = scroll.getBoundingClientRect(), top = Math.max(0, b.top), bot = Math.min(innerHeight, b.bottom);
    const inView = a.top >= top && a.bottom <= bot && a.left >= Math.max(0, b.left) && a.right <= Math.min(innerWidth, b.right);
    if (inView) return;
    const show = () => { find()?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior }); };
    show();
    // closing by ✕ steps the history back over the entry; the browser may then restore the old scroll position, so show it
    // again once that step lands (a one-shot listener, dropped after half a second)
    const again = () => { requestAnimationFrame(show); window.removeEventListener('hashchange', again); };
    window.addEventListener('hashchange', again); setTimeout(() => window.removeEventListener('hashchange', again), 500);
  }
  const isSplit = () => wrap.classList.contains('split');
  /** an entry opened while the header still fills the top: scroll the page so the map and entry start under the top bar
   *  (they are sticky there), giving them the screen's height; already in place = no scroll */
  function revealSplit() {
    const top = wrap.getBoundingClientRect().top;
    // (any start below the top bar: the header is one slim line now, so the old "a fifth of the screen" test missed it)
    if (top > 64) window.scrollTo({ top: scrollY + top - 52, behavior: 'instant' as ScrollBehavior });
  }
  /** split on (desktop + an entry open) or off; the map is re-laid out for its new column at once, and the zoom resets when it leaves the side */
  function applySplit() {
    const on = !!st.pick && !!wide?.matches;
    if (on === isSplit()) return;
    // opening: the full view's zoom is kept aside and the side map fits its column; closing: the full view comes back at it
    if (on) { fullZoom = { zoom, fit: zoomFit }; zoomFit = true; } else { zoom = fullZoom.zoom; zoomFit = fullZoom.fit; }
    wrap.classList.toggle('split', on);
    width = Math.floor(scroll.clientWidth - 8) || width;
    sizeFrame();
  }
  let fullZoom = { zoom: 1, fit: true };
  /** the full-width map is a framed viewport filling the screen below the header (at least 60% of the screen's height);
   *  the side map keeps its own height (CSS) */
  function sizeFrame() {
    // the zoom bar sits in the frame's top padding; it can wrap onto two rows in a narrow column, so the padding follows it
    if (zoomBar.offsetHeight) scroll.style.paddingTop = `${zoomBar.offsetHeight + 14}px`;
    if (isSplit()) { scroll.style.removeProperty('height'); return; }
    const top = scroll.getBoundingClientRect().top + scrollY;
    scroll.style.height = `${Math.round(Math.max(innerHeight * 0.6, innerHeight - top - 12))}px`;
  }
  window.addEventListener('resize', () => sizeFrame());
  /** the fit: the map's width in its frame (100%, or less when the side column is narrower than the map). Fit to screen and a
   *  fresh split use it; Actual size on the full-width map is 100% (natural boxes) */
  const fitZoom = () => (!geom ? 1 : !isSplit() && view === 'actual' ? 1 : Math.min(1, (scroll.clientWidth - 8) / geom.width));
  /** the whole map in its frame, width and height */
  const wholeZoom = () => (!geom ? 1 : Math.min((scroll.clientWidth - 8) / geom.width, (scroll.clientHeight - (parseFloat(getComputedStyle(scroll).paddingTop) || 0) - 8) / geom.height));
  /** how far the wheel / pinch may zoom: in to 3×; out, on the full-width map, to 60% or the whole map in the frame, whichever
   *  is smaller; the side map as before: to 60% or its column fit, whichever is smaller */
  const MIN_ZOOM = 0.6, MAX_ZOOM = 3;
  const minZoom = () => Math.max(0.05, Math.min(MIN_ZOOM, fitZoom(), isSplit() ? Infinity : wholeZoom()));
  /** zoom so the map point under (cx, cy) stays under it */
  function setZoom(z: number, cx?: number, cy?: number) {
    const svg = scroll.querySelector('svg'); if (!svg || !geom) return;
    z = Math.max(minZoom(), Math.min(MAX_ZOOM, z));
    const r0 = svg.getBoundingClientRect(), b = scroll.getBoundingClientRect();
    const x = cx ?? b.left + b.width / 2, y = cy ?? b.top + b.height / 2, px = (x - r0.left) / zoom, py = (y - r0.top) / zoom;
    zoom = z; zoomFit = Math.abs(z - fitZoom()) < 1e-3; svg.setAttribute('width', String(geom.width * z)); svg.setAttribute('height', String(geom.height * z));
    const r1 = svg.getBoundingClientRect();
    scroll.scrollLeft += r1.left + px * z - x; scroll.scrollTop += r1.top + py * z - y;
    zoomPct.textContent = `${Math.round(z * 100)}%`; wrap.dataset.zoom = z.toFixed(3);
  }
  const zoomAtCentre = (f: number) => setZoom(zoom * f);
  /** keep the open box or line in view in the side map */
  function centerSel() {
    const sel = scroll.querySelector('.qm-node.n-sel, .qm-edge.e-sel, .qm-ref.r-sel') as SVGGraphicsElement | null; if (!sel) return;
    const a = sel.getBoundingClientRect(), b = scroll.getBoundingClientRect();
    scroll.scrollLeft += a.left - b.left - (b.width - a.width) / 2; scroll.scrollTop += a.top - b.top - (b.height - a.height) / 2;
  }
  // the wheel zooms the map about the cursor, only over the map's frame (everywhere else the page scrolls as usual)
  scroll.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const dy = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaMode === 2 ? ev.deltaY * 400 : ev.deltaY;
    setZoom(zoom * Math.exp(-dy * 0.0015), ev.clientX, ev.clientY);
  }, { passive: false });
  // touch: two fingers pinch-zoom the map about their midpoint; one finger pans it natively (the frame contains its own
  // overscroll, so the page only scrolls from outside the map)
  let pinch: { d0: number; z0: number } | null = null;
  const tdist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  scroll.addEventListener('touchstart', (ev) => { if (ev.touches.length === 2) pinch = { d0: tdist(ev.touches) || 1, z0: zoom }; }, { passive: true });
  scroll.addEventListener('touchmove', (ev) => {
    if (!pinch || ev.touches.length !== 2) return;
    ev.preventDefault();
    const t = ev.touches; setZoom(pinch.z0 * (tdist(t) / pinch.d0), (t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2);
  }, { passive: false });
  const endPinch = (ev: TouchEvent) => { if (ev.touches.length < 2) pinch = null; };
  scroll.addEventListener('touchend', endPinch); scroll.addEventListener('touchcancel', endPinch);
  const onWide = () => { applySplit(); renderSvg(); };
  wide?.addEventListener?.('change', onWide);
  const toggleNode = (id: string) => {
    if (st.mode === 'review' && st.recall && !st.revealed.has(`${st.mapId}/${id}`)) {
      st.revealed.add(`${st.mapId}/${id}`); renderSvg(); return;
    }
    if (st.pick?.kind === 'node' && st.pick.id === id) return setPick(null);
    progress.markSeen(st.mapId, id);
    // tapping the box a just-opened line leads to counts as arriving by that line (a shortcut restates its own question)
    const prev = st.pick, via = prev?.kind === 'edge' && map().edges.some((e) => !e.dashed && edgeKey(e.from, e.to) === prev.id && e.to === id) ? prev.id : undefined;
    arrivedVia = via; if (via) cameBy.set(`${st.mapId}/${id}`, via); else cameBy.delete(`${st.mapId}/${id}`);
    setPick({ kind: 'node', id });
  };
  /** open a box (never toggles it shut): used by the Next/Back chain controls */
  /** the solid line the reader last arrived by (its Next button), so the box can restate that question */
  let arrivedVia: string | undefined;
  /** the path actually walked: for each box, the line the reader came in by (kept while they walk Back up the chain) */
  const cameBy = new Map<string, string>();
  const openNode = (id: string, via?: string) => {
    const k = `${st.mapId}/${id}`;
    if (via) cameBy.set(k, via);
    arrivedVia = via ?? cameBy.get(k);
    progress.markSeen(st.mapId, id); setPick({ kind: 'node', id }); panel.scrollTop = 0;
  };
  /** the main chain: solid lines that are not side paths (falls back to every solid line if a box is only reachable by a side path) */
  const mainEdges = (m: MapDef) => m.edges.filter((e) => !e.dashed && !e.side);
  const mainPath = (id: string, m: MapDef) => { const p = pathToRoot(id, mainEdges(m)); return p.length > 1 || id === 'root' ? p : pathToRoot(id, m.edges.filter((e) => !e.dashed)); };
  /** Back order: the line you actually came through, then the main chain, then the rest */
  const backOrder = (id: string, m: MapDef) => {
    const ins = m.edges.filter((e) => e.to === id && !e.dashed), up = mainPath(id, m), prev = up.length > 1 ? up[up.length - 2] : undefined;
    const rank = (e: MapEdge) => (edgeKey(e.from, e.to) === arrivedVia ? 0 : e.from === prev ? 1 : e.side ? 3 : 2);
    return ins.sort((a, b) => rank(a) - rank(b));
  };
  /** a side line is a shortcut when its box leads on; a branch that ends there (a Full-detail side box) is a detour you come back from */
  const sideTag = (e: MapEdge, m: MapDef) => (m.edges.some((x) => x.from === e.to && !x.dashed) ? 'Side path (shortcut)' : 'Side path (a detour; come back here)');
  /** a side line's header uses the same words as its box's tag and the legend: a detour you come back from, or a shortcut that
   *  leads on (pass 3: never call a detour a shortcut or a quicker way) */
  const sideHeader = (e: MapEdge, m: MapDef) => (sideTag(e, m) === 'Side path (shortcut)' ? 'Side path (shortcut): it skips ahead to a later box; the main path gets there too' : 'Side path (a detour; come back here): a side box off the main path, which goes on without it');
  /** the legend names the side lines this map actually has: detours, shortcuts or both */
  const sideLegend = (m: MapDef) => { const t = new Set(m.edges.filter((e) => e.side).map((e) => sideTag(e, m))), sc = t.has('Side path (shortcut)'), dt = t.size > (sc ? 1 : 0); return sc && dt ? 'side path (a shortcut or a detour)' : sc ? 'side path (shortcut)' : 'side path (a detour; come back here)'; };
  /** Next order: main path first, side paths after */
  const nextOrder = (id: string, m: MapDef) => m.edges.filter((e) => e.from === id && !e.dashed).sort((a, b) => Number(!!a.side) - Number(!!b.side) || (a.rank ?? 0) - (b.rank ?? 0));
  /** the main-chain box a Full-detail branch hangs from: the last box on its path that is also on the first map */
  const mainAncestor = (id: string, m: MapDef) => { const first = new Set(content.maps[0]?.nodes.map((n) => n.id)); const up = mainPath(id, m).filter((x) => x !== id && first.has(x)); return up[up.length - 1]; };
  const openEdge = (key: string) => { setPick({ kind: 'edge', id: key }); panel.scrollTop = 0; };
  /** an Example node opens its card in the panel (the phone card below 700 px); tapping it again closes it */
  /** an Example node is a side trip: remember where the reader was (a box or a line, or nothing) and go back there on Close,
   *  Esc or a second tap; the browser's Back does the same (app.ts pushes a history step for it) */
  let refFrom: MapState['pick'] = null;
  const toggleRef = (id: string) => { if (st.pick?.kind === 'ref' && st.pick.id === id) return closeRef(); if (st.pick?.kind !== 'ref') refFrom = st.pick; setPick({ kind: 'ref', id }); };
  function closeRef() { const back = refFrom && (refFrom.kind !== 'node' || map().nodes.some((n) => n.id === refFrom!.id)) ? refFrom : null; refFrom = null; endingTrip = true; try { setPick(back); } finally { endingTrip = false; } }
  let endingTrip = false;
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
    // on a phone the two folds sit side by side with short summaries (the long ones return on wider screens)
    if (m.caption) caption.append(h('details', { class: 'fold' }, h('summary', null, h('span', { class: 'sum-long' }, 'How to read this map'), h('span', { class: 'sum-short' }, 'How to read it')), h('div', { html: `<p>${m.caption}</p>` })));
    const re = content.subject.runningExample;
    // the running examples' introductions live in their Example nodes (runningExample.refs): no separate section then
    if (re && !exRefs.length) caption.append(h('details', { class: 'fold', dataset: { testid: 'running-example' } }, h('summary', null, h('span', { class: 'sum-long' }, `Running example: ${re.title}`), h('span', { class: 'sum-short' }, 'Running example')), h('div', { html: `<p><b>${re.title}.</b> ${re.summary}</p>${re.details ?? ''}` })));
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
      h('span', { class: 'cm-sum', html: `<span class="badge-dot"></span><b>${sm.unseen}</b> unseen · <span class="badge-dot seen"></span><b>${sm.seen}</b> seen · <span class="badge-dot correct"></span><b>${sm.correct}</b> correct · <span class="badge-dot missed"></span><b>${sm.missed}</b> missed (all maps: ${sm.total} different boxes; a box on two maps counts once)` }),
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
    const hasDashed = m.edges.some((e) => e.dashed), hasSide = m.edges.some((e) => e.side);
    const line = (dashed: boolean, side = false) => {
      const sw = s('svg', { class: 'lg-sw', width: 34, height: 12, viewBox: '0 0 34 12', 'aria-hidden': 'true' });
      sw.append(s('path', { class: `lg-line${dashed ? ' dashed' : ''}${side ? ' side' : ''}`, d: 'M 1 6 H 27' }), s('path', { class: 'lg-head', d: 'M 23 2.5 L 28 6 L 23 9.5' }));
      return sw;
    };
    const shape = (k: string) => {
      const sw = s('svg', { class: 'lg-sw', width: 24, height: 14, viewBox: '0 0 24 14', 'aria-hidden': 'true' });
      sw.append(k === 'decision' ? s('path', { class: 'lg-shape', d: 'M 5 1 L 19 1 L 23 7 L 19 13 L 5 13 L 1 7 Z' }) : s('rect', { class: 'lg-shape', x: 1, y: 1, width: 22, height: 12, rx: k === 'terminal' ? 6 : 3 }));
      return sw;
    };
    // a dashed example node and its dotted link, side by side (the link is drawn on the left, as from its host box)
    const exChip = () => { const sw = s('svg', { class: 'lg-sw', width: 40, height: 14, viewBox: '0 0 40 14', 'aria-hidden': 'true' }); sw.append(s('line', { class: 'lg-exlink', x1: 1, y1: 7, x2: 14, y2: 7 }), s('rect', { class: 'lg-ref', x: 15, y: 1, width: 24, height: 12, rx: 5 })); return sw; };
    // the per-box example glyphs, one per example on this map
    const usesIcon = (mm: MapDef) => { const ids = refsOn(mm).map((r) => r.id), sw = s('svg', { class: 'lg-sw', width: ids.length * 13, height: 14, viewBox: `0 0 ${ids.length * 13} 14`, 'aria-hidden': 'true' }); ids.forEach((id, i) => sw.append(exampleGlyph(id, { x: i * 13 + 1, y: 2, w: 10, h: 10 }, { 'data-testid': 'legend-exglyph' }))); return sw; };
    const item = (key: string, icon: Element, text: string) => h('span', { class: 'lg-item', dataset: { legend: key } }, icon as unknown as Node, h('span', null, text));
    legend.append(
      item('solid', line(false), 'next question'),
      ...(hasSide ? [item('side', line(false, true), sideLegend(m))] : []),
      ...(hasDashed ? [item('dashed', line(true), 'same idea, other view')] : []),
      ...(kinds.has('decision') ? [item('decision', shape('decision'), 'a fork: the answer picks the way')] : []),
      ...(kinds.has('terminal') ? [item('terminal', shape('terminal'), 'where the map starts')] : []),
      ...(refsOn(m).length ? [item('example', exChip(), 'running example (dashed), dotted to the box where it starts')] : []),
      ...(usesOn(m) ? [item('uses', usesIcon(m), 'the box uses that example (point at or open the Example node to light them all)')] : []),
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
    syncViewBtns();
  }
  /** the map's boxes rarely span every column: start Actual size looking at them, not at the empty margin */
  function centerOnBoxes() {
    if (!geom) return; const xs = Object.values(geom.boxes); if (!xs.length) return;
    const x0 = Math.min(...xs.map((b) => b.x)), x1 = Math.max(...xs.map((b) => b.x + b.w));
    scroll.scrollLeft = Math.max(0, (x0 + x1) / 2 - scroll.clientWidth / 2);
  }
  /** Fit to screen / Actual size: the layout and the zoom (pressing the current one again resets its zoom) */
  function setView(v: MapView) {
    const same = v === view;
    view = v; storeSet(MAP_VIEW_KEY, v); zoomFit = true; zoom = 1;
    if (!same) { scroll.scrollLeft = 0; scroll.scrollTop = 0; }
    renderLegend(); renderSvg(); if (v === 'actual' && !same) centerOnBoxes();
    if (same) centerSel();
    const sel = scroll.querySelector('.qm-node.n-sel, .qm-edge.e-sel') as SVGGraphicsElement | null; // keep the tapped thing in view
    if (sel && v === 'actual') { const a = sel.getBoundingClientRect(), b = scroll.getBoundingClientRect(); scroll.scrollLeft += a.left - b.left - (b.width - a.width) / 2; scroll.scrollTop += a.top - b.top - (b.height - a.height) / 2; }
  }

  // drag-to-pan with a mouse or pen in Actual size (touch pans natively); a drag never counts as a tap
  let drag: { x: number; y: number; sl: number; st: number; id: number; moved: boolean } | null = null;
  scroll.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType === 'touch' || ev.button !== 0) return;
    drag = { x: ev.clientX, y: ev.clientY, sl: scroll.scrollLeft, st: scroll.scrollTop, id: ev.pointerId, moved: false };
  });
  scroll.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) { drag.moved = true; scroll.classList.add('panning'); try { scroll.setPointerCapture(ev.pointerId); } catch { /* ignore */ } }
    scroll.scrollLeft = drag.sl - dx; scroll.scrollTop = drag.st - dy;
  });
  const endDrag = (ev: PointerEvent) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null; scroll.classList.remove('panning');
    if (moved) { const eat = (e: Event) => { e.stopPropagation(); e.preventDefault(); }; scroll.addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => scroll.removeEventListener('click', eat, true), 0); }
  };
  scroll.addEventListener('pointerup', endDrag); scroll.addEventListener('pointercancel', endDrag);

  let geom: Geometry | null = null;
  let labels: Label[] = [];
  let sideNodes: SideNode[] = [];
  function renderSvg() {
    applySplit(); sizeFrame();
    const m = map();
    const byId: Record<string, MapNode> = Object.fromEntries(m.nodes.map((n) => [n.id, n]));
    geom = computeGeometry(m.nodes, m.edges, layoutWidth(view, width));
    // Example nodes: placed in free space beside their host boxes once the chain is laid out (the chain never moves for them)
    const sideIn = refsOn(m).map((r) => ({ id: r.id, at: r.at, label: r.label }));
    if (sideIn.length) { const ps = placeSideNodes(geom, sideIn, placeLabels(geom, m.edges, [])); geom = ps.geom; sideNodes = ps.nodes; } else sideNodes = [];
    const pick = st.pick, openRef = pick?.kind === 'ref' ? exRefs.find((r) => r.id === pick.id) : undefined;
    // an open Example node lights its host box's path like the box itself would (the box is not "selected": the node is)
    const hl = mapHighlight(pick?.kind === 'ref' ? (openRef ? { kind: 'node', id: openRef.at } : null) : pick as { kind: 'node' | 'edge'; id: string } | null, m.edges);
    const ser = pick === null ? st.series : null;
    const selNode = openRef ? null : hl.selected, selEdgeKey = pick?.kind === 'edge' && hl.edges.size ? pick.id : null;
    const pathSet = hl.path, neigh = hl.neigh, pathKeys = hl.edges;
    labels = placeLabels(geom, m.edges, hl.priority, sideNodes);
    const recallHide = (id: string) => st.mode === 'review' && st.recall && !st.revealed.has(`${st.mapId}/${id}`);

    if (zoomFit) { zoom = fitZoom(); wrap.dataset.zoom = zoom.toFixed(3); zoomPct.textContent = `${Math.round(zoom * 100)}%`; }
    const svg = s('svg', { width: geom.width * zoom, height: geom.height * zoom, viewBox: `0 0 ${geom.width} ${geom.height}`, role: 'group', 'aria-label': 'Question-chain map. Tap a box, a line, or a line’s dot for more.', 'data-testid': 'map-svg' });
    svg.append(s('rect', { x: 0, y: 0, width: geom.width, height: geom.height, fill: 'transparent', onclick: () => { if (st.pick) setPick(null); } }));
    const edgeData: Record<string, MapEdge> = Object.fromEntries(m.edges.map((e) => [edgeKey(e.from, e.to), e]));
    for (const g of geom.edges) {
      const data = edgeData[g.key];
      const active = pathKeys.has(g.key);
      const dim = (pick !== null && !active) || (ser !== null && !(byId[g.from].series === ser && byId[g.to].series === ser));
      const d = roundedPath(g.points), dHop = roundedPath(g.points, undefined, g.hops);
      const act = () => toggleEdge(g.key);
      const grp = s('g', {
        class: `qm-edge${data.dashed ? ' dashed' : ''}${data.side ? ' side' : ''}${active ? ' e-path' : ''}${dim ? ' e-dim' : ''}${selEdgeKey === g.key ? ' e-sel' : ''}`,
        role: 'button', tabindex: 0, 'aria-label': `Link: ${byId[g.from].label} to ${byId[g.to].label}`, 'aria-pressed': selEdgeKey === g.key,
        'data-edge': g.key, 'data-testid': 'map-edge', onclick: act,
        onkeydown: (ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } },
      });
      grp.append(
        s('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': 26, 'stroke-linejoin': 'round', 'pointer-events': 'stroke' }),
        s('path', { class: 'line', d: dHop }), s('path', { class: 'head', d: arrowHead(data.reverse ? [...g.points].reverse() : g.points) }),
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
    // example usage (opt-in: boxes carry `examples`): faint dotted links from each Example node to the other boxes that use it,
    // shown only while the node is pointed at or its introduction is open (never permanent lines)
    const uses = usesOn(m), litRef = openRef?.id ?? null;
    if (uses) for (const sn of sideNodes) {
      const users = geom.order.filter((id) => id !== sn.at && byId[id].examples?.includes(sn.id));
      const g = s('g', { class: `qm-uselinks${litRef === sn.id ? ' u-on' : ''}`, 'data-ref': sn.id, 'data-testid': 'map-uselinks', 'aria-hidden': 'true', 'pointer-events': 'none' });
      useLinkSegments(sn, users.map((id) => geom!.boxes[id])).forEach(([a, b], i) => g.append(s('line', { class: 'qm-uselink', x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'data-to': users[i], 'data-testid': 'map-uselink' })));
      svg.append(g);
    }
    for (const id of geom.order) {
      const b = geom.boxes[id], n = byId[id];
      const selected = selNode === id, onPath = pathSet.has(id), isNeigh = neigh.has(id) && !onPath;
      const inSer = ser !== null && n.series === ser;
      const dim = (pick !== null && !selected && !onPath && !isNeigh) || (ser !== null && !inSer);
      const status = st.mode === 'review' ? progress.status(m.id, n) : null;
      const hide = recallHide(id);
      const exs = uses ? exRefs.map((r) => r.id).filter((x) => n.examples?.includes(x)) : [];
      const cls = ['qm-node', selected ? 'n-sel' : onPath ? 'n-path' : isNeigh ? 'n-neigh' : inSer ? 'n-ser' : dim ? 'n-dim' : '', status ? `st-${status}` : '', hide ? 'recall-hidden' : '', litRef && exs.includes(litRef) ? 'u-hl' : ''].filter(Boolean).join(' ');
      const act = () => toggleNode(id);
      const grp = s('g', {
        class: cls, role: 'button', tabindex: 0, 'aria-label': hide ? `Hidden box ${m.nodes.indexOf(n)}. Tap to reveal.` : `${n.label}${n.detail ? `. ${n.detail}` : ''}. Tap for more.`,
        'aria-pressed': selected, style: n.series !== undefined ? `--c:${SERIES[n.series]}` : undefined, 'data-node': id, 'data-status': status ?? undefined, 'data-uses': exs.length ? exs.join(' ') : undefined, 'data-testid': 'map-node', onclick: act,
        onkeydown: (ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } },
      });
      const r = 14;
      grp.append(b.kind === 'decision'
        ? s('path', { class: 'shape focus-ring', d: `M ${b.x + r} ${b.y} L ${b.x + b.w - r} ${b.y} L ${b.x + b.w} ${b.y + b.h / 2} L ${b.x + b.w - r} ${b.y + b.h} L ${b.x + r} ${b.y + b.h} L ${b.x} ${b.y + b.h / 2} Z` })
        : s('rect', { class: 'shape focus-ring', x: b.x, y: b.y, width: b.w, height: b.h, rx: b.kind === 'terminal' ? Math.min(24, b.h / 2) : 10 }));
      if (n.series !== undefined && b.kind === 'box') grp.append(s('rect', { class: 'qm-accent', x: b.x, y: b.y + 6, width: 4, height: b.h - 12, rx: 2, fill: SERIES[n.series] }));
      const cx = b.x + b.w / 2, textH = b.lines.length * 15 + b.detailLines.length * 14, top0 = b.y + (b.h - b.extra - textH) / 2 + 11;
      b.lines.forEach((line, i) => grp.append(s('text', { x: cx, y: top0 + i * 15, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600 }, line)));
      b.detailLines.forEach((line, i) => grp.append(s('text', { class: 'det', x: cx, y: top0 + b.lines.length * 15 + i * 14, 'text-anchor': 'middle', 'font-size': 11 }, line)));
      // the example glyphs in the box's right padding, up from the bottom-right corner (never on the label)
      exampleGlyphRects(b, exs.length).forEach((gr, i) => grp.append(exampleGlyph(exs[i], gr)));
      if (hide) grp.append(s('text', { class: 'qmark', x: cx, y: b.y + b.h / 2 + 6, 'text-anchor': 'middle', style: 'opacity:1' }, '?'));
      if (status) grp.append(s('circle', { class: 'st', cx: b.x + b.w - 9, cy: b.y + 9, r: 6 }));
      svg.append(grp);
    }
    // Example nodes: a dashed, tinted node with an "Example" tag in a side column beside its host box, joined to it by a
    // plain dotted link (no arrowhead, no label, not clickable, no line pop-up). Its own tap target; never in the Next/Back chain.
    for (const sn of sideNodes) {
      const r = exRefs.find((x) => x.id === sn.id); if (!r) continue;
      const on = openRef?.id === r.id, dim = (pick !== null && !on && !pathSet.has(r.at) && selNode !== r.at) || (ser !== null && byId[r.at]?.series !== ser);
      svg.append(s('line', { class: `qm-exlink${on ? ' x-on' : ''}${dim ? ' x-dim' : ''}`, x1: sn.link[0].x, y1: sn.link[0].y, x2: sn.link[1].x, y2: sn.link[1].y, 'pointer-events': 'none', 'aria-hidden': 'true', 'data-testid': 'map-exlink', 'data-ref': r.id, 'data-at': r.at }));
      const act = () => toggleRef(r.id);
      const grp = s('g', {
        class: `qm-ref${on ? ' r-sel' : ''}${dim ? ' r-dim' : ''}`, role: 'button', tabindex: 0, 'aria-label': `Example: ${r.label}. Opens the running example's introduction.`, 'aria-pressed': on,
        'data-ref': r.id, 'data-at': r.at, 'data-side': sn.side, 'data-testid': 'map-ref',
        onclick: (ev: Event) => { ev.stopPropagation(); act(); },
        onkeydown: (ev: KeyboardEvent) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); act(); } },
        // pointing at it (a mouse or pen; a touch taps it open instead) or focusing it lights the boxes that use it
        ...(uses ? {
          onpointerenter: (ev: PointerEvent) => { if (ev.pointerType !== 'touch') lightUses(r.id, true); },
          onpointerleave: (ev: PointerEvent) => { if (ev.pointerType !== 'touch') lightUses(r.id, false); },
          onfocus: () => lightUses(r.id, true), onblur: () => lightUses(r.id, false),
        } : {}),
      });
      const cx = sn.x + sn.w / 2;
      grp.append(s('rect', { class: 'shape chip focus-ring', x: sn.x, y: sn.y, width: sn.w, height: sn.h, rx: 12 }),
        s('text', { class: 'tag', x: cx, y: sn.y + 5 + SIDE_TAG_H - 3, 'text-anchor': 'middle', 'font-size': 8.5 }, 'EXAMPLE'));
      sn.lines.forEach((line, i) => grp.append(s('text', { class: 'lab', x: cx, y: sn.y + 5 + SIDE_TAG_H + 10 + i * 13, 'text-anchor': 'middle', 'font-size': sideFont(sn.w) }, line)));
      svg.append(grp);
    }
    const sl = scroll.scrollLeft, stp = scroll.scrollTop; // a re-render (a tap, a theme change) must not throw the reader back to the corner
    scroll.classList.toggle('actual', view === 'actual');
    scroll.replaceChildren(svg);
    zoomPct.textContent = `${Math.round(zoom * 100)}%`; wrap.dataset.zoom = zoom.toFixed(3);
    scroll.scrollLeft = sl; scroll.scrollTop = stp;
  }

  function pathChips(ids: string[], m: MapDef, lookBack = false) {
    const wrap = h('div', { class: 'path', dataset: { testid: 'path-chips' } }, 'Path from the central question: ');
    ids.forEach((id, i) => {
      const n = m.nodes.find((x) => x.id === id);
      if (!n) return;
      wrap.append(h('a', { href: '#', dataset: { node: id }, onclick: (ev: Event) => { ev.preventDefault(); toggleNode(id); } }, n.label));
      if (i < ids.length - 1) wrap.append(lookBack && i === ids.length - 2 ? ' ⇢ looks back at ' : ' → ');
    });
    return wrap;
  }

  let popStops: (() => void)[] = [];
  const askOpen = new Set<string>();
  // data-body marks a pop-up's MAIN BODY (what the word cap counts: see packages/build/test/wordcap.ts)
  /** The opt-in fixed pop-up template (node.pop): answer, rough formula, figure strip, running example, next question, one intuition question. */
  function popTemplate(n: MapNode, m: MapDef): HTMLElement[] {
    const p = n.pop!, out: HTMLElement[] = [];
    const row = (cls: string, lead: string, html: string, testid: string, body = false) => h('p', { class: `pop-row ${cls}`, dataset: { testid } }, h('b', { class: 'pop-lead' }, lead), ' ', h('span', { html, dataset: body ? { body: '' } : undefined }));
    // restate the question this box answers: the line the reader arrived by, else the main-chain incoming line; the root states the central question
    const inc = backOrder(n.id, m)[0];
    const qText = inc ? inc.question : n.label;
    out.push(h('p', { class: 'pop-question', dataset: { testid: 'pop-question', edge: inc ? edgeKey(inc.from, inc.to) : '' } }, h('span', { class: 'pq-lead' }, inc ? 'The question:' : 'The central question:'), ' ', h('span', { class: 'pq-text', html: qText })));
    out.push(h('div', { class: 'pop-answer', dataset: { testid: 'pop-answer', body: '' }, html: `<p>${n.short}</p>` }));
    out.push(row('pop-rough', 'In rough words:', p.rough, 'pop-rough'));
    if (n.eqHtml || n.eq) out.push(n.eqHtml ? h('div', { class: 'st-eq', html: n.eqHtml }) : h('div', { class: 'st-eq' }, n.eq!));
    if (p.eqKey) out.push(h('p', { class: 'pop-key st-hint', dataset: { testid: 'pop-key' }, html: p.eqKey }));
    if (p.figures?.length) {
      // a wide figure (aspect ≥ 2.2) in a multi-figure strip gets its own full row; the grid is sized by the narrow ones
      const wide = (f: { id: string }) => p.figures!.length > 1 && (nav.figures?.[f.id]?.aspect ?? 0) >= 2.2;
      const narrow = p.figures.filter((f) => !wide(f)).length || p.figures.length;
      const strip = h('div', { class: `pop-figs n${narrow}`, dataset: { testid: 'pop-figures' } });
      for (const f of p.figures) { const mf = mountQuizFigure(f, nav.figures); popStops.push(mf.destroy); if (wide(f)) mf.el.style.gridColumn = '1 / -1'; strip.append(mf.el); }
      out.push(strip);
      if (p.figCaption) out.push(h('p', { class: 'pop-figcap', dataset: { testid: 'pop-figcap' }, html: p.figCaption }));
    }
    if (p.audio?.length && nav.audio) {
      const box = h('div', { class: 'pop-audio', dataset: { testid: 'pop-audio' } });
      for (const id of p.audio) { const a = nav.audio.mount(id); popStops.push(a.destroy); box.append(a.el); }
      out.push(box);
    }
    const ex = p.example ?? n.addsToExample;
    if (ex) out.push(row('pop-example', 'On the running example:', ex, 'adds-to-example'));
    out.push(...meetLinks(n, m));
    // the chain goes THROUGH the lines: each outgoing (solid) line's question is a link that opens that line's pop-up
    const outs = nextOrder(n.id, m), fork = outs.length > 1 && outs.some((e) => e.side);
    const link = (e: MapEdge, testid: string) => h('a', { href: '#', class: 'pop-next-link', dataset: { testid, edge: edgeKey(e.from, e.to), to: e.to }, onclick: (ev: Event) => { ev.preventDefault(); openEdge(edgeKey(e.from, e.to)); }, html: e.question });
    if (outs.length) {
      const r = h('div', { class: 'pop-row pop-next', dataset: { testid: 'pop-next' } }, h('b', { class: 'pop-lead' }, outs.length > 1 ? 'Next questions:' : 'Next question:'));
      const ul = h('ul', { class: 'pop-next-list' });
      for (const e of outs) ul.append(h('li', { class: fork ? (e.side ? 'nx-side' : 'nx-main') : undefined }, ...(fork ? [h('span', { class: 'nx-tag' }, e.side ? `${sideTag(e, m)}:` : 'Main path:'), ' '] : []), link(e, 'pop-next-link')));
      r.append(ul); out.push(r);
    } else if (p.next) out.push(row('pop-next', 'Next question:', p.next, 'pop-next'));
    // a Full-detail branch end is not a dead end: Back up the branch, or straight back to the main chain
    // (a box with chain buttons gets its Back and Return there, once; see chainNav)
    const anc = !outs.length && !n.pop && !content.maps[0]?.nodes.some((x) => x.id === n.id) ? mainAncestor(n.id, m) : undefined;
    if (anc) {
      const inc0 = backOrder(n.id, m)[0], ancN = m.nodes.find((x) => x.id === anc)!;
      const r = h('div', { class: 'pop-row pop-end', dataset: { testid: 'pop-end' } }, h('b', { class: 'pop-lead' }, 'End of this branch:'), ' ');
      if (inc0) { const src = m.nodes.find((x) => x.id === inc0.from)!; r.append(h('a', { href: '#', dataset: { testid: 'end-back', edge: edgeKey(inc0.from, inc0.to) }, onclick: (ev: Event) => { ev.preventDefault(); openEdge(edgeKey(inc0.from, inc0.to)); } }, `← Back to “${src.label}”`), ' · '); }
      r.append(h('a', { href: '#', dataset: { testid: 'end-main', to: anc }, onclick: (ev: Event) => { ev.preventDefault(); openNode(anc); } }, `Return to the main chain (“${ancN.label}”)`));
      out.push(r);
    }
    // a dashed line touching this box joins it to another box that uses the same idea
    // a reversed dashed line is a look-back: it is listed only at its arrow's tail (`to`), the box that looks back, so the
    // earlier box never previews a later idea
    const side = m.edges.filter((e) => e.dashed && (e.reverse ? e.to === n.id : (e.from === n.id || e.to === n.id)));
    if (side.length) { const back = side.every((e) => e.reverse); const ul = h('ul', { class: 'pop-next-list' }); for (const e of side) ul.append(h('li', null, link(e, 'pop-side-link'))); out.push(h('div', { class: 'pop-row pop-side', dataset: { testid: 'pop-side' } }, h('b', { class: 'pop-lead' }, back ? 'Look back:' : 'Look across:'), ul)); }
    const q = p.ask ? content.quiz.find((x) => x.id === p.ask) : undefined;
    if (q) { const d = h('details', { class: 'fold pop-ask', open: askOpen.has(n.id), dataset: { testid: 'pop-ask' } }, h('summary', null, 'Quick check'), miniCheck(q, progress)); d.addEventListener('toggle', () => { if (d.open) askOpen.add(n.id); else askOpen.delete(n.id); }); out.push(d); }
    return out;
  }

  /** Back (each incoming solid line, main chain first) and Next (each outgoing solid line) buttons for a box; both open the LINE, whose own Back / Next open the boxes */
  function chainNav(id: string, m: MapDef): HTMLElement {
    const nav2 = h('div', { class: 'chain-nav', dataset: { testid: 'chain-nav' } });
    const ins = backOrder(id, m), outs = nextOrder(id, m), fork = outs.length > 1 && outs.some((e) => e.side);
    const btn = (e: MapEdge, back: boolean) => h('button', { class: back ? 'tbtn chain-back' : e.side ? 'tbtn chain-next chain-side' : 'tbtn on chain-next', dataset: { testid: back ? 'chain-back' : 'chain-next', edge: edgeKey(e.from, e.to), to: back ? e.from : e.to, path: !back && fork ? (e.side ? 'side' : 'main') : undefined }, onclick: () => openEdge(edgeKey(e.from, e.to)) },
      h('span', { class: 'ch-dir' }, back ? '← Back: the question that led here' : fork ? (e.side ? `${sideTag(e, m)} →` : 'Next on the main path →') : 'Next question →'), h('span', { class: 'ch-name', html: e.question }));
    const anc = !outs.length && !content.maps[0]?.nodes.some((x) => x.id === id) ? mainAncestor(id, m) : undefined;
    // a branch end: one Back (the line you came by) and one Return, not a Back for every line in
    for (const e of anc ? ins.slice(0, 1) : ins) nav2.append(btn(e, true));
    for (const e of outs) nav2.append(btn(e, false));
    if (anc) nav2.append(h('button', { class: 'tbtn chain-main', dataset: { testid: 'chain-main', to: anc }, onclick: () => openNode(anc) }, h('span', { class: 'ch-dir' }, 'Return to the main chain'), h('span', { class: 'ch-name' }, m.nodes.find((x) => x.id === anc)!.label)));
    return nav2;
  }

  /** the edge's "why ask it here": what the last box left open, why it matters, what answer we want; optional captioned figures */
  function whyBox(e: MapEdge): HTMLElement {
    const cb = h('div', { class: 'cb', html: e.why!, dataset: { body: '' } }); // main body (its figures and caption are not counted)
    if (e.whyFigures?.length) {
      const strip = h('div', { class: `pop-figs n${e.whyFigures.length}`, dataset: { testid: 'edge-why-figures' } });
      for (const f of e.whyFigures) { const mf = mountQuizFigure(f, nav.figures); popStops.push(mf.destroy); strip.append(mf.el); }
      cb.append(strip);
      if (e.whyFigCaption) cb.append(h('p', { class: 'pop-figcap', dataset: { testid: 'edge-why-figcap' }, html: e.whyFigCaption }));
    }
    return h('aside', { class: 'callout c-why', dataset: { testid: 'edge-why' } }, h('b', { class: 'lead' }, 'Why ask it here'), cb);
  }

  function renderPanel() {
    popStops.forEach((f) => f()); popStops = [];
    clear(panel);
    const m = map();
    const pick = st.pick;
    panel.classList.toggle('idle', !pick);
    // the glossary section the Variables drawer should open at for this entry (subject.glossaryTopics; inherited down the main path)
    const gt = content.subject.glossaryTopics, at = pick?.kind === 'node' ? pick.id : pick?.kind === 'edge' ? m.edges.find((e) => edgeKey(e.from, e.to) === pick.id)?.to : pick?.kind === 'ref' ? exRefs.find((r) => r.id === pick.id)?.at : undefined;
    panel.dataset.gloss = (gt && at ? [...mainPath(at, m)].reverse().map((id) => gt[id]).find(Boolean) : undefined) ?? '';
    if (!pick) {
      panel.append(h('p', { class: 'st-hint' }, 'Tap a box or a line. A box opens its short answer, key equation and a way into the deep dive; a line shows the question that leads from one idea to the next. Esc closes.'));
      return;
    }
    const close = h('button', { class: 'tbtn x', 'aria-label': 'Close', dataset: { testid: 'panel-close' }, onclick: () => setPick(null) }, '✕');
    // phones (< 700 px): the entry is a floating card; it closes with its ✕ (kept in reach at the card's top) or the browser/OS Back
    if (pick.kind === 'ref') {
      const r = exRefs.find((x) => x.id === pick.id), host = r && m.nodes.find((x) => x.id === r.at);
      if (!r) return;
      // the example's introduction: restated question, the live drawing and its caption, what it is and why we use it, and
      // the key numbers introduced so far. A side trip: no Next/Back chain; Close / Esc / browser Back return to where you were.
      const xClose = h('button', { class: 'tbtn x', 'aria-label': 'Close', dataset: { testid: 'panel-close' }, onclick: () => closeRef() }, '✕');
      panel.append(h('div', { class: 'cm-head' }, h('h3', null, h('span', { class: 'ref-tag' }, 'Example'), ' ', r.title), xClose));
      if (host) {
        const crumb = h('div', { class: 'path ref-trail', dataset: { testid: 'ref-trail' } }, 'Side trip from: ');
        crumb.append(h('a', { href: '#', dataset: { node: host.id }, onclick: (ev: Event) => { ev.preventDefault(); openNode(host.id); } }, host.label), ' ⇢ ', h('span', { class: 'ref-here' }, `Example: ${r.label}`));
        panel.append(crumb);
      }
      panel.append(h('p', { class: 'pop-question', dataset: { testid: 'ref-question' } }, h('span', { class: 'pq-lead' }, 'The question:'), ' ', h('span', { class: 'pq-text' }, r.question ?? "What's the running example?")));
      const live = h('div', { class: 'ref-live', dataset: { testid: 'ref-live' } });
      panel.append(live);
      if (r.scene) { const hd = mountScene(live, { scene: r.scene.id, overlays: r.scene.overlays, params: r.scene.params, caption: r.scene.caption, diagram: r.scene.diagram }); popStops.push(() => hd.destroy()); }
      else if (r.figure) { const stop = nav.mountFigure?.(live, r.figure, r.preset, { intro: { panels: r.panels } }); if (stop) popStops.push(stop); else live.append(h('p', { class: 'st-hint' }, `(figure ${r.figure} is not available)`)); if (r.caption) live.append(h('p', { class: 'scene-cap ref-cap', dataset: { testid: 'ref-caption' }, html: r.caption })); }
      panel.append(h('h4', { class: 'ref-h' }, 'What it is and why we use it'), h('div', { class: 'ref-about', dataset: { testid: 'ref-about', body: '' }, html: r.about }));
      panel.append(h('h4', { class: 'ref-h' }, 'Key numbers so far'), h('div', { class: 'ref-numbers', dataset: { testid: 'ref-numbers', body: '' }, html: r.numbers }));
      // where it comes back: the boxes on this map that use it after its own first stretch, in reading order, each opening that
      // box, with the box's one-line why (exampleComesBack)
      if (usesOn(m)) {
        const back = r.comesBack?.[m.id] ?? exampleComesBack(m, exRefs, r.id);
        if (back.length) {
          const ul = h('ul', { class: 'ref-back', dataset: { testid: 'ref-comesback' } });
          for (const id of back) { const n = m.nodes.find((x) => x.id === id)!; ul.append(h('li', null, h('a', { href: '#', dataset: { node: id, testid: 'ref-comesback-link' }, onclick: (ev: Event) => { ev.preventDefault(); refFrom = null; openNode(id); } }, n.label), ...(n.exampleWhy ? [h('span', { class: 'ref-why', dataset: { testid: 'ref-comesback-why' }, html: `: ${n.exampleWhy}` })] : []))); }
          panel.append(h('h4', { class: 'ref-h' }, 'Where this example comes back'), ul);
        }
      }
      if (host) panel.append(h('div', { class: 'chain-nav', dataset: { testid: 'ref-nav' } }, h('button', { class: 'tbtn', dataset: { testid: 'ref-host', to: host.id }, onclick: () => { refFrom = null; openNode(host.id); } }, h('span', { class: 'ch-name' }, `← Back to ${host.label}`))));
      return;
    }
    if (pick.kind === 'node') {
      const n = m.nodes.find((x) => x.id === pick.id);
      if (!n) return;
      const head = h('div', { class: 'cm-head' }, h('h3', null, n.label), copyRefButton(() => nodeReference(content, n, m.id)), close);
      if (n.pop) panel.append(head, ...popTemplate(n, m));
      else panel.append(head, ...(n.detail ? [h('div', { class: 'st-hint', dataset: { body: '' } }, n.detail)] : []), h('div', { html: `<p>${n.short}</p>`, dataset: { body: '' } }));
      if (n.pop) { /* template replaces the free-form rows */ } else if (n.eqHtml) panel.append(h('div', { class: 'st-eq', html: n.eqHtml })); else if (n.eq) panel.append(h('div', { class: 'st-eq' }, n.eq));
      if (!n.pop && n.addsToExample) panel.append(h('aside', { class: 'callout c-example', dataset: { testid: 'adds-to-example' } }, h('b', { class: 'lead' }, 'Adds to the running example'), h('div', { class: 'cb', html: `<p>${n.addsToExample}</p>`, dataset: { body: '' } })));
      if (!n.pop) panel.append(...meetLinks(n, m));
      if (!n.pop && n.accountsFor) panel.append(h('aside', { class: 'callout c-account', dataset: { testid: 'accounts-for' } }, h('b', { class: 'lead' }, 'Lets us account for'), h('div', { class: 'cb', html: `<p>${n.accountsFor}</p>`, dataset: { body: '' } })));
      for (const [k, lead] of [['why', 'Why it matters'], ['recognize', 'Recognize'], ['trap', 'Trap'], ['predict', 'Predict']] as const) {
        const v = n.pop ? undefined : n[k];
        if (v) panel.append(h('aside', { class: `callout c-${k}` }, h('b', { class: 'lead' }, lead), h('div', { class: 'cb', html: `<p>${v}</p>`, dataset: { body: '' } })));
      }
      panel.append(pathChips(mainPath(n.id, m), m));
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
      if (n.pop) panel.append(chainNav(n.id, m));
    } else {
      const e = m.edges.find((x) => edgeKey(x.from, x.to) === pick.id);
      if (!e) return;
      const f = m.nodes.find((x) => x.id === e.from)!, t = m.nodes.find((x) => x.id === e.to)!;
      const head = h('div', { class: 'cm-head' }, h('h3', null, e.reverse ? `${t.label} ⇢ ${f.label}` : `${f.label} → ${t.label}`), copyRefButton(() => edgeReference(content, e, f, t, m.id)), close);
      panel.append(head, h('div', { class: 'st-hint', dataset: { testid: 'edge-kind' } }, e.dashed ? (e.reverse ? `Look-back (dashed): ${t.label} looks back at the same idea in ${f.label}` : 'Dashed: the same idea in another language') : e.side ? sideHeader(e, m) : 'Next step in the chain of questions'),
        h('aside', { class: 'callout c-predict' }, h('b', { class: 'lead' }, 'The question this line asks'), h('div', { class: 'cb', html: `<p>${e.question}</p>` })),
        ...(e.why ? [whyBox(e)] : []),
        e.why ? h('div', { class: 'edge-idea', dataset: { testid: 'edge-idea' } }, h('b', { class: 'pop-lead' }, 'The answer, in short: '), h('span', { html: e.idea })) : h('div', { html: `<p>${e.idea}</p>`, dataset: { body: '' } }));
      if (e.eq) panel.append(h('div', { class: 'st-eq' }, e.eq));
      // breadcrumb: the main path to where the reader stands, then the box the line leads to (a look-back stands at `to`)
      const [at, goes] = e.dashed && e.reverse ? [e.to, e.from] : [e.from, e.to];
      const pl = mainPath(at, m); if (pl[pl.length - 1] !== goes) pl.push(goes);
      panel.append(pathChips(pl, m, !!(e.dashed && e.reverse)));
      // a reversed (dashed) line is read from its arrow's tail: `to` looks back at `from`
      const [src, dst] = e.reverse ? [t, f] : [f, t];
      panel.append(h('div', { class: 'chain-nav', dataset: { testid: 'chain-nav' } },
        h('button', { class: 'tbtn chain-back', dataset: { testid: 'edge-back', to: src.id }, onclick: () => openNode(src.id) }, h('span', { class: 'ch-dir' }, '← Back to the box'), h('span', { class: 'ch-name' }, src.label)),
        h('button', { class: 'tbtn on chain-next', dataset: { testid: 'edge-next', to: dst.id }, onclick: () => openNode(dst.id, e.dashed ? undefined : edgeKey(e.from, e.to)) }, h('span', { class: 'ch-dir' }, 'Next box →'), h('span', { class: 'ch-name' }, dst.label))));
      const acts = h('div', { class: 'acts' });
      const dv = t.dive ?? f.dive;
      if (dv) acts.append(h('button', { class: 'tbtn on', onclick: () => nav.openDive(dv) }, 'Deep dive'));
      panel.append(acts);
    }
  }

  function renderAll() { renderTop(); renderLegend(); renderReview(); renderSvg(); renderPanel(); }
  renderAll(); if (view === 'actual') centerOnBoxes();
  const off = progress.onChange(() => { renderReview(); renderSvg(); renderPanel(); });
  const offPop = nav.onPop?.((p) => setPick(p)) ?? (() => {});
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && (st.pick || st.series !== null) && !document.querySelector('.fig-overlay:not([hidden])')) { st.series = null; if (st.pick?.kind === 'ref') closeRef(); else setPick(null); } };
  document.addEventListener('keydown', onKey);
  return () => { offPop(); popStops.forEach((f) => f()); ro.disconnect(); off(); document.removeEventListener('keydown', onKey); wide?.removeEventListener?.('change', onWide); root.remove(); };
}

/** Expose geometry+labels of the *current* render to tests. */
export function mapGeometryFor(map: MapDef, width: number, refs: { id: string; at: string; label: string }[] = []) {
  const g0 = computeGeometry(map.nodes, map.edges, width);
  const on = refs.filter((r) => map.nodes.some((n) => n.id === r.at)), side = on.length ? placeSideNodes(g0, on, placeLabels(g0, map.edges, [])) : { geom: g0, nodes: [] };
  return { geom: side.geom, labels: placeLabels(side.geom, map.edges, [], side.nodes), side: side.nodes };
}
