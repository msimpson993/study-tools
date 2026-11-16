import { describe, it, expect } from 'vitest';
import { createFullscreen, fullscreenActive, type FsEnv } from '../src/fullscreen';

/** A tiny browser: event targets, a history stack with pushState/back/forward, and an element full-screen switch. */
function world(opts: { supported?: boolean; startHash?: string } = {}) {
  const listeners: Record<string, ((e: any) => void)[]> = {};
  const add = (t: string, f: (e: any) => void) => { (listeners[t] ??= []).push(f); };
  const remove = (t: string, f: (e: any) => void) => { listeners[t] = (listeners[t] ?? []).filter((x) => x !== f); };
  const fire = (t: string, e: any = {}) => { for (const f of [...(listeners[t] ?? [])]) f(e); };
  const entries: { url: string; state: unknown }[] = [{ url: opts.startHash ?? '#/', state: null }];
  let idx = 0;
  const w = {
    full: false,
    get url() { return entries[idx].url; },
    entries, get idx() { return idx; },
    hashRoutes: [] as string[], // what the hash router would have seen (it listens to hashchange only)
    popstates: [] as unknown[],
  };
  const traverse = (to: number) => {
    const before = entries[idx].url; idx = to;
    fire('popstate', { state: entries[idx].state }); w.popstates.push(entries[idx].state);
    if (entries[idx].url !== before) { w.hashRoutes.push(entries[idx].url); fire('hashchange'); }
  };
  const hist = {
    get state() { return entries[idx].state; },
    pushState(s: unknown, _t: string, u?: string) { entries.splice(idx + 1); entries.push({ url: u ?? entries[idx].url, state: s }); idx++; },
    replaceState(s: unknown, _t: string, u?: string) { entries[idx] = { url: u ?? entries[idx].url, state: s }; },
    back() { if (idx > 0) { const to = idx - 1; queueMicrotask(() => traverse(to)); } },
  };
  /** the user clicks an in-app link: a new entry is made by the browser (state null), then popstate + hashchange */
  const navigate = (hash: string) => { entries.splice(idx + 1); entries.push({ url: hash, state: null }); idx++; fire('popstate', { state: null }); w.hashRoutes.push(hash); fire('hashchange'); };
  const swipeBack = () => traverse(idx - 1);
  const docEl: any = {};
  if (opts.supported !== false) {
    docEl.requestFullscreen = async () => { w.full = true; queueMicrotask(() => fire('fullscreenchange')); };
  }
  const doc: any = {
    documentElement: docEl,
    get fullscreenElement() { return w.full ? docEl : null; },
    fullscreenEnabled: true,
    exitFullscreen: async () => { w.full = false; queueMicrotask(() => fire('fullscreenchange')); },
    addEventListener: add, removeEventListener: remove,
  };
  const env: FsEnv = { doc, win: { addEventListener: add, removeEventListener: remove }, hist: hist as any, href: () => entries[idx].url };
  const tick = () => new Promise<void>((r) => setTimeout(r, 0));
  return { w, env, hist, navigate, swipeBack, fire, tick, escape: async () => { w.full = false; fire('fullscreenchange'); await new Promise((r) => setTimeout(r, 0)); } };
}

describe('fullscreen controller: support detection', () => {
  it('reports unsupported (and attaches nothing) when the element has no requestFullscreen, like iPhone Safari', () => {
    const k = world({ supported: false }); const c = createFullscreen(k.env);
    expect(c.supported).toBe(false);
    return c.toggle().then(() => { expect(k.w.full).toBe(false); expect(k.w.entries.length).toBe(1); c.destroy(); });
  });
  it('also works with the webkit-prefixed API', async () => {
    const k = world({ supported: false });
    let on = false;
    k.env.doc.documentElement.webkitRequestFullscreen = () => { on = true; Object.defineProperty(k.env.doc, 'webkitFullscreenElement', { get: () => (on ? 1 : null), configurable: true }); queueMicrotask(() => k.fire('webkitfullscreenchange')); };
    (k.env.doc as any).webkitExitFullscreen = () => { on = false; queueMicrotask(() => k.fire('webkitfullscreenchange')); };
    delete (k.env.doc as any).exitFullscreen;
    const c = createFullscreen(k.env); expect(c.supported).toBe(true);
    await c.toggle(); await k.tick(); expect(c.isFull()).toBe(true); expect(k.w.entries.length).toBe(2);
    await c.toggle(); await k.tick(); await k.tick(); expect(c.isFull()).toBe(false); expect(k.w.idx).toBe(0);
    c.destroy();
  });
  it('a rejected requestFullscreen does not throw and leaves history alone', async () => {
    const k = world(); k.env.doc.documentElement.requestFullscreen = () => Promise.reject(new Error('denied'));
    const c = createFullscreen(k.env); await expect(c.enter()).resolves.toBeUndefined(); expect(k.w.entries.length).toBe(1); c.destroy();
  });
});

