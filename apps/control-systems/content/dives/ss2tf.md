---
id: ss2tf
order: 10
title: "From state space to the transfer function"
category: state
chain:
  - title: "How are the two descriptions related?"
  - title: "How do the two descriptions connect?"
  - title: "G(s) = C(sI − A)⁻¹B + D"
    detail: "G(s) = C(sI − A)⁻¹B + D"
neighbors:
  - ss
exampleScene: { overlays: [sensor, push, poles], caption: "A, B and C give the same poles, −1 and −2, as G(s): the sensor sees them in the push response." }
---
**How do the two descriptions connect?**

**Picture it first.** The eigenvalues of A are the poles of G(s): change c and k and see the same two numbers in both descriptions.

```figure:states
```

Taking the Laplace transform of the state equations and eliminating x gives G(s) = C(sI − A)⁻¹B + D. The poles of G are the eigenvalues of A, so stability and modes can be read from either description.

### Where does G(s) = C(sI − A)⁻¹B + D come from?

Laplace-transform the state equation with <i>x</i>(0) = 0, solve for <i>X</i>, and substitute into the output equation. Three lines.

1. <i>sX</i>(<i>s</i>) = <i>AX</i>(<i>s</i>) + <i>BU</i>(<i>s</i>) (zero ICs: the transfer-function convention again)
2. (<i>sI</i> − <i>A</i>)<i>X</i> = <i>BU</i> ⇒ <i>X</i> = (<i>sI</i> − <i>A</i>)<sup>−1</sup><i>BU</i> (you need <i>I</i> to subtract a matrix from the scalar <i>s</i>)
3. <i>Y</i> = <i>CX</i> + <i>DU</i> = [<i>C</i>(<i>sI</i> − <i>A</i>)<sup>−1</sup><i>B</i> + <i>D</i>]<i>U</i>

#### Back to 3/(s² + 2s + 3)

<i>sI</i> − <i>A</i> = <i>s</i>−13<i>s</i>+2, det = <i>s</i>² + 2<i>s</i> + 3.

2×2 inverse: <b>swap the diagonal, negate the off-diagonal, divide by det</b>: (<i>sI</i>−<i>A</i>)<sup>−1</sup> = <span class="frac"><span>1</span><span><i>s</i>²+2<i>s</i>+3</span></span><i>s</i>+21−3<i>s</i>

<i>C</i>(·)<sup>−1</sup> picks the top row: [<i>s</i>+2 1]/det. Times <i>B</i> = [0; 3] gives 3/det. So <i>G</i> = 3/(<i>s</i>²+2<i>s</i>+3) ✓.

### What should I recognize in that formula?

det(<i>sI</i> − <i>A</i>) <em>is</em> the characteristic polynomial, so the <b>poles of G are the eigenvalues of A</b> (unless a zero cancels one). <i>C</i>, <i>B</i>, and <i>D</i> only shape the numerator.

````callout:recognize Recognize


- (<i>sI</i> − <i>A</i>)<sup>−1</sup> is called the <b>resolvent</b>. Its denominator is det(<i>sI</i> − <i>A</i>) for every entry.
- Order of multiplication is fixed: <b>C · (inverse) · B</b> → (1×<i>n</i>)(<i>n</i>×<i>n</i>)(<i>n</i>×1) = scalar for SISO.
- Eigenvalue of <i>A</i> missing from <i>G</i>? Then that mode is cancelled: uncontrollable from <i>u</i> or unobservable at <i>y</i>. It still exists inside, and if it's unstable the transfer function will hide it.
````

````callout:trap Trap
Forgetting <i>D</i>, writing <i>B</i>(<i>sI</i>−<i>A</i>)<sup>−1</sup><i>C</i>, or mis-inverting the 2×2 (forgetting to divide by the determinant). Always finish with the DC-gain sanity check <i>G</i>(0) = −<i>CA</i><sup>−1</sup><i>B</i> + <i>D</i>.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Change c and k and watch the eigenvalues move: the same pole picture as the transfer function, now with the inside of the cart in view.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
````
