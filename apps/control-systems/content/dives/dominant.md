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

Each pole's motion decays at its own rate. One five times farther left decays e⁵ ≈ 150 times faster, so it's gone before the slow one has moved much. The slow, *dominant* pair shapes the response, which is why second-order specs work on real hardware, and why the single-mass corner was allowed. (The 5–10× rule is *added*, a rule of thumb.)

### See it

Turn the wheel on (40 kg on a 200 kN/m tyre), then soften the tyre: wheel hop comes down toward the body's frequency and the single-mass model breaks.

```figure:dominant
```

### The math

Two masses: the body m (400 kg) and the wheel m_u (40 kg), with the suspension k, c between them and the tyre k_t below. Four poles: the body pair at −1.60 ± 7.45j and wheel hop at −20.4 ± 71.4j (11.8 Hz, ζ = 0.275). When dropping a pole, keep the DC gain.

### Worked example: on the corner with its wheel

The decay ratio is 20.4/1.6 = 12.8×, so the body pair dominates. Under a 1 kN load: overshoot 50.8 % (single mass 44.4 %), Tₛ 2.25 s (1.77 s).

### What it can't do

The rule is a rule of thumb. A zero near the dominant poles, or a slow pole in the controller (PI's), breaks it; see the tuned dish's −0.53 pole in *Choosing the three gains*.
