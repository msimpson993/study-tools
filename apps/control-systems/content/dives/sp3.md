---
id: sp3
order: 18
title: "Reading a location on the plane"
category: describe
chain:
  - title: "How do I read where a pole sits?"
  - title: "How do I read a location on the plane?"
  - title: "left or right, near or far, up or down"
    detail: "ζ = cos θ, ωₙ = |p|"
neighbors:
  - sp1
  - sp4
---
**How do I read a location on the plane?**

**Picture it first.** Where the pole is tells you the response: left is decay, the angle is the damping, the height is the oscillation frequency.

```figure:second
```

Left of the imaginary axis decays, right grows. Farther left is faster. Higher up is faster oscillation. The angle from the negative real axis is cos⁻¹ ζ and the distance from the origin is ωₙ.

### So what is a point s = σ + jω, in plain words?

It's an <b>address</b> that names a <em>type</em> of exponential signal, <i>e</i><sup><i>st</i></sup> = <i>e</i><sup>σ<i>t</i></sup>(cos ω<i>t</i> + <i>j</i> sin ω<i>t</i>): σ says how fast it grows or decays, and ω how fast it oscillates. <i>G</i>(<i>s</i>) at that address is the complex number the system would multiply that signal by. The point itself is neither a state of the system nor a setting.

Linear systems have a special property: feed in <i>e</i><sup><i>st</i></sup> and (after transients) you get back <i>G</i>(<i>s</i>)·<i>e</i><sup><i>st</i></sup>, the same shape, just scaled and rotated. So the plane is a <b>catalogue of test shapes</b>, and the surface records how the system treats each one. On the jω axis (σ = 0) the shapes are steady sines. Left of it (σ &lt; 0) they're decaying sines; right of it (σ &gt; 0), growing ones.

````callout:recognize Recognize
When someone says “evaluate at <i>s</i> = <i>j</i>2,” read it as <b>“put the ◆ at <i>j</i>2 and read the surface height and phase there.”</b> You get a gain and a phase for a 2 rad/s sine. Nothing moves.
````

### Is my spot on the plane the input?

<b>No.</b> The input is a time signal, e.g. 3 sin(2<i>t</i>). Your spot (<i>s</i> = <i>j</i>2) is only the <b>label</b> that says “a 2 rad/s sine,” i.e. where to look up the answer. The amplitude 3 isn't on the map at all. The output is 3·|<i>G</i>(<i>j</i>2)|·sin(2<i>t</i> + ∠<i>G</i>(<i>j</i>2)), a time signal, not another point.

### Does the gradient pull me toward a pole? Does the system “slide” across the plane over time?

<b>No.</b> There's no ball rolling on this surface. For a fixed system the surface is frozen, and your lookup spot is wherever <em>you</em> put it (the drive frequency). The only motion on the map is <b>poles moving when you turn a knob</b>, and that's a design change, not something the response does in time.

The slope of the surface still means something. A steep rise as you move up the jω axis toward a peak means the gain changes quickly with frequency (a sharp resonance). But slope is information <em>about</em> the system, not a force acting on anything.

````callout:trap Trap
Don't confuse <b>root-locus motion</b> (closed-loop poles travel as you sweep the gain <i>K</i>, S8) with time evolution. A root locus is a flip-book of different surfaces, one per <i>K</i>, not one system moving.
````

### Why does a sine input only use the jω axis?

A steady sine neither grows nor decays, so its σ = 0. sin ω<i>t</i> = (<i>e</i><sup><i>j</i>ω<i>t</i></sup> − <i>e</i><sup>−<i>j</i>ω<i>t</i></sup>)/2<i>j</i>, which lives at exactly <i>s</i> = ±<i>j</i>ω. Those are two mirror-image points on the jω axis (the surface is symmetric, so reading one is enough).

````callout:recognize Recognize


- <b>Bode plot = a slice of the |G| surface along the jω axis</b>: |<i>G</i>(<i>j</i>ω)| and ∠<i>G</i>(<i>j</i>ω) for ω from small to large.
- <b>Poles are not on the jω axis</b> for a stable system. They sit in the LHP. Their effect on a sine test is felt only through how high they <em>lift the surface</em> along the slice: a peak close to the axis gives a resonant bump at that ω.
- Off-axis addresses still matter, because that's where the poles live. They describe the system's <em>own</em> free motions (decaying sines at −σ ± <i>j</i>ω), not something you drive it with in a frequency test. If a pole sits in the RHP, that free motion grows instead, with or without your sine (M8).
````

### How do I read a location on the plane?

<b>Left/right = decay/growth</b> (real part σ: envelope <i>e</i><sup>σ<i>t</i></sup>). <b>Up/down = oscillation</b> (imaginary part ω). <b>Distance from origin = ω<sub>n</sub></b> (overall speed). <b>Angle from the negative real axis = damping</b> (cos θ = ζ).

*From the guide's static figure: <b>The plane, annotated.</b> Constant-σ lines are constant settling time, horizontal lines are constant ω<sub>d</sub> (peak time), circles are constant ω<sub>n</sub>, and rays from the origin are constant ζ (constant %OS).*

| Location | Mode in time | Name |
|---|---|---|
| Negative real axis, <i>p</i> = −<i>a</i> | <i>e</i><sup>−<i>at</i></sup> | Pure exponential decay, τ = 1/<i>a</i> |
| LHP complex pair −σ ± <i>j</i>ω<sub>d</sub> | <i>e</i><sup>−σ<i>t</i></sup>cos(ω<sub>d</sub><i>t</i> + φ) | Damped sinusoid |
| <i>j</i>ω axis ±<i>j</i>ω₀ | cos(ω₀<i>t</i> + φ) | Sustained oscillation (marginal) |
| Origin | constant (1) | Integrator: holds its value |
| RHP | <i>e</i><sup>+σ<i>t</i></sup>… | Growth: unstable |


````callout:recognize Recognize


- Complex poles always appear in conjugate pairs, so the plot is mirror-symmetric about the real axis.
- A <b>repeated</b> pole at the same spot gives <i>t</i>·<i>e</i><sup><i>pt</i></sup>. On the <i>j</i>ω axis that means a growing response: a double integrator or a double pole at ±<i>j</i>ω₀ is unstable.
- Design “boxes”: <i>T</i><sub>s</sub> spec ⇒ poles left of σ = 4/<i>T</i><sub>s</sub>; %OS spec ⇒ poles inside a ζ wedge.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Drag the pole straight up: the ringing grows but the decay rate (its real part) does not. Drag it left: faster, same shape. Overshoot depends on the angle only.
````

````callout:note Symbols used here
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **ζ, ωn**: damping ratio and natural frequency of a pole pair
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
- **T (time constant)**: time for a first-order response to cover 63 % of the way: T = 1/|p|
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