describe('fullscreen controller: sentinel history entry', () => {
  it('entering pushes one same-URL sentinel and tags the page entry; the router sees nothing', async () => {
    const k = world({ startHash: '#/dive/model' }); const c = createFullscreen(k.env); const seen: boolean[] = []; c.onChange((f) => seen.push(f));
    await c.toggle(); await k.tick();
    expect(k.w.entries.map((e) => e.url)).toEqual(['#/dive/model', '#/dive/model']);
    expect((k.w.entries[0].state as any).__studyFs).toBe('page'); expect((k.w.entries[1].state as any).__studyFs).toBe('fs');
    expect(k.w.hashRoutes).toEqual([]); expect(fullscreenActive()).toBe(true); expect(seen).toEqual([true]);
    c.destroy(); expect(fullscreenActive()).toBe(false);
  });
  it('the button again exits and drops the sentinel without any route change', async () => {
    const k = world({ startHash: '#/dive/model' }); const c = createFullscreen(k.env);
    await c.toggle(); await k.tick(); await c.toggle(); await k.tick(); await k.tick();
    expect(c.isFull()).toBe(false); expect(k.w.idx).toBe(0); expect(k.w.url).toBe('#/dive/model'); expect(k.w.hashRoutes).toEqual([]); c.destroy();
  });
  it('Esc / browser exit drops the sentinel the same way, so one real back press goes to the previous page', async () => {
    const k = world({ startHash: '#/' }); const c = createFullscreen(k.env);
    k.navigate('#/dive/model'); k.w.hashRoutes.length = 0;
    await c.toggle(); await k.tick();
    await k.escape(); await k.tick();
    expect(k.w.idx).toBe(1); expect(k.w.url).toBe('#/dive/model'); expect(k.w.hashRoutes).toEqual([]);
    k.swipeBack(); expect(k.w.url).toBe('#/'); // exactly one step back, no leftover duplicate
    c.destroy();
  });
  it('a back swipe in full screen leaves full screen, stays on the same page, and does not re-route', async () => {
    const k = world({ startHash: '#/dive/model' }); const c = createFullscreen(k.env);
    await c.toggle(); await k.tick();
    k.swipeBack(); await k.tick(); await k.tick();
    expect(c.isFull()).toBe(false); expect(k.w.url).toBe('#/dive/model'); expect(k.w.hashRoutes).toEqual([]);
    expect(k.w.entries.length).toBe(2); // sentinel stays as a forward entry only; no extra push after leaving
    expect(k.w.idx).toBe(0); c.destroy();
  });
  it('in-app navigation in full screen works, gets its own sentinel, and the next back swipe still exits cleanly on the new page', async () => {
    const k = world({ startHash: '#/' }); const c = createFullscreen(k.env);
    await c.toggle(); await k.tick();
    k.navigate('#/dive/fb'); // router runs on hashchange
    expect(k.w.hashRoutes).toEqual(['#/dive/fb']);
    expect(c.isFull()).toBe(true); expect(k.w.entries.map((e) => (e.state as any)?.__studyFs)).toEqual(['page', 'fs', 'page', 'fs']);
    k.navigate('#/dive/ctrl'); expect(k.w.hashRoutes).toEqual(['#/dive/fb', '#/dive/ctrl']);
    k.hist.back(); await k.tick(); await k.tick();
    expect(c.isFull()).toBe(false); expect(k.w.url).toBe('#/dive/ctrl'); expect(k.w.hashRoutes).toEqual(['#/dive/fb', '#/dive/ctrl']); // no navigation caused by the swipe
    c.destroy();
  });
  it('entering again after leaving starts fresh (no second sentinel pile-up)', async () => {
    const k = world({ startHash: '#/' }); const c = createFullscreen(k.env);
    await c.toggle(); await k.tick(); k.swipeBack(); await k.tick();
    await c.toggle(); await k.tick();
    expect(k.w.entries.length).toBe(2); expect(k.w.idx).toBe(1); c.destroy();
  });
  it('popstate when not in full screen is ignored', async () => {
    const k = world({ startHash: '#/' }); const c = createFullscreen(k.env);
    k.navigate('#/x'); k.hist.back(); await k.tick(); expect(k.w.entries.length).toBe(2); expect(k.w.full).toBe(false); c.destroy();
  });
});

describe('fullscreen controller: left-edge swipe fallback', () => {
  const touch = (x: number, y: number) => ({ touches: [{ clientX: x, clientY: y }] });
  it('a rightward swipe from the left edge exits; one that starts mid-screen, a vertical one and a short one do not', async () => {
    const k = world(); const c = createFullscreen(k.env); await c.toggle(); await k.tick();
    k.fire('touchstart', touch(120, 300)); k.fire('touchmove', touch(260, 300)); expect(k.w.full).toBe(true);
    k.fire('touchstart', touch(8, 300)); k.fire('touchmove', touch(20, 300)); expect(k.w.full).toBe(true);
    k.fire('touchstart', touch(8, 300)); k.fire('touchmove', touch(40, 380)); expect(k.w.full).toBe(true);
    k.fire('touchstart', touch(8, 300)); k.fire('touchmove', touch(90, 310));
    await k.tick(); await k.tick(); expect(k.w.full).toBe(false);
    expect(k.w.idx).toBe(0); expect(k.w.hashRoutes).toEqual([]); // sentinel dropped, no navigation
    c.destroy();
  });
  it('does nothing outside full screen', async () => {
    const k = world(); const c = createFullscreen(k.env);
    k.fire('touchstart', touch(8, 300)); k.fire('touchmove', touch(120, 300)); await k.tick(); expect(k.w.entries.length).toBe(1); c.destroy();
  });
});
