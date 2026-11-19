---
id: part-a
order: 1
title: "Practice exam, part A: transforms, difference equations, optimal control"
summary: "Step-by-step walkthroughs of A1 (inverse Z with an ROC), A2 (Laplace and a contour/residue inverse with a double pole), A3 (a difference equation solved with Z) and A4 (Pontryagin with fixed endpoints), each with the rule behind every step, a picture to hold on to and the usual traps. The 12 matching practice variants make up this page's self-test."
covers: "Practice problems A1–A4 and variants Z1–Z3, L1–L3, D1–D3, P1–P3"
quizTag: part-a
quizSubsets:
  - { tag: v-zinv, label: "Inverse Z" }
  - { tag: v-lap, label: "Laplace & residues" }
  - { tag: v-deq, label: "Difference equations" }
  - { tag: v-pmp, label: "Pontryagin" }
---
**How to use this page.** Read the problem, try it on paper, then open the walkthrough and compare step by step: each step names the rule it uses, so you can see exactly where you went off. Every answer here was checked symbolically and numerically. The map links go to the box that builds the idea. The self-test (button above) is the twelve practice variants of these four problems.

| Problem | Skill | On the map |
|---|---|---|
| A1 | partial fractions in z, ROC → right- or left-sided terms | [Region of convergence](#/dive/roc), [Going back](#/dive/inverse) |
| A2 | convolution theorem, ROC of a product, Bromwich contour, double-pole residue | [Laplace and Z](#/dive/laplace), [Going back](#/dive/inverse) |
| A3 | shift theorem, forced plus natural response | [Equations as algebra](#/dive/diffeq) |
| A4 | Hamiltonian, costate, two-point boundary problem with Φ of the Hamiltonian matrix | [The best input](#/dive/optimal), [Cayley–Hamilton](#/dive/cayley) |

### A1. Inverse Z-transform with an ROC

$X(z) = \dfrac{1}{(z-\frac12)(z+2)(z+3)}$. (a) Which ROC makes $x(n)$ right-sided? (b) With ROC $2<|z|<3$, find $x(n)$.

<details class="fold">
<summary>Step-by-step walkthrough</summary>

1. **Poles.** $z = \tfrac12,\,-2,\,-3$, at radii $\tfrac12, 2, 3$. So there are four possible ROCs: $|z|<\tfrac12$, $\tfrac12<|z|<2$, $2<|z|<3$, $|z|>3$.
2. **(a) Right-sided.** *Rule: a right-sided sequence has its ROC outside the outermost pole.* So the ROC is $\boxed{|z|>3}$. It includes $z=\infty$, so the sequence is also causal.
3. **Partial fractions** (*rule: cover-up*). $A = \dfrac{1}{(\frac12+2)(\frac12+3)} = \dfrac{4}{35}$, $B = \dfrac{1}{(-2-\frac12)(-2+3)} = -\dfrac25$, $C = \dfrac{1}{(-3-\frac12)(-3+2)} = \dfrac27$. Check: $A+B+C = 0$, as it must be since $X \sim z^{-3}$ at infinity.
4. **Pairs with a delay.** *Rule: $\dfrac{z}{z-a} \leftrightarrow a^n u(n)$ for $|z|>|a|$ and $-a^n u(-n-1)$ for $|z|<|a|$; a factor $z^{-1}$ shifts $n \to n-1$.* So $\dfrac{1}{z-a} \leftrightarrow a^{n-1}u(n-1)$ (right-sided) or $-a^{n-1}u(-n)$ (left-sided).
5. **(b) Apply the ring $2<|z|<3$.** The poles at $\tfrac12$ and $-2$ are inside the ring: right-sided. The pole at $-3$ is outside: left-sided.
$$x(n)=\Big[\tfrac{4}{35}\big(\tfrac12\big)^{n-1}-\tfrac25(-2)^{n-1}\Big]u(n-1)\;-\;\tfrac27(-3)^{n-1}u(-n)$$
Sample values for $n = -3,\dots,4$: −0.003527, 0.010582, −0.031746, 0.095238, −0.285714, 0.857143, −1.571429, 3.214286.
6. For (a) the same coefficients give $x(n) = \big[\tfrac{4}{35}(\tfrac12)^{n-1} - \tfrac25(-2)^{n-1} + \tfrac27(-3)^{n-1}\big]u(n-1)$, which is zero at $n = 1, 2$ and starts at $n = 3$, matching $X \sim z^{-3}$.

</details>

**Picture it.** Three poles on the real axis; the ring $2<|z|<3$ sits between the second and third. Each pole looks either inward or outward from the ring: inward poles give terms that run forward in time, the outward pole gives a term that runs backward, where $(-3)^{n-1}$ shrinks as $n \to -\infty$. The unit circle is not in the ring, so this $x(n)$ has no DTFT.

```picture:pic-rev-a1 Left (top on a phone): the poles ½, −2 (inside the ring, blue) and −3 (outside, orange), the ROC ring 2 < |z| < 3 and the unit circle. Right (below on a phone): x(n) for n = −4…4.
z-plane with the ring ROC between radius 2 and 3, and the stems of x(n): left-sided for n ≤ 0, right-sided for n ≥ 1.
```

**Traps.** Expanding $X(z)/z$ when there is no $z$ upstairs (it works, but adds a pole at 0 and a $\delta(n)$ term). Forgetting the delay: $1/(z-a)$ is not $a^n u(n)$. The sign on left-sided terms. Treating "right-sided" as "the ROC contains the unit circle": sidedness and stability are different questions.

### A2. Laplace transforms, ROC, and inversion by contour integration

$h(t) = e^{-3t}u(t)$ and $x(t) = e^{-3t}u(t)$. Find $H(s)$, $X(s)$ and $Y(s)$ with their ROCs, then find $y(t)$ by contour integration.

<details class="fold">
<summary>Step-by-step walkthrough</summary>

1. *Rule: $e^{-at}u(t) \leftrightarrow \dfrac{1}{s+a}$, $\operatorname{Re}s > -a$.* So $H(s) = X(s) = \dfrac{1}{s+3}$, $\operatorname{Re}s>-3$.
2. *Rule: convolution ↔ product; the ROC contains the intersection.* $Y(s) = \dfrac{1}{(s+3)^2}$, $\operatorname{Re}s>-3$.
3. **Contour.** $y(t) = \dfrac{1}{2\pi j}\displaystyle\int_{\sigma-j\infty}^{\sigma+j\infty} Y(s)e^{st}\,ds$ with $\sigma>-3$, a vertical line inside the ROC. For $t>0$, $e^{st}\to0$ as $\operatorname{Re}s\to-\infty$, so close with a large semicircle to the left: counterclockwise, it encloses $s=-3$, and Jordan's lemma kills the arc. For $t<0$ close to the right: no poles there, so $y=0$.
4. **Residue at a pole of order 2.** *Rule: $\operatorname{Res} = \dfrac{1}{(m-1)!}\dfrac{d^{m-1}}{ds^{m-1}}\big[(s-p)^m Y e^{st}\big]_{s=p}$.* Here $\operatorname{Res} = \dfrac{d}{ds}e^{st}\Big|_{s=-3} = t\,e^{-3t}$.
$$y(t)=t\,e^{-3t}u(t)$$

</details>

**Picture it.** One double pole at −3, and the ROC is the half-plane to its right. A repeated pole is what you get when you feed a system its own natural mode: $t e^{-3t}$ first grows, then decays, the continuous-time version of driving a system at its eigenvalue.

```picture:pic-rev-a2 Left (top on a phone): the double pole at −3, the ROC Re s > −3 and the Bromwich contour. Right (below on a phone): y(t) = t e^(−3t), peaking at t = 1/3.
s-plane with a double pole at −3 and the ROC to its right; the response t e^(−3t) rises, peaks at t = 1/3 and decays.
```

**Traps.** The simple-pole residue on a double pole gives $e^{-3t}$, which is wrong. Forgetting $u(t)$. Closing to the right for $t>0$. Taking the union of ROCs. **Sign convention:** with the standard Bromwich orientation (upward line, closed to the left) $y = +\sum\operatorname{Res}$; if your course defines the contour clockwise, $y = -\sum\operatorname{Res}$.

### A3. Difference equation via the Z-transform

$y(n) = -\tfrac34 y(n-1) - \tfrac18 y(n-2) + x(n)$, $x(n) = (\tfrac12)^n u(n)$, zero initial conditions. Find $X(z)$, $Y(z)$, their ROCs and $y(n)$.

<details class="fold">
<summary>Step-by-step walkthrough</summary>

1. *Rule: $a^n u(n) \leftrightarrow \dfrac{z}{z-a}$, $|z|>|a|$.* $X(z) = \dfrac{z}{z-\frac12}$, $|z|>\tfrac12$.
2. *Rule: $y(n-k) \leftrightarrow z^{-k}Y(z)$ with zero initial conditions.* $Y\,(1 + \tfrac34 z^{-1} + \tfrac18 z^{-2}) = X$, so $H(z) = \dfrac{z^2}{(z+\frac14)(z+\frac12)}$ and
$$Y(z)=\frac{z^3}{(z-\frac12)(z+\frac14)(z+\frac12)},\quad |z|>\tfrac12 .$$
The system is causal, so the ROC is outside the largest pole.
3. **Partial fractions of $Y/z$** $= \dfrac{z^2}{(z-\frac12)(z+\frac14)(z+\frac12)}$: residues $\tfrac13$ at $\tfrac12$, $-\tfrac13$ at $-\tfrac14$, $1$ at $-\tfrac12$.
4. **Invert.**
$$y(n)=\Big[\tfrac13\big(\tfrac12\big)^n-\tfrac13\big(-\tfrac14\big)^n+\big(-\tfrac12\big)^n\Big]u(n)$$
$y(0), y(1), y(2) = 1,\ -0.25,\ 0.3125$ and $y(3), y(4), y(5) = -0.078125,\ 0.082031,\ -0.020508$.
5. **Check against the recursion:** $y(0) = x(0) = 1$ and $y(1) = -\tfrac34 + \tfrac12 = -\tfrac14$. ✓

</details>

**Picture it.** The output is the input's mode $(\tfrac12)^n$ plus the system's natural modes $(-\tfrac14)^n$ and $(-\tfrac12)^n$: forced plus homogeneous. The system poles sit on the negative real axis, so the natural modes alternate in sign; everything is inside the unit circle, so it all decays.

```picture:pic-rev-a3 Left (top on a phone): the input pole ½ (orange) and the system poles −¼, −½ (blue), all inside the unit circle. Right (below on a phone): y(n) for n = 0…8 from the recursion.
z-plane with three poles inside the unit circle, and stems of y(n) that alternate in sign and decay.
```

**Traps.** Partial fractions on $Y(z)$ instead of $Y(z)/z$. Moving $-\tfrac34y(n-1)$ across: the characteristic polynomial is $z^2 + \tfrac34z + \tfrac18$. Checking only the algebra and not $y(0)$, $y(1)$.

### A4. Pontryagin minimum principle with fixed endpoints

$\dot x = 6x + u$, $J = \int_0^1 (x^2 + 2u^2)\,dt$, $x(0) = 1$, $x(1) = 2$. Find (a) $H$, (b) $u^\circ$, (c) the state and costate equations, (d) $u^\circ(t)$ using the state transition matrix of the Hamiltonian system.

<details class="fold">
<summary>Step-by-step walkthrough</summary>

1. **(a)** *Rule: $H = L + \lambda f$* (no ½, since the cost has none): $H = x^2 + 2u^2 + \lambda(6x+u)$.
2. **(b)** *Rule: $\partial H/\partial u = 0$.* $4u + \lambda = 0$, and $\partial^2H/\partial u^2 = 4 > 0$, a minimum: $u^\circ = -\lambda/4$.
3. **(c)** *Rules: $\dot x = \partial H/\partial\lambda$, $\dot\lambda = -\partial H/\partial x$.* $\dot x = 6x - \tfrac14\lambda$, $\dot\lambda = -2x - 6\lambda$, that is
$$\begin{bmatrix}\dot x\\\dot\lambda\end{bmatrix}=\underbrace{\begin{bmatrix}6&-\frac14\\-2&-6\end{bmatrix}}_{M}\begin{bmatrix}x\\\lambda\end{bmatrix}.$$
4. **(d) Φ of M.** The eigenvalues are $\pm\omega$, $\omega = \sqrt{36+\frac12} = \tfrac{\sqrt{146}}{2} \approx 6.0415$ (a ± pair, as for every Hamiltonian matrix). Since $\operatorname{tr}M = 0$, Cayley–Hamilton gives $M^2 = \omega^2 I$, so
$$\Phi_M(t) = \cosh(\omega t)\,I + \frac{\sinh(\omega t)}{\omega}M .$$
So $\varphi_{11} = \cosh\omega t + \tfrac{6}{\omega}\sinh\omega t$, $\varphi_{12} = -\tfrac{\sinh\omega t}{4\omega}$, $\varphi_{21} = -\tfrac{2\sinh\omega t}{\omega}$, $\varphi_{22} = \cosh\omega t - \tfrac{6}{\omega}\sinh\omega t$.
5. **Solve for the unknown $\lambda(0)$.** *Rule: impose $x(1) = \varphi_{11}(1)x(0) + \varphi_{12}(1)\lambda(0)$.* $\lambda(0) = \dfrac{2-\varphi_{11}(1)}{\varphi_{12}(1)} = 4\omega\coth\omega + 24 - \dfrac{8\omega}{\sinh\omega} \approx 47.9365$.
6. **The control.** $\lambda(t) = \varphi_{21}(t) + \varphi_{22}(t)\lambda(0)$, so
$$u^\circ(t) = \frac{\sinh\omega t}{2\omega} - \frac{\lambda(0)}{4}\Big(\cosh\omega t - \frac{6}{\omega}\sinh\omega t\Big).$$
$u^\circ(0) \approx -11.984$, $u^\circ(0.5) \approx -0.580$, $u^\circ(1) \approx 0.0545$, and the optimal cost is $J^\circ \approx 24.19$ (the straight-line path $x = 1+t$ costs 136.3).

</details>

```callout:note Sign convention (A4)
The Hamiltonian convention does not change the answer. With $H = \tfrac12L + \lambda f$ or the "maximum principle" form $H = -L + \lambda f$, the costate is scaled or sign-flipped and $u^\circ(\lambda)$ changes form ($-\lambda/2$ or $+\lambda/4$), but **$u^\circ(t)$, $x(t)$ and $J^\circ$ are identical**. Only $\lambda(0) \approx 47.94$ depends on the convention.
```

**Picture it.** The plant is violently unstable ($e^{6t}$): left alone, $x$ would reach $e^6 \approx 403$. The optimal input pushes hard down first ($u^\circ(0) \approx -12$), parks $x$ near zero where $x^2$ is cheap, then lets the instability carry it up to 2 at the end. In the $(x,\lambda)$ plane the origin is a saddle (eigenvalues $\pm\omega$): the path rides in along the stable eigenvector and peels off along the unstable one.

```picture:pic-rev-a4 Left (top on a phone): the optimal x(t) against the straight line x = 1 + t. Right (below on a phone): the same path in the (x, λ) plane, in along the stable eigenvector and out along the unstable one.
The optimal state dips to near zero and climbs to 2 at t = 1; in the (x, λ) plane it rides the saddle's two eigenvector lines.
```

**Traps.** $\dot\lambda = +\partial H/\partial x$ (wrong sign). Setting $\lambda(1) = 0$: transversality applies only when $x(T)$ is free. The factor in $u^\circ$ ($2u^2 \to 4u$). Building $e^{Mt}$ entry by entry from $e^{\pm\omega t}$.
