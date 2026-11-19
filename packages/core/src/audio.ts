/**
 * Opt-in sound examples (Web Audio, generated in the browser: no audio files, works offline in the single-file page).
 *
 * Safety rules built in: nothing is created or played until the reader presses a Play button (the AudioContext is made
 * inside that click); every clip is short and normalised to a low peak (−20 dBFS by default) before the master volume;
 * one Stop button (on every player) silences everything. An app opts in by passing `audio: { id: AudioDef }` to mountApp and
 * naming ids in a map box's `pop.audio`.
 */
import { h } from './dom';
import { fitCanvas } from './plot';
import { normalizePeak, fadeEnds } from './audioDsp';

export interface AudioControl { key: string; label: string; min: number; max: number; step: number; value: number; fmt?: (v: number) => string }
export interface AudioDef {
  /** text on the Play button */
  label: string;
  /** one line under the player */
  note?: string;
  controls?: AudioControl[];
  /** mono samples at rate fs, any scale (they are normalised to peakDb); keep it short (≤ ~8 s) */
  render(fs: number, v: Record<string, number>): Float32Array;
  peakDb?: number;
  /** optional plot redrawn while playing (t = seconds since start, or null when stopped) */
  view?: { aspect: number; maxWidth?: number; alt: string; draw(g: CanvasRenderingContext2D, w: number, h: number, v: Record<string, number>, t: number | null): void };
}
export type AudioRegistry = Record<string, AudioDef>;

const MAX_SECONDS = 8;
let ctx: AudioContext | null = null, master: GainNode | null = null, volume = 0.5;
const live = new Set<AudioBufferSourceNode>(), listeners = new Set<() => void>();
const stats = { contextCreated: false, started: 0, stopped: 0 };
declare global { interface Window { __studyAudio?: { stats: typeof stats; playing: () => number; volume: () => number } } }
if (typeof window !== 'undefined') window.__studyAudio = { stats, playing: () => live.size, volume: () => volume };

function engine(): { ctx: AudioContext; master: GainNode } {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C(); master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination); stats.contextCreated = true;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, master: master! };
}
const notify = () => listeners.forEach((f) => f());
/** Stop every sound now. */
export function stopAllAudio() { for (const s of [...live]) { try { s.stop(); } catch { /* already stopped */ } } live.clear(); stats.stopped++; notify(); }
export function setMasterVolume(v: number) { volume = Math.max(0, Math.min(1, v)); if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02); notify(); }
/** Play mono samples (normalised to peakDb dBFS before the master volume). Only call from a user gesture. */
export function playSamples(x: Float32Array, fs: number, peakDb = -20): { start: number; duration: number; source: AudioBufferSourceNode } {
  const { ctx: c, master: m } = engine();
  const n = Math.min(x.length, Math.round(fs * MAX_SECONDS)), y = normalizePeak(fadeEnds(x.slice(0, n), fs), Math.min(peakDb, -6));
  const buf = c.createBuffer(1, n, fs); buf.getChannelData(0).set(y);
  const src = c.createBufferSource(); src.buffer = buf; src.connect(m);
  src.onended = () => { live.delete(src); notify(); };
  const start = c.currentTime + 0.02; src.start(start); live.add(src); stats.started++; notify();
  return { start, duration: n / fs, source: src };
}

/** A compact player: Play, Stop, master volume, the clip's sliders, and an optional live plot. */
export function mountAudio(id: string, registry: AudioRegistry | undefined): { el: HTMLElement; destroy(): void } {
  const def = registry?.[id];
  if (!def) return { el: h('div', { class: 'aud missing', dataset: { testid: 'audio-missing' } }, `[sound “${id}” is not available in this build]`), destroy() {} };
  const v: Record<string, number> = {}; for (const c of def.controls ?? []) v[c.key] = c.value;
  let mine: AudioBufferSourceNode | null = null, t0 = 0, dur = 0, raf = 0;
  const play = h('button', { class: 'tbtn aud-play', type: 'button', dataset: { testid: 'audio-play' } }, '▶ ' + def.label);
  const stop = h('button', { class: 'tbtn aud-stop', type: 'button', dataset: { testid: 'audio-stop' }, 'aria-label': 'Stop all sound' }, '■ Stop');
  const vol = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(volume), 'aria-label': 'Master volume', dataset: { testid: 'audio-volume' } }) as HTMLInputElement;
  const rows: HTMLElement[] = [];
  for (const c of def.controls ?? []) {
    const out = h('output', null, c.fmt ? c.fmt(c.value) : String(c.value));
    const r = h('input', { type: 'range', min: String(c.min), max: String(c.max), step: String(c.step), value: String(c.value), 'aria-label': c.label, dataset: { testid: 'audio-ctl', key: c.key } }) as HTMLInputElement;
    r.addEventListener('input', () => { v[c.key] = +r.value; out.textContent = c.fmt ? c.fmt(v[c.key]) : r.value; redraw(); if (mine) start(); });
    rows.push(h('label', { class: 'aud-ctl' }, h('span', null, c.label), r, out));
  }
  let cv: HTMLCanvasElement | null = null;
  if (def.view) { cv = h('canvas', { role: 'img', 'aria-label': def.view.alt, dataset: { testid: 'audio-view' } }) as HTMLCanvasElement; cv.style.cssText = `display:block;width:100%;max-width:${def.view.maxWidth ?? 440}px;aspect-ratio:${def.view.aspect};margin:.2rem auto`; }
  const t = () => (mine && ctx ? Math.max(0, ctx.currentTime - t0) : null);
  function redraw() { if (!cv || !def!.view) return; const f = fitCanvas(cv); def!.view.draw(f.g, f.w, f.h, v, t()); }
  function tick() { redraw(); if (mine && ctx && ctx.currentTime - t0 < dur + 0.05) raf = requestAnimationFrame(tick); }
  function start() {
    if (mine) { try { mine.stop(); } catch { /* */ } live.delete(mine); }
    const { ctx: c } = engine(); const p = playSamples(def!.render(c.sampleRate, v), c.sampleRate, def!.peakDb ?? -20);
    mine = p.source; t0 = p.start; dur = p.duration; const me = mine;
    me.addEventListener('ended', () => { if (mine === me) { mine = null; play.classList.remove('on'); redraw(); } });
    play.classList.add('on'); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  play.addEventListener('click', start);
  stop.addEventListener('click', () => { stopAllAudio(); });
  vol.addEventListener('input', () => setMasterVolume(+vol.value));
  const sync = () => { vol.value = String(volume); if (mine && !live.has(mine)) { mine = null; play.classList.remove('on'); cancelAnimationFrame(raf); redraw(); } };
  listeners.add(sync);
  const el = h('div', { class: 'aud', dataset: { testid: 'audio', audio: id } },
    h('div', { class: 'aud-bar' }, play, stop, h('label', { class: 'aud-vol' }, h('span', null, 'Volume'), vol)), ...rows, ...(cv ? [cv] : []),
    def.note ? h('p', { class: 'aud-note' }, def.note) : null);
  let ro: ResizeObserver | null = null; if (cv) { ro = new ResizeObserver(redraw); ro.observe(cv); window.addEventListener('study-theme', redraw); }
  return { el, destroy() { listeners.delete(sync); cancelAnimationFrame(raf); if (mine) { try { mine.stop(); } catch { /* */ } live.delete(mine); } ro?.disconnect(); window.removeEventListener('study-theme', redraw); } };
}

/** The hook an app passes to mountApp({ audio: audioHook(registry) }). */
export const audioHook = (registry: AudioRegistry) => ({ mount: (id: string) => mountAudio(id, registry) });
