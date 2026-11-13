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
| `poles` | poles | The eigenvalues of A (poles of G) in the s-plane. With a closed-loop overlay on: the closed-loop poles at the chosen gain, and the path they travel as the gain K grows. |
| `loop` | trace | Close the loop: the sensor reads y = x, the error e = r − y goes into a controller C, and C pushes the cart with u = K·e. Offset, speed and ringing all come from K. |
| `pid` | ctrl | The controller split into its three parts: P (K·e, like a spring), I (the running total of e) and D (the rate of change of e, like a damper), and the push u they add up to. (switches on `loop`) |
| `disturb` | main picture | A steady shove d hits the cart at time t_d. The loop has to push back; the trace shows how far the cart is moved and whether it comes back. (switches on `loop`) |
| `noise` | ctrl | The sensor reading is y plus random noise. The controller cannot tell, so the noise becomes a jittery push u. (switches on `loop`) |
| `limit` | ctrl | The actuator cannot push harder than ±u_max: the demanded u is clipped, drawn as a flat-topped trace, and the cart answers the clipped push, not the demanded one. (switches on `loop`) |
| `delay` | main picture | The sensor reports where the cart was T_d seconds ago. The controller acts on old news and rings. (switches on `loop`) |
| `lag` | main picture | A slow sensor: its reading chases the true position with time constant τ, so the controller sees a smoothed, late y. (switches on `loop`) |

#### Closed-loop overlays and `params`

The overlays `loop`, `pid`, `disturb`, `noise`, `limit`, `delay` and `lag` draw the cart **inside a feedback loop**: a controller block C under the cart takes e = r − y and pushes the cart with u; the sensor returns y to the summing junction Σ. The motion, the u(t) trace and the poles come from the real closed-loop simulation (`simulatePid` in `dsp/pid.ts`, RK4, plant 1/(s² + 3s + 2); the cart's velocity is dx/dt of that y). `pid`, `disturb`, `noise`, `limit`, `delay` and `lag` each switch `loop` on, so `overlays: [limit]` alone is a complete loop with the actuator clipped. Closed-loop overlays cannot be combined with the open-loop ones (`push`, `hammer`, `shaker`, `clock`, `critical`, `modes`, `flow`, `reach`, `observe`): the build says which pair clashes. The panel cap still applies after the implied overlays are added (`pid`, `noise` and `limit` open the x(t) trace and the u(t) controller panel, so they leave no room for `poles` or `phase`; `loop`, `disturb`, `delay` and `lag` open only the trace and combine with one more panel such as `poles` or `phase`).

```yaml
exampleScene:
  overlays: [pid, disturb]
  params: { K: 8, Ki: 6, Kd: 1.5, d: 1, td: 4 }   # all optional; also on graph.yaml nodes and runningExample.scene
```

A param only takes effect with the overlay it belongs to (e.g. `umax` needs `limit`, `d`/`td` need `disturb`, `noise`/`seed` need `noise`); unknown names, non-numbers, values outside the range and params with no closed-loop overlay fail the build. `pid` defaults Ki = 6 and Kd = 1.5, other overlays Ki = Kd = 0.

| param | meaning | range | default |
|---|---|---|---|
| `K` | Proportional gain: the push per metre of error, in N/m. | 0 … 60 | 6 N/m |
| `Ki` | Integral gain, in N/(m·s). Default 0 (6 with the pid overlay). | 0 … 60 | 0 N/(m·s) |
| `Kd` | Derivative gain, in N·s/m. Default 0 (1.5 with the pid overlay). | 0 … 20 | 0 N·s/m |
| `r` | The commanded position, in m. | 0.2 … 2 | 1 m |
| `umax` | Actuator limit ±u_max in N (limit overlay). | 0.2 … 20 | 2.5 N |
| `d` | Size of the steady shove in N (disturb overlay; negative pushes the other way). | -5 … 5 | 1 N |
| `td` | Time of the shove in s (disturb overlay). | 1 … 8 | 4 s |
| `noise` | Standard deviation of the sensor noise in m (noise overlay). | 0 … 0.3 | 0.04 m |
| `seed` | Seed of the noise generator, so the same picture comes back every time. | 1 … 1000000 | 7 |
| `delay` | Pure sensor delay in s (delay overlay). | 0.02 … 1 | 0.3 s |
| `lag` | Sensor time constant in s (lag overlay). | 0.02 … 2 | 0.4 s |

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
