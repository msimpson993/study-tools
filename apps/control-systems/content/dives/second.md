---
id: second
order: 10
title: "Two poles: ζ and ωₙ, and specs as regions"
category: predict
neighbors: [first, dominant, blocks, splane]
level: Some algebra
check: [q-second, q-specs, ck-second-1]
---

**The question:** the house can't bounce, so what does a plant that rings look like, and how do we put numbers on "how much" and "how fast"? This is the box *Two poles: ζ and ωₙ* (and its follow-on *Specs*), after *One pole: the yardstick*.

### The big idea

- **The standard plant that rings:** a mass on a spring with a shock absorber.
- **Two numbers:** the natural frequency ωₙ (how fast it would swing with no shock) and the damping ratio ζ (how much the shock calms it).
- **What each spec depends on:** overshoot on ζ alone, settling on the decay rate σ = ζωₙ, and peak time on the ringing frequency ω_d.

**Model note:** this is a *single-mass quarter car*: one corner's share of the body (400 kg) on its spring and shock, tyre rigid, wheel mass ignored. The wheel comes back once in *Which poles matter?*.

### See it

The car corner over a road profile, with the spring and damper between body and wheel. Try the presets, then double or halve the shock.

```figure:corner
```

Specs as a region: the sliders shade the s-plane wedge allowed by an overshoot limit and the line σ ≥ 4/Tₛ allowed by a settling limit. Drag the poles in or out.

```figure:specs
```

### The math

```eq
m z̈ + c ż + k z = u  ⇒  Z/U = (1/m)/(s² + (c/m)s + k/m)
```

```eq
ωₙ = √(k/m),  ζ = c/(2√(km)),  σ = ζωₙ = c/(2m),  ω_d = ωₙ√(1 − ζ²)
```

```eq
%OS = 100e^(−ζπ/√(1−ζ²)),  Tₚ = π/ω_d,  Tₛ = 4/σ,  T_r1 = (2.16ζ + 0.6)/ωₙ (0.3 ≤ ζ ≤ 0.8)
```

**What each symbol means.** z: body height from rest (m); u: force on the body (N); m (kg), c (N·s/m), k (N/m).

Below ζ = 1 the poles are complex, −σ ± jω_d: the body overshoots and rings (*underdamped*). Rise time: the notes use 0–100 % when underdamped and 10–90 % (T_r1) otherwise.

````callout:derivation Full derivation
Y(s) = ωₙ²/(s(s² + 2ζωₙs + ωₙ²)). Partial fractions with the completed square (s + ζωₙ)² + ω_d² give y = 1 − (e^(−ζωₙt)/√(1−ζ²)) sin(ω_d t + θ), with θ = cos⁻¹ζ. The peak is where ẏ = 0: sin ω_d t = 0, so Tₚ = π/ω_d; substitute into y for %OS.
````

### Worked example: on the corner

- s² + 4s + 64: ωₙ = 8 rad/s (fₙ = 1.27 Hz), ζ = 0.25, σ = 2, ω_d = 7.75 rad/s.
- %OS 44.4 %, Tₚ 0.41 s, Tₛ 2.0 s (formula; simulated 1.77 s), bounce period 0.81 s. Static sag under its own weight 15.3 cm; critical damping would need c = 6400 N·s/m.
- 1 kN of luggage: sags 3.91 cm, dips to 5.64 cm first.
- **Comfort vs bounce:** ζ 0.4 (c 2560): load overshoot 25.4 %. ζ 0.7 (c 4480): 4.6 %, settles in 0.75 s, but the road step still overshoots 21 %, because the shock itself transmits the road.
- **Specs check:** the smallest c for Tₛ ≤ 1 s (formula) is 3200 N·s/m (σ = c/800 ≥ 4); for %OS ≤ 10 % it is 3783 N·s/m (ζ ≥ 0.591).

### What it can't do

The formulas are exact for two poles and no zeros. The road input has a zero at −16 (the shock pushes on the body when the road moves), so a road step overshoots 50.6 %, not 44.4 %. A third pole (the wheel) changes things a little (*Which poles matter?*).

<p class="src">Sources: LN1 s.50–60 (Tₛ = 4/σ: s.59; rise-time fit: s.60), s.61 (allowed pole region).</p>
