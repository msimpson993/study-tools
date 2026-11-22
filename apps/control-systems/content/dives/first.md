---
id: first
order: 8
title: "One pole: the yardstick K/(τs + 1)"
category: predict
neighbors: [splane, second, reduce, dominant]
level: Conceptual
check: [q-first, ck-first-1, ck-first-2]
---

**The question:** what does a single real pole do, and how close is the house to one? This is the box *One pole: the yardstick*, after *Poles and zeros*.

### The big idea

- **Shape:** a one-pole plant rises smoothly with no overshoot.
- **Two numbers:** its final value is K × input, and it covers 63 % of the way in one time constant τ.
- **The house:** its fast pole has died out after the first couple of hours, so its step response looks almost like this. "τ ≈ 5 h, 8.2 K per kW" sums up the whole house.

### See it

Solid: the true two-pole house. Dashed: the stand-in. The stand-in runs ahead in the first hour (the real bedroom waits for heat to cross the inner wall), then the curves merge.

```figure:first
```

### The math

```eq
G(s) = K/(τs + 1),   y(t) = K·u·(1 − e^(−t/τ))
```

- Tₛ (2 %) = 4τ; T_r (10–90 %) = 2.2τ.
- K: the DC gain (K per W); τ: the time constant (h).

**What each symbol means.**

- **K**: the DC gain, the final output per unit of steady input. For the house, 8.18 K per kW. The letter is the gain; the unit "K" after a number is kelvin.
- **τ**: the time constant, the time to cover 63 % of the way (h). The house's stand-in has τ = 5 h.
- **u**: the steady input step (W).
- **y(t)**: the output over time (K above outdoors).
- **t**: time (h).
- **Tₛ**: 2 % settling time, 4τ (h).
- **T_r**: 10–90 % rise time, 2.2τ (h).
- **x₂(t)**: the true bedroom temperature above outdoors (K), for comparison.

### Worked example: on the house

- True: x₂(t) = 20.45 − 22.5e^(−0.2t) + 2.05e^(−2.2t): 2.26 K at 1 h, 12.18 K at 5 h (59.5 %), 17.41 K at 10 h; it settles (2 %) at 20.0 h, and the 10–90 % rise takes 11.1 h.
- Stand-in (drop −2.2, keep the DC gain): 63 % at 5 h, Tₛ = 20 h. The largest gap is 1.46 K, early on.

### What it can't do

A first-order model can't overshoot or ring, and it misses the early delay. For the bedroom that delay is only about 25 min, so it doesn't matter. For a plant that swings past its target, a one-pole model misses the main behaviour, which is why the next box needs two poles.

<p class="src">Sources: LN1 s.47–49.</p>
