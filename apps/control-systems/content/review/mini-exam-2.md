---
id: mini-exam-2
order: 2
title: "Mini exam 2: feedback control system characteristics"
summary: "Lecture Notes 2 start to finish: open versus closed loop, the error signal, sensitivity, disturbance and noise, transient and steady-state behaviour, performance indices and model reduction. A topic checklist with slide references, a one-page formula sheet, seven worked problems and a 23-question self-test."
covers: "Lecture Notes 2, slides 1–34 (Dorf, Modern Control Systems, ch. 4)"
quizTag: mini-exam-2
---
**How to use this page.** Tick through the checklist and open the map link for anything you cannot explain in a sentence. Then do the worked problems with the solution closed, compare step by step (an exam is graded by steps, so write the steps), and finish with the self-test. The formula sheet prints on its own page. No exam date is assumed here.

````callout:trap Practise this one by hand
A performance-index problem that also needs an inverse Laplace transform appeared on a prior-year exam. **Problem 4** below is that type (inverse Laplace, then $\int y^2\,dt$, then minimise over a gain). Do it with the solution closed.
````

### Topic checklist (Lecture Notes 2)

Notation follows the slides: the controller is $G_c$, the plant $G$, the loop gain $L = G_cG$, a disturbance $T_d$ and measurement noise $N$. $C(s)$ is the complementary sensitivity (many books call it $T(s)$); it is not the state-space $C$ matrix.

