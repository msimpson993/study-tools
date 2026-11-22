---
id: index
order: 21
title: "The best gain in one number"
category: pid
neighbors: [tuning, methods, derivative]
level: Worked calculation
check: [q-index, ck-index-1, ck-index-2]
---

**The question:** can "best" be made into one number we minimise? This is the side box *The best gain in one number*, in the *Tuning toolkit* under *Choosing the three gains*.

### The big idea

Integrate the error over the whole response and you get one score; the best gain minimises it. ISE punishes big early errors (so prefers fast, lightly damped responses); IAE and ITAE punish the long tail more (more damping).

### See it

The shaded area is the index; the lower curve is the index against the gain, with its minimum marked. Try the four presets.

```figure:index
```

### The math

```eq
ISE = ∫e² dt,   IAE = ∫|e| dt,   ITAE = ∫t|e| dt,   ITSE = ∫t·e² dt
```

**The loop.** The dish with Kp = 1000 and a rate (tachometer) gain K_r closes to Θ/R = 100/(s² + a₁s + 100), with a₁ = 2 + 0.1K_r. For a unit step the error is

```eq
E(s) = (s + a₁)/(s² + a₁s + a₀),   a₀ = Kp/J = 100
```

**ISE in closed form.** A standard table for second-order errors gives ISE = (a₀ + a₁²)/(2a₀a₁). With a₀ = 100:

```eq
ISE = 1/(2a₁) + a₁/200
```

**What each symbol means.**
- **e(t)**: the error r − θ after a unit step (rad per rad of step).
- **a₀ = Kp/J**: stiffness over inertia (1/s²); 100 here.
- **a₁ = (B + K_r)/J**: total damping over inertia (1/s).
- **K_r**: the rate gain, N·m·s/rad. It is written K_r, not K_v, so it doesn't clash with the velocity constant of *System type*.
- **ζ = a₁/(2√a₀)**: the damping ratio.
- **ITSE = ∫t·e² dt**: like ISE, but late errors weigh more; the lecture notes list it beside the others; not used on the dish here.
- The best gain is where the index stops falling: dI/dK_r = 0.

````callout:derivation Full derivation: the ISE optimum on the dish
1. dISE/da₁ = −1/(2a₁²) + 1/200 = 0 ⇒ a₁² = 100 ⇒ **a₁ = 10 /s**.
2. K_r = 10(a₁ − 2) = **80 N·m·s/rad**, and ζ = 10/(2·10) = **0.5**.
3. ISE_min = 1/20 + 10/200 = **0.1 s** per unit step (0.001 rad²·s for the 0.1 rad step).
4. In general a₁ = √a₀, so the ISE optimum of this loop is always ζ = 0.5, whatever Kp.
5. IAE has no closed form here. Minimising it numerically gives a₁ = 13.25 /s: **K_r = 112.5, ζ = 0.662, IAE = 0.161 s**.
````

````callout:note Side panel: the telescope in the lecture notes
The notes work the same index on a telescope position loop with an adjustable gain K₃. Its error has the same form with a₀ = 2.5 and a₁ = 0.5K₃, so the same formula gives ISE = 1/K₃ + 0.1K₃.
- **ISE optimum:** K₃ = √10 = 3.162, ζ = 0.5, ISE 0.6325 (0.65 at K₃ = 4).
- **IAE optimum:** K₃ = 4.189, ζ = 0.662 (the notes round to 4.2 and 0.665).
- **The same ζ as the dish.** Changing a₀ only rescales time, which moves the best gain but not the best damping.

The full problem is in Review › Mini exam 2, Problem 4.
````

### Worked example: on the dish's rate gain

- **ISE:** K_r = 80 (ζ 0.5, ISE 0.1).
- **IAE:** K_r = 112.5 (ζ 0.662).
- **ITAE:** K_r = 130.5 (ζ 0.752).
- **Hand tuning:** the rate gain K_r = 120 is the Kd = 120 of *Derivative action* (the same loop: ζ 0.70, ISE 0.1057, IAE 0.1610). It sits between the IAE (112.5) and ITAE (130.5) optima.
- **At Kp = 2000:** the optima are 121.4 (ISE), 167.4 (IAE) and 192.8 (ITAE), against the tuned 200.

### What it can't do

It ignores torque, noise and robustness, and a different index gives a different "best".

<p class="src">Sources: LN2 s.23–25 (ISE, IAE, ITAE and ITSE defined), s.26–28 (the telescope). Not in lecture notes: the dish's rate-gain example and its IAE and ITAE optima. Exam practice: Review › Mini exam 2, Problem 4.</p>
