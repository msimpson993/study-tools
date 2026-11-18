---
id: formula-sheet
order: 3
title: "Formula sheet: Linear Systems"
summary: "One printable page (two columns) of the rules the practice problems use: transform pairs and ROC rules, residues, the shift theorem, Fourier and sampling, e^(At), controllability, observability and PBH, realization, Gramians and Pontryagin's principle. Use Print to get only the sheet."
covers: "Everything the practice problems A1–A4 and B1–B3 use, plus the Fourier side of the map"
---
**How to use this page.** Print it (the Print button prints only the sheet, in two columns), or read it as a last check before the self-tests. Each line is a rule a walkthrough step uses; the map box that explains it is linked under the sheet.

<div class="formula-sheet">

#### Formula sheet: Linear Systems

#### Transform pairs

- $e^{-at}u(t) \leftrightarrow \frac{1}{s+a}$, Re $s>-a$; $\;-e^{-at}u(-t) \leftrightarrow \frac{1}{s+a}$, Re $s<-a$
- $t^k e^{-at}u(t) \leftrightarrow \frac{k!}{(s+a)^{k+1}}$
- $a^n u(n) \leftrightarrow \frac{z}{z-a}$, $|z|>|a|$; $\;-a^n u(-n-1) \leftrightarrow \frac{z}{z-a}$, $|z|<|a|$
- $\frac{1}{z-a} \leftrightarrow a^{n-1}u(n-1)$ (right) or $-a^{n-1}u(-n)$ (left)
- $(n+1)a^n u(n) \leftrightarrow \frac{z^2}{(z-a)^2}$

#### ROC rules

- ROC never contains a pole; edges run through poles
- Right-sided: right of / outside the outermost pole
- Left-sided: left of / inside the innermost pole; two-sided: strip / ring
- Stable ⇔ ROC ∋ $j\omega$ axis (or $|z|=1$)
- ROC of $X_1X_2$ ⊇ ROC$_1$ ∩ ROC$_2$

#### Going back

- Cover-up: $c_p = (s-p)X(s)\big|_{s=p}$
- $\operatorname{Res}_{p}$ of order $m$: $\frac{1}{(m-1)!}\frac{d^{m-1}}{ds^{m-1}}\big[(s-p)^mXe^{st}\big]_{s=p}$
- $t>0$: close left, $+\sum$Res; $t<0$: close right, $-\sum$Res
- Z with a $z$ upstairs: expand $X(z)/z$

#### Difference equations

- $y(n-k) \leftrightarrow z^{-k}Y(z)$ (zero ICs)
- One-sided: $y(n-1) \leftrightarrow z^{-1}Y + y(-1)$
- Answer = input modes + natural modes; check $y(0)$, $y(1)$

#### Fourier and sampling

- $H(j\omega) = H(s)|_{s=j\omega}$; DTFT: $z = e^{j\Omega}$, period $2\pi$
- FS: $c_k = \frac1T\int_T x\,e^{-jk\omega_0t}dt$; $y$: $H(jk\omega_0)c_k$
- DFT: $X[k] = \sum_n x[n]e^{-j2\pi kn/N}$, bins $f_s/N$ apart
- Parseval: $\int|x|^2dt = \frac{1}{2\pi}\int|X|^2d\omega$; $\sum|x|^2 = \frac1N\sum|X|^2$
- Sampling: $z = e^{sT}$; aliases above $f_s/2$

#### State evolution

- $x(t) = \Phi(t)x_0 + \int_0^t\Phi(t-\tau)Bu\,d\tau$, $\Phi = e^{At}$
- $\Phi = Ve^{\Lambda t}V^{-1} = \sum e^{\lambda_it}v_iw_i^{\mathsf T}$; $\Phi(0) = I$
- $\Phi = \mathcal L^{-1}\{(sI-A)^{-1}\}$; $h(t) = C\Phi(t)B$, $h(0^+) = CB$
- Cayley–Hamilton: $e^{At} = \sum_{k<n}\alpha_k(t)A^k$
- Jordan block: $e^{Jt} = e^{\lambda t}\begin{bmatrix}1&t\\0&1\end{bmatrix}$
- Stable ⇔ all Re $\lambda_i<0$

#### Reachability and observability

- Ctrb: rank $[B\ AB\ \cdots\ A^{n-1}B] = n$
- Obsv: rank $[C;\ CA;\ \cdots;\ CA^{n-1}] = n$
- PBH: $w_i^{\mathsf T}B \ne 0$ (left), $Cv_i \ne 0$ (right)
- Dual: $(A,B)$ ctrb ⇔ $(A^{\mathsf T},B^{\mathsf T})$ obsv
- Minimal ⇔ ctrb and obsv; cancelled pole = hidden mode
- $W(T) = \int_0^Te^{A\tau}BB^{\mathsf T}e^{A^{\mathsf T}\tau}d\tau$; $E_{\min} = x_f^{\mathsf T}W^{-1}x_f$

#### Realization (phase variable)

- Last row of $A$: $[-a_0\ -a_1\ \cdots]$; $B = e_n$; $C = [b_0\ b_1\ \cdots]$
- Biproper: divide first, quotient → $D$
- $G = C(sI-A)^{-1}B + D$; MATLAB tf2ss reverses the order

#### Application: optimal control (Pontryagin)

- $H = L + \lambda^{\mathsf T}f$; $\partial H/\partial u = 0$
- $\dot x = \partial H/\partial\lambda$, $\dot\lambda = -\partial H/\partial x$
- $x(T)$ fixed: solve $\lambda(0)$ from $\Phi_M(T)$; $x(T)$ free: $\lambda(T) = 0$
- Hamiltonian $M$: eigenvalues in $\pm$ pairs; tr $M = 0$ ⇒ $M^2 = -\det M\,I$ (2×2)

</div>

### Where each line is explained

[Region of convergence](#/dive/roc) · [Going back](#/dive/inverse) · [Equations as algebra](#/dive/diffeq) · [Fourier](#/dive/ft) · [Parseval](#/dive/parseval) · [Sampling](#/dive/sampling) · [How does it evolve?](#/dive/expm) · [Cayley–Hamilton](#/dive/cayley) · [Jordan form](#/dive/jordan) · [Controllability](#/dive/ctrl) · [PBH](#/dive/pbh) · [Gramians](#/dive/gramian) · [Realization](#/dive/realize) · [The best input](#/dive/optimal)
