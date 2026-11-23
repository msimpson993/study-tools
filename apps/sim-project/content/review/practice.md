---
id: practice
order: 2
title: "Practice problems on the four machines"
summary: "Eight worked problems in exam and lab-report style, built on the project's own machines: the motor's sag at a new gain, the boring machine's closed loop and offset, a two-goal spec, sensitivity, the disk head's step error, shock offset and gain ceiling, and reading the PID Tuner's tables. Solutions are collapsed."
covers: "Dorf §4.9–4.10 (Examples 4.4, 4.5, §4.10) and the PID Tuner handout"
---
**How to use this page.** Do each problem with the solution closed, then compare step by step. Problems 1–6 use only the handout's models; 7 and 8 use the page's reconstructions and say so.

### Problem 1: the motor at a different gain

The motor of Example 4.4 (Table 4.2) runs closed loop with Ka = 20, Kt = 1. Find the steady speed change for a unit step load, the ratio to open loop, and the time constant. Does it meet the 0.02 rule?

````callout:derivation Solution
Total drag = b + Km(Ka·Kt + Kb)/Ra = 0.5 + 10(20 + 0.1) = 201.5 N·m·s.
- Sag = −1/201.5 = **−0.00496 rad/s**.
- Ratio = 1.5/201.5 = **0.0074** < 0.02 ✓.
- τ = J/201.5 = 2/201.5 = **9.93 ms**.
````

### Problem 2: derive the boring machine's closed loop

With G = 1/(s(s + 1)), Gc = K + 11s, the push T_d added at the machine's input, derive Y(s) in terms of R and T_d, and find the final offset for a unit step push.

````callout:derivation Solution
Y = G[Gc(R − Y) + T_d] ⇒ Y(1 + GcG) = GcG·R + G·T_d. Multiply through by s(s + 1):
**Y = (K + 11s)/(s² + 12s + K)·R + 1/(s² + 12s + K)·T_d.**
Final value, T_d = 1/s: lim s·1/(s² + 12s + K)·1/s = **1/K** (stable for all K > 0, since 12 > 0 and K > 0).
````

### Problem 3: two goals, one knob

A spec asks for step overshoot ≤ 10 % and push offset ≤ 2 % on the boring machine (rate gain fixed at 11). Is there a K that meets both?

````callout:derivation Solution
- Offset ≤ 2 % ⇒ 1/K ≤ 0.02 ⇒ K ≥ 50. At K = 50 the overshoot is 12.9 %.
- Overshoot ≤ 10 % ⇒ K ≤ 38.7 (offset 2.6 %).
**No K meets both.** A second knob is needed: e.g. rate gain 20 at K = 100 gives 10.1 % overshoot and 1 % offset (numbers from numbers.py; not in lab handout).
````

### Problem 4: sensitivity

For the boring machine at K = 20, a 10 % slow drift (ω = 1 rad/s) in the machine changes the closed loop by how much? Compare with the shortcut s/K.

````callout:derivation Solution
S(j1) = j(j + 1)/(−1 + 12j + 20) ⇒ |S| = √2/√(19² + 12²) = 1.414/22.47 = **0.063** ⇒ about **0.63 %**.
Shortcut: |s/K| = 1/20 = 0.05 ⇒ 0.5 %. Close, because 1 rad/s is still slow for this loop.
````

### Problem 5: the disk head's step error and shock offset

Show that the head's steady error to a unit step command is zero for any stable Ka, and find the shock offset at Ka = 80.

````callout:derivation Solution
E = R/(1 + Ka·G₁·G₂). As s → 0, G₂ = 1/(s(s + 20)) → ∞, so e(∞) = lim s·E = **0**.
Shock: Y/T_d = −G₂/(1 + Ka·G₁·G₂) → −1/(Ka·G₁(0)) = −1/(80 × 5) = **−0.0025**.
````

### Problem 6: the ceiling on Ka (not in lab handout)

Find the range of Ka for which the disk head loop is stable, and the frequency at which it oscillates at the limit.

````callout:derivation Solution
s³ + 1020s² + 20000s + 5000Ka. Routh first column: 1, 1020, (1020·20000 − 5000Ka)/1020, 5000Ka. All positive ⇔ **0 < Ka < 4080**.
At Ka = 4080 the auxiliary equation 1020s² + 5000·4080 = 0 gives s = ±j√20000 = ±**j141.4 rad/s**.
````

### Problem 7: reading the PID Tuner tables

From the handout's three tables: (a) which designs meet the 5 s settling requirement? (b) which has the least overshoot? (c) explain in two sentences why the slower design has P = 0.

````callout:derivation Solution
(a) All three: 1.96 s, 3.45 s, 1.81 s.
(b) The final design (0 %).
(c) At the slow crossover (0.645 rad/s) the engine adds only about 21° of lag, so keeping a 60° phase margin would need 99° of controller lag, more than a PI controller's maximum of 90° (pure I). The tuner therefore sets P = 0, and the margin rises to 69.3°, as the table shows. (Reconstruction on a stand-in engine fitted to the tables; not in lab handout.)
````

### Problem 8: why PI on the engine (not in lab handout)

On the stand-in engine (steady gain ≈ 311 rpm per unit throttle), what steady error would P = 0.0042253 alone leave on a unit speed step, and what does adding I change?

````callout:derivation Solution
Error = 1/(1 + P·K_e) = 1/(1 + 0.0042253 × 311) = 1/2.31 = **0.43** (43 % of the step).
With any I > 0 and a stable loop, the integral keeps growing while error remains, so the loop can only settle at **zero error**: Project 1's second requirement.
````

<p class="src">Sources: Dorf Examples 4.4 and 4.5, §4.10; PID Tuner handout pp.1–5. Not in lab handout: Problems 3 (second knob), 6 and 8, and the reconstruction in 7(c).</p>
