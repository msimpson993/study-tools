---
id: disk
order: 5
title: "The disk head: Ka, a fast coil and a hard limit"
category: disk
neighbors: [borer, sens, tuner]
level: Worked calculation
check: [ck-disk-1, ck-disk-2, ck-disk-3]
addsToExample: "Brings in the disk head and turns its Ka knob for a seek and a shock."
accountsFor: Why the fast seek at Ka = 80 rings, and why the coil can be ignored there but not at high gain.
---

**The question:** what does the amplifier gain Ka do to the disk head, and when does the fast coil matter? These are the boxes *A third part: the disk head*, *Ka: fast or calm*, *Ka and a shock* and the side box *The ceiling on Ka*.

### The big idea

- **Zero step error comes free:** the arm builds position (its 1/s), so the head ends exactly on a new track for any stable Ka, even if the parts drift.
- **Ka trades speed against swing,** as K did for the boring machine.
- **The coil is 50× faster than the arm:** at moderate Ka, drop it and the loop is a spring 5·Ka with a damper 20.
- **But dropping it hides a ceiling:** three parts in a ring go unstable past Ka = 4080.

### See it

Drag Ka (log scale). Plots: the seek (command step), the shock response and the poles. Toggle **drop the coil** to overlay the two-part stand-in and watch it agree at Ka = 80 and fail near the ceiling.

```figure:disk
```

### The math

```eq
G₁ = 5000/(s + 1000) (coil),   G₂ = 1/(s(s + 20)) (arm)
seek:   T = Ka·G₁·G₂/(1 + Ka·G₁·G₂) = 5000·Ka/(s³ + 1020s² + 20000s + 5000·Ka)
error:  e(∞) = lim_{s→0} s · 1/(1 + Ka·G₁·G₂) · 1/s = 0
shock:  Y/T_d = −G₂/(1 + Ka·G₁·G₂),   y(∞) = −1/(5·Ka)
stand-in (drop the coil, keep its steady gain 5):  5·Ka/(s² + 20s + 5·Ka),   ζ = 10/√(5·Ka)
Routh, s³ + a₂s² + a₁s + a₀:  stable ⇔ all aᵢ > 0 and a₂·a₁ > a₀  ⇒  Ka < 1020·20000/5000 = 4080
```

**What each symbol means.** Ka: amplifier gain (the knob); G₁: coil, volts → force, with a 1 ms lag (pole at −1000); G₂: arm, force → position, with friction-to-inertia ratio 20 (1/s); T_d: shock, entering between coil and arm; Y: head position.

### Worked example: on the disk head

| | Ka = 10 | Ka = 80 | Handout |
|---|---|---|---|
| Poles | −1000.05, −17.0, −2.94 | −1000.4, −9.80 ± 17.43j | – |
| Stand-in ζ | 1.41 | 0.50 | – |
| Overshoot | 0 | 17.1 % (stand-in 16.3 %) | Ka = 80 "unacceptably oscillatory" |
| Settling (2 %) | 1.40 s | 0.41 s | – |
| Shock offset | −0.020 | −0.0025 (dip −0.0029 at 0.18 s) | −2.5×10⁻³ (Fig. 4.31) |

- **Why the stand-in works at 80:** the coil pole sits at −1000, 100× further left than the arm's pair.
- **Shock target:** an offset of 0.001 needs Ka = 200, where the seek overshoots 37 % (not in lab handout).
- **The ceiling:** at Ka = 4080 the head rings forever at √20000 = 141 rad/s (not in lab handout).

### Knobs

| Knob | What it is, physically | Turn it up | Turn it down |
|---|---|---|---|
| **Ka** | amplifier volts per unit of track error | faster seek, smaller shock offset, more overshoot (Ka = 160: 32 %); unstable past 4080 | slower, calmer; Ka = 20 is the stand-in's critical damping (no overshoot) |
| **1000** (coil speed) | how fast the coil's current builds (R/L) | ceiling rises; the stand-in fits better | ceiling falls; the coil starts to matter at lower Ka |
| **20** (arm damping) | bearing friction ÷ arm inertia | calmer seek at a given Ka | swingier |
| **5000/1000 = 5** (coil gain) | force per volt, steady | acts like more Ka | acts like less Ka |

Values beyond Ka = 10 and 80, and the coil and arm knobs, are mine (not in lab handout).

### What it can't do

- **Pick Ka:** the handout leaves the best Ka to its next chapter; every Ka here trades the seek against the shock.
- **Handle a machine we can't write down:** that needs software to build the model, which is where Project 1 starts: *Too messy? Let PID Tuner*.

<p class="src">Sources: Dorf §4.10, Figs. 4.28–4.31, Eqs. 4.67–4.69 (pp.263–267). Not in lab handout: the two-part stand-in, ζ, the knob values outside Ka = 10 and 80, the Routh ceiling. Course background: Control Systems › <a href="../control-systems/#/dive/dominant">Which poles matter? Dominant poles</a> (model reduction, LN2 s.29–34).</p>
