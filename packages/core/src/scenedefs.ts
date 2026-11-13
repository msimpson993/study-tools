/**
 * Example scenes: the catalogue (pure data, no DOM, so the content builder can validate against it).
 * A scene is an animated drawing of a subject's running example. A content file picks which OVERLAYS to switch on;
 * each overlay names one thing the node adds (forces, the state dot, the impulse hammer, the sample clock, …).
 * Drawing lives in scene.ts.
 */
export type InsetKind = 'trace' | 'phase' | 'poles' | 'spectrum' | 'zplane' | 'ctrl';
export interface OverlayInfo {
  id: string;
  /** short name shown in the caption */
  label: string;
  /** what it shows and why (one sentence; also used as the figure's accessible description) */
  says: string;
  /** which small panel under the main picture this overlay switches on (at most MAX_INSETS distinct ones per scene) */
  inset?: InsetKind;
  /** overlays this one needs; they are switched on with it (so `noise` alone draws the loop it lives in) */
  implies?: string[];
}
/** A number a content file may set in `exampleScene.params` (validated: known key, within [min, max]). */
export interface ParamInfo { id: string; label: string; says: string; min: number; max: number; default: number; unit?: string }
export interface SceneInfo {
  id: string;
  title: string;
  /** physical description, used as the base alt text */
  physical: string;
  overlays: OverlayInfo[];
  /** scene parameters (only the closed-loop overlays use them) */
  params?: ParamInfo[];
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
      { id: 'poles', label: 'poles', says: 'The eigenvalues of A (poles of G) in the s-plane. With a closed-loop overlay on: the closed-loop poles at the chosen gain, and the path they travel as the gain K grows.', inset: 'poles' },
      { id: 'loop', label: 'feedback loop', says: 'Close the loop: the sensor reads y = x, the error e = r − y goes into a controller C, and C pushes the cart with u = K·e. Offset, speed and ringing all come from K.', inset: 'trace' },
      { id: 'pid', label: 'P, I, D', says: 'The controller split into its three parts: P (K·e, like a spring), I (the running total of e) and D (the rate of change of e, like a damper), and the push u they add up to.', inset: 'ctrl', implies: ['loop'] },
      { id: 'disturb', label: 'shove d', says: 'A steady shove d hits the cart at time t_d. The loop has to push back; the trace shows how far the cart is moved and whether it comes back.', implies: ['loop'] },
      { id: 'noise', label: 'sensor noise', says: 'The sensor reading is y plus random noise. The controller cannot tell, so the noise becomes a jittery push u.', inset: 'ctrl', implies: ['loop'] },
      { id: 'limit', label: 'actuator limit', says: 'The actuator cannot push harder than ±u_max: the demanded u is clipped, drawn as a flat-topped trace, and the cart answers the clipped push, not the demanded one.', inset: 'ctrl', implies: ['loop'] },
      { id: 'delay', label: 'sensor delay', says: 'The sensor reports where the cart was T_d seconds ago. The controller acts on old news and rings.', implies: ['loop'] },
      { id: 'lag', label: 'sensor lag', says: 'A slow sensor: its reading chases the true position with time constant τ, so the controller sees a smoothed, late y.', implies: ['loop'] },
    ],
    params: [
      { id: 'K', label: 'gain K (= Kp)', says: 'Proportional gain: the push per metre of error, in N/m.', min: 0, max: 60, default: 6, unit: 'N/m' },
      { id: 'Ki', label: 'Ki', says: 'Integral gain, in N/(m·s). Default 0 (6 with the pid overlay).', min: 0, max: 60, default: 0, unit: 'N/(m·s)' },
      { id: 'Kd', label: 'Kd', says: 'Derivative gain, in N·s/m. Default 0 (1.5 with the pid overlay).', min: 0, max: 20, default: 0, unit: 'N·s/m' },
      { id: 'r', label: 'target r', says: 'The commanded position, in m.', min: 0.2, max: 2, default: 1, unit: 'm' },
      { id: 'umax', label: 'limit u_max', says: 'Actuator limit ±u_max in N (limit overlay).', min: 0.2, max: 20, default: 2.5, unit: 'N' },
      { id: 'd', label: 'shove d', says: 'Size of the steady shove in N (disturb overlay; negative pushes the other way).', min: -5, max: 5, default: 1, unit: 'N' },
      { id: 'td', label: 't_d', says: 'Time of the shove in s (disturb overlay).', min: 1, max: 8, default: 4, unit: 's' },
      { id: 'noise', label: 'noise σ', says: 'Standard deviation of the sensor noise in m (noise overlay).', min: 0, max: 0.3, default: 0.04, unit: 'm' },
      { id: 'seed', label: 'seed', says: 'Seed of the noise generator, so the same picture comes back every time.', min: 1, max: 1000000, default: 7 },
      { id: 'delay', label: 'delay T_d', says: 'Pure sensor delay in s (delay overlay).', min: 0.02, max: 1, default: 0.3, unit: 's' },
      { id: 'lag', label: 'lag τ', says: 'Sensor time constant in s (lag overlay).', min: 0.02, max: 2, default: 0.4, unit: 's' },
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
export interface ExampleSceneRef { overlays?: string[]; caption?: string; params?: Record<string, number> }
/** What subject.yaml may say: `runningExample.scene: { id: cart, overlays: [...] }` (overlays = the small hero on the map page). */
export interface SubjectSceneRef { id: string; overlays?: string[]; params?: Record<string, number> }

/** Closed-loop overlays (they replace the open-loop drive: push, hammer, shaker, clock … cannot be combined with them). */
export const LOOP_OVERLAYS = ['loop', 'pid', 'disturb', 'noise', 'limit', 'delay', 'lag'] as const;
/** Open-loop-only overlays: they describe the cart's own response and make no sense once a controller drives it. */
export const OPEN_LOOP_ONLY = ['push', 'hammer', 'shaker', 'clock', 'critical', 'modes', 'flow', 'reach', 'observe'] as const;

/** The overlays plus everything they imply (e.g. `noise` ⇒ `loop`), in first-use order. */
export function expandOverlays(scene: string, overlays: string[]): string[] {
  const info = SCENES[scene]; const out: string[] = [];
  const add = (id: string) => { if (out.includes(id)) return; out.push(id); for (const j of info?.overlays.find((o) => o.id === id)?.implies ?? []) add(j); };
  for (const id of overlays) add(id);
  return out;
}
export const isLoopScene = (scene: string, overlays: string[]): boolean => scene === 'cart' && expandOverlays(scene, overlays).includes('loop');

export const insetsOf = (scene: string, overlays: string[]): InsetKind[] => {
  const info = SCENES[scene]; if (!info) return [];
  const out: InsetKind[] = [];
  for (const id of expandOverlays(scene, overlays)) { const k = info.overlays.find((o) => o.id === id)?.inset; if (k && !out.includes(k)) out.push(k); }
  return out;
};

/** Human-readable problems with a scene reference (empty = fine). Used by the content builder. */
export function sceneProblems(scene: string, overlays: string[] | undefined, where: string, params?: Record<string, unknown>): string[] {
  const info = SCENES[scene];
  if (!info) return [`${where}: unknown scene "${scene}" (known: ${Object.keys(SCENES).join(', ')})`];
  const p: string[] = [];
  const known = new Set(info.overlays.map((o) => o.id));
  for (const id of overlays ?? []) if (!known.has(id)) p.push(`${where}: unknown overlay "${id}" for scene "${scene}" (known: ${[...known].join(', ')})`);
  if ((overlays ?? []).length !== new Set(overlays).size) p.push(`${where}: duplicate overlays`);
  const ok = (overlays ?? []).filter((o) => known.has(o)), ex = expandOverlays(scene, ok);
  const ins = insetsOf(scene, ok);
  if (ins.length > MAX_INSETS) p.push(`${where}: overlays open ${ins.length} panels (${ins.join(', ')}); at most ${MAX_INSETS} fit, drop one`);
  const loop = ex.some((o) => (LOOP_OVERLAYS as readonly string[]).includes(o));
  if (loop && scene === 'cart') for (const o of ex) if ((OPEN_LOOP_ONLY as readonly string[]).includes(o)) p.push(`${where}: overlay "${o}" describes the open-loop cart and cannot be combined with a closed-loop overlay (${LOOP_OVERLAYS.filter((l) => ex.includes(l)).join(', ')})`);
  if (params && Object.keys(params).length) {
    const defs = new Map((info.params ?? []).map((d) => [d.id, d]));
    for (const [k, v] of Object.entries(params)) {
      const d = defs.get(k);
      if (!d) { p.push(`${where}: unknown param "${k}" for scene "${scene}" (known: ${[...defs.keys()].join(', ') || 'none'})`); continue; }
      if (typeof v !== 'number' || !Number.isFinite(v)) { p.push(`${where}: param "${k}" must be a number`); continue; }
      if (v < d.min || v > d.max) p.push(`${where}: param "${k}" = ${v} is outside [${d.min}, ${d.max}]`);
    }
    if (!loop) p.push(`${where}: params only apply to the closed-loop overlays (${LOOP_OVERLAYS.join(', ')}); none is on`);
  }
  return p;
}
