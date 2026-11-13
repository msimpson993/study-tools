/**
 * Example scenes: the catalogue (pure data, no DOM, so the content builder can validate against it).
 * A scene is an animated drawing of a subject's running example. A content file picks which OVERLAYS to switch on;
 * each overlay names one thing the node adds (forces, the state dot, the impulse hammer, the sample clock, …).
 * Drawing lives in scene.ts.
 */
export type InsetKind = 'trace' | 'phase' | 'poles' | 'spectrum' | 'zplane';
export interface OverlayInfo {
  id: string;
  /** short name shown in the caption */
  label: string;
  /** what it shows and why (one sentence; also used as the figure's accessible description) */
  says: string;
  /** which small panel under the main picture this overlay switches on (at most MAX_INSETS distinct ones per scene) */
  inset?: InsetKind;
}
export interface SceneInfo {
  id: string;
  title: string;
  /** physical description, used as the base alt text */
  physical: string;
  overlays: OverlayInfo[];
  /** overlays used when a content file names none */
  defaults: string[];
}
export const MAX_INSETS = 2;

export const SCENES: Record<string, SceneInfo> = {
  cart: {
    id: 'cart',
    title: 'The cart on a spring and a damper',
    physical: 'A 1 kg cart on a track, tied to a wall by a spring (k = 2 N/m) and a damper (c = 3 N·s/m). Position x is measured from where the spring is relaxed.',
    defaults: ['forces'],
    overlays: [
      { id: 'forces', label: 'forces', says: 'The three forces on the cart: spring −kx, damper −cẋ and the push u. Their sum is m·ẍ.' },
      { id: 'trace', label: 'x(t)', says: 'The position over time, drawn as the cart moves.', inset: 'trace' },
      { id: 'phase', label: 'state (x, ẋ)', says: 'The state vector (x, ẋ) as a dot in the plane of position and velocity.', inset: 'phase' },
      { id: 'flow', label: 'what A does', says: 'The arrows ẋ = Ax: at every state, where A sends it next.', inset: 'phase' },
      { id: 'modes', label: 'modes', says: 'The two eigen-directions of A, and the state split into its two modal parts, each decaying on its own.', inset: 'phase' },
      { id: 'critical', label: 'critical damping', says: 'Same cart with the damper at c = 2√2: the two poles merge into one repeated pole (Jordan block).', inset: 'phase' },
      { id: 'reach', label: 'where u can push', says: 'The directions B and AB: the push acts on the velocity, and the spring turns that into position.', inset: 'phase' },
      { id: 'observe', label: 'what y sees', says: 'The position sensor reads x only. The velocity is hidden from it, but x(t) over time still reveals it.', inset: 'phase' },
      { id: 'sensor', label: 'sensor C', says: 'The position sensor: y = Cx with C = (1 0).' },
      { id: 'push', label: 'push u', says: 'A constant 1 N push switched on at t = 0.5 s.', inset: 'trace' },
      { id: 'hammer', label: 'impulse', says: 'A hammer strike: all the push arrives at once (1 N·s), so the velocity jumps to 1 m/s and then the cart rings down.', inset: 'trace' },
      { id: 'shaker', label: 'sine shaker', says: 'A sinusoidal force u = sin(ωt) with ω = 1.5 rad/s: after the transient the cart moves at the same frequency, scaled and delayed.', inset: 'trace' },
      { id: 'clock', label: 'sample clock', says: 'A clock reads the position every T = 0.5 s and holds the value between ticks (zero-order hold).', inset: 'trace' },
      { id: 'poles', label: 'poles', says: 'The eigenvalues of A (poles of G) in the s-plane.', inset: 'poles' },
    ],
  },
  tine: {
    id: 'tine',
    title: 'The plucked tine and its sampler',
    physical: 'A plucked tine rings and decays: x(t) = e^(−σt) cos(ω_d t) with σ = 0.6 s⁻¹ and f₀ = 1 Hz. A clock samples the tip at fs = 8 Hz.',
    defaults: ['envelope'],
    overlays: [
      { id: 'envelope', label: 'decay e^{−σt}', says: 'The envelope e^(−σt) that the ringing fits inside.' },
      { id: 'sampler', label: 'sampler fs = 8 Hz', says: 'A clock reads the tip every T = 1/fs = 125 ms: the stems are the samples x[n] = x(nT).' },
      { id: 'window', label: 'finite record', says: 'Keep only M = 16 samples (2 s) and fade the ends with a window: the record is all the analyser sees.' },
      { id: 'poles', label: 's-plane poles', says: 'The pole pair −σ ± jω_d: σ is how fast it decays, ω_d how fast it rings.', inset: 'poles' },
      { id: 'spectrum', label: 'spectrum', says: 'The spectrum: a peak at ±f₀ whose width is about σ/π. With the sampler on, it repeats every fs.', inset: 'spectrum' },
      { id: 'zpoles', label: 'z-plane poles', says: 'The same poles after sampling: z = e^(pT), radius e^(−σT), angle 2πf₀/fs.', inset: 'zplane' },
    ],
  },
};

/** What a content file may say: `exampleScene: { overlays: [...], caption?: "…" }` on a dive or a map node. */
export interface ExampleSceneRef { overlays?: string[]; caption?: string }
/** What subject.yaml may say: `runningExample.scene: { id: cart, overlays: [...] }` (overlays = the small hero on the map page). */
export interface SubjectSceneRef { id: string; overlays?: string[] }

export const insetsOf = (scene: string, overlays: string[]): InsetKind[] => {
  const info = SCENES[scene]; if (!info) return [];
  const out: InsetKind[] = [];
  for (const id of overlays) { const k = info.overlays.find((o) => o.id === id)?.inset; if (k && !out.includes(k)) out.push(k); }
  return out;
};

/** Human-readable problems with a scene reference (empty = fine). Used by the content builder. */
export function sceneProblems(scene: string, overlays: string[] | undefined, where: string): string[] {
  const info = SCENES[scene];
  if (!info) return [`${where}: unknown scene "${scene}" (known: ${Object.keys(SCENES).join(', ')})`];
  const p: string[] = [];
  const known = new Set(info.overlays.map((o) => o.id));
  for (const id of overlays ?? []) if (!known.has(id)) p.push(`${where}: unknown overlay "${id}" for scene "${scene}" (known: ${[...known].join(', ')})`);
  if ((overlays ?? []).length !== new Set(overlays).size) p.push(`${where}: duplicate overlays`);
  const ins = insetsOf(scene, (overlays ?? []).filter((o) => known.has(o)));
  if (ins.length > MAX_INSETS) p.push(`${where}: overlays open ${ins.length} panels (${ins.join(', ')}); at most ${MAX_INSETS} fit, drop one`);
  return p;
}
