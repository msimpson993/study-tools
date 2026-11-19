---
id: part-b
order: 2
title: "Practice exam, part B: state space"
summary: "Step-by-step walkthroughs of B1 (companion form: eigenvectors, Φ(t), general solution, impulse response), B2 (eigenvalues, Φ(t), and controllability/observability with parameters, by rank and by PBH) and B3 (phase-variable realization), each with a picture, with the notes on what B2 and B3 leave ambiguous. The 9 matching practice variants make up this page's self-test."
covers: "Practice problems B1–B3 and variants E1–E3, CO1–CO3, R1–R3"
quizTag: part-b
quizSubsets:
  - { tag: v-eig, label: "Eigen, Φ(t), h(t)" }
  - { tag: v-co, label: "Controllability & observability" }
  - { tag: v-real, label: "Realization" }
---
**How to use this page.** Same routine as part A: try each problem, then open the walkthrough and compare step by step. Every answer was checked symbolically and numerically. The self-test (button above) is the nine practice variants of these three problems.

| Problem | Skill | On the map |
|---|---|---|
| B1 | companion matrix, Vandermonde eigenvectors, spectral form of Φ, variation of constants, h = CΦB | [Eigenvectors](#/dive/eig), [How does it evolve?](#/dive/expm) |
| B2 | triangular eigenvalues, left and right eigenvectors, rank tests and PBH with parameters | [Controllability](#/dive/ctrl), [Observability](#/dive/obs), [PBH](#/dive/pbh) |
| B3 | phase-variable (controllable canonical) form | [Realization](#/dive/realize) |

### B1. Companion-form system

$A = \begin{bmatrix}0&1&0\\0&0&1\\2&1&-2\end{bmatrix}$, $B = \begin{bmatrix}0\\0\\1\end{bmatrix}$, $C = \begin{bmatrix}1&0&1\end{bmatrix}$. Find the eigenvalues and eigenvectors, $\Phi(t)$, the general $x(t)$, and $y(t)$ for $x(0) = 0$, $u = \delta(t)$.

<details class="fold">
<summary>Step-by-step walkthrough</summary>

1. **Characteristic polynomial.** *Rule: a companion last row $[-a_0,\,-a_1,\,-a_2]$ gives $s^3 + a_2s^2 + a_1s + a_0$.* The last row is $[2, 1, -2]$, so $a_0 = -2$, $a_1 = -1$, $a_2 = 2$: $s^3 + 2s^2 - s - 2 = (s+2)(s-1)(s+1)$.
2. **Eigenvectors.** *Rule: for a companion matrix, $v = (1, \lambda, \lambda^2)$.* $\lambda = 1, -1, -2$ with $v_1 = (1,1,1)$, $v_2 = (1,-1,1)$, $v_3 = (1,-2,4)$.
3. **Φ(t) by the spectral form.** *Rule: $\Phi(t) = \sum_i e^{\lambda_i t} v_i w_i^{\mathsf T}$ with $w_i^{\mathsf T}v_j = \delta_{ij}$.*
$$\Phi(t)=e^{t}\!\begin{bmatrix}\frac13&\frac12&\frac16\\\frac13&\frac12&\frac16\\\frac13&\frac12&\frac16\end{bmatrix}+e^{-t}\!\begin{bmatrix}1&-\frac12&-\frac12\\-1&\frac12&\frac12\\1&-\frac12&-\frac12\end{bmatrix}+e^{-2t}\!\begin{bmatrix}-\frac13&0&\frac13\\\frac23&0&-\frac23\\-\frac43&0&\frac43\end{bmatrix}$$
The three matrices add up to $I$ at $t = 0$ (check this). Entry by entry, $\Phi_{12} = \Phi_{32} = \sinh t$ and $\Phi_{22} = \cosh t$.
4. **General solution.** *Rule: variation of constants.*
$$x(t)=\Phi(t)x(0)+\int_0^t\Phi(t-\tau)B\,u(\tau)\,d\tau,\qquad \Phi(t)B=\tfrac16\begin{bmatrix}e^{t}-3e^{-t}+2e^{-2t}\\ e^{t}+3e^{-t}-4e^{-2t}\\ e^{t}-3e^{-t}+8e^{-2t}\end{bmatrix}$$
5. **Impulse response.** *Rule: $x(0^-) = 0$, $u = \delta$ ⇒ $x(0^+) = B$ ⇒ $y = C\Phi(t)B$.*
$$y(t)=\Big(\tfrac13e^{t}-e^{-t}+\tfrac53e^{-2t}\Big)u(t)$$
6. **Cross-check.** $G(s) = C(sI-A)^{-1}B = \dfrac{s^2+1}{(s-1)(s+1)(s+2)}$, whose residues are $\tfrac13, -1, \tfrac53$ ✓; and $y(0^+) = CB = 1$ ✓.

</details>

**Picture it.** Three modes on the real axis at +1, −1 and −2. The impulse kicks the state to $B = e_3$; that point splits into the three eigen-directions, each evolving at its own rate. The +1 mode is unstable, so $y$ eventually grows like $e^t/3$. The zeros at $\pm j$ (from $C = [1\ 0\ 1]$) cancel no pole, so all three modes show in $y$.

```picture:pic-rev-b1 Left: poles +1, −1, −2 and zeros ±j. Right: the impulse response y(t), which heads for eᵗ/3.
s-plane with one unstable pole at +1, two stable poles and zeros on the imaginary axis; y(t) starts at 1 and grows like e to the t over 3.
```

**Traps.** Signs when reading the polynomial off the last row. Forgetting $u(t)$. Mis-normalised left eigenvectors (check the matrices add to $I$). Calling the system stable because two of three modes decay.

### B2. Eigenvalues, Φ(t), and parametric controllability and observability

$A = \begin{bmatrix}-1&0&0\\-2&-2&0\\1&1&-3\end{bmatrix}$, $B = \begin{bmatrix}-1&b\\1&0\\1&1\end{bmatrix}$, $C = \begin{bmatrix}0&0&0\\0&f&g\end{bmatrix}$. Find the eigenvalues and eigenvectors and $\Phi(t)$, the condition on $b$ for controllability, and the conditions on $f, g$ for observability.

<details class="fold">
<summary>Step-by-step walkthrough</summary>

1. **Eigenvalues.** *Rule: a triangular matrix has its diagonal as eigenvalues.* $\lambda = -1, -2, -3$, distinct, so $A$ is diagonalisable.
2. **Right eigenvectors** (*solve $(A-\lambda I)v = 0$*): $\lambda=-1$: $v=(-2,4,1)$; $\lambda=-2$: $v=(0,1,1)$; $\lambda=-3$: $v=(0,0,1)$. **Left eigenvectors** ($w^{\mathsf T}A = \lambda w^{\mathsf T}$): $(1,0,0)$, $(2,1,0)$, $(-\tfrac32,-1,1)$.
3. **Φ(t)** $= Ve^{\Lambda t}V^{-1}$ (or $\mathcal L^{-1}\{(sI-A)^{-1}\}$):
$$\Phi(t)=\begin{bmatrix}e^{-t}&0&0\\ 2(e^{-2t}-e^{-t})&e^{-2t}&0\\ \tfrac12\left(-e^{-t}+4e^{-2t}-3e^{-3t}\right)&e^{-2t}-e^{-3t}&e^{-3t}\end{bmatrix}$$
Checks: $\Phi(0) = I$, and $\Phi$ is lower-triangular like $A$.
4. **Controllability by PBH.** *Rule: controllable ⇔ $w_i^{\mathsf T}B \ne 0$ for every left eigenvector.* $\lambda=-1$: $[-1,\ b]$; $\lambda=-2$: $[-1,\ 2b]$; $\lambda=-3$: $[\tfrac32,\ 1-\tfrac32b]$. Every row has a nonzero first entry whatever $b$ is. The rank test agrees: $\det[b_1\ Ab_1\ A^2b_1] = -3$ for the first column alone. **Controllable for every $b$.**
5. **Observability by PBH.** *Rule: observable ⇔ $Cv_i \ne 0$ for every right eigenvector.* The first row of $C$ is zero, so only $c = [0\ f\ g]$ matters: $\lambda=-1$: $4f+g$; $\lambda=-2$: $f+g$; $\lambda=-3$: $g$. The rank test agrees: $\det[c;\,cA;\,cA^2] = g(f+g)(4f+g)$.
$$\text{observable} \iff g\ne0,\quad f+g\ne0,\quad 4f+g\ne0 .$$

</details>

```callout:trap B2 as printed is controllable for every b
The first input column $(-1, 1, 1)$ already reaches all three modes, so no condition on $b$ appears. If the problem meant the **second column alone**, $b_2 = (b, 0, 1)$, then $\det[b_2\ Ab_2\ A^2b_2] = 2b^2(3b-2)$: controllable **iff $b \ne 0$ and $b \ne 2/3$** (PBH: $w^{\mathsf T}b_2 = b,\ 2b,\ 1-\tfrac32b$). Check $B$ and $C$ against the original problem sheet; the zero first row of $C$ is also unusual.
```

**Picture it.** Three modes, each a direction $v_i$ that decays at its own rate. A sensor $y = fx_2 + gx_3$ is a projection; it is blind to a mode exactly when that direction is perpendicular to $[0\ f\ g]$. The −3 mode points straight along $x_3$, so $g = 0$ hides it. Controllability is the dual: an input column must not be perpendicular to any *left* eigenvector.

```picture:pic-rev-b2 The eigenvectors seen in the (x₂, x₃) plane, with the sensor f = 1, g = 0: the λ = −3 mode lies on the sensor's blind line, so it reads 0.
Three arrows for the eigenvectors; the sensor direction along x₂ and its perpendicular blind line along x₃, which contains the λ = −3 eigenvector.
```

**Traps.** Right eigenvectors for controllability (use left ones, or rank $[A-\lambda I,\ B]$). Writing "controllable iff $b\ne\dots$" by habit when the condition is vacuous. A $3\times6$ controllability matrix needs *some* nonzero $3\times3$ minor, not a particular one.

### B3. Phase-variable (controllable canonical) realization

$\dfrac{Y}{U} = \dfrac{(6s+1)(4s+3)}{s^3+8s^2+19s+2}$. Find $A$, $B$, $C$ in phase-variable form.

<details class="fold">
<summary>Step-by-step walkthrough</summary>

1. **Expand the numerator.** $(6s+1)(4s+3) = 24s^2 + 22s + 3$, so $b = (3, 22, 24)$ and $a = (2, 19, 8)$.
2. **Introduce $X$ with $X/U = 1/\text{den}$**, states $x_1 = x$, $x_2 = \dot x$, $x_3 = \ddot x$. *Rule: for $\dfrac{b_2s^2+b_1s+b_0}{s^3+a_2s^2+a_1s+a_0}$, $A$ is the companion matrix with last row $[-a_0\ -a_1\ -a_2]$, $B = e_3$, $C = [b_0\ b_1\ b_2]$.*
$$A=\begin{bmatrix}0&1&0\\0&0&1\\-2&-19&-8\end{bmatrix},\quad B=\begin{bmatrix}0\\0\\1\end{bmatrix},\quad C=\begin{bmatrix}3&22&24\end{bmatrix},\quad D=0$$
3. **Check.** $C(sI-A)^{-1}B$ gives back $(6s+1)(4s+3)/(s^3+8s^2+19s+2)$.

</details>

```callout:note B3 and MATLAB's tf2ss use different state orderings
This page uses the phase-variable ordering ($x_1$ is the internal signal, $A$'s **last** row holds $-a$). MATLAB's `tf2ss` returns the controller form, with the states in reverse: $A$'s **first** row is $[-8\ -19\ -2]$ and $C = [24\ 22\ 3]$. Both are correct realizations of the same $G(s)$; just do not mix the two.
```

**Picture it.** A chain of three integrators ($x_3 \to x_2 \to x_1$). The input enters at the top, every integrator's output feeds back with weight $-a_k$ (the poles), and the output taps the chain with weights 3, 22, 24 (the zeros). Zeros live in $C$; poles live in $A$'s last row.

```picture:pic-rev-b3 The phase-variable realization: three integrators, feedback −2, −19, −8 into the input sum (A's last row), output taps 3, 22, 24 (C).
Block diagram: u into a sum, three integrators in a chain giving x₃, x₂, x₁, each fed back with its gain, and the output summed from the taps.
```

**Traps.** Missing minus signs in the last row. $C$ in the reverse order for your ordering. Not expanding the numerator. If $\deg$ num $= \deg$ den, divide first and put the quotient in $D$ (variant R2).
