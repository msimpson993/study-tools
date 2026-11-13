import { h } from './dom';
import type { ControlDef, PresetDef } from './types';

export type Values = Record<string, number | string | boolean>;

/**
 * Declarative controls. Presets are partial assignments of these *visible* controls (so every example is reachable by hand),
 * state can be serialised to / restored from a URL query string, and "reset" always exists.
 */
export class ControlSet {
  values: Values = {};
  private inputs = new Map<string, { sync(): void; wrap: HTMLElement }>();
  private listeners = new Set<(changed: string | null) => void>();
  private presetBtns = new Map<string, HTMLButtonElement>();
  active: string | null = null;
  constructor(public defs: ControlDef[], public presets: PresetDef[] = []) { this.reset(false); }

  onChange(fn: (changed: string | null) => void) { this.listeners.add(fn); }
  private emit(k: string | null) { this.syncAll(); this.listeners.forEach((f) => f(k)); }

  set(k: string, v: number | string | boolean) {
    const d = this.defs.find((x) => x.id === k);
    if (!d) throw new Error(`unknown control ${k}`);
    if (d.type === 'range') { const n = Number(v); v = Math.min(d.max ?? n, Math.max(d.min ?? n, n)); }
    this.values[k] = v;
    this.active = this.presets.find((p) => this.matches(p))?.id ?? null;
    this.emit(k);
  }
  reset(emit = true) {
    for (const d of this.defs) this.values[d.id] = d.default;
    this.active = null;
    if (emit) this.emit(null);
  }
  private matches(p: PresetDef): boolean {
    const base: Values = Object.fromEntries(this.defs.map((d) => [d.id, d.default]));
    const want = { ...base, ...p.set };
    return this.defs.every((d) => typeof want[d.id] === 'number' ? Math.abs((this.values[d.id] as number) - (want[d.id] as number)) < 1e-9 : this.values[d.id] === want[d.id]);
  }
  applyPreset(id: string) {
    const p = this.presets.find((x) => x.id === id);
    if (!p) return;
    this.reset(false);
    for (const [k, v] of Object.entries(p.set)) this.values[k] = v;
    this.active = id;
    this.emit(null);
  }
  /** Only values that differ from defaults, as a query string. */
  serialize(): string {
    const q = new URLSearchParams();
    for (const d of this.defs) if (this.values[d.id] !== d.default) q.set(d.id, String(this.values[d.id]));
    return q.toString();
  }
  restore(query: string) {
    const q = new URLSearchParams(query);
    this.reset(false);
    const pre = q.get('preset');
    if (pre && this.presets.some((p) => p.id === pre)) { for (const [k, v] of Object.entries(this.presets.find((p) => p.id === pre)!.set)) this.values[k] = v; }
    for (const d of this.defs) {
      const raw = q.get(d.id);
      if (raw === null) continue;
      this.values[d.id] = d.type === 'range' ? Number(raw) : d.type === 'toggle' ? raw === 'true' : raw;
    }
    this.active = this.presets.find((p) => this.matches(p))?.id ?? null;
    this.emit(null);
  }
  private syncAll() { this.inputs.forEach((i) => i.sync()); this.presetBtns.forEach((b, id) => b.classList.toggle('on', id === this.active)); }

  /** Render the control rail: presets, primary controls, a collapsed "More controls" drawer, and Reset. */
  render(title = 'Controls'): HTMLElement {
    const root = h('div', { class: 'st-ctl', dataset: { testid: 'controls' } }, h('h4', null, title));
    if (this.presets.length) {
      const row = h('div', { class: 'st-presets', role: 'group', 'aria-label': 'Presets' });
      for (const p of this.presets) {
        const b = h('button', { dataset: { preset: p.id }, title: p.about ? p.about.replace(/<[^>]+>/g, '') : '', onclick: () => this.applyPreset(p.id) }, p.label);
        this.presetBtns.set(p.id, b); row.append(b);
      }
      root.append(row);
    }
    const more = h('div', { class: 'morebody' });
    for (const d of this.defs) (d.group === 'primary' ? root : more).append(this.control(d));
    if (this.defs.some((d) => d.group === 'more')) root.append(h('details', { class: 'st-more', dataset: { testid: 'more-controls' } }, h('summary', null, 'More controls'), more));
    root.append(h('div', { class: 'actions' }, h('button', { class: 'tbtn', dataset: { testid: 'reset' }, onclick: () => this.reset() }, 'Reset')));
    this.syncAll();
    return root;
  }

  private control(d: ControlDef): HTMLElement {
    const wrap = h('div');
    const fmt = (v: number) => String(+v.toFixed(6));
    if (d.type === 'range') {
      const num = h('input', { type: 'number', class: 'num', min: d.min, max: d.max, step: 'any', inputmode: 'decimal', 'aria-label': `${d.label} value`, dataset: { n: d.id } });
      const rng = h('input', { type: 'range', min: d.min, max: d.max, step: d.step ?? 'any', 'aria-label': d.label, dataset: { k: d.id } });
      rng.addEventListener('input', () => this.set(d.id, Number(rng.value)));
      num.addEventListener('change', () => { const n = Number(num.value); if (Number.isFinite(n)) this.set(d.id, n); else this.syncAll(); });
      wrap.append(h('label', null, `${d.label}${d.unit ? ` (${d.unit})` : ''}`, num), rng);
      this.inputs.set(d.id, { wrap, sync: () => { const v = this.values[d.id] as number; if (document.activeElement !== num) num.value = fmt(v); rng.value = String(v); } });
    } else if (d.type === 'select') {
      const sel = h('select', { 'aria-label': d.label, dataset: { k: d.id } }, ...(d.options ?? []).map((o) => h('option', { value: o.value }, o.label)));
      sel.addEventListener('change', () => this.set(d.id, sel.value));
      wrap.append(h('label', null, d.label), sel);
      this.inputs.set(d.id, { wrap, sync: () => { sel.value = String(this.values[d.id]); } });
    } else if (d.type === 'seg') {
      const seg = h('div', { class: 'st-seg', dataset: { k: d.id } });
      const btns = (d.options ?? []).map((o) => h('button', { dataset: { v: o.value }, onclick: () => this.set(d.id, o.value) }, o.label));
      seg.append(...btns);
      wrap.append(h('label', null, d.label), seg);
      this.inputs.set(d.id, { wrap, sync: () => btns.forEach((b) => b.classList.toggle('on', b.dataset.v === String(this.values[d.id]))) });
    } else {
      const cb = h('input', { type: 'checkbox', dataset: { k: d.id } });
      cb.addEventListener('change', () => this.set(d.id, cb.checked));
      wrap.append(h('label', null, cb, ` ${d.label}`));
      this.inputs.set(d.id, { wrap, sync: () => { cb.checked = !!this.values[d.id]; } });
    }
    return wrap;
  }
}
