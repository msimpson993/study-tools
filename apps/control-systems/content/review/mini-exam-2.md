---
id: mini-exam-2
order: 2
title: "Mini exam 2: feedback control system characteristics"
summary: "Lecture Notes 2 start to finish (open versus closed loop, the error signal, sensitivity, disturbance and noise, transient and steady-state behaviour, performance indices, model reduction), plus a carry-over section for the part of Lecture Notes 1 that Mini exam 1 left out (second-order systems and P, I, D control, slides 50–72). Topic checklists with slide references, formula sheets, eleven worked problems and a 37-question self-test."
covers: "Lecture Notes 2, slides 1–34 (Dorf, ch. 4), and the LN1 carry-over, slides 50–72"
quizTag: mini-exam-2
quizSubsets:
  - { tag: ln1-carryover, label: "LN1 carry-over" }
---
**How to use this page.** The page has two parts: Lecture Notes 2 (the first checklist, the first formula sheet and problems 1–7), then a clearly marked **LN1 carry-over** (slides 50–72, not on Mini exam 1) in case the exam draws on it. Tick through the checklist and open the map link for anything you cannot explain in a sentence. Then do the worked problems with the solution closed, compare step by step (an exam is graded by steps, so write the steps), and finish with the self-test. The formula sheet prints on its own page. No exam date is assumed here.

Project 1 uses MATLAB's PID Tuner (see *Recipes*) and anti-windup (see *When the push hits its limit*). Neither is in the lecture notes.

````callout:trap Practise this one by hand
A performance-index problem that also needs an inverse Laplace transform appeared on a prior-year exam. **Problem 4** below is that type (inverse Laplace, then $\int y^2\,dt$, then minimise over a gain). Do it with the solution closed.
````

### Topic checklist (Lecture Notes 2)

Notation follows the slides: the controller is $G_c$, the plant $G$, the loop gain $L = G_cG$, a disturbance $T_d$ and measurement noise $N$. $C(s)$ is the complementary sensitivity (many books call it $T(s)$); it is not the state-space $C$ matrix.

