/** Restrict machine/script pickers and presets to the current problem tab. */
import type { ControlSet } from '@study/core';

export function currentTab(host: HTMLElement): string | undefined {
  return host.closest<HTMLElement>('[data-testid="tab-page"]')?.dataset.tab
    ?? /#\/tab\/([^/?]+)/.exec(location.hash ?? '')?.[1];
}

const LOOP: Record<string, { machine: string[]; presets: string[] }> = {
  motor: { machine: ['motor-open', 'motor-closed'], presets: ['motor-open', 'motor-closed'] },
  borer: { machine: ['borer'], presets: ['borer'] },
  disk: { machine: ['disk'], presets: ['disk'] },
  engine: { machine: ['engine'], presets: ['engine'] },
};

const BLOCKS: Record<string, { script: string[]; presets: string[] }> = {
  motor: { script: ['motor-open', 'motor-closed'], presets: ['motoropen', 'motorclosed'] },
  borer: { script: ['borer-step', 'borer-push'], presets: ['borerstep', 'borerpush'] },
  disk: { script: ['disk-seek', 'disk-shock'], presets: ['diskseek', 'diskshock'] },
};

const TRADEOFF: Record<string, { machine: string[]; presets: string[] }> = {
  borer: { machine: ['boring machine'], presets: ['borer', 'ten'] },
  disk: { machine: ['disk head'], presets: ['disk'] },
};

const SCRIPT_LABEL: Record<string, string> = {
  'motor-open': 'Fig. 4.23 (open loop)',
  'motor-closed': 'Fig. 4.24 (closed loop)',
  'borer-step': 'Fig. 4.25 (command step)',
  'borer-push': 'Fig. 4.26 (rock push)',
  'disk-seek': 'Fig. 4.30 (disk seek)',
  'disk-shock': 'Fig. 4.31 (disk shock)',
};

const MACHINE_LABEL: Record<string, string> = {
  'motor-open': 'motor, no feedback',
  'motor-closed': 'motor with tachometer',
  borer: 'boring machine',
  disk: 'disk head',
  engine: 'engine model',
};

function optionValue(o: { value: string; label: string } | string): string {
  return typeof o === 'string' ? o : o.value;
}

/** Filter a live ControlSet to the current tab's machine (Overview and unknown tabs keep everything). */
export function applyTabLocalControls(figureId: string, host: HTMLElement, controls: ControlSet): void {
  const tab = currentTab(host);
  if (!tab) return;
  let presets: string[] | undefined;
  let options: Record<string, string[]> | undefined;
  if (figureId === 'loop' && LOOP[tab]) {
    presets = LOOP[tab].presets;
    options = { machine: LOOP[tab].machine };
  } else if (figureId === 'blocks' && BLOCKS[tab]) {
    presets = BLOCKS[tab].presets;
    options = { script: BLOCKS[tab].script };
  } else if (figureId === 'tradeoff' && TRADEOFF[tab]) {
    presets = TRADEOFF[tab].presets;
    options = { machine: TRADEOFF[tab].machine };
  } else {
    return;
  }
  if (presets) controls.presets = controls.presets.filter((p) => presets!.includes(p.id));
  if (options) {
    controls.defs = controls.defs.map((d) => {
      const keep = options![d.id];
      if (!keep || !d.options) return d;
      const filtered = d.options.filter((o) => keep.includes(optionValue(o)));
      const first = filtered[0] ? optionValue(filtered[0]) : undefined;
      const defOk = keep.includes(String(d.default));
      if (first !== undefined && !keep.includes(String(controls.values[d.id] ?? ''))) controls.values[d.id] = first;
      return { ...d, options: filtered, default: defOk ? d.default : (first ?? d.default) };
    });
  }
  const relabel = (id: string, map: Record<string, string>) => {
    const d = controls.defs.find((x) => x.id === id);
    if (!d?.options) return;
    d.options = d.options.map((o) => {
      const value = optionValue(o);
      return { value, label: map[value] ?? (typeof o === 'string' ? o : o.label) };
    });
  };
  if (figureId === 'loop') relabel('machine', MACHINE_LABEL);
  if (figureId === 'blocks') relabel('script', SCRIPT_LABEL);
}
