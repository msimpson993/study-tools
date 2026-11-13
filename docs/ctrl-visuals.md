# Control visuals (`packages/core/src/ctrlviz.ts`)

Reusable canvas panels for control-systems pages, built on `viz.ts` and the `tf` / `rlocus` maths in `@study/core/dsp`
(see [dsp-control.md](dsp-control.md)). Each `draw…` paints one `FigurePanel` from plain data, in the usual figure recipe
(`figureOf` + a `figures.yaml` entry, see [components.md](components.md)). **The gallery `packages/core/gallery/main.ts`
(built to `dist/_gallery/index.html`, tested by `tests/e2e/ctrlviz.spec.ts`) is the copy-paste reference**: four complete
figures on the running cart (1 kg, k = 2, c = 3, G = 1/(s²+3s+2), poles −1, −2).

| Export | Draws | Key options |
|---|---|---|
| `drawStepResponse(g,w,h,spec) → StepMetrics or null` | step response, optional ghost trace | `t,y,ghost?,ref?,final?,band?=0.02,tEnd?,yRange?`, `show:{timing,overshoot,band,settling,ess}` (each marker optional, default off) |
| `drawSPlane(g,w,h,spec) → Frame` | s-plane, shaded unstable half, jω axis | `range,reCenter?`, `poles,zeros,labels`, `zetaRays[],wnCircles[]`, `region:{zeta,wn,sigma}`, `locus,asymptotes,marks,handles` |
| `drawRootLocus(g,w,h,{rl,L,K,…SPlaneSpec}) → Frame` | `RLocus` + asymptotes, breakaway ◆, jω-crossing ○ with their K, closed-loop poles at K (branch colours), “K = … stable/UNSTABLE” | `showAsymptotes,showSpecialPoints,showReadout` |
| `drawBode(g,w,h,{L,wmin,wmax,margins?,ghost?,cursor?}) → Margins` | dB over phase, log ω, **PM bar** on the phase plot at the gain crossover and **GM bar** on the gain plot at the phase crossover | `magRange,phaseRange,n` |
| `drawHeightMap(g,w,h,{G,range,reCenter?,dbRange?=[−36,18],omega?}) → Frame` | log|G(s)| as colour height over the s-plane (poles = peaks, zeros = pits), yellow jω axis, probe s = jω | `cell` (px per colour cell) |
| `drawJwSlice(g,w,h,{G,wmax,omega?,db?,ghost?})` | |G(jω)| along the jω axis: the cut through the height map | |
| `splaneDrag({range,reCenter?,handles,onDrag,upperOnly?,realOnly?,radius?,limit?}) → PanelPointer` | drag poles/zeros (conjugates are yours: `upperOnly` keeps a handle in the upper half plane) | |
| `locusDrag({rl,range,reCenter?,onK,radius?}) → PanelPointer` | grab near the locus and slide the gain along it | |
| `splaneFrame(w,h,range,reCenter?)`, `wnZeta(s)`, `poleFromWnZeta(wn,ζ)`, `suggestKMax(rl)`, `heightColor(t)`, `BRANCH_COLORS()` | helpers | |

## Direct manipulation: `FigurePanel.pointer`
`FigurePanel` (figure.ts) has an optional `pointer?: PanelPointer { down, move, up?, hover? }` in CSS pixels. `down` returns `true` to grab:
the pointer is captured (inline and expanded view), the click-to-expand that would follow a drag is suppressed, the canvas gets
`touch-action: none` (a finger drag moves the handle instead of scrolling the page) and a grab cursor on hover. Return `false` and the tap expands the plot as before.
**Rule: every draggable quantity must also be a slider/number control**; the drag callbacks just call `controls.set(...)` on those controls, so presets, URL state and Reset keep working.
Panels without `pointer` are unchanged.

```ts
{ id: 'plane', title: 'Poles', x: 'σ', y: 'jω',
  draw: (g, w, h, v) => drawSPlane(g, w, h, { range: 4, poles, handles: [p], zetaRays: [0.5], wnCircles: [wn] }),
  pointer: splaneDrag({ range: 4, handles: () => [{ id: 'p', s: pole() }], upperOnly: true,
                        onDrag: (_id, s) => { const q = wnZeta(s); c.set('wn', q.wn); c.set('zeta', q.zeta); } }) }
```
Draw and drag must use the same `range`/`reCenter` (both go through `splaneFrame`).

## Limitations
- Dragging moves one point at a time; pole/zero **pairs** are expressed through (ωn, ζ) or similar controls by your `onDrag` (a complex pair is not draggable as two independent points). Overdamped (real-pair) systems are reached by the sliders; a drag onto the real axis gives ζ = 1.
- `drawStepResponse` markers assume a response that settles; for unstable data it still draws the trace (clipped to `yRange`) but omits `Ts`/`ess`.
- `drawHeightMap` evaluates |G| per colour cell on every redraw (≈ 5 000 evaluations at default cell size): fine for TFs of degree ≲ 8, slower beyond; raise `cell` for big ones.
- `drawBode` is for one loop TF; margins come from `margins()` (log-grid interpolation, no Nyquist test).
- The gallery is built by `scripts/build-gallery.ts` (part of `npm run build`) and is not linked from the hub.
