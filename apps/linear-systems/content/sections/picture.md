The four Fourier tools are one idea (expand in complex exponentials) under the two choices “is time continuous or discrete?” and “is the signal periodic or aperiodic?” The consistent rule is: **periodicity in one domain ⇔ discreteness in the other.** Sampling in time periodizes frequency (aliases); periodizing in time samples frequency (a line spectrum).

| | Time continuous | Time discrete |
|---|---|---|
| **Aperiodic in time** | FT: frequency continuous, aperiodic | DTFT: frequency continuous, periodic |
| **Periodic in time** | FS: frequency discrete, aperiodic | DFT: frequency discrete, periodic |

| Time | Periodic in t? | Transform | Frequency | Periodic in freq? |
|---|---|---|---|---|
| Continuous | No | FT | Continuous ω (rad/s) | No |
| Continuous | Yes, period T | FS | Discrete k ω₀, ω₀ = 2π/T | No (line spectrum) |
| Discrete | No | DTFT | Continuous Ω (rad/sample) | Yes, period 2π |
| Discrete | Yes, period N (or finite record) | DFT / DFS | Discrete 2π k / N | Yes, period N bins |

```callout:note Conventions used on this page
CTFT and DTFT use radian frequency (ω in rad/s, Ω in rad/sample) with the 1/2π factor on the inverse. The DFT uses the unnormalized forward sum and 1/N on the inverse, matching MATLAB fft / ifft. Fourier series puts 1/T on the analysis integral, ω₀ = 2π/T. Laplace is written unilaterally when talking about state space; the ROC is part of the answer. State-space sign convention: ẋ = Ax + Bu, y = Cx + Du. Inner products conjugate the first argument: ⟨u, w⟩ = u\* w.
```

The same dictionary relates matrix diagonalization to Fourier analysis of LTI systems. State-space and transfer functions meet on the last rows: poles are eigenvalues, except the ones a non-minimal realization hides.

| Question | Matrices | LTI systems |
|---|---|---|
| What is invariant? | A v = λ v | H{e^{st}} = H(s) e^{st} |
| Best coordinates | Columns of V (eigenbasis) | Complex exponentials e^{st}, z^n |
| The operator becomes | Multiplication by λ_i | Multiplication by H(s) or H(jω) |
| Change of basis | x = V ξ,  Λ = V⁻¹ A V | Analysis / synthesis transform |
| Composition | Polynomials and powers of A | Convolution ↔ product of transforms |
| Evolution in time | e^{At} = V e^{Λt} V⁻¹ | Each mode × e^{λt};  Y(s) = H(s) X(s) |
| Incomplete basis | Jordan blocks, t^k e^{λt} | Repeated poles, t^k e^{λt} u(t) |
| Reach / see every mode | Range of Ctrb,  null space of O | No cancelled poles in a minimal G(s) |

| State space | Transfer function |
|---|---|
| (A, B, C, D) | G(s) = C(sI − A)⁻¹ B + D |
| Eigenvalues of A | Poles of G, after cancelling hidden modes |
| Impulse response C e^{At} B + D δ(t) | G(s) = Laplace transform of that h(t) |
| Controllable and observable | Minimal: deg G = n, poles = eig(A) |
| Uncontrollable or unobservable mode | Pole-zero cancellation; mode still lives in A |
| Internal stability: all Re(λ) < 0 | BIBO: poles of G in the open left half-plane |
| Similarity: T⁻¹ A T, T⁻¹ B, C T | G(s) unchanged |
