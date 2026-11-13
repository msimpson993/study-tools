---
id: sp5
order: 20
title: "Time-domain operations as moves on the plane"
category: describe
chain:
  - title: "Which time-domain operations correspond to simple moves?"
  - title: "Which time-domain operations are moves on the plane?"
  - title: "operations dictionary"
neighbors:
  - sp4
---
**Which time-domain operations are moves on the plane?**

**Picture it first.** Multiplying by e^(−at) in time slides every pole left by a; the response is the same shape, faster or slower.

```figure:shift
```

Differentiating multiplies by s (adds a zero at 0), integrating divides by s (a pole at 0), a delay multiplies by e^(−sT), a time shift or scaling moves the pattern. Each operation has a picture on the map.

### Which time-domain operations correspond to simple moves on the s-plane?

Almost every Laplace property is a <b>move of the pole/zero pattern</b>: differentiation adds a ○ at the origin, integration adds a × at the origin, an exponential envelope slides the whole pattern sideways, time scaling stretches it radially, and putting systems in cascade overlays their patterns.

| Time domain | s-domain | What happens on the map | Intuition |
|---|---|---|---|
| d<i>f</i>/d<i>t</i> | <i>s</i><i>F</i>(<i>s</i>) − <i>f</i>(0) | Adds a <b>○ at the origin</b> (zero ICs) | \|<i>j</i>ω\| rises with ω: boosts high frequencies, kills DC. <i>s</i>² = two ○'s at 0. |
| ∫₀<sup><i>t</i></sup> <i>f</i> dτ | <i>F</i>(<i>s</i>)/<i>s</i> | Adds a <b>× at the origin</b> | \|1/<i>j</i>ω\| → ∞ at DC: infinite low-frequency gain. Each one raises the <b>system type</b> by 1. |
| <i>e</i><sup>−<i>at</i></sup><i>f</i>(<i>t</i>) | <i>F</i>(<i>s</i> + <i>a</i>) | <b>Slides the whole pattern left by <i>a</i></b> (right if <i>a</i> &lt; 0) | Multiplying by a decaying envelope adds damping to every mode: sin ω<i>t</i> (×'s at ±<i>j</i>ω) → <i>e</i><sup>−<i>at</i></sup>sin ω<i>t</i> (×'s at −<i>a</i> ± <i>j</i>ω). |
| <i>f</i>(<i>at</i>), <i>a</i> &gt; 0 | (1/<i>a</i>)<i>F</i>(<i>s</i>/<i>a</i>) | <b>Scales the pattern radially by <i>a</i></b>: a pole at <i>p</i> moves to <i>a·p</i> | Playing the response <i>a</i>× faster pushes every mark <i>a</i>× farther from the origin. Angles (ζ, %OS) are unchanged, so it's the <b>same shape, faster</b>. That's exactly what ω<sub>n</sub> does. |
| <i>f</i>(<i>t</i> − <i>T</i>)·u(<i>t</i> − <i>T</i>) | <i>e</i><sup>−<i>sT</i></sup><i>F</i>(<i>s</i>) | <b>No finite pole or zero.</b> \|<i>e</i><sup>−<i>j</i>ω<i>T</i></sup>\| = 1, phase −ω<i>T</i> | Pure lag: same magnitude at every frequency, phase falls without limit. Padé: <i>e</i><sup>−<i>sT</i></sup> ≈ (1 − <i>sT</i>/2)/(1 + <i>sT</i>/2), a <b>RHP ○ at +2/<i>T</i></b> mirrored by a LHP × at −2/<i>T</i>. |
| <i>f</i> * <i>g</i> (convolution) | <i>F</i>(<i>s</i>)<i>G</i>(<i>s</i>) | <b>Overlay both patterns</b> on one plane | Cascade = multiply = union of all ×'s and ○'s (a ○ on top of a × cancels). |
| <i>a</i>·<i>f</i> + <i>b</i>·<i>g</i> | <i>aF</i> + <i>bG</i> | Poles: union. <b>Zeros: move</b> (new numerator) | Parallel paths keep all the modes but reshape the coupling, which is how PID's zeros appear. |


*From the guide's static figure: <b>Three moves of the same pattern</b> (a pole pair and a zero). Left: original. Middle: <i>e</i><sup>−<i>at</i></sup> envelope (<i>s</i> → <i>s</i> + <i>a</i>) slides everything left by <i>a</i> = 1. Right: time compressed 2× (<i>s</i> → <i>s</i>/2) pushes everything radially outward ×2. Rays from the origin (ζ) are preserved.*

````callout:recognize Recognize


- An <b>integrator in the loop</b> = × at the origin = type 1 = zero step error (Q28). An integrator is literally “a pole at zero frequency.”
- A <b>D term</b> = ○ at the origin (pure <i>K</i><sub>d</sub><i>s</i>), which explains the noise boost. A filtered D adds a far-left × to stop the boost.
- <b>Time delay</b> behaves like a RHP zero: it allows a wrong-way/late start and limits loop speed. Same lesson as non-minimum phase.
````

````callout:trap Trap
Shift and scale are easy to swap. <b>Multiply by <i>e</i><sup>−<i>at</i></sup> → slide</b> (horizontal translation: adds the same σ to every pole, so ζ changes). <b>Speed up time → stretch</b> (radial scaling: ζ preserved). Delay is a third thing: no pole moves at all, only phase is added.
````

### Then what does turning a control knob (like gain K) do on the map?

It <b>rebuilds the surface</b>: the closed-loop poles (peaks) move, so the height everywhere changes, including under your fixed lookup spot. In the explorer, slide the pole pair toward the jω axis (−a → 0) or up (larger b) and watch the readout at a <em>fixed</em> ◆ probe change: the bulldozer moved the peak, not you. (In a feedback loop, a gain knob moves the closed-loop poles the same way. See the root locus in S8.)

````callout:note The two-hand rule
One hand holds the <b>bulldozer</b> (knobs → where the peaks are). The other hand holds the <b>◆ probe</b> (drive frequency → where you read). They're independent. Design = use the bulldozer so that, along the stretch of the jω axis your signals actually use, the height and phase of the slice are what you want: high and flat at low frequency (good tracking) and low at high frequency (noise rejection), just like S and C.
````

Same as a filter: the component values set the pole/zero map (the surface). The signal generator's frequency is where you probe it. Turning the generator's dial never moves the poles.

````callout:predict Predict
Before you touch a slider, predict what it will do. Set a negative: the poles move right and the response grows. Set a large positive: the ringing dies almost at once.
````

````callout:note Symbols used here
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **ζ, ωn**: damping ratio and natural frequency of a pole pair
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
- **T (time constant)**: time for a first-order response to cover 63 % of the way: T = 1/|p|
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
