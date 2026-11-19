---
id: dominant
order: 11
title: "Which poles matter? Dominant poles"
category: predict
neighbors: [second, reduce]
level: Conceptual
check: [q-dom, ck-dom-1]
---

**The question:** a real plant has more than two poles, so why do second-order specs still work? This is the side box *Which poles matter?*, under *Two poles: ζ and ωₙ*.

### The big idea

Each pole's motion decays at its own rate. One five times farther left decays e⁵ ≈ 150 times faster, so it's gone before the slow one has moved much. The slow, *dominant* pair shapes the response, which is why second-order specs work on real hardware, and why the single-mass corner was allowed.

### See it

Turn the wheel on (40 kg on a 200 kN/m tyre), then soften the tyre: wheel hop comes down toward the body's frequency and the single-mass model breaks.

```figure:dominant
```

### The math

Two masses: the body m (400 kg) and the wheel m_u (40 kg), with the suspension k, c between them and the tyre k_t below. Four poles: the body pair at −1.60 ± 7.45j and wheel hop at −20.4 ± 71.4j (11.8 Hz, ζ = 0.275). When dropping a pole, keep the DC gain.

**What each symbol means.**

- **m**: body mass 400 kg.
- **m_u**: wheel (unsprung) mass 40 kg.
- **k, c**: suspension spring 25.6 kN/m and shock 1.6 kN·s/m, between body and wheel.
- **k_t**: tyre stiffness 200 kN/m, between wheel and road.
- **σ**: a pole's decay rate, its distance left of the imaginary axis (1/s): body pair 1.60, wheel hop 20.4.
- **ω_d**: ringing frequency (rad/s): body 7.45, wheel hop 71.4 (11.8 Hz).
- **ζ**: damping ratio (no unit).
- **Decay ratio**: σ_fast/σ_slow, no unit: 12.8×.

### Worked example: on the corner with its wheel

The decay ratio is 20.4/1.6 = 12.8×, so the body pair dominates. Under a 1 kN load: overshoot 50.8 % (single mass 44.4 %), Tₛ 2.25 s (1.77 s).

### What it can't do

The rule is a rule of thumb. A zero near the dominant poles, or a slow pole in the controller (PI's), breaks it; see the tuned dish's −0.53 pole in *Choosing the three gains*.

<p class="src">Sources: LN2 s.29–34 (dropping far poles, keeping the DC gain). Not in lecture notes: the 5–10× rule of thumb and the corner's wheel model.</p>
