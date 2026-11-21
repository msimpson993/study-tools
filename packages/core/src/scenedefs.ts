/**
 * Example scenes: the catalogue (pure data, no DOM, so the content builder can validate against it).
 * A scene is an animated drawing of a subject's running example. A content file picks which OVERLAYS to switch on;
 * each overlay names one thing the node adds (forces, the state dot, the impulse hammer, the sample clock, …).
 * Drawing lives in scene.ts.
 */
import { diagramProblems, type DiagramSpec } from './blockdiagram';
import { isChainScene, chainDiagramProblems } from './chaindiagram';
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
      { id: 'sensor', label: 'sensor (C matrix)', says: 'The position sensor: y = Cx, where C = (1 0) is the state-space output matrix (not the controller, which is Gc).' },
      { id: 'push', label: 'push u', says: 'A constant 1 N push switched on at t = 0.5 s.', inset: 'trace' },
      { id: 'hammer', label: 'impulse', says: 'A hammer strike: all the push arrives at once (1 N·s), so the velocity jumps to 1 m/s and then the cart rings down.', inset: 'trace' },
      { id: 'shaker', label: 'sine shaker', says: 'A sinusoidal force u = sin(ωt) with ω = 1.5 rad/s: after the transient the cart moves at the same frequency, scaled and delayed.', inset: 'trace' },
      { id: 'clock', label: 'sample clock', says: 'A clock reads the position every T = 0.5 s and holds the value between ticks (zero-order hold).', inset: 'trace' },
      { id: 'poles', label: 'poles', says: 'The eigenvalues of A (poles of G) in the s-plane. With a closed-loop overlay on: the closed-loop poles at the chosen gain, and the path they travel as the gain K grows.', inset: 'poles' },
      { id: 'loop', label: 'feedback loop', says: 'Close the loop: the sensor reads y = x, the error e = r − y goes into a controller Gc, and Gc pushes the cart with u = K·e. Offset, speed and ringing all come from K.', inset: 'trace' },
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

  speaker: {
    id: 'speaker',
    title: 'The noise-cancelling earbud speaker',
    physical: 'A micro-speaker in a noise-cancelling earbud (Thiele–Small values Mms = 0.084 g, Rms = 0.173 kg/s, Cms = 0.587 mm/N, Bl = 0.545 T·m, Re = 7.47 Ω, Le = 0.04 mH). A voltage V(t) drives the voice coil, the diaphragm moves x(t), and in the sealed ear canal the sound pressure follows x. It resonates at fs ≈ 717 Hz with damping ratio ζ ≈ 0.28 (0.229 from Rms alone; the back-EMF damping Bl²/Re of the voltage-driven coil adds the rest).',
    defaults: ['forces'],
    overlays: [
      { id: 'forces', label: 'forces', says: 'The forces on the diaphragm: the coil force Bl·i, the suspension spring −x/Cms and the damping −Rms·ẋ. Their sum is Mms·ẍ.' },
      { id: 'coil', label: 'coil circuit', says: 'The electrical side: V drives the current i through Re and Le, against the back-EMF Bl·ẋ. Its pole sits at −Re/Le ≈ −186,750 rad/s, about 40 times faster than the mechanics, so two states (x, ẋ) are enough.' },
      { id: 'click', label: 'click → h(t)', says: 'A click (an impulse of voltage): the diaphragm rings at about 690 Hz and dies away within a few milliseconds. That ring is the impulse response h(t).', inset: 'trace' },
      { id: 'split', label: 'add the responses', says: 'Linearity: a tone plus a click goes in, and the motion is exactly the response to the tone plus the response to the click.', inset: 'trace' },
      { id: 'conv', label: 'sum of clicks', says: 'Convolution: any input is a row of scaled, shifted clicks, so the output is the same row of scaled, shifted impulse responses, added up.', inset: 'trace' },
      { id: 'tone', label: 'tone in, tone out', says: 'A 500 Hz tone goes in; after a short transient the diaphragm moves at exactly 500 Hz, only scaled and delayed. Tones e^{jωt} are what this system only scales.', inset: 'trace' },
      { id: 'state', label: 'state (x, ẋ)', says: 'The state: position and velocity of the diaphragm, a point that spirals into the origin because the eigenvalues are complex.', inset: 'phase' },
      { id: 'critical', label: 'critically damped', says: 'The same speaker with damping raised to 2√(k·Mms) ≈ 0.76 kg/s: the two poles merge at −ωs ≈ −4,503 rad/s, a Jordan block with only one eigen-direction.', inset: 'phase' },
      { id: 'poles', label: 'poles', says: 'The eigenvalues of A, the poles of H(s), at −1,266 ± j4,322 rad/s: the real part sets the decay, the imaginary part the ring frequency. The coil pole is far off to the left.', inset: 'poles' },
      { id: 'bode', label: '|H(f)|', says: 'The frequency response |H(j2πf)|, H(s) on the jω axis: flat in the bass, a peak near 660 Hz from the light damping, then falling at 40 dB per decade.', inset: 'spectrum' },
      { id: 'series', label: 'Fourier series', says: 'A 200 Hz buzz (square wave) is a sum of harmonics at 200, 600, 1000 Hz, …; the speaker scales each by |H| at its own frequency.', inset: 'spectrum' },
      { id: 'sampler', label: 'sampling', says: 'A microphone signal read by the ANC chip\'s converter. Drawn at 8 kHz here so the samples are visible; real ANC converters run much faster to keep the delay small.', inset: 'trace' },
      { id: 'dft', label: 'DFT bins', says: 'A block of N = 64 samples at 8 kHz analysed by the DFT: bins every 125 Hz. The ring dies out within about 1 ms, so its spectrum is wide (−3 dB from about 400 to 850 Hz, peak near 660 Hz): damping, not leakage.', inset: 'spectrum' },
      { id: 'zplane', label: 'z-plane', says: 'The same two poles after sampling at 8 kHz: z = e^{pT}, inside the unit circle. The ANC filters are designed here, as H(z).', inset: 'zplane' },
      { id: 'anc', label: 'noise cancelling', says: 'Active noise cancelling: a reference mic outside (feedforward) and an error mic in the ear (feedback) drive an adaptive filter (FxLMS) so the speaker makes anti-noise. The residual at the ear shrinks as the filter adapts. Illustrative waveforms, not a simulated FxLMS.', inset: 'trace' },
    ],
  },
  car: {
    id: 'car',
    title: 'A car on its suspension, seen from the side',
    physical: 'A car body (mass m = 1400 kg, pitch inertia J = 2000 kg·m²) on a front spring+shock pair 1.2 m ahead of its centre of gravity and a rear pair 1.5 m behind (kf = 38,000 N/m, kr = 42,000 N/m, shocks cf = 3040, cr = 3360 N·s/m). The state is heave z, pitch θ and their rates. Its two modes are bounce (1.15 Hz, the whole body moves up and down) and pitch (1.42 Hz, the nose dips as the tail rises). Small angles, linear springs and shocks, rigid tyres, no wheel mass (fine up to about 5 Hz).',
    defaults: ['springs'],
    overlays: [
      { id: 'springs', label: 'springs and shocks', says: 'The body sits on a front and a rear spring+shock pair; any body point x metres ahead of the centre of gravity moves z + x·θ.' },
      { id: 'state', label: 'state (z, θ, ż, θ̇)', says: 'The state: heave z, pitch θ and their rates. Released 2° nose-down, the body heaves and pitches back to level.', inset: 'trace' },
      { id: 'bounce', label: 'bounce mode', says: 'Bounce: 1.15 Hz, ζ 0.29. Mostly up and down with a slight nose-up; the point that stays still is 1.06 m behind the rear axle, off the body.' },
      { id: 'pitch', label: 'pitch mode', says: 'Pitch: 1.42 Hz, ζ 0.36. The nose dips as the tail rises, about a point 0.56 m ahead of the centre of gravity.' },
      { id: 'trace', label: 'z(t), θ(t)', says: 'Heave (mm) and pitch (degrees) against time.', inset: 'trace' },
      { id: 'poles', label: 'poles', says: 'The four eigenvalues of A: bounce at −2.09 ± 6.92j and pitch at −3.18 ± 8.33j per second. With worn shocks they slide towards the imaginary axis.', inset: 'poles' },
      { id: 'bump', label: 'bump', says: 'A 5 cm bump at 15 m/s: the rear wheel meets it 0.18 s after the front, and the motion is the front response plus a delayed rear copy. Peak heave 8.8 mm at 0.24 s.', inset: 'trace' },
      { id: 'worn', label: 'worn shocks', says: 'Shocks worn to 20% of their damping: ζ falls to about 0.06 and 0.07, and after the bump the body keeps moving more than 1 mm until 3.9 s instead of 1.2 s.', inset: 'trace' },
      { id: 'sensor', label: 'sensor at the centre', says: 'The symmetric car (kf·a = kr·b): a height sensor at the centre of gravity cannot see pitch, because the pitch mode does not move there.' },
      { id: 'centre', label: 'push at the centre', says: 'The symmetric car (kf·a = kr·b): a push at the centre of gravity cannot start pitch, and a height sensor there cannot see it.' },
      { id: 'active', label: 'active suspension', says: 'Front and rear actuators bring the body from 2° nose-down to level and still in 0.5 s with the least ∫|u|²dt: peaks of 476 N front and 652 N rear.', inset: 'ctrl' },
    ],
  },
  house: {
    id: 'house',
    title: 'The two-room house and its thermostat',
    physical: 'Two rooms share a wall and each leaks heat outdoors. Temperatures are measured above the outdoor temperature: ẋ = Ax + Bu with A = [[−1.2, 1], [1, −1.2]] per hour, a heater in room 1 (u in kW; with C_th = 1 MJ/K per room, B = (3.6, 0)ᵀ K/h per kW) and a thermostat reading room 1 (C = [1, 0]). The modes are the average temperature (λ = −0.2/h, τ = 5 h) and the difference (λ = −2.2/h, τ ≈ 27 min).',
    defaults: ['heat'],
    overlays: [
      { id: 'heat', label: 'heater on', says: 'The 2.5 kW heater in room 1 switches on at t = 0. Room 1 warms first; room 2 follows through the shared wall.' },
      { id: 'flows', label: 'heat flows', says: 'The heat flows: through the shared wall in proportion to x₁ − x₂ (rate 1/h) and out to the cold in proportion to each room\'s temperature above outdoors (rate 0.2/h).' },
      { id: 'trace', label: 'x₁(t), x₂(t)', says: 'Both room temperatures above outdoors (K) over 12 hours.', inset: 'trace' },
      { id: 'modes', label: 'modes', says: 'The two eigen-directions of A: the average (1, 1), which fades slowly (τ = 5 h), and the difference (1, −1), which fades fast (τ ≈ 27 min). The state splits into these two parts.', inset: 'phase' },
      { id: 'flow', label: 'what A does', says: 'The arrows ẋ = Ax over the plane of the two temperatures: everything is pulled first onto the average line, then slowly to the outdoor temperature.', inset: 'phase' },
      { id: 'poles', label: 'eigenvalues', says: 'The eigenvalues −0.2/h and −2.2/h on the real axis: both negative, so the house is stable, and the slow one dominates.', inset: 'poles' },
      { id: 'both', label: 'heat both rooms', says: 'The heater power split equally between the rooms, B ∝ (1, 1): the input only pushes the average. The difference can never be changed by the input; it is uncontrollable and just decays on its own.' },
      { id: 'avg', label: 'thermostat reads the average', says: 'A thermostat that reads the average (x₁ + x₂)/2: it cannot tell the rooms apart, so the difference mode is unobservable.' },
      { id: 'thermo', label: 'thermostat in room 1', says: 'The thermostat reads room 1 only, y = Cx with C = [1, 0]. It sees both modes, so the full state can be worked out from y(t).' },
      { id: 'reach', label: 'where u can push', says: 'The directions B and AB: the heater pushes room 1 only, and the shared wall turns that into a push on room 2. Together they span the plane, so the pair is controllable.', inset: 'phase' },
      { id: 'gramian', label: 'reachable ellipse', says: 'The controllability Gramian as an ellipse: the states reachable with the same heating energy in 3 hours. It is long in a direction about 31° up from the room-1 axis (heat room 1 and let the wall share it) and thin across it: pulling the rooms apart is the expensive direction to reach.', inset: 'phase' },
      { id: 'optimal', label: 'least-energy warm-up', says: 'The heater profile with the least energy ∫u² that takes the house from cold to an illustrative target, (10, 7) K above outdoors in 3 hours (Pontryagin, or the Gramian formula). It rises for about two hours, then eases off so room 1 does not overshoot.', inset: 'ctrl' },
    ],
  },
};

/** What a content file may say: `exampleScene: { overlays: [...], caption?: "…" }` on a dive or a map node. */
export interface ExampleSceneRef { /** another scene of the subject than runningExample.scene (it must be listed there or in runningExample.moreScenes) */ scene?: string; overlays?: string[]; caption?: string; params?: Record<string, number>; /** staged block diagram under the picture (see docs/example-scenes.md) */ diagram?: DiagramSpec | string | string[] }
/** What subject.yaml may say: `runningExample.scene: { id: cart, overlays: [...] }` (overlays = the small hero on the map page). */
export interface SubjectSceneRef { id: string; overlays?: string[]; params?: Record<string, number>; caption?: string; diagram?: DiagramSpec | string | string[] }

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
export function sceneProblems(scene: string, overlays: string[] | undefined, where: string, params?: Record<string, unknown>, diagram?: unknown): string[] {
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
  p.push(...(isChainScene(scene) ? chainDiagramProblems(scene, diagram, where) : diagramProblems(diagram, where)));
  return p;
}
