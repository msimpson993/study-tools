---
id: obs
order: 30
title: "Estimate what we can't measure: the observer"
category: state
neighbors: [sf, sep, cc]
level: Worked calculation
check: [q-obs, ck-obs-1, ck-obs-2]
---

**The question:** we have a height sensor but no velocity sensor; how do we feed back a state we can't measure? This is the box *Estimate what we can't measure*, after *Feed back every state*.

### The big idea

Run the corner's model in software with the same actuator force, compare its predicted height with the measured one, and nudge both estimates by L times the difference. The estimation error then decays on its own, as fast as we choose.

### See it

The real body and the ghost estimate start apart and lock on. ×10 locks on faster but the velocity estimate gets noisy: L = [156, 9312] multiplies the sensor noise.

```figure:obs
```

### The math

```eq
x̂̇ = Ax̂ + Bu + L(y − Cx̂);   e = x − x̂  ⇒  ė = (A − LC)e
```

```eq
det(sI − (A − LC)) = s² + (4 + l₁)s + (64 + 4l₁ + l₂)
```

Choosing L is pole placement on Aᵀ, Cᵀ (duality).

**What each symbol means.** x̂: the estimate; e: the estimation error; L = [l₁, l₂]ᵀ, in 1/s and 1/s².

### Worked example: on the corner

×5 the controller poles (−40 ± 30j): s² + 80s + 2500, so L = [76, 2132]. ×2: [28, 224]. ×10: [156, 9312].

### Exam example

LN4 slides 22–29: A = [[2, 3], [−1, 4]], C = [1, 0], ζ 0.8, ωₙ 10 give L = [22, 59].

### What it can't do

It trusts the model: a wrong k biases the velocity estimate. The "2–10× faster" rule is *added*, not from the notes.