| Slides | Topic: can you…? | Where it is on the map |
|---|---|---|
| 1–2 | tell open loop from closed loop, and name every block and signal ($G_c$, $G$, sensor $H$, $T_d$, $N$) | [What feedback buys, and what it costs](#/dive/fb) |
| 3–4 | write the tracking error $E = SR - SGT_d + CN$ and define $S = 1/(1+L)$, $C = L/(1+L)$; explain why $S + C = 1$ means you cannot make both small at one frequency | [What feedback buys, and what it costs](#/dive/fb) |
| 5–6 | show a plant change $\Delta G$ changes the error by $\approx -\Delta G/(LG)$, a factor $1+L$ smaller | [What feedback buys, and what it costs](#/dive/fb) |
| 7–9 | define system sensitivity $S = \partial\ln T/\partial\ln G$, give open loop = 1 and closed loop $S_G^T = 1/(1+G_cG)$, and use the chain rule $S_\alpha^T = S_G^T S_\alpha^G$ and $S_\alpha^N - S_\alpha^D$ | [What feedback buys, and what it costs](#/dive/fb) |
| 10–13 | derive $E = -S\,G\,T_d$ (disturbance rejection) and work the steel-mill speed loop: open loop, then with a tachometer, then the ratio (usually under 0.02) | [What feedback buys, and what it costs](#/dive/fb) |
| 14 | state the noise flip side: $E = CN$, so $Y \approx -N$ for large $L$ (the lecture treats it briefly) | [What feedback buys, and what it costs](#/dive/fb) |
| 15–18 | compare open-loop and closed-loop transient: time constant $\tau_1 \to \tau_1/(1+K_aK_tK_1)$ | [What feedback buys, and what it costs](#/dive/fb) |
| 19–22 | get $e_{ss}$ with the final-value theorem for step and ramp by system type; work the boring machine | [Why P leaves an error and I removes it](#/dive/sse), [What feedback buys, and what it costs](#/dive/fb) |
| 23–28 | define ISE, IAE, ITAE, ITSE; minimise an index with $dI/dK = 0$; quote the telescope result (ISE: $K_3 = \sqrt{10} \approx 3.2$, $\zeta = 0.5$; IAE: $K_3 = 4.2$, $\zeta = 0.665$) | [What feedback buys, and what it costs](#/dive/fb) |
| 29–34 | reduce a model two ways: drop a far pole and keep the DC gain, or match the frequency response ($M_{2q} = \Delta_{2q}$); know the $6/((s+1)(s+2)(s+3))$ example and that more zeros than poles is not causal | [Which poles matter](#/dive/dominant), [What feedback buys, and what it costs](#/dive/fb) |

Underlying ideas elsewhere on the map: [the loop](#/dive/blocks) (where a disturbance enters), [P, I and D](#/dive/ctrl) and the [ζ and ωₙ](#/dive/second) read-offs the boring-machine problem uses.

<div class="formula-sheet">

#### Formula sheet: Mini exam 2 (Lecture Notes 2)

#### Loop and error signal

- $L = G_cG$ (loop gain); with $H=1$: $Y = \dfrac{L}{1+L}R + \dfrac{G}{1+L}T_d - \dfrac{L}{1+L}N$
- $E = R - Y = S\,R - S\,G\,T_d + C\,N$
- $S = \dfrac{1}{1+L}$, $\;C = \dfrac{L}{1+L}$ (also called $T$), $\;S + C = 1$
- Every path has the same denominator $1 + L$ (same poles)
- Open loop: $Y = G_cG\,R + G\,T_d$, no correction, $S = 1$

#### Sensitivity

- $S_G^T = \dfrac{\partial T/T}{\partial G/G} = \dfrac{\partial\ln T}{\partial\ln G}$; open loop $1$; closed loop $\dfrac{1}{1 + G_cG}$
- Chain rule: $S_\alpha^T = S_G^T\,S_\alpha^G$; for $T = N(s,\alpha)/D(s,\alpha)$: $S_\alpha^T = S_\alpha^N - S_\alpha^D$
- Small change: $\Delta E \approx -\dfrac{G_c\,\Delta G}{(1+L)^2}R \approx -\dfrac{1}{L}\dfrac{\Delta G}{G}R$

#### Disturbance and noise

- $E = -\dfrac{G}{1+L}\,T_d$; large $L$: $E \approx -T_d/G_c$ (unity feedback) or $T_d/(G_1H)$ with an extra loop
- Steel mill: open loop $\omega_0(\infty) = \dfrac{-D}{b + K_mK_b/R_a}$; with tachometer $\omega_c(\infty) \approx \dfrac{-R_aD}{K_aK_mK_t}$
- Ratio $\dfrac{\omega_c}{\omega_0} = \dfrac{R_ab + K_mK_b}{R_ab + K_m(K_tK_a + K_b)} \approx \dfrac{R_ab + K_mK_b}{K_aK_mK_t}$ (the slides: usually $< 0.02$)
- Noise: $E = C\,N$; large $L$: $Y \approx -N$

#### Transient and steady state

- Open loop $G = \dfrac{K_1}{\tau_1 s + 1}$; closed loop $\dfrac{K_aG}{1 + K_aK_tG}$ has time constant $\dfrac{\tau_1}{1 + K_aK_tK_1}$
- $e_{ss} = \lim_{s\to0} sE(s)$ (stable loop only); step: $\dfrac{1}{1+K_p}$, ramp: $\dfrac{1}{K_v}$, $K_v = \lim sL$
- Type 0: step $\dfrac{1}{1+K_p}$, ramp $\infty$. Type 1: step $0$, ramp $\dfrac{1}{K_v}$. Type 2: step $0$, ramp $0$

#### Boring machine ($G_c = K + 11s$, $G = \dfrac{1}{s(s+1)}$)

- $\dfrac{Y}{R} = \dfrac{K + 11s}{s^2 + 12s + K}$, $\;\dfrac{Y}{T_d} = \dfrac{1}{s^2 + 12s + K}$
- Step $e_{ss} = 0$; unit-step disturbance $y_{ss} = 1/K$ (0.01 at $K=100$, 0.05 at $K=20$)
- $\omega_n = \sqrt K$, $\;\zeta = 6/\sqrt K$. The zero adds overshoot ($K=100$: about 22 %; $K=20$: about 4 %)

#### Performance indices

- ISE $\int_0^T e^2dt$, IAE $\int_0^T|e|dt$, ITAE $\int_0^T t|e|dt$, ITSE $\int_0^T te^2dt$ ($T$ about the settling time)
- Minimise over a gain $K$: write $I(K)$, solve $dI/dK = 0$, check $d^2I/dK^2 > 0$
- $\int_0^\infty y^2dt$ for $Y = \dfrac{b_1s + b_0}{s^2 + a_1s + a_0}$: $\dfrac{b_1^2a_0 + b_0^2}{2a_0a_1}$
- Telescope ($Y/T_d = \dfrac{s(s+K_1K_3)}{s^2 + K_1K_3s + K_1K_2K_p}$, $K_1 = 0.5$, $K_1K_2K_p = 2.5$): $I_{ISE} = \dfrac{1}{K_3} + 0.1K_3$, minimum at $K_3 = \sqrt{10} = 3.2$, $\zeta = 0.5$; IAE minimum at $K_3 = 4.2$, $\zeta = 0.665$

#### Model reduction

- Drop a far pole, keep the DC gain: $\dfrac{K}{s(s+2)(s+30)} \to \dfrac{K/30}{s(s+2)}$
- Frequency match: $G_H = K\dfrac{a_ms^m + \dots + 1}{b_ns^n + \dots + 1}$, $G_L = K\dfrac{c_ps^p + \dots + 1}{d_qs^q + \dots + 1}$ with $p \le q < n$ (same $K$); solve $M_{2q} = \Delta_{2q}$, $M_{2q} = \sum_{k=0}^{2q}\dfrac{(-1)^{k+q}M^{(k)}(0)M^{(2q-k)}(0)}{k!\,(2q-k)!}$
- $\dfrac{6}{(s+1)(s+2)(s+3)} \to \dfrac{1.60}{s^2 + 2.590s + 1.60}$ (poles $-1.02$, $-1.57$)
- More zeros than poles: not causal (not a usable model)

</div>

### Worked problems

Each solution is written the way it would be graded: the setup, each step, the result and a check.

#### Problem 1: Error signal and sensitivity (slides 3–9)

Unity feedback, controller $G_c = 18$, plant $G = \dfrac{1}{s+2}$.

(a) Find $L$, $S$ and $C$, confirm $S + C = 1$, and give $S(0)$ and $C(0)$.
(b) The plant gain drops by 10 %. Use $S_G^T$ to predict the change in $T = C$, then compare with the exact DC value and with open loop.
(c) For a unit step command, what is the steady-state error?

<details class="fold">
<summary>Solution</summary>

1. (a) $L = \dfrac{18}{s+2}$, so $1 + L = \dfrac{s+20}{s+2}$. $S = \dfrac{s+2}{s+20}$ and $C = \dfrac{18}{s+20}$. Then $S + C = \dfrac{s+20}{s+20} = 1$. At DC, $S(0) = 2/20 = 0.1$ and $C(0) = 18/20 = 0.9$.
2. (b) $S_G^T = \dfrac{1}{1 + G_cG} = S$, so at DC $S_G^T = 0.1$. A $-10\,\%$ change in $G$ predicts $\Delta T/T \approx 0.1 \times (-10\,\%) = -1\,\%$.
3. Exact: $L(0)$ falls from $9$ to $8.1$, so $T(0)$ goes from $0.9$ to $8.1/9.1 = 0.8901$, a change of $-1.1\,\%$. Open loop the output would change by the full $-10\,\%$ ($S = 1$).
4. (c) $E = S\,R$, so $e_{ss} = \lim_{s\to0} s\,\dfrac{s+2}{s+20}\dfrac{1}{s} = 0.1$ (equal to $S(0)$, equal to $1 - C(0)$).

**Check:** $S(0) + C(0) = 1$, and the error equals the part of the command not carried to the output.

</details>

#### Problem 2: Disturbance rejection with a tachometer (slides 10–13)

A speed-control motor has $R_a = 1\ \Omega$, $K_m = 1$, $K_b = 1$, $b = 1$, an amplifier gain $K_a = 100$ and a tachometer gain $K_t = 0.5$. A load-torque step $T_d = D/s$ hits with $R = 0$.

(a) Find the open-loop steady speed change (back-EMF only, no tachometer loop).
(b) Find it with the tachometer loop.
(c) Give the ratio, and compare with the slide formula $(R_ab + K_mK_b)/(K_aK_mK_t)$.
(d) What $K_a$ makes the ratio at most 0.02?

<details class="fold">
<summary>Solution</summary>

1. (a) $\omega_0(\infty) = \dfrac{-D}{b + K_mK_b/R_a} = \dfrac{-D}{1 + 1} = -\dfrac{D}{2}$.
2. (b) With $G_1 = K_aK_m/R_a = 100$, $G_2 = 1/(Js + b)$ and $H = K_t + K_b/K_a = 0.51$: $E(s) = -\omega(s) = \dfrac{G_2}{1 + G_1G_2H}T_d$. By the final-value theorem with $G_2(0) = 1/b = 1$: $\omega_c(\infty) = \dfrac{-D}{b + G_1H} = \dfrac{-D}{1 + 51} = -\dfrac{D}{52}$.
3. (c) Ratio $\omega_c/\omega_0 = 2/52 = 1/26 \approx 0.038$. The slide formula gives $(1\cdot1 + 1\cdot1)/(100\cdot1\cdot0.5) = 2/50 = 0.04$: close, because $K_a \gg K_b$.
4. (d) Exact ratio $= \dfrac{2}{2 + 0.5K_a} \le 0.02 \Rightarrow 0.5K_a \ge 98 \Rightarrow K_a \ge 196$ (the approximate formula says 200).

**Check:** the tachometer loop cuts the speed drop by about the loop gain $G_1H \approx 51$, from $D/2$ to about $D/52$.

</details>

#### Problem 3: The English Channel boring machine (slides 20–22)

$G_c = K + 11s$ and $G = \dfrac{1}{s(s+1)}$ in a unity-feedback loop.

(a) Find $Y/R$ and $Y/T_d$. (b) Find the steady-state error for a unit step command. (c) Find the steady output for a unit step disturbance with $R = 0$. (d) Give $\omega_n$, $\zeta$ for $K = 100$ and $K = 20$. (e) The disturbance output must stay at or below 0.02. What $K$ does that need, and what is $\zeta$ there?

<details class="fold">
<summary>Solution</summary>

1. (a) $L = \dfrac{K + 11s}{s(s+1)}$ and $1 + L = \dfrac{s^2 + 12s + K}{s(s+1)}$. So $\dfrac{Y}{R} = \dfrac{L}{1+L} = \dfrac{K + 11s}{s^2 + 12s + K}$ and $\dfrac{Y}{T_d} = \dfrac{G}{1 + L} = \dfrac{1}{s^2 + 12s + K}$.
2. (b) $e_{ss} = \lim_{s\to0} \dfrac{s}{1 + L(s)}\dfrac{1}{s} = \dfrac{1}{1 + L(0)} = 0$, since $L$ has a pole at $s = 0$ (type 1).
3. (c) $y_{ss} = \lim_{s\to0} s\,\dfrac{1}{s^2 + 12s + K}\dfrac{1}{s} = \dfrac{1}{K}$.
4. (d) $s^2 + 12s + K$ matches $s^2 + 2\zeta\omega_ns + \omega_n^2$, so $\omega_n = \sqrt K$ and $\zeta = 6/\sqrt K$. For $K = 100$: $\omega_n = 10$, $\zeta = 0.6$, $y_{ss} = 0.01$. For $K = 20$: $\omega_n = 4.47$, $\zeta = 1.34$ (overdamped), $y_{ss} = 0.05$.
5. (e) $1/K \le 0.02 \Rightarrow K \ge 50$, where $\zeta = 6/\sqrt{50} = 0.85$.

**Check and trade-off:** a larger $K$ rejects the disturbance better and is faster, but lowers $\zeta$. Even at $K = 20$ the reference step overshoots (about 4 %) because the PD zero at $s = -K/11$ adds overshoot that the $\zeta$ formula does not include.

</details>

#### Problem 4: A performance index and an inverse Laplace transform (slides 23–28)

For a unit step disturbance the output of a loop is $Y(s) = \dfrac{s + K}{s^2 + Ks + 4}$.

(a) For $K = 2$ find $y(t)$ by inverse Laplace transform. (b) For $K = 2$ compute $\mathrm{ISE} = \int_0^\infty y^2\,dt$ by hand. (c) Find the $K$ that minimises ISE and the damping ratio there.

<details class="fold">
<summary>Solution</summary>

1. (a) $s^2 + 2s + 4 = (s+1)^2 + 3$ and $s + 2 = (s+1) + 1$. So $Y = \dfrac{s+1}{(s+1)^2 + 3} + \dfrac{1}{\sqrt3}\dfrac{\sqrt3}{(s+1)^2 + 3}$, and $y(t) = e^{-t}\left(\cos\sqrt3\,t + \dfrac{1}{\sqrt3}\sin\sqrt3\,t\right)$. Check: $y(0) = 1$, the initial value $\lim sY(s)$.
2. (b) Put $\theta = \sqrt3\,t$ and square: $y^2 = e^{-2t}\left[\cos^2\theta + \dfrac{2}{\sqrt3}\sin\theta\cos\theta + \dfrac13\sin^2\theta\right]$. Use $\cos^2 = \dfrac{1 + \cos2\theta}{2}$, $\sin\cos = \dfrac{\sin2\theta}{2}$, $\sin^2 = \dfrac{1 - \cos2\theta}{2}$: $y^2 = e^{-2t}\left[\dfrac23 + \dfrac13\cos2\theta + \dfrac{1}{\sqrt3}\sin2\theta\right]$ with $2\theta = 2\sqrt3\,t$.
3. Integrate term by term with $\omega = 2\sqrt3$ ($\omega^2 = 12$): $\int_0^\infty e^{-2t}dt = \dfrac12$, $\int_0^\infty e^{-2t}\cos\omega t\,dt = \dfrac{2}{4 + \omega^2} = \dfrac18$, $\int_0^\infty e^{-2t}\sin\omega t\,dt = \dfrac{\omega}{4 + \omega^2} = \dfrac{\sqrt3}{8}$. So $\mathrm{ISE} = \dfrac23\cdot\dfrac12 + \dfrac13\cdot\dfrac18 + \dfrac{1}{\sqrt3}\cdot\dfrac{\sqrt3}{8} = \dfrac13 + \dfrac1{24} + \dfrac18 = \dfrac12$.
4. (c) Keeping $K$ symbolic, the same integral (or the standard table entry $I = \dfrac{b_1^2a_0 + b_0^2}{2a_0a_1}$ with $b_1 = 1$, $b_0 = a_1 = K$, $a_0 = 4$) gives $I(K) = \dfrac{4 + K^2}{8K} = \dfrac{1}{2K} + \dfrac{K}{8}$.
5. $\dfrac{dI}{dK} = -\dfrac{1}{2K^2} + \dfrac18 = 0 \Rightarrow K^2 = 4 \Rightarrow K = 2$. $\dfrac{d^2I}{dK^2} = \dfrac{1}{K^3} > 0$, so it is a minimum, with $I_{\min} = \dfrac12$ (agreeing with part (b)). Damping: $2\zeta\omega_n = K$ and $\omega_n = 2$, so $\zeta = K/4 = 0.5$.

**Check and link to the lecture:** the telescope example (slides 26–28) has the same form with $a_1 = 0.5K_3$, $a_0 = 2.5$, giving $I = 1/K_3 + 0.1K_3$, a minimum at $K_3 = \sqrt{10} \approx 3.2$ and again $\zeta = 0.5$. The ITAE and IAE optima are more damped (IAE: $\zeta = 0.665$).

</details>

#### Problem 5: Steady-state error by system type (slides 19–22)

A unity-feedback loop has $L(s) = \dfrac{10(s + 3)}{s(s + 2)(s + 5)}$.

(a) Is the closed loop stable? (b) What is its type, and what is $K_v$? (c) Give the steady-state error for a unit step and a unit ramp. (d) How does the ramp error change if the plant gain falls by 10 %?

<details class="fold">
<summary>Solution</summary>

1. (a) The characteristic polynomial is $s(s+2)(s+5) + 10(s+3) = s^3 + 7s^2 + 20s + 30$. For a cubic, stable if all coefficients are positive and $a_2a_1 > a_0$: $7\cdot20 = 140 > 30$, so it is stable. (Routh: first column $1,\ 7,\ 110/7,\ 30$, all positive.) The final-value theorem is therefore allowed.
2. (b) One pole of $L$ at the origin: **type 1**. $K_v = \lim_{s\to0} sL(s) = \dfrac{10\cdot3}{2\cdot5} = 3$.
3. (c) Step: $e_{ss} = 0$ (type 1). Ramp: $e_{ss} = 1/K_v = 1/3$.
4. (d) $K_v$ becomes $2.7$, so the ramp error rises to $1/2.7 = 0.37$. The step error stays 0, because the integrator in $L$ does not depend on the plant gain.

**Check:** stability first, then the final-value theorem.

</details>

#### Problem 6: Reducing a model two ways (slides 29–34)

(a) Reduce $G_H = \dfrac{300}{(s+1)(s+3)(s+30)}$ by dropping a pole, keeping the DC gain. (b) Reduce $G_H = \dfrac{6}{(s+1)(s+2)(s+3)}$ to a second-order model by frequency matching. (c) Reduce the same $G_H$ to a first-order model by frequency matching.

<details class="fold">
<summary>Solution</summary>

1. (a) The pole at $-30$ is ten times farther left than the next one ($-3$), so its mode dies out much faster and can be dropped. Remove the factor $(s + 30)$ and divide the gain by 30 to keep the DC gain: $G_L = \dfrac{10}{(s+1)(s+3)}$. Check: $G_H(0) = 300/90 = 3.33$ and $G_L(0) = 10/3 = 3.33$.
2. (b) Normalise so the constant terms are 1: $G_H = \dfrac{1}{1 + \frac{11}{6}s + s^2 + \frac16s^3}$. Take $G_L = \dfrac{1}{1 + d_1s + d_2s^2}$ and match $M_{2q} = \Delta_{2q}$.
4. From the slide values $\Delta^{(0)} = 1$, $\Delta^{(1)} = \frac{11}{6}$, $\Delta^{(2)} = 2$, $\Delta^{(3)} = 1$ at $s = 0$: $\Delta_2 = -\dfrac{1\cdot2}{2} + \dfrac{(11/6)^2}{1} - \dfrac{2\cdot1}{2} = \dfrac{49}{36}$ and $\Delta_4 = -\dfrac{11}{36} + 1 - \dfrac{11}{36} = \dfrac{7}{18}$. For $M = 1 + d_1s + d_2s^2$: $M_2 = d_1^2 - 2d_2$ and $M_4 = d_2^2$.
5. So $d_2^2 = \dfrac{7}{18} \Rightarrow d_2 = 0.624$, and $d_1^2 = \dfrac{49}{36} + 2d_2 \Rightarrow d_1 = 1.615$ (positive roots keep the poles in the left half-plane). Then $G_L = \dfrac{1}{1 + 1.615s + 0.624s^2} = \dfrac{1.60}{s^2 + 2.590s + 1.60}$, with poles $-1.02$ and $-1.57$ against the original $-1, -2, -3$.
6. (c) With $G_L = \dfrac{1}{1 + d_1s}$ only one equation is needed: $M_2 = d_1^2 = \Delta_2 = \dfrac{49}{36}$, so $d_1 = \dfrac76$ and $G_L = \dfrac{1}{1 + \frac76 s} = \dfrac{0.857}{s + 0.857}$.

**Checks:** all reduced models keep DC gain 1 (or $10/3$ in (a)). A reduced model with more zeros than poles would not be causal, so keep $p \le q$.

</details>

#### Problem 7: Transient response with a tachometer (slides 15–18)

A speed-control motor has $R_a = 1$, $J = 10$, $b = 1$, $K_b = K_m = 1$, so $G = \dfrac{K_1}{\tau_1s + 1}$ with $K_1 = \dfrac{K_m}{R_ab + K_bK_m}$ and $\tau_1 = \dfrac{R_aJ}{R_ab + K_bK_m}$. The amplifier is $K_a = 20$, the tachometer $K_t = 0.5$.

(a) Open-loop time constant and settling time (2 %). (b) The same with the tachometer loop. (c) Compare the final values and say what the loop gain costs.

<details class="fold">
<summary>Solution</summary>

1. (a) $K_1 = 1/(1 + 1) = 0.5$, $\tau_1 = 10/2 = 5\ \mathrm{s}$; open loop $\omega/R = K_aG$ has time constant $5\ \mathrm{s}$ and $T_s \approx 4\tau = 20\ \mathrm{s}$.
2. (b) $\dfrac{\omega}{R} = \dfrac{K_aG}{1 + K_aK_tG} = \dfrac{K_aK_1/\tau_1}{s + (1 + K_aK_tK_1)/\tau_1}$. With $1 + K_aK_tK_1 = 1 + 20\cdot0.5\cdot0.5 = 6$ the pole is at $-6/5 = -1.2$: time constant $\tau_1/6 = 0.83\ \mathrm{s}$, $T_s \approx 3.3\ \mathrm{s}$ (six times faster).
3. (c) Final value (per unit command): open loop $K_aK_1 = 10$; closed loop $\dfrac{K_aK_1}{1 + K_aK_tK_1} = \dfrac{10}{6} = 1.67$, tending to $1/K_t = 2$ as the loop gain grows. Feedback bought speed (by the factor $1 + K_aK_tK_1$) and paid for it in DC gain, so $K_a$ (or the command) must be raised to get the same final speed.

**Check:** speed-up factor and gain-reduction factor are the same $1 + K_aK_tK_1$.

</details>

### Self-test

The self-test has 23 questions: the twelve Lecture Notes 2 questions already in the course quiz (feedback and steady-state error) plus eleven new ones on these problems. Use the **Take the self-test** button above; each answer links back to the map.
