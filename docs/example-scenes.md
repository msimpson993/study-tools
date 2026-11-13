# Example scenes

An **example scene** is an animated, theme-aware drawing of a subject's *physical* running example (the cart on a spring and damper in linear-systems; the plucked tine in transforms). A dive or a map box chooses **overlays**: each overlay is one thing that node adds to the example (the forces, the state dot, the impulse hammer, the sample clock, …). The scene is drawn next to the "what this adds" callout of every dive, and as a small hero beside the central question on the map page.

Style (3Blue1Brown): minimal, every symbol named on the picture, and motion that means something. The cart's x(t) is an exact zero-order-hold simulation of ẋ = Ax + Bu (`dsp/tf.ts` `c2dZoh`), not a canned curve; the tine is e^(−σt) cos ω_d t with the real σ, f₀ and fs. Colours come from the theme variables, so it repaints on the `study-theme` event. It pauses off-screen, and holds one frame under `prefers-reduced-motion`.

## Content

```yaml
# subject.yaml
runningExample:
  title: …
  summary: …
  scene: { id: cart, overlays: [forces] }     # which core scene, and the overlays of the small hero on the map page

# dives/<id>.md front matter (or on a graph.yaml node; a dive inherits the overlays of the first node that links to it)
exampleScene: { overlays: [push, reach], caption: "The push acts on the velocity (B) …" }
```

- Scene id and overlay ids are validated against the catalogue (`packages/core/src/scenedefs.ts`) at build time. An unknown id, a duplicate, or overlays that open **more than two small panels** fail the build (some overlays share a panel: see the table).
- A dive without `exampleScene` shows the scene's default overlays and the build warns.
- `caption` is one line under the picture (optional). The overlay chips and the accessible description are generated from the catalogue.
- The field needs `runningExample.scene` in `subject.yaml` (without it the field is ignored, with a build warning); apps that declare no scene are unchanged.
- Pick overlays the way you pick a figure: ask *what does this node add to the cart?* and switch on exactly that. Prefer 1–3 overlays.

## Component API (`@study/core`)

```ts
mountScene(host: HTMLElement, { scene: 'cart' | 'tine', overlays?: string[], caption?: string, compact?: boolean }): SceneHandle
// SceneHandle { el, canvas, setOverlays(ids), drawAt(t), destroy() }; compact = main picture only (the hero)
SCENES, MAX_INSETS, insetsOf(scene, overlays), sceneProblems(scene, overlays, where)   // scenedefs.ts: pure data + validation
simulateCart(overlays): CartSim   // x, v, u arrays, at(t) → {x, v, u, a, b (modal coefficients)}, lam (eigenvalues), Ts, strike
cartEigs(m, k, c), tineX(t), tineSpectrum(f), sceneLayout(...), sceneAlt(scene, overlays), sceneRestTime / sceneDuration
```

Test hook: `window.__sceneFreeze = seconds` (set before load, or set and dispatch `study-theme`) draws one fixed frame, so screenshots and e2e are deterministic. Test ids: `example-scene` (`data-scene`, `data-overlays`), `scene-canvas`, `map-hero`, `dive-example-row`.

Layout: on ≥ 900 px the callout and the scene sit side by side; below that the scene stacks under the callout (390 px phones: no horizontal scroll). The map hero sits beside the central question from 760 px, under it below.

## Adding a scene for another app

Add an entry to `SCENES` (id, physical description, overlays with `says` sentences and the panel each opens), draw it in `scene.ts` (`drawSceneFrame` dispatches on the id: a main picture plus the small panels), add unit tests for the model (match the analytic response), and a gallery row in `packages/core/gallery/main.ts`. control-systems and pid-tuning can reuse the `cart` scene as is: set `runningExample.scene: { id: cart, overlays: [forces] }` and give each dive an `exampleScene`.

## Catalogue

### `cart` — The cart on a spring and a damper

A 1 kg cart on a track, tied to a wall by a spring (k = 2 N/m) and a damper (c = 3 N·s/m). Position x is measured from where the spring is relaxed.

Default overlays: `forces`.

| overlay | panel | what it shows |
|---|---|---|
| `forces` | main picture | The three forces on the cart: spring −kx, damper −cẋ and the push u. Their sum is m·ẍ. |
| `trace` | trace | The position over time, drawn as the cart moves. |
| `phase` | phase | The state vector (x, ẋ) as a dot in the plane of position and velocity. |
| `flow` | phase | The arrows ẋ = Ax: at every state, where A sends it next. |
| `modes` | phase | The two eigen-directions of A, and the state split into its two modal parts, each decaying on its own. |
| `critical` | phase | Same cart with the damper at c = 2√2: the two poles merge into one repeated pole (Jordan block). |
| `reach` | phase | The directions B and AB: the push acts on the velocity, and the spring turns that into position. |
| `observe` | phase | The position sensor reads x only. The velocity is hidden from it, but x(t) over time still reveals it. |
| `sensor` | main picture | The position sensor: y = Cx with C = (1 0). |
| `push` | trace | A constant 1 N push switched on at t = 0.5 s. |
| `hammer` | trace | A hammer strike: all the push arrives at once (1 N·s), so the velocity jumps to 1 m/s and then the cart rings down. |
| `shaker` | trace | A sinusoidal force u = sin(ωt) with ω = 1.5 rad/s: after the transient the cart moves at the same frequency, scaled and delayed. |
| `clock` | trace | A clock reads the position every T = 0.5 s and holds the value between ticks (zero-order hold). |
| `poles` | poles | The eigenvalues of A (poles of G) in the s-plane. |

### `tine` — The plucked tine and its sampler

A plucked tine rings and decays: x(t) = e^(−σt) cos(ω_d t) with σ = 0.6 s⁻¹ and f₀ = 1 Hz. A clock samples the tip at fs = 8 Hz.

Default overlays: `envelope`.

| overlay | panel | what it shows |
|---|---|---|
| `envelope` | main picture | The envelope e^(−σt) that the ringing fits inside. |
| `sampler` | main picture | A clock reads the tip every T = 1/fs = 125 ms: the stems are the samples x[n] = x(nT). |
| `window` | main picture | Keep only M = 16 samples (2 s) and fade the ends with a window: the record is all the analyser sees. |
| `poles` | poles | The pole pair −σ ± jω_d: σ is how fast it decays, ω_d how fast it rings. |
| `spectrum` | spectrum | The spectrum: a peak at ±f₀ whose width is about σ/π. With the sampler on, it repeats every fs. |
| `zpoles` | zplane | The same poles after sampling: z = e^(pT), radius e^(−σT), angle 2πf₀/fs. |
