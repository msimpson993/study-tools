---
id: refin
order: 32
title: "Follow a command: the reference input"
category: state
neighbors: [sep, sf, first, integral]
level: Worked calculation
check: [q-ref, ck-ref-1, ck-ref-2]
---

**The question:** state feedback returns every state to zero; how do we make the corner go to a commanded ride height instead? This is the box *Follow a command*, after *Use the estimate*.

### The big idea

State feedback returns every state to zero. To go somewhere else, add the command into the force, scaled so the final height equals it. That scale is one over the closed loop's DC gain: the same s → 0 reading as the yardstick's final value. It trusts the model.

### See it

Step the ride height and make the real spring stiffer or softer than modelled. Make it 10 % stiffer: the car stops 6 % short.

```figure:refin
```

With N̄ off, the command enters only as a height error, u = −k₁(z − r) − k₂ż. The body then stops at k₁/(k + k₁) = 36 % of the command (0.72 cm of a 2 cm step), because the passive spring keeps pulling it back while k₁ alone does the pushing. N̄ = k + k₁ = 40 000 N/m scales the command so the body lands exactly on it.

### The math

```eq
u = −Kx̂ + N̄r:   ẋ = (A − BK)x + BN̄r
```

```eq
DC gain −C(A − BK)⁻¹B·N̄ = 1  ⇒  N̄ = 1/(−C(A − BK)⁻¹B)
```

Corner: −C(A − BK)⁻¹B = (1/m)/((k + k₁)/m) = 1/(k + k₁), so N̄ = 40 000 N/m.

The notes (LN4 slides 41–44) write M = BN̄; the alternative M = −L feeds y − r to the observer.

**What each symbol means.** r: the commanded height (m); N̄: the reference gain (N/m); M: how the command enters the observer.

````callout:derivation Full derivation
At rest ẋ = 0, so x_ss = −(A − BK)⁻¹BN̄r and y_ss = −C(A − BK)⁻¹BN̄r. Set y_ss = r.
````

### Worked example: on the corner, raise 2 cm

1.5 % overshoot, Tₛ 0.38 s. The actuator starts at N̄r = 800 N and settles at 512 N, exactly the spring's extra load for 2 cm (25.6 kN/m × 2 cm). With the spring 10 % stiffer than modelled the car stops 6.0 % short.

### What it can't do

It leaves an offset under model error or a steady load (luggage); integral action on the height error would remove it (look back to *One pole: the yardstick* and *Integral action*).

<p class="src">Sources: LN4 s.41–44 (the notes write N̄ as N, and also show feeding the observer y − r).</p>
