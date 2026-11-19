---
id: sens
order: 24
title: "What if the model is wrong? Sensitivity"
category: feedback
neighbors: [dist, fb, blocks]
level: Some algebra
check: [q-sens, ck-sens-1, ck-sens-2]
---

**The question:** the walls are only approximately what we modelled; how much does that matter once the thermostat is in the loop? This is the box *What if the model is wrong?*, after *A push we didn't command*.

### The big idea

In open loop a 10 % plant error is a 10 % output error. In closed loop only the fraction S = 1/(1 + L) gets through, because the loop measures the result and corrects. With high loop gain the room depends on the thermostat you built, not the walls you guessed; with PI, the steady value doesn't depend on the walls at all.

### See it

Make the walls leakier and compare the nominal (dashed) and perturbed (solid) responses: open loop, an 18 % shortfall; P, 2 %; PI, none.

```figure:sens
```

### The math

```eq
S_G^T = (∂T/T)/(∂G/G) = 1/(1 + GcGH) = S   (LN2 slides 5–9)
```

S is the fraction of a plant error that reaches the output (LN2 slides 5–9).

````callout:derivation Full derivation
T = GcG/(1 + GcGH), so ∂T/∂G = Gc/(1 + GcGH)², and (G/T)(∂T/∂G) = 1/(1 + GcGH).
````

```eq
Sensor sensitivity: S_H^T = −L/(1 + L) ≈ −1 for large L
```

The sensor must be right (*Why not infinite gain?*).

**What each symbol means.** T: the closed-loop transfer function; ∂G/G: the fractional plant error.

### Worked example: on the house, insulation 20 % worse

The leak goes from 0.2 to 0.24 /h, so G₂(0) drops from 8.18 to 6.70 K/kW (−18.2 %).

- P 1100: T(0) goes from 0.900 to 0.881 (−2.17 %; S predicts −1.82 %, the gap because the change isn't small).
- PI: 0 %. With PI the steady value doesn't depend on the walls at all.
- |S| peaks at 1.33 near 2.6 rad/h: around that speed, feedback slightly *amplifies* model errors.

### What it can't do

It's a small-change, low-frequency result; |S| > 1 near crossover means feedback can make things worse at some speeds.

<p class="src">Sources: LN2 s.5–9, 11–13. Exam practice: Review › Mini exam 2, Problems 1–2.</p>
