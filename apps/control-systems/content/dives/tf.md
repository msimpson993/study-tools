---
id: tf
order: 3
title: "What to read off any transfer function"
category: describe
chain:
  - title: "What do I read off G(s) before simulating?"
  - title: "What can I read off any transfer function?"
  - title: "order, DC gain, time constants"
    detail: "G(0) = lim s→0 G(s)   τ = 1/|p|"
neighbors:
  - model
  - order
  - blocks
  - first
exampleScene: { overlays: [sensor, push, trace], caption: "The sensor reads y = x. Hold a 1 N push and the cart settles at G(0) = 0.5 m: the DC gain read straight off G(s)." }
---
**What can I read off any transfer function?**

**Picture it first.** Three numbers say most of it: the DC gain G(0), the order, and where the poles sit. Slide q and watch the final value and the start slope appear without solving anything.

```figure:fvt
```

Three numbers: the order (highest power of s in the denominator), the DC gain G(0) (final output per unit constant input), and the time constants 1/|p| of the poles. With those you can sketch the step response before computing anything.

### What exactly is G(s)?

<i>G</i>(<i>s</i>) = <i>Y</i>(<i>s</i>)/<i>U</i>(<i>s</i>) with zero initial conditions: output transform over input transform. For lumped LTI systems it's a ratio of polynomials in <i>s</i>.

<div class="eqbox"><i>G</i>(<i>s</i>) = <span class="frac"><span><i>Y</i>(<i>s</i>)</span><span><i>U</i>(<i>s</i>)</span></span> = <span class="frac"><span><i>b</i><sub><i>m</i></sub><i>s</i><sup><i>m</i></sup> + … + <i>b</i><sub>1</sub><i>s</i> + <i>b</i><sub>0</sub></span><span><i>s</i><sup><i>n</i></sup> + <i>a</i><sub><i>n</i>−1</sub><i>s</i><sup><i>n</i>−1</sup> + … + <i>a</i><sub>1</sub><i>s</i> + <i>a</i><sub>0</sub></span></span></div>

It is also the Laplace transform of the impulse response <i>g</i>(<i>t</i>). <b>Proper</b> means <i>m</i> ≤ <i>n</i>, and <b>strictly proper</b> means <i>m</i> &lt; <i>n</i>, which is the usual case for physical plants (they can't respond instantly to infinitely fast inputs).

### What three numbers should I read off any transfer function instantly?

<b>Order</b> = highest power of <i>s</i> in the denominator. <b>DC gain</b> = <i>G</i>(0) (let <i>s</i> → 0). <b>Time constants / speeds</b> come from the pole locations (τ = 1/|<i>p</i>| for a real pole).

| G(s) | Order | DC gain G(0) | Poles → speed |
|---|---|---|---|
| 5/(2<i>s</i>+1) | 1 | 5 | <i>p</i> = −0.5 → τ = 2 s |
| 4/(<i>s</i>+2) | 1 | <b>2</b> (not 4!) | <i>p</i> = −2 → τ = 0.5 s |
| 3/(<i>s</i>²+2<i>s</i>+3) | 2 | 1 | −1 ± <i>j</i>1.41 → oscillatory, decays like <i>e</i><sup>−<i>t</i></sup> |
| (<i>s</i>+1)/(<i>s</i>³+4<i>s</i>²+5<i>s</i>+2) | 3 | 0.5 | −1, −1, −2 (one −1 cancels the zero) |
| 1/(<i>s</i>(<i>s</i>+1)) | 2 | ∞ (integrator) | 0, −1 → <b>type 1</b> |


````callout:recognize Recognize


- <b>Order</b>: look only at the denominator's highest power. The numerator doesn't count.
- <b>DC gain</b>: substitute <i>s</i> = 0, i.e. the ratio of the constant terms. For a stable system, a unit step settles at <i>G</i>(0).
- A bare <i>s</i> factor in the denominator is an integrator: infinite DC gain, and a step input makes the output ramp forever.
- <b>Time-constant form</b> <i>K</i>/(τ<i>s</i>+1) shows <i>K</i> and τ directly. <b>Pole form</b> <i>b</i>/(<i>s</i>+<i>a</i>) hides them: <i>K</i> = <i>b</i>/<i>a</i>, τ = 1/<i>a</i>.
````

### How do blocks combine: series, parallel, feedback?

Series → multiply. Parallel → add. Negative feedback → <i>G</i>/(1 + <i>GH</i>), which reads as “forward path over one plus loop gain.”

*From the guide's static figure: <b>Three rules cover almost every reduction.</b> In a loop, <i>GH</i> is the <b>loop gain</b>: the product around the loop, ignoring the summing junction's sign.*

````callout:trap Trap
The sign in the denominator is the <em>opposite</em> of the feedback sign: negative feedback gives 1 <b>+</b> <i>GH</i>. With unity feedback (<i>H</i> = 1) it's <i>G</i>/(1+<i>G</i>), and the class notes write this as <i>C</i>/<i>R</i>.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Move q to the right of zero: G(0) is still a perfectly good number, but the output runs away, so the theorem does not apply.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
- **T (time constant)**: time for a first-order response to cover 63 % of the way: T = 1/|p|
````