| Slides | Topic: can you…? | Where it is on the map |
|---|---|---|
| 1–2 | tell open loop from closed loop, and name every block and signal ($G_c$, $G$, sensor $H$, $T_d$, $N$) | [Why not infinite gain? The price of feedback](#/dive/fb) |
| 3–4 | write the tracking error $E = SR - SGT_d + CN$ and define $S = 1/(1+L)$, $C = L/(1+L)$; explain why $S + C = 1$ means you cannot make both small at one frequency | [Why not infinite gain? The price of feedback](#/dive/fb) |
| 5–6 | show a plant change $\Delta G$ changes the error by $\approx -\Delta G/(LG)$, a factor $1+L$ smaller | [Why not infinite gain? The price of feedback](#/dive/fb) |
| 7–9 | define system sensitivity $S = \partial\ln T/\partial\ln G$, give open loop = 1 and closed loop $S_G^T = 1/(1+G_cG)$, and use the chain rule $S_\alpha^T = S_G^T S_\alpha^G$ and $S_\alpha^N - S_\alpha^D$ | [Why not infinite gain? The price of feedback](#/dive/fb) |
| 10–13 | derive $E = -S\,G\,T_d$ (disturbance rejection) and work the steel-mill speed loop: open loop, then with a tachometer, then the ratio (usually under 0.02) | [Why not infinite gain? The price of feedback](#/dive/fb) |
| 14 | state the noise flip side: $E = CN$, so $Y \approx -N$ for large $L$ (the lecture treats it briefly) | [Why not infinite gain? The price of feedback](#/dive/fb) |
| 15–18 | compare open-loop and closed-loop transient: time constant $\tau_1 \to \tau_1/(1+K_aK_tK_1)$ | [Why not infinite gain? The price of feedback](#/dive/fb) |
| 19–22 | define the steady-state error $e_{ss}$; write the open-loop error $E_0 = (1 - G_cG)R$ and the closed-loop error $E_c = R/(1 + G_cG)$; apply the final-value theorem; work the boring machine (step command: $e_{ss} = 0$; unit-step disturbance: $y_{ss} = 1/K$). *(Not in lecture notes.)* System type, error constants $K_p$, $K_v$ and ramp errors (Problem 5 and a self-test question) | [Why not infinite gain? The price of feedback](#/dive/fb); not in lecture notes: [Why it stops short](#/dive/sse) |
| 23–28 | define ISE, IAE, ITAE and ITSE (s.23–25); minimise an index with $dI/dK = 0$; quote the telescope result (ISE: $K_3 = \sqrt{10} = 3.16$, $\zeta = 0.5$; IAE: $K_3 = 4.2$, $\zeta = 0.665$) | [Why not infinite gain? The price of feedback](#/dive/fb) |
| 29–34 | reduce a model two ways: drop a far pole and keep the DC gain, or match the frequency response ($M_{2q} = \Delta_{2q}$); know the $6/((s+1)(s+2)(s+3))$ example and that more zeros than poles is not causal | [Which poles matter](#/dive/dominant), [Why not infinite gain? The price of feedback](#/dive/fb) |

Underlying ideas elsewhere on the map: [the loop](#/dive/blocks) (where a disturbance enters), [Turn up the gain (P), the controller menu, and faster loops](#/dive/ctrl) and the [ζ and ωₙ](#/dive/second) read-offs the boring-machine problem uses.

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
- $e_{ss} = \lim_{s\to0} sE(s)$ (stable loop only). Open loop $E_0 = (1 - G_cG)R$; closed loop $E_c = \dfrac{R}{1 + G_cG}$ (slides 19–22)
- *(Not in lecture notes.)* step: $e_{ss} = \dfrac{1}{1+K_p}$ with $K_p = \lim_{s\to0}L(s)$; ramp: $e_{ss} = \dfrac{1}{K_v}$ with $K_v = \lim_{s\to0}sL(s)$. Type 0: step $\dfrac{1}{1+K_p}$, ramp $\infty$. Type 1: step $0$, ramp $\dfrac{1}{K_v}$. Type 2: step $0$, ramp $0$. This $K_p$ is the loop's position error constant, not the telescope's position-feedback gain $K_p$ (slides 26–27)

#### Boring machine ($G_c = K + 11s$, $G = \dfrac{1}{s(s+1)}$)

- $\dfrac{Y}{R} = \dfrac{K + 11s}{s^2 + 12s + K}$, $\;\dfrac{Y}{T_d} = \dfrac{1}{s^2 + 12s + K}$
- Step $e_{ss} = 0$; unit-step disturbance $y_{ss} = 1/K$ (0.01 at $K=100$, 0.05 at $K=20$)
- $\omega_n = \sqrt K$, $\;\zeta = 6/\sqrt K$. The zero adds overshoot ($K=100$: about 22 %; $K=20$: about 4 %)

#### Performance indices

- ISE $\int_0^T e^2dt$, IAE $\int_0^T|e|dt$, ITAE $\int_0^T t|e|dt$, ITSE $\int_0^T te^2dt$ ($T$ about the settling time)
- Minimise over a gain $K$: write $I(K)$, solve $dI/dK = 0$, check $d^2I/dK^2 > 0$
- $\int_0^\infty y^2dt$ for $Y = \dfrac{b_1s + b_0}{s^2 + a_1s + a_0}$: $\dfrac{b_1^2a_0 + b_0^2}{2a_0a_1}$
- Telescope time response (slide 27, unit step $T_d$): $y(t) = \dfrac{\sqrt{10}}{\beta}\,e^{-0.25K_3t}\sin\!\left(\dfrac{\beta}{2}t + \psi\right)$, $\beta = \sqrt{10 - K_3^2/4}$ (needs $K_3 < \sqrt{40}$). The slide does not define $\psi$; matching $Y = \dfrac{s + 0.5K_3}{s^2 + 0.5K_3s + 2.5}$ gives $\tan\psi = 2\beta/K_3$ and $y(0) = 1$
- Telescope ($Y/T_d = \dfrac{s(s+K_1K_3)}{s^2 + K_1K_3s + K_1K_2K_p}$, $K_1 = 0.5$, $K_1K_2K_p = 2.5$): $I_{ISE} = \dfrac{1}{K_3} + 0.1K_3$, minimum at $K_3 = \sqrt{10} = 3.16$, $\zeta = 0.5$; IAE minimum at $K_3 = 4.2$, $\zeta = 0.665$

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
2. (b) $e_{ss} = \lim_{s\to0} \dfrac{s}{1 + L(s)}\dfrac{1}{s} = \dfrac{1}{1 + L(0)} = 0$, since $L(s) \to \infty$ as $s \to 0$ (the loop has an integrator).
3. (c) $y_{ss} = \lim_{s\to0} s\,\dfrac{1}{s^2 + 12s + K}\dfrac{1}{s} = \dfrac{1}{K}$.
4. (d) $s^2 + 12s + K$ matches $s^2 + 2\zeta\omega_ns + \omega_n^2$, so $\omega_n = \sqrt K$ and $\zeta = 6/\sqrt K$. For $K = 100$: $\omega_n = 10$, $\zeta = 0.6$, $y_{ss} = 0.01$. For $K = 20$: $\omega_n = 4.47$, $\zeta = 1.34$ (overdamped), $y_{ss} = 0.05$.
5. (e) $1/K \le 0.02 \Rightarrow K \ge 50$, where $\zeta = 6/\sqrt{50} = 0.85$.

**Check and trade-off:** a larger $K$ rejects the disturbance better and is faster, but lowers $\zeta$. Even at $K = 20$ the reference step overshoots (about 4 %) because the PD zero at $s = -K/11$ adds overshoot that the $\zeta$ formula does not include. Including the PD zero, the step overshoots 22.0 % (K = 100), 12.9 % (K = 50), 3.9 % (K = 20).

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

**Check and link to the lecture:** the telescope example (slides 26–28) has the same form with $a_1 = 0.5K_3$, $a_0 = 2.5$, giving $I = 1/K_3 + 0.1K_3$, a minimum at $K_3 = \sqrt{10} = 3.16$ and again $\zeta = 0.5$. The ITAE and IAE optima are more damped (IAE: $\zeta = 0.665$).

</details>

#### Problem 5: Steady-state error by system type (uses the final-value theorem from slides 19–22; system type and $K_v$: not in lecture notes)

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
3. From the coefficients $\Delta^{(0)} = 1$, $\Delta^{(1)} = \frac{11}{6}$, $\Delta^{(2)} = 2$, $\Delta^{(3)} = 1$ at $s = 0$: $\Delta_2 = -\dfrac{1\cdot2}{2} + \dfrac{(11/6)^2}{1} - \dfrac{2\cdot1}{2} = \dfrac{49}{36}$ and $\Delta_4 = -\dfrac{11}{36} + 1 - \dfrac{11}{36} = \dfrac{7}{18}$. For $M = 1 + d_1s + d_2s^2$: $M_2 = d_1^2 - 2d_2$ and $M_4 = d_2^2$.
4. So $d_2^2 = \dfrac{7}{18} \Rightarrow d_2 = 0.624$, and $d_1^2 = \dfrac{49}{36} + 2d_2 \Rightarrow d_1 = 1.615$ (positive roots keep the poles in the left half-plane). Then $G_L = \dfrac{1}{1 + 1.615s + 0.624s^2} = \dfrac{1.60}{s^2 + 2.590s + 1.60}$, with poles $-1.02$ and $-1.57$ against the original $-1, -2, -3$.
5. (c) With $G_L = \dfrac{1}{1 + d_1s}$ only one equation is needed: $M_2 = d_1^2 = \Delta_2 = \dfrac{49}{36}$, so $d_1 = \dfrac76$ and $G_L = \dfrac{1}{1 + \frac76 s} = \dfrac{0.857}{s + 0.857}$.

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


### LN1 carry-over (slides 50–72, not on Mini exam 1)

[Mini exam 1](#/review/mini-exam-1) stops at the first-order impulse response (slide 49). Everything below is the rest of Lecture Notes 1: second-order systems and what P, I and D do. It sits on this page in case Mini exam 2 draws on it. In this section $K_p$ is the proportional gain of the controller, as on the slides. The question map covers these in [ζ and ωₙ](#/dive/second), [Turn up the gain (P), the controller menu, and faster loops](#/dive/ctrl) and [Why it stops short](#/dive/sse).

| Slides | Topic: can you…? | Where it is on the map |
|---|---|---|
| 50–51 | write the servo model $J\ddot\theta + B\dot\theta = T$ (inertia and viscous friction), close it with proportional gain $K$ to get $\dfrac{C}{R} = \dfrac{K}{Js^2 + Bs + K}$, and read $\omega_n = \sqrt{K/J}$, $\zeta = \dfrac{B}{2\sqrt{JK}}$ and the attenuation $\sigma = \zeta\omega_n = \dfrac{B}{2J}$ | [ζ and ωₙ](#/dive/second) |
| 52–55 | tell the damping cases apart and give each step response: underdamped $0 < \zeta < 1$ (poles $-\zeta\omega_n \pm j\omega_d$, $\omega_d = \omega_n\sqrt{1-\zeta^2}$), critically damped $\zeta = 1$ (a double pole at $-\omega_n$, $c = 1 - e^{-\omega_nt}(1 + \omega_nt)$), overdamped $\zeta > 1$ (two real poles). The undamped case $\zeta = 0$ (poles on the imaginary axis, rings forever) appears on slides 61 and 70 | [ζ and ωₙ](#/dive/second) |
| 56–57 | read the family of step responses (slide 56) and impulse responses (slide 57) against ζ: small ζ rings for a long time, ζ = 1 and above is sluggish | [ζ and ωₙ](#/dive/second) |
| 58–60 | define rise time $T_r$ (the 0–100 % rise time for an underdamped response with overshoot), peak time $T_p$, settling time $T_s$ (2 % criterion $e^{-\zeta\omega_nT_s} < 0.02$, so $\zeta\omega_nT_s \approx 4$) and percent overshoot, and use $T_p = \dfrac{\pi}{\omega_n\sqrt{1-\zeta^2}}$, $\;\%OS = 100e^{-\zeta\pi/\sqrt{1-\zeta^2}}$, $\;T_s = \dfrac{4}{\zeta\omega_n}$, $\;T_{r1} = \dfrac{2.16\zeta + 0.60}{\omega_n}$ ($0.3 \le \zeta \le 0.8$); for an overdamped system there is no peak, so use the 10–90 % rise time $T_{r1}$ | [ζ and ωₙ](#/dive/second) |
| 61 | read an impulse response from pole location: left half-plane decays, imaginary axis oscillates forever, right half-plane grows; farther left is faster, farther from the real axis is a faster oscillation | [ζ and ωₙ](#/dive/second), [Poles and zeros](#/dive/splane) |
| 62–64 | show that proportional control of $K/(Ts+1)$ leaves $e_{ss} = \dfrac{1}{K + 1}$ for a unit step, and that an integral term removes the offset ($e_{ss} = 0$) at the risk of oscillation | [Why it stops short](#/dive/sse), [Turn up the gain (P), the controller menu, and faster loops](#/dive/ctrl) |
| 65–68 | find the steady-state error from a step torque disturbance on an inertia load: P gives $e_{ss} = -T_d/K_p$ (raising $K_p$ shrinks it but adds oscillation); PI makes it 0, but the loop becomes third order, $Js^3 + Bs^2 + K_ps + K_p/T_i$, and can go unstable (the stability test $a_2a_1 > a_0a_3$ *(not in lecture notes)*; Carry-over problem 4) | [Why it stops short](#/dive/sse) |
| 69–72 | say what derivative action does (anticipates the error, adds damping); see that P on an inertia load $1/(Js^2)$ has imaginary poles and oscillates forever; for PD on $\dfrac{1}{s(Js+B)}$ (slide 71 writes it $K_p(1 + T_ds)$, so $K_d = K_pT_d$) get $\zeta = \dfrac{B + K_d}{2\sqrt{K_pJ}}$ and ramp error $B/K_p$; the design advice is small $B$, large $K_p$, then pick $K_d$ for $\zeta$ between 0.4 and 0.7 | [Turn up the gain (P), the controller menu, and faster loops](#/dive/ctrl), [ζ and ωₙ](#/dive/second) |

<div class="formula-sheet page2">

#### Formula sheet: LN1 carry-over (slides 50–72)

#### Second-order system

- Standard form $\dfrac{C(s)}{R(s)} = \dfrac{\omega_n^2}{s^2 + 2\zeta\omega_ns + \omega_n^2}$; servo with P control ($J\ddot\theta + B\dot\theta = T$): $\dfrac{C}{R} = \dfrac{K}{Js^2 + Bs + K}$, $\omega_n = \sqrt{\dfrac{K}{J}}$, $\dfrac{B}{J} = 2\zeta\omega_n = 2\sigma$, $\zeta = \dfrac{B}{B_c} = \dfrac{B}{2\sqrt{JK}}$, $\sigma = \zeta\omega_n$
- Underdamped $0 < \zeta < 1$: poles $-\zeta\omega_n \pm j\omega_d$, $\omega_d = \omega_n\sqrt{1-\zeta^2}$; $c(t) = 1 - \dfrac{e^{-\zeta\omega_nt}}{\sqrt{1-\zeta^2}}\sin\!\left(\omega_dt + \tan^{-1}\dfrac{\sqrt{1-\zeta^2}}{\zeta}\right)$
- Critically damped $\zeta = 1$: double pole at $-\omega_n$; $c(t) = 1 - e^{-\omega_nt}(1 + \omega_nt)$
- Overdamped $\zeta > 1$: two real poles $s_{1,2} = -(\zeta \pm \sqrt{\zeta^2-1})\,\omega_n$ (both negative; LN1 slide 54), response is two decaying exponentials, no overshoot
- Undamped $\zeta = 0$: poles $\pm j\omega_n$, oscillates forever

#### Step-response specifications

- $T_p = \dfrac{\pi}{\omega_d}$, $\;M_{pt} = 1 + e^{-\zeta\pi/\sqrt{1-\zeta^2}}$, $\;\%OS = 100\,e^{-\zeta\pi/\sqrt{1-\zeta^2}}$ (depends on $\zeta$ only)
- $T_s = \dfrac{4}{\zeta\omega_n}$ (slide 59: 2 % criterion $e^{-\zeta\omega_nT_s} < 0.02$, so $\zeta\omega_nT_s \approx 4$, i.e. $T_s = 4\tau$)
- Rise time (slide 58): underdamped (with overshoot) use the **0–100 %** rise time $T_r$; overdamped has no peak, use the **10–90 %** rise time $T_{r1}$
- $T_{r1} = \dfrac{2.16\zeta + 0.60}{\omega_n}$ (10–90 % rise time, $0.3 \le \zeta \le 0.8$)

#### Pole location (slide 61)

- Left half-plane: decays; imaginary axis: oscillates forever; right half-plane: grows. Real part $= -\zeta\omega_n$ sets decay speed, imaginary part $\omega_d$ sets oscillation speed

#### P, I and D actions (the slides' $K_p$ is the controller's proportional gain)

- P on $\dfrac{K}{Ts+1}$: $e_{ss} = \dfrac{1}{K + 1}$ for a unit step (with a controller gain $K_p$ in front of a plant gain $K$, replace $K$ by $K_pK$)
- Integral action: $e_{ss} = 0$ for a step, possibly oscillatory. PI on a step torque disturbance: $e_{ss} = 0$, but the loop is one order higher
- P on a step torque disturbance $T_d$, plant $\dfrac{1}{s(Js+b)}$ (slides 65–66): $\dfrac{C}{D} = \dfrac{1}{Js^2 + bs + K_p}$, $e_{ss} = -\dfrac{T_d}{K_p}$ (output offset $T_d/K_p$): larger $K_p$ gives less error but more oscillation
- PI on the same disturbance (slides 67–68): $\dfrac{C}{D} = \dfrac{s}{Js^3 + bs^2 + K_ps + K_p/T_i}$, $e_{ss} = 0$, but the loop is third order and can go unstable. *(Not in lecture notes.)* For $a_3s^3 + a_2s^2 + a_1s + a_0$ (all $a_i > 0$) stable if $a_2a_1 > a_0a_3$, here $bK_p > JK_p/T_i$, i.e. $T_i > J/b$ (the $K_p$ cancels)
- P on an inertia load $\dfrac{1}{Js^2}$: $\dfrac{K_p}{Js^2 + K_p}$, poles $\pm j\sqrt{K_p/J}$, oscillates forever
- PD (slide 71 writes $K_p(1 + T_ds)$, so $K_d = K_pT_d$) on an inertia load: $Js^2 + K_pT_ds + K_p = 0$, damping added. PD on $\dfrac{1}{s(Js+B)}$ (slide 72): $\zeta = \dfrac{B + K_d}{2\sqrt{K_pJ}}$, ramp $e_{ss} = \dfrac{B}{K_p}$. Design advice: small $B$, large $K_p$ (small ramp error), then $K_d$ so that $\zeta$ is between 0.4 and 0.7 (small overshoot)

</div>

#### Carry-over problem 1: Second-order specifications (slides 50–60)

For $T(s) = \dfrac{3}{s^2 + 2s + 3}$ find $\omega_n$, $\zeta$, the percent overshoot, the peak time, the 2 % settling time and the 10–90 % rise time.

<details class="fold">
<summary>Solution</summary>

1. Match $s^2 + 2s + 3$ to $s^2 + 2\zeta\omega_ns + \omega_n^2$: $\omega_n^2 = 3$, so $\omega_n = \sqrt3 = 1.732$; $2\zeta\omega_n = 2$, so $\zeta = 1/\sqrt3 = 0.577$. Since $0 < \zeta < 1$ it is underdamped. The DC gain is $3/3 = 1$, so the step response settles at 1.
2. The damped frequency is $\omega_d = \omega_n\sqrt{1-\zeta^2} = \sqrt3\cdot\sqrt{2/3} = \sqrt2 = 1.414$ rad/s.
3. Overshoot: $\zeta/\sqrt{1-\zeta^2} = (1/\sqrt3)/\sqrt{2/3} = 1/\sqrt2$, so $\%OS = 100\,e^{-\pi/\sqrt2} = 100\,e^{-2.221} = 10.8\,\%$ (10.85 %); the peak value is $1.108$.
4. Peak time: $T_p = \pi/\omega_d = \pi/\sqrt2 = 2.22$ s.
5. Settling time: $\zeta\omega_n = 1$, so $T_s = 4/(\zeta\omega_n) = 4$ s.
6. Rise time: $T_{r1} = (2.16\zeta + 0.60)/\omega_n = (1.247 + 0.60)/1.732 = 1.07$ s (valid because $0.3 \le \zeta \le 0.8$).

**Check:** the poles are $-1 \pm j\sqrt2$. The real part $-1$ gives $T_s = 4$ s, and the imaginary part $\sqrt2$ gives the peak at $\pi/\sqrt2$.

</details>

#### Carry-over problem 2: A second-order plant with proportional control (the pattern of slides 50–62)

The plant is $G(s) = \dfrac{1}{s^2 + 3s + 2}$ and the controller is a proportional gain $K = 7$ in a unity-feedback loop. Find the closed loop, $\omega_n$, $\zeta$, the steady-state error for a unit step, the percent overshoot and the settling time.

<details class="fold">
<summary>Solution</summary>

1. Closed loop: $T = \dfrac{KG}{1 + KG} = \dfrac{K}{s^2 + 3s + 2 + K} = \dfrac{7}{s^2 + 3s + 9}$.
2. $\omega_n^2 = 9$, so $\omega_n = 3$ rad/s; $2\zeta\omega_n = 3$, so $\zeta = 3/6 = 0.5$ (underdamped, poles $-1.5 \pm j2.60$).
3. DC gain $T(0) = 7/9$, so for a unit step the output settles at $7/9$ and $e_{ss} = 1 - 7/9 = 2/9 = 0.222$. Check with $e_{ss} = \dfrac{1}{1 + KG(0)} = \dfrac{1}{1 + 7/2} = \dfrac29$ (the same pattern as slide 62).
4. Overshoot: $\%OS = 100\,e^{-\pi(0.5)/\sqrt{0.75}} = 16.3\,\%$ of the final value, so the peak is $\tfrac79 \times 1.163 = 0.905$. The overshoot formula applies because $T$ is the standard second-order shape times the constant $7/9$.
5. Settling time: $T_s = 4/(\zeta\omega_n) = 4/1.5 = 2.67$ s. (Also $T_p = \pi/(3\sqrt{0.75}) = 1.21$ s and $T_{r1} = (2.16\cdot0.5 + 0.6)/3 = 0.56$ s.)

**Check and link:** the $2/9$ offset is the price of P-only control (slides 62–63). An integral term would remove it, as in the next problem.

</details>

#### Carry-over problem 3: P versus PI on a first-order plant (slides 62–64)

The plant is $G(s) = \dfrac{4}{2s + 1}$ ($K = 4$, $\tau = 2$ s) in a unity-feedback loop with a unit-step command. Find the steady-state error with (a) the P controller $K_p = 2$ and (b) the PI controller $G_c = K_p + K_i/s = \dfrac{2s + 3}{s}$ ($K_p = 2$, $K_i = 3$).

<details class="fold">
<summary>Solution</summary>

1. (a) $E(s) = \dfrac{R(s)}{1 + K_pG(s)} = \dfrac1s\cdot\dfrac{2s + 1}{2s + 1 + 8} = \dfrac{2s + 1}{s(2s + 9)}$. The closed loop $\dfrac{8}{2s + 9}$ is stable (pole at $-4.5$), so the final-value theorem applies: $e_{ss} = \lim_{s\to0} sE(s) = \dfrac{1}{9} = \dfrac{1}{1 + K_pK}$, which is the slide's $1/(K+1)$ with the loop gain $K_pK = 8$. The closed-loop time constant is also faster: $\tau/(1 + K_pK) = 2/9$ s.
2. (b) $L = G_cG = \dfrac{(2s + 3)}{s}\cdot\dfrac{4}{2s + 1}$, so $1 + L = \dfrac{s(2s + 1) + 4(2s + 3)}{s(2s + 1)} = \dfrac{2s^2 + 9s + 12}{s(2s + 1)}$.
3. Stability: $2s^2 + 9s + 12$ has all coefficients positive, so both poles are in the left half-plane (they are $-2.25 \pm j0.97$, with $\zeta \approx 0.92$). The final-value theorem is allowed.
4. $E(s) = \dfrac1s\cdot\dfrac{s(2s + 1)}{2s^2 + 9s + 12} = \dfrac{2s + 1}{2s^2 + 9s + 12}$, so $e_{ss} = \lim_{s\to0} sE(s) = 0$.
5. Overshoot: the closed loop is $T = \dfrac{L}{1 + L} = \dfrac{8s + 12}{2s^2 + 9s + 12}$, which has a **zero at $s = -1.5$** (from the PI controller). With $\zeta \approx 0.92$ the overshoot formula would predict almost nothing (0.07 %), but the simulated step response peaks at $1.098$ (about 9.8 % overshoot, at $t \approx 0.94$ s). The PI zero adds roughly 10 % overshoot, so $\%OS = 100e^{-\zeta\pi/\sqrt{1-\zeta^2}}$ holds only for a pure second-order system with no zeros.

**Check:** the integrator in $G_c$ makes $L(0) \to \infty$, so $\dfrac{1}{1 + L(0)} = 0$. The price (slides 63 and 68) is that the first-order loop became second order, which can ring, and the PI zero makes it overshoot more than its $\zeta$ suggests.

</details>

#### Carry-over problem 4: A torque disturbance on an inertia load, P versus PI (slides 65–68)

A load with inertia $J = 1$ and viscous friction $B = 2$ has the plant $\dfrac{1}{s(Js + B)}$ (torque to position). A step torque disturbance $T_d = 1$ acts with $R = 0$. Find the steady-state error and $\zeta$ for (a) P control with $K_p = 4$ and (b) with $K_p = 16$. (c) Use PI control $G_c = K_p\left(1 + \dfrac{1}{T_is}\right)$ with $K_p = 4$, $T_i = 2$: find the closed-loop characteristic polynomial, check stability and the steady-state error. (d) For which $T_i$ is the PI loop stable? Check $T_i = 0.5$ and $T_i = 0.25$.

<details class="fold">
<summary>Solution</summary>

1. (a) With P control, $\dfrac{C}{D} = \dfrac{1}{Js^2 + Bs + K_p} = \dfrac{1}{s^2 + 2s + 4}$, which is stable. For $E = -C$ and a step $D = 1/s$: $e_{ss} = -\lim_{s\to0} \dfrac{s}{s^2 + 2s + 4}\dfrac1s = -\dfrac14 = -\dfrac{T_d}{K_p}$ (the output sits at $0.25$ instead of $0$). Here $\omega_n = 2$ and $\zeta = \dfrac{B}{2\sqrt{JK_p}} = \dfrac{2}{4} = 0.5$. The disturbance response $C/D$ overshoots its final value $1/K_p = 0.25$ by about 16 %.
2. (b) With $K_p = 16$: $\dfrac{1}{s^2 + 2s + 16}$, $e_{ss} = -\dfrac{1}{16} = -0.0625$, $\omega_n = 4$ and $\zeta = \dfrac{2}{2\cdot4} = 0.25$. The disturbance response $C/D$ overshoots its final value $1/K_p = 0.0625$ by about 44 %. Four times the gain gives four times less error, but the response rings much more.
3. (c) With PI, $L = K_p\dfrac{T_is + 1}{T_is}\cdot\dfrac{1}{s(Js + B)}$, so $1 + L = 0$ gives $Js^3 + Bs^2 + K_ps + \dfrac{K_p}{T_i} = 0$, which for the numbers is $s^3 + 2s^2 + 4s + 2 = 0$. The loop is now third order. The disturbance transfer function is $\dfrac{C}{D} = \dfrac{s}{s^3 + 2s^2 + 4s + 2}$.
4. Stability of the cubic $a_3s^3 + a_2s^2 + a_1s + a_0$ with all coefficients positive: it is stable if $a_2a_1 > a_0a_3$. This test is the Routh condition for a cubic. *(Not in lecture notes.)* Here $a_2a_1 = 2\cdot4 = 8 > a_0a_3 = 2$, so it is stable (the poles are $-0.64$ and $-0.68 \pm j1.63$).
5. Then $e_{ss} = -\lim_{s\to0} s\cdot\dfrac{s}{s^3 + 2s^2 + 4s + 2}\dfrac1s = 0$. The integral action removes the disturbance error that P left (slide 68).
6. (d) For the general cubic $Js^3 + Bs^2 + K_ps + K_p/T_i$: $a_2a_1 > a_0a_3$ reads $BK_p > J\dfrac{K_p}{T_i}$, so the loop is stable for $T_i > J/B = 0.5$. The $K_p$ cancels out of this condition. At $T_i = 0.5$ the cubic is $s^3 + 2s^2 + 4s + 8 = (s + 2)(s^2 + 4)$, with poles $-2$ and $\pm j2$: marginal, it rings forever. At $T_i = 0.25$ it is $s^3 + 2s^2 + 4s + 16$, where $8 < 16$, so it is unstable (poles $-2.71$ and $+0.35 \pm j2.41$) and the disturbance response grows.

**Check and link:** P leaves $-T_d/K_p$, and raising $K_p$ cuts the error but adds oscillation (slides 65–66). PI gives 0 error but raises the order (slide 68, which warns the loop may become unstable); the cubic test shows where: too much integral action (here $T_i \le J/B$), not simply a large $K_p$.

**Reconciling with slide 68:** the slide says the PI loop "may become unstable for a large value of $K_p$". For this exact model the test gives $T_i > J/B$, which does not depend on $K_p$, so too much integral action is what destabilizes it. Real loops have extra lags (actuator, sensor), and with those a large $K_p$ also erodes stability. On the exam, quote the slide's point (PI makes the loop third order, so stability is no longer guaranteed) and show the cubic test if asked.

</details>

### LN4 worked examples (not on Mini exam 2)

The state-space examples from Lecture Notes 4, moved here from the *Feed back every state*, *Estimate what we can't measure* and *Use the estimate (separation)* deep dives.

- **Pole placement (LN4 s.17–18):** y‴ + 5ÿ + 3ẏ + 2y = u with poles from (s² + 9.6s + 36)(s + 4.8) = s³ + 14.4s² + 82.08s + 172.8, giving K = [170.8, 79.08, 9.4].
- **Ackermann (LN4 s.19–21):** on 1/s² with poles −1 ± j: K = [2, 2].
- **Observer (LN4 s.22–29):** A = [[2, 3], [−1, 4]], C = [1, 0], ζ 0.8, ωₙ 10 give L_o = [22, 59].
- **Inverted pendulum (LN4 s.30–40):** the separation principle on a four-state unstable plant; work it from the slides.

### Self-test

The self-test has 37 questions. 22 are on Lecture Notes 2: the eleven already in the course quiz (feedback and the final-value theorem) plus eleven new ones on the problems above (one of them, the unit-ramp error, is not in lecture notes). The other 15 are the **LN1 carry-over**: eight existing questions on second-order systems and P, I, D, plus seven new ones. The **LN1 carry-over only** button runs just those 15, and each of them is labelled "LN1 carry-over" on its card. Use the **Take the self-test** button above; each answer links back to the map.
