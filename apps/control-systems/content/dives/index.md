---
id: index
order: 22
title: "The best gain in one number"
category: pid
neighbors: [tuning, methods, derivative]
level: Worked calculation
check: [q-index, ck-index-1, ck-index-2]
---

**The question:** can "best" be made into one number we minimise? This is the side box *The best gain in one number*, under *Choosing the three gains*.

### The big idea

Integrate the error over the whole response and you get one score; the best gain minimises it. ISE punishes big early errors (so prefers fast, lightly damped responses); IAE and ITAE punish the long tail more (more damping).

### See it

The shaded area is the index; the lower curve is the index against the gain, with its minimum marked. Try the four presets.

```figure:index
```

### The math

```eq
ISE = ∫e² dt,   IAE = ∫|e| dt,   ITAE = ∫t|e| dt
```

```eq
E = (s + a₁)/(s² + a₁s + a₀)  ⇒  ISE = (a₀ + a₁²)/(2a₀a₁)
```

This is the step error of a type-1 second-order loop (from the Lyapunov table). For the dish with Kp = 1000 and a rate gain K_r: a₀ = 100, a₁ = 2 + 0.1K_r, so ISE = 1/(2a₁) + a₁/200.

**What each symbol means.** K₃: the telescope's gain; K_r: the rate (tachometer) gain, N·m·s/rad. It is written K_r, not K_v, to avoid clashing with the velocity constant of *System type*. The optimum is where dI/dK = 0.

````callout:derivation Full derivation
The telescope (LN2 slides 26–28): ISE = 1/K₃ + 0.1K₃, so the optimum is K₃ = √10 = 3.162 (ζ = 0.5, ISE 0.6325); at K₃ = 4 the ISE is 0.65. The IAE optimum is K₃ = 4.189, ζ = 0.662 (slide 28 rounds to 4.2, 0.665).
````

### Worked example: on the dish's rate gain

The ISE minimum is at a₁ = 10, so K_r = 80 (ζ 0.5, ISE 0.1); IAE's is at 112.5 (ζ 0.662); ITAE's at 130.5 (ζ 0.752). The hand-tuned Kd = 120 (ζ 0.7) sits between. At Kp = 2000 the optima are 121.4 (ISE), 167.4 (IAE) and 192.8 (ITAE), against the tuned 200.

### What it can't do

It ignores torque, noise and robustness, and a different index gives a different "best".

<p class="src">Sources: LN2 s.23–28 (ISE, IAE, ITAE and ITSE defined on s.23–25; the telescope on s.26–28). Exam practice: Review › Mini exam 2, Problem 4.</p>
