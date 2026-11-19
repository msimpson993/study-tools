---
id: sf
order: 29
title: "Feed back every state: pole placement and Ackermann"
category: state
neighbors: [cc, obs, sep, refin]
level: Worked calculation
check: [q-sf, q-ack, ck-sf-1]
---

**The question:** with both states known, what force law puts the corner's poles wherever we want? This is the box *Feed back every state* (and its side box *Ackermann*), after *Can we reach and see every state?*.

### The big idea

Feed back a weighted sum of all the states and you choose every coefficient of the closed-loop polynomial, so you can put the poles anywhere (if controllable). On the corner, an actuator between body and wheel with u = −k₁z − k₂ż adds k₁ to the spring and k₂ to the shock, in software.

### See it

Drag the target poles (default −8 ± 6j) and try the load and the speed bump against the passive ghost. Comfort is in acceleration: the active body sees 3.5 m/s² peak instead of 5.7.

```figure:sf
```

### The math

```eq
A − BK = [[0, 1], [−(k + k₁)/m, −(c + k₂)/m]]
```

Target ζ = 0.8, ωₙ = 10: s² + 16s + 100, so (k + k₁)/m = 100 and (c + k₂)/m = 16.

<a id="ack"></a>**Ackermann** (LN4 slides 19–21): K = [0 … 0 1]P_c⁻¹q(A), where q is the target polynomial.

**What each symbol means.** K = [k₁, k₂]: the state-feedback gains, k₁ in N/m and k₂ in N·s/m; q(A): the target polynomial evaluated at the matrix A.

### Worked example: on the active corner

- K = [14 400, 4 800] (Ackermann agrees).
- 1 kN load: sag 2.5 cm (against 3.9), 1.5 % overshoot, Tₛ 0.38 s.
- Speed bump (5 cm for 0.2 s): passive peak 3.89 cm, dip −1.73 cm, peak acceleration 5.71 m/s², 0.77 cm still moving after 1 s. Active: 1.93 cm, 3.51 m/s², ≤ 0.001 cm after 1 s, peak force 987 N.

### What it can't do

It needs every state (*Estimate what we can't measure*); faster poles need more force; a model error moves the poles.

<p class="src">Sources: LN4 s.17–21 (pole placement, Ackermann s.19–21). Exam practice: Review › Mini exam 2, LN4 worked examples.</p>
