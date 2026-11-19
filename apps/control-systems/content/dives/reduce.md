---
id: reduce
order: 5
title: "Shrink the model, keep the behaviour"
category: predict
neighbors: [first, dominant]
level: Worked calculation
check: [q-reduce, ck-reduce-1, ck-reduce-2]
---

**The question:** can a big model be replaced by a smaller one that behaves the same? This is the side box *Shrink the model*, under *One pole: the yardstick*.

### The big idea

A smaller model is easier to design with. The crude way drops fast poles and rescales so the DC gain is unchanged. The notes' way matches the frequency response at low frequency term by term, which fixes the small model's coefficients.

### See it

On the house the two first-order models differ by at most 0.03 K, because the poles are 11× apart. Switch to the notes' third-order example and try both orders.

```figure:reduce
```

### The math

```eq
G(s) = 1/(1 + a₁s + a₂s²) ≈ 1/(1 + d₁s),   d₁² = a₁² − 2a₂
```

This matches |G(jω)|² up to ω² (the notes' Δ₂ condition, LN2 slide 31).

**What each symbol means.** a_i: the full model's denominator coefficients, normalised so a₀ = 1; d_i: the reduced model's. House: a₁ = 5.4545 h, a₂ = 2.2727 h², so Δ₂ = 25.207 and d₁ = 5.0206 h.

````callout:derivation Full derivation
The notes' example 6/((s + 1)(s + 2)(s + 3)) to second order: Δ₂ = 49/36, Δ₄ = 7/18 → d₁ = 1.6150, d₂ = 0.6236 → 1.6036/(s² + 2.5898s + 1.6036). To first order: 0.857/(s + 0.857).

Dropping a far pole instead: 300/((s + 1)(s + 3)(s + 30)) → 10/((s + 1)(s + 3)), keeping the DC gain 3.33.
````

### Worked example: on the house

Frequency matching gives 20.45/(5.021s + 1), with a largest step gap of 1.447 K against the true house; dropping −2.2 gives τ = 5 h and a gap of 1.463 K.

### What it can't do

It keeps low-frequency behaviour only. A reduced model with more zeros than poles is not causal.
