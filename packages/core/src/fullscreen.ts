/**
 * Full-screen toggle for the whole page, with a "swipe back leaves full screen" exit.
 *
 * Back-gesture trick: when full screen starts we mark the current history entry as a page entry and push one extra
 * "sentinel" entry with the same URL. A back swipe/back button then lands on the page entry (same URL, so the hash
 * router sees no hashchange and nothing navigates); we see that popstate and leave full screen. If full screen ends any
 * other way (Esc, the browser's own exit, the button) the sentinel is still on top, so we drop it with one history.back().
 * In-app hash navigation while in full screen pushes a new entry; we put a fresh sentinel on top of that one as well.
 *
 * The environment is injectable so the logic can be unit tested without a browser.
 */

const TAG = '__studyFs';
type Tagged = { [TAG]?: 'page' | 'fs' } & Record<string, unknown>;

export interface FsDoc {
  documentElement: any;
  fullscreenElement?: unknown; webkitFullscreenElement?: unknown;
  fullscreenEnabled?: boolean; webkitFullscreenEnabled?: boolean;
  exitFullscreen?: () => Promise<void> | void; webkitExitFullscreen?: () => void;
  addEventListener(t: string, f: (e: any) => void, o?: any): void; removeEventListener(t: string, f: (e: any) => void, o?: any): void;
}
export interface FsWin {
  addEventListener(t: string, f: (e: any) => void, o?: any): void; removeEventListener(t: string, f: (e: any) => void, o?: any): void;
}
export interface FsHist { state: unknown; pushState(s: unknown, t: string, u?: string): void; replaceState(s: unknown, t: string, u?: string): void; back(): void }
export interface FsEnv { doc: FsDoc; win: FsWin; hist: FsHist; href: () => string }

export interface FullscreenController {
  /** the browser can do element full screen (false on iPhone Safari) */
  readonly supported: boolean;
  isFull(): boolean;
  toggle(): Promise<void>;
  enter(): Promise<void>;
  exit(): void;
  onChange(cb: (full: boolean) => void): () => void;
  destroy(): void;
}

let activeCount = 0;
/** True while a controller is in full screen: code that rewrites the URL in place should skip it (see replaceUrl). */
export const fullscreenActive = (): boolean => activeCount > 0;
/** history.replaceState for the current entry, skipped while in full screen so it can never rewrite the sentinel entry. Keeps any history state. */
export function replaceUrl(url: string): void {
  if (fullscreenActive()) return;
  history.replaceState(history.state, '', url);
}

const EDGE_PX = 20, SWIPE_PX = 56;

export function createFullscreen(env?: FsEnv): FullscreenController {
  const e: FsEnv = env ?? { doc: document as unknown as FsDoc, win: window as unknown as FsWin, hist: history as unknown as FsHist, href: () => location.href };
  const { doc, win, hist } = e;
  const el = () => doc.documentElement;
  const supported = !!(el() && (el().requestFullscreen || el().webkitRequestFullscreen)) && (doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled) !== false;
  const isFull = () => !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);

  let sentinelTop = false; // our extra history entry is the current one
  let leaving = false;     // a back swipe already consumed the sentinel; full screen is on its way out
  let counted = false;
  const listeners = new Set<(full: boolean) => void>();
  const notify = () => { for (const cb of listeners) { try { cb(isFull()); } catch { /* a bad listener must not break full screen */ } } };
  const setActive = (on: boolean) => { if (on && !counted) { counted = true; activeCount++; } else if (!on && counted) { counted = false; activeCount--; } };

  const stateOf = (): Tagged => (hist.state && typeof hist.state === 'object' ? { ...(hist.state as Tagged) } : {});
  function ensureSentinel() {
    if (leaving) return;
    if ((hist.state as Tagged | null)?.[TAG] === 'fs') { sentinelTop = true; return; }
    hist.replaceState({ ...stateOf(), [TAG]: 'page' }, '', e.href());
    hist.pushState({ [TAG]: 'fs' }, '', e.href());
    sentinelTop = true;
  }

  function onFsChange() {
    if (isFull()) { setActive(true); leaving = false; ensureSentinel(); }
    else {
      setActive(false);
      if (sentinelTop) { sentinelTop = false; hist.back(); } // Esc / browser exit: drop the sentinel, same URL so nothing re-routes
      leaving = false;
    }
    notify();
  }
  function onPopState(ev: { state?: unknown }) {
    if (!isFull()) return;
    const tag = (ev.state as Tagged | null)?.[TAG];
    if (tag === undefined) return; // a new entry made by in-app hash navigation: the hashchange handler adds a sentinel
    if (tag === 'fs') { sentinelTop = true; return; } // arrived on the sentinel itself (e.g. a forward step): stay
    // landed on a page entry: this was a back swipe
    sentinelTop = false; leaving = true;
    exit();
  }
  function onHashChange() { if (isFull() && !leaving) ensureSentinel(); }

  // edge-swipe fallback: a rightward swipe that starts on the left edge leaves full screen (for browsers whose back gesture does not reach popstate)
  let t0: { x: number; y: number; done: boolean } | null = null;
  function onTouchStart(ev: any) {
    const t = ev.touches?.[0]; t0 = null;
    if (!isFull() || !t || ev.touches.length !== 1) return;
    if (t.clientX <= EDGE_PX) t0 = { x: t.clientX, y: t.clientY, done: false };
  }
  function onTouchMove(ev: any) {
    const t = ev.touches?.[0];
    if (!t0 || t0.done || !t || !isFull()) return;
    const dx = t.clientX - t0.x, dy = Math.abs(t.clientY - t0.y);
    if (dx >= SWIPE_PX && dy < dx * 0.6) { t0.done = true; exit(); }
  }
  const onTouchEnd = () => { t0 = null; };

  async function enter() {
    if (!supported || isFull()) return;
    try {
      const r = el().requestFullscreen ? el().requestFullscreen({ navigationUI: 'hide' }) : el().webkitRequestFullscreen();
      if (r && typeof r.then === 'function') await r;
    } catch { /* denied (no user gesture, policy): stay as we are */ }
  }
  function exit() {
    try { const r = doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.(); if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {}); } catch { /* already out */ }
  }

  const fsEvents = ['fullscreenchange', 'webkitfullscreenchange'];
  if (supported) {
    for (const t of fsEvents) doc.addEventListener(t, onFsChange);
    win.addEventListener('popstate', onPopState);
    win.addEventListener('hashchange', onHashChange);
    doc.addEventListener('touchstart', onTouchStart, { passive: true });
    doc.addEventListener('touchmove', onTouchMove, { passive: true });
    doc.addEventListener('touchend', onTouchEnd, { passive: true });
    doc.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  return {
    supported,
    isFull,
    enter,
    exit,
    toggle: async () => { if (isFull()) exit(); else await enter(); },
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    destroy() {
      for (const t of fsEvents) doc.removeEventListener(t, onFsChange);
      win.removeEventListener('popstate', onPopState); win.removeEventListener('hashchange', onHashChange);
      doc.removeEventListener('touchstart', onTouchStart); doc.removeEventListener('touchmove', onTouchMove);
      doc.removeEventListener('touchend', onTouchEnd); doc.removeEventListener('touchcancel', onTouchEnd);
      setActive(false); listeners.clear();
    },
  };
}
