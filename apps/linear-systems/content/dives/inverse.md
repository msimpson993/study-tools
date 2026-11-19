---
id: inverse
order: 6
title: "Going back: partial fractions, residues and the ROC"
addsToExample: "Recovers the speaker's click response from its two poles: h(t) = (Bl/Re)/(Mms ω_d) · e^(−σt) sin(ω_d t) u(t), with σ ≈ 1,267 /s and ω_d ≈ 4,322 rad/s."
accountsFor: "Why the click response is a decaying sine at about 690 Hz that has died away within a few milliseconds."
category: signals
neighbors:
  - roc
  - laplace
  - diffeq
  - jordan
matlab: "[r, p, k] = residue(b, a)    % residuez for z⁻¹ polynomials"
exampleScene: { overlays: [click], caption: "Two complex poles give one decaying sine: the click response." }
level: Worked calculation
check: [c-inv-1, c-inv-2]
---

**The question:** how do you get the signal back, and how does the ROC change the answer? It follows *Region of convergence*: split X into partial fractions, invert each pole term, and let the ROC decide whether each term is right-sided or left-sided.

### The big idea

How a formula becomes a signal, and why the same formula with a different ROC is a different signal. Worked out in full in the Review area (A1 and A2).

### See it

**Picture it first.** The poles are where |X(s)| shoots up; the ROC is the region the inverse line must run through. Each pole contributes one term to the answer, weighted by its residue; the figure does this for the speaker.

```figure:inverse
```

```figure:laplace
```

### The math

Every rational transform splits into first-order pieces, one per pole. Each piece has a known inverse, and the ROC says whether it is the right-sided or the left-sided version.

**Two ways to do the same thing.**

1. **Partial fractions** (cover-up): for a simple pole p, the coefficient is (s − p)X(s) evaluated at s = p.
2. **Contour integral and residues**: x(t) = (1/2πj)∫ X(s)e^(st)ds along a vertical line inside the ROC. For t > 0 close the contour to the left (counterclockwise) and add the residues of X(s)e^(st) at the poles it encloses; for t < 0 close to the right and subtract the residues there.

$$\operatorname*{Res}_{s=p}\big[X(s)e^{st}\big]=\frac{1}{(m-1)!}\,\frac{d^{\,m-1}}{ds^{\,m-1}}\Big[(s-p)^m X(s)e^{st}\Big]_{s=p}\quad\text{(pole of order }m)$$

**The Z pairs, with a delay.** For X(z) with no z factor upstairs, use

$$\frac{1}{z-a}\;\leftrightarrow\;\begin{cases}a^{n-1}u(n-1), & |z|>|a|\ \text{(right-sided)}\\[2pt]-a^{n-1}u(-n), & |z|<|a|\ \text{(left-sided)}\end{cases}$$

If X(z) has a factor z upstairs, expand X(z)/z instead and use z/(z − a) ↔ aⁿu(n) (right) or −aⁿu(−n − 1) (left).

**What each symbol means.**

- $p$: a pole of $X(s)$; $m$: its order.
- Residue: the weight of the term $e^{pt}$ in the time signal.
- $a$: a pole of $X(z)$; inside or outside the ROC ring decides right- or left-sided.
- $u(t)$, $u(n)$: the unit step (signal on from 0).

### Worked example: on the earbud

1. The earbud's H(s) has two poles, $-\sigma \pm j\omega_d$ with $\sigma \approx 1{,}267$ /s and $\omega_d \approx 4{,}322$ rad/s.
2. Each gives a term (residue) × $e^{pt}$; the conjugate pair combines into one real sine.
3. So $h(t) \propto e^{-\sigma t}\sin(\omega_d t)\,u(t)$: a 688 Hz ring with decay time constant 0.79 ms, exactly the click response.

**Exam-style example.** X(z) = 1/((z − ½)(z + 2)(z + 3)) with ROC 2 < |z| < 3. Cover-up gives 4/35 at ½, −2/5 at −2 and 2/7 at −3. The poles ½ and −2 are inside the ring (right-sided), −3 is outside (left-sided):

$$x(n)=\Big[\tfrac{4}{35}\big(\tfrac12\big)^{n-1}-\tfrac25(-2)^{n-1}\Big]u(n-1)-\tfrac27(-3)^{n-1}u(-n).$$

Laplace with a double pole: Y = 1/(s + 3)², Re s > −3. The residue of e^(st)/(s + 3)² at −3 is d/ds e^(st) = t e^(−3t), so y(t) = t e^(−3t)u(t).

### What it can't do

Partial fractions work once you have X(s). They don't tell you how to get H from an equation you meet on a chip, a difference equation, and they don't say whether the system settles.

**Next question.** Repeated poles need the derivative formula and give tᵏe^(pt) terms. In state space the same thing happens when A has a Jordan block.

### Common pitfalls

- 1/(z − a) is not aⁿu(n): it is that sequence delayed by one sample.
- The left-sided pair has a minus sign: −aⁿu(−n − 1) ↔ +z/(z − a).
- Using the simple-pole residue on a double pole gives e^(−3t) instead of t e^(−3t).
- Closing the contour on the wrong side: for t > 0, e^(st) dies as Re s → −∞, so close left.
