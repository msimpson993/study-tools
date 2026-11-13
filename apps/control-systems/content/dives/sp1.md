---
id: sp1
order: 16
title: "How poles and zeros are drawn"
category: describe
chain:
  - title: "How do I mark poles and zeros?"
  - title: "How are poles and zeros drawn?"
  - title: "× and ○"
neighbors:
  - sp2
  - sp3
---
**How are poles and zeros drawn?**

**Picture it first.** × marks a pole, ○ a zero. Drag them: the step response and the dashed no-zero response tell you what each one does.

```figure:pz
```

A pole is drawn ×, a zero ○. A pole is a root of the denominator (|G| → ∞, a natural mode); a zero is a root of the numerator (G = 0, a transmission null). Complex ones come in conjugate pairs.

### How are poles and zeros drawn, and why are they marked differently?

<b>Poles are drawn as ×</b> and <b>zeros as ○</b>. Poles are where |<i>G</i>(<i>s</i>)| blows up to ∞; zeros are where <i>G</i>(<i>s</i>) = 0. Picture |<i>G</i>(<i>s</i>)| as a rubber sheet over the plane: poles are tent poles pushing it up to infinity, and zeros are tacks pinning it down to zero.

*From the guide's static figure: <b>Marks for G(s) = (s + 2)/((s + 1)² + 4)</b>: a zero at −2 (○) and poles at −1 ± j2 (×). The shading shows |G(s)|, brighter where it's larger. It's bright near the ×'s and dark near the ○.*

````callout:recognize Recognize


- × = pole = root of the denominator. ○ = zero = root of the numerator. Exam plots, MATLAB <code>pzmap</code>, and the Lecture Notes all use this convention.
- The <b>picture dictionary</b> in Q4 shows only poles (×), because it's about natural modes. Zeros have no mode of their own.
- Evaluating <i>G</i> on the <i>j</i>ω axis (<i>s</i> = <i>j</i>ω) is the frequency response: walking up the axis past a × gives a resonant bump, and past a ○ gives a notch.
````

Exactly like a filter's pole/zero plot: a high-Q pole pair close to the <i>j</i>ω axis is a sharp resonance, and a zero on the axis is a perfect notch (a trap circuit).

#### What does a point on the s-plane actually mean? (the |G| surface picture)

If the s-plane feels slippery, it's usually because three very different things are being pictured at the same spot: <b>the system</b>, <b>the input you apply</b>, and <b>the knobs you turn</b>. One picture keeps them apart. We'll use it for this whole deep dive.

| In the picture | In control | Who decides it? |
|---|---|---|
| The whole surface | <i>G</i>(<i>s</i>) evaluated everywhere | The hardware + controller (fixed while you test) |
| Peaks × | Poles: the system's own natural modes | The system. They move only when you turn a knob |
| Sinkholes ○ | Zeros: inputs the system blocks (not modes) | The system |
| Left half (σ &lt; 0) / jω axis / right half (σ &gt; 0) | A pole there is a mode that <b>decays</b> / <b>rings forever</b> / <b>grows</b> | Fixed meaning of σ |
| <b>The ◆ at s = jω</b> | <b>You drive the system with sin ω<i>t</i></b>, so you evaluate <i>G</i>(<i>j</i>ω) | <b>You</b>: you choose the test frequency |
| Surface height under the ◆ | \|<i>G</i>(<i>j</i>ω)\|: output amplitude ÷ input amplitude | Read off the surface |
| Phase attached to that point | ∠<i>G</i>(<i>j</i>ω): output phase shift vs. input | Read off the surface |
| Slicing the surface along the jω axis | The Bode magnitude plot | That's all a Bode plot is |
| A peak standing close to the jω axis | Resonance (lightly damped poles): the slice passes near a peak, so it bumps up |  |
| Bulldozers reshaping the surface | Changing <i>K</i>, <i>K</i><sub>p</sub>, <i>R</i>, <i>C</i>, … moves the poles/zeros | The designer, <em>before</em> the test |


<b>Contour lines.</b> Lines where |<i>G</i>| is constant are constant-gain contours. They crowd together near a pole because the surface rises steeply there. If that crowding reaches the jω axis, the Bode slice climbs fast too: a sharp resonance.

````callout:trap Three misconceptions this kills


- <b>“A control setting is a position on the plane.”</b> No. A knob is a bulldozer: it reshapes the surface (moves the ×'s). It doesn't put you anywhere.
- <b>“A point is the drive signal” or “a point is the response.”</b> No. A point is an <em>address</em> where you <b>evaluate</b> <i>G</i>. The input is a time signal (sin ω<i>t</i>). The output is that same sine scaled by the surface height and shifted by the phase.
- <b>“Any point can be a sine drive.”</b> No. A steady sine of frequency ω lives only on the jω axis, at <i>s</i> = ±<i>j</i>ω. Points off the axis correspond to sinusoids that grow or decay exponentially.
````

### If the ◆ is one probe signal, what is my real input?

Your real input is a <b>combination, literally a sum, of many probe signals</b> e<sup><i>st</i></sup>, each with its own weight. That's what a transform does: <b>Fourier</b> writes a signal as a sum of probes <em>on the jω axis</em> (pure sines, <i>s</i> = <i>j</i>ω). <b>Laplace</b> allows probes <em>anywhere</em> (<i>s</i> = σ + <i>j</i>ω, growing or decaying). Linearity lets you handle each probe separately: response/probe = <i>G</i>(<i>s</i>) at that probe's address. Then add up all the responses.

| Real input | As a mix of probes |
|---|---|
| 3 sin 2<i>t</i> | Two probes, at <i>s</i> = +<i>j</i>2 and −<i>j</i>2 (weights ∓3<i>j</i>/2) |
| Any repeating (periodic) signal, e.g. a square wave | A <b>discrete</b> set of probes on the jω axis at the harmonics ±<i>j</i>ω₀, ±2<i>j</i>ω₀, … (square wave: odd ones only). That's its Fourier series. All σ = 0 |
| A chirp (frequency sweep) | Roughly <b>one probe sliding up the jω axis over time</b>: at each moment you're reading G near <i>j</i>ω(<i>t</i>). That's how a network/Bode analyzer sweeps. The probes are still on the jω axis, not off-axis σ ≠ 0 probes (a slow sweep ≈ steady state at each ω) |
| A step, a pulse, speech, noise | A continuous spread of probes (Fourier/Laplace integral): <i>Y</i>(<i>s</i>) = <i>G</i>(<i>s</i>)·<i>U</i>(<i>s</i>), probe by probe |
| <i>e</i><sup>−0.5<i>t</i></sup> cos 2<i>t</i> | Two off-axis probes at −0.5 ± <i>j</i>2: not a lab sine, but still just probes |


````callout:trap Trap
Dragging the ◆ doesn't change your input or your system. It just picks <em>which one</em> probe in the mix you're reading the answer for.
````

### Does the distance from the ◆ to a pole or zero matter?

<b>Yes. It's the whole geometric meaning of G(s).</b> Write the explorer's system in factored form, <i>G</i>(<i>s</i>) = <i>C</i>·(<i>s</i> − <i>z</i>)/((<i>s</i> − <i>p</i>)(<i>s</i> − <i>p̄</i>)). Each factor (<i>s</i> − mark) is a complex number, and you can draw it as an arrow: <b>the vector from that mark to the ◆</b>. Those are exactly the <b>dashed lines</b> in the explorer. Read them like this: <b>Length</b> of a dashed line = |<i>s</i> − mark| = how much that mark contributes to |<i>G</i>|. <b>Angle</b> of a dashed line (measured from the +σ direction) = that mark's contribution to ∠<i>G</i>.

````callout:recognize Why this matters


- <b>Resonance, explained by a ruler.</b> Slide the ◆ up the jω axis past a lightly damped pole (try the “light damping” preset). At the ω just beside the ×, one dashed line becomes very short, so the denominator shrinks and |<i>G</i>| spikes. That's the Bode peak. The closer the pole is to the jω axis (smaller ζ), the shorter that shortest line can get, and the taller the peak.
- <b>Notches, same idea upside down.</b> A zero near the jω axis makes a numerator line short at that ω, so |<i>G</i>| dips.
- <b>Phase, too.</b> As the ◆ walks past a pole, that pole's arrow swings through about 180°, which is why the phase drops quickly near resonance.
````

````callout:recognize Recognize
Check it live: the readout lists each distance and the product |<i>C</i>|·<i>d</i><sub>○</sub>/(<i>d</i><sub>×</sub>·<i>d</i><sub>×̄</sub>). It matches |<i>G</i>(<i>s</i>)| every time. Drag the ◆ next to a × and watch that dashed line shrink while |<i>G</i>| climbs.
````

````callout:trap Trap
Two different distances get mixed up. <b>Distance from the origin to a pole</b> is ω<sub>n</sub> = |<i>p</i>|, a property of the system (how fast that mode is). <b>Distance from the ◆ to a pole</b> is lookup geometry: it changes every time you move the probe and tells you how big |<i>G</i>| is <em>at that address</em>. Same ruler, different question.
````

### Do RHP poles mean the system blows up even with no input?

<b>Yes. No input is required.</b> A pole is an <i>e</i><sup><i>st</i></sup> the system can produce <em>on its own</em> (that's why |<i>G</i>| → ∞ there: zero input, nonzero output). A pole pair at +σ ± <i>j</i>ω with σ &gt; 0 is the natural mode <i>e</i><sup>+σ<i>t</i></sup>cos(ω<i>t</i>). With <i>u</i> = 0, any tiny nonzero initial condition, sensor noise, or disturbance excites it a little, and then it grows exponentially. That's the definition of instability for an LTI system: the <b>free response doesn't die out</b>. So yes, those signals do spiral out of control. Nothing has to drive them.

| Poles at σ ± <i>j</i>ω | Free response (<i>u</i> = 0) | Verdict |
|---|---|---|
| σ &lt; 0 (LHP) | <i>e</i><sup>−\|σ\|<i>t</i></sup>cos ω<i>t</i> dies out | Stable: only the forced response is left |
| σ = 0 (on the jω axis) | cos ω<i>t</i> rings forever, never grows | Marginal: not BIBO stable (a sine at that ω grows like <i>t</i>) |
| σ &gt; 0 (RHP) | <i>e</i><sup>+σ<i>t</i></sup>cos ω<i>t</i> grows without bound | Unstable, even with no input |


````callout:recognize Recognize


- Click the <b>“unstable poles (RHP)”</b> preset (poles at +0.4 ± <i>j</i>2). The ◆ can still sit on the jω axis and <i>G</i>(<i>j</i>ω) is still a perfectly good number, but it only describes the <em>forced</em> part. In a real lab sine test the total output = forced sine + free response, and the free response grows like <i>e</i><sup>0.4<i>t</i></sup>. Within seconds it drowns the sine, so the test <b>never settles</b>.
- That's why a Bode plot of an unstable plant can't be <em>measured</em> open-loop (it can still be computed), and why the first job of feedback is to bulldoze the peaks back into the LHP (M5, root locus in S8).
- Real hardware doesn't grow forever. It saturates, clips, or breaks. That's the linear model telling you it is no longer valid. Oscillators use exactly this on purpose (M9).
````

````callout:trap Trap
An <b>RHP zero</b> is not the same thing. A zero isn't a mode, so it never makes the free response grow. It causes a wrong-way start and limits feedback (the “RHP zero” preset; details in M10), but the system can be perfectly stable. Only <b>poles</b> decide stability.
````

### So how do oscillators and amplifiers fit in? Do RHP poles give infinite power?

<b>No infinite power. Where the poles sit tells you what kind of circuit you have.</b> An <b>ideal oscillator</b> has its poles exactly <b>on the jω axis</b>, so its free response rings forever at constant amplitude, cos(ω<sub>0</sub><i>t</i>), with no input. A <b>practical oscillator</b> is built with its poles <b>slightly in the RHP</b> so the ring <em>starts by itself</em> from noise and grows. Then <b>nonlinear saturation</b> (clipping at the supply rails, transistor gain compression) lowers the effective loop gain as the amplitude rises. That pushes the effective poles back onto the axis, and the amplitude settles at a finite value. A <b>linear amplifier</b> you want to behave keeps all its poles in the <b>LHP</b>: “high gain” means |<i>G</i>| is large <em>along the jω slice</em>, not that the poles moved right.

| Circuit | Poles | Free response (<i>u</i> = 0) | Explorer preset |
|---|---|---|---|
| Amplifier / filter (you want it stable) | LHP | Dies out; only the amplified input remains | “stable amp: big \|G\| on jω, poles LHP” |
| Ideal oscillator (textbook LC tank, no loss) | On the jω axis | Rings forever at constant amplitude | “ideal oscillator (poles on jω)” |
| Practical oscillator, at start-up | Slightly RHP | Grows from noise… until saturation stops it | “amp starting to oscillate (slight RHP)” |
| Practical oscillator, steady state | <em>Effectively</em> on the axis (nonlinear) | Finite, steady amplitude set by the rails or the gain-control loop | dashed green curve (illustrative) |


````callout:recognize Recognize


- Click <b>“ideal oscillator”</b>: the orange free response neither grows nor decays, and the status line flags poles on the axis.
- Click <b>“amp starting to oscillate”</b> (poles at +0.1 ± <i>j</i>2): orange grows slowly with no input. The dashed green curve is the same ring once saturation caps it, which is what a real oscillator's output looks like.
- Click <b>“stable amp”</b>: the ◆ on the jω axis sits close to a LHP peak, so |<i>G</i>| is big (lots of gain at that frequency), yet there's no orange curve, because nothing rings on its own.
- An amplifier that “breaks into oscillation” (squealing audio amp, ringing op-amp with a capacitive load) is a stable design whose poles got pushed across the jω axis by unintended feedback.
````

````callout:trap Trap
Don't equate <b>high gain</b> with <b>RHP poles</b>. Gain is <em>surface height along the jω slice</em> (|<i>G</i>(<i>j</i>ω)|). Stability is <em>where the peaks stand</em>. A stable amp can have huge gain with every pole in the LHP. And a pole sitting <em>exactly</em> on the axis is a knife edge: in practice tiny parameter drift tips it to decay or grow, which is why real oscillators aim slightly RHP and let saturation hold the amplitude.
````

### What does a zero in the right half-plane actually do?

<b>It's not a growing mode: zeros aren't modes.</b> A zero at <i>s</i> = +<i>z</i> just means the input shape <i>e</i><sup>+<i>zt</i></sup> gets blocked (<i>G</i> = 0 there). On the surface it is still a <b>sinkhole</b>, only one standing in the RHP. Nothing in the free response grows because of it. What it changes is <b>phase</b>, and through phase, what feedback can do. Systems with RHP zeros are called <b>non-minimum phase</b>.

````callout:recognize Recognize


- Click the explorer's <b>“RHP zero (sinkhole in RHP)”</b> preset: the ○ sits right of the jω axis, the surface still dips to 0 there, and the poles (and so stability) are unchanged. The status line flags non-minimum phase.
- Numerator factor like (1 − <i>s</i>/<i>z</i>) or (<i>z</i> − <i>s</i>) with <i>z</i> &gt; 0, i.e. a sign flip between the <i>s</i> term and the constant: suspect an RHP zero.
- If complex RHP zeros sit close to the jω axis, the Bode slice still shows a <b>notch</b> there, exactly like LHP zeros would. The magnitude can't tell them apart; the phase can.
````

````callout:trap Trap
Don't confuse an <b>RHP zero</b> with an <b>RHP pole</b>. RHP pole: a mode that grows with no input, so the system is unstable (M8). RHP zero: no mode at all, the system can be perfectly stable, but it starts the wrong way and limits how aggressive your controller can be. Also, you can't cancel an RHP zero with an RHP controller pole: that pole would be an unstable hidden mode.
````

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

### Then what does turning a control knob (like gain K) do on the map?

It <b>rebuilds the surface</b>: the closed-loop poles (peaks) move, so the height everywhere changes, including under your fixed lookup spot. In the explorer, slide the pole pair toward the jω axis (−a → 0) or up (larger b) and watch the readout at a <em>fixed</em> ◆ probe change: the bulldozer moved the peak, not you. (In a feedback loop, a gain knob moves the closed-loop poles the same way. See the root locus in S8.)

````callout:note The two-hand rule
One hand holds the <b>bulldozer</b> (knobs → where the peaks are). The other hand holds the <b>◆ probe</b> (drive frequency → where you read). They're independent. Design = use the bulldozer so that, along the stretch of the jω axis your signals actually use, the height and phase of the slice are what you want: high and flat at low frequency (good tracking) and low at high frequency (noise rejection), just like S and C.
````

Same as a filter: the component values set the pole/zero map (the surface). The signal generator's frequency is where you probe it. Turning the generator's dial never moves the poles.

### If the ◆ is one probe signal, what is my real input?

Your real input is a <b>combination, literally a sum, of many probe signals</b> e<sup><i>st</i></sup>, each with its own weight. That's what a transform does: <b>Fourier</b> writes a signal as a sum of probes <em>on the jω axis</em> (pure sines, <i>s</i> = <i>j</i>ω). <b>Laplace</b> allows probes <em>anywhere</em> (<i>s</i> = σ + <i>j</i>ω, growing or decaying). Linearity lets you handle each probe separately: response/probe = <i>G</i>(<i>s</i>) at that probe's address. Then add up all the responses.

| Real input | As a mix of probes |
|---|---|
| 3 sin 2<i>t</i> | Two probes, at <i>s</i> = +<i>j</i>2 and −<i>j</i>2 (weights ∓3<i>j</i>/2) |
| Any repeating (periodic) signal, e.g. a square wave | A <b>discrete</b> set of probes on the jω axis at the harmonics ±<i>j</i>ω₀, ±2<i>j</i>ω₀, … (square wave: odd ones only). That's its Fourier series. All σ = 0 |
| A chirp (frequency sweep) | Roughly <b>one probe sliding up the jω axis over time</b>: at each moment you're reading G near <i>j</i>ω(<i>t</i>). That's how a network/Bode analyzer sweeps. The probes are still on the jω axis, not off-axis σ ≠ 0 probes (a slow sweep ≈ steady state at each ω) |
| A step, a pulse, speech, noise | A continuous spread of probes (Fourier/Laplace integral): <i>Y</i>(<i>s</i>) = <i>G</i>(<i>s</i>)·<i>U</i>(<i>s</i>), probe by probe |
| <i>e</i><sup>−0.5<i>t</i></sup> cos 2<i>t</i> | Two off-axis probes at −0.5 ± <i>j</i>2: not a lab sine, but still just probes |


````callout:trap Trap
Dragging the ◆ doesn't change your input or your system. It just picks <em>which one</em> probe in the mix you're reading the answer for.
````

### Does the distance from the ◆ to a pole or zero matter?

<b>Yes. It's the whole geometric meaning of G(s).</b> Write the explorer's system in factored form, <i>G</i>(<i>s</i>) = <i>C</i>·(<i>s</i> − <i>z</i>)/((<i>s</i> − <i>p</i>)(<i>s</i> − <i>p̄</i>)). Each factor (<i>s</i> − mark) is a complex number, and you can draw it as an arrow: <b>the vector from that mark to the ◆</b>. Those are exactly the <b>dashed lines</b> in the explorer. Read them like this: <b>Length</b> of a dashed line = |<i>s</i> − mark| = how much that mark contributes to |<i>G</i>|. <b>Angle</b> of a dashed line (measured from the +σ direction) = that mark's contribution to ∠<i>G</i>.

````callout:recognize Why this matters


- <b>Resonance, explained by a ruler.</b> Slide the ◆ up the jω axis past a lightly damped pole (try the “light damping” preset). At the ω just beside the ×, one dashed line becomes very short, so the denominator shrinks and |<i>G</i>| spikes. That's the Bode peak. The closer the pole is to the jω axis (smaller ζ), the shorter that shortest line can get, and the taller the peak.
- <b>Notches, same idea upside down.</b> A zero near the jω axis makes a numerator line short at that ω, so |<i>G</i>| dips.
- <b>Phase, too.</b> As the ◆ walks past a pole, that pole's arrow swings through about 180°, which is why the phase drops quickly near resonance.
````

````callout:recognize Recognize
Check it live: the readout lists each distance and the product |<i>C</i>|·<i>d</i><sub>○</sub>/(<i>d</i><sub>×</sub>·<i>d</i><sub>×̄</sub>). It matches |<i>G</i>(<i>s</i>)| every time. Drag the ◆ next to a × and watch that dashed line shrink while |<i>G</i>| climbs.
````

````callout:trap Trap
Two different distances get mixed up. <b>Distance from the origin to a pole</b> is ω<sub>n</sub> = |<i>p</i>|, a property of the system (how fast that mode is). <b>Distance from the ◆ to a pole</b> is lookup geometry: it changes every time you move the probe and tells you how big |<i>G</i>| is <em>at that address</em>. Same ruler, different question.
````

### Do RHP poles mean the system blows up even with no input?

<b>Yes. No input is required.</b> A pole is an <i>e</i><sup><i>st</i></sup> the system can produce <em>on its own</em> (that's why |<i>G</i>| → ∞ there: zero input, nonzero output). A pole pair at +σ ± <i>j</i>ω with σ &gt; 0 is the natural mode <i>e</i><sup>+σ<i>t</i></sup>cos(ω<i>t</i>). With <i>u</i> = 0, any tiny nonzero initial condition, sensor noise, or disturbance excites it a little, and then it grows exponentially. That's the definition of instability for an LTI system: the <b>free response doesn't die out</b>. So yes, those signals do spiral out of control. Nothing has to drive them.

| Poles at σ ± <i>j</i>ω | Free response (<i>u</i> = 0) | Verdict |
|---|---|---|
| σ &lt; 0 (LHP) | <i>e</i><sup>−\|σ\|<i>t</i></sup>cos ω<i>t</i> dies out | Stable: only the forced response is left |
| σ = 0 (on the jω axis) | cos ω<i>t</i> rings forever, never grows | Marginal: not BIBO stable (a sine at that ω grows like <i>t</i>) |
| σ &gt; 0 (RHP) | <i>e</i><sup>+σ<i>t</i></sup>cos ω<i>t</i> grows without bound | Unstable, even with no input |


````callout:recognize Recognize


- Click the <b>“unstable poles (RHP)”</b> preset (poles at +0.4 ± <i>j</i>2). The ◆ can still sit on the jω axis and <i>G</i>(<i>j</i>ω) is still a perfectly good number, but it only describes the <em>forced</em> part. In a real lab sine test the total output = forced sine + free response, and the free response grows like <i>e</i><sup>0.4<i>t</i></sup>. Within seconds it drowns the sine, so the test <b>never settles</b>.
- That's why a Bode plot of an unstable plant can't be <em>measured</em> open-loop (it can still be computed), and why the first job of feedback is to bulldoze the peaks back into the LHP (M5, root locus in S8).
- Real hardware doesn't grow forever. It saturates, clips, or breaks. That's the linear model telling you it is no longer valid. Oscillators use exactly this on purpose (M9).
````

````callout:trap Trap
An <b>RHP zero</b> is not the same thing. A zero isn't a mode, so it never makes the free response grow. It causes a wrong-way start and limits feedback (the “RHP zero” preset; details in M10), but the system can be perfectly stable. Only <b>poles</b> decide stability.
````

### So how do oscillators and amplifiers fit in? Do RHP poles give infinite power?

<b>No infinite power. Where the poles sit tells you what kind of circuit you have.</b> An <b>ideal oscillator</b> has its poles exactly <b>on the jω axis</b>, so its free response rings forever at constant amplitude, cos(ω<sub>0</sub><i>t</i>), with no input. A <b>practical oscillator</b> is built with its poles <b>slightly in the RHP</b> so the ring <em>starts by itself</em> from noise and grows. Then <b>nonlinear saturation</b> (clipping at the supply rails, transistor gain compression) lowers the effective loop gain as the amplitude rises. That pushes the effective poles back onto the axis, and the amplitude settles at a finite value. A <b>linear amplifier</b> you want to behave keeps all its poles in the <b>LHP</b>: “high gain” means |<i>G</i>| is large <em>along the jω slice</em>, not that the poles moved right.

| Circuit | Poles | Free response (<i>u</i> = 0) | Explorer preset |
|---|---|---|---|
| Amplifier / filter (you want it stable) | LHP | Dies out; only the amplified input remains | “stable amp: big \|G\| on jω, poles LHP” |
| Ideal oscillator (textbook LC tank, no loss) | On the jω axis | Rings forever at constant amplitude | “ideal oscillator (poles on jω)” |
| Practical oscillator, at start-up | Slightly RHP | Grows from noise… until saturation stops it | “amp starting to oscillate (slight RHP)” |
| Practical oscillator, steady state | <em>Effectively</em> on the axis (nonlinear) | Finite, steady amplitude set by the rails or the gain-control loop | dashed green curve (illustrative) |


````callout:recognize Recognize


- Click <b>“ideal oscillator”</b>: the orange free response neither grows nor decays, and the status line flags poles on the axis.
- Click <b>“amp starting to oscillate”</b> (poles at +0.1 ± <i>j</i>2): orange grows slowly with no input. The dashed green curve is the same ring once saturation caps it, which is what a real oscillator's output looks like.
- Click <b>“stable amp”</b>: the ◆ on the jω axis sits close to a LHP peak, so |<i>G</i>| is big (lots of gain at that frequency), yet there's no orange curve, because nothing rings on its own.
- An amplifier that “breaks into oscillation” (squealing audio amp, ringing op-amp with a capacitive load) is a stable design whose poles got pushed across the jω axis by unintended feedback.
````

````callout:trap Trap
Don't equate <b>high gain</b> with <b>RHP poles</b>. Gain is <em>surface height along the jω slice</em> (|<i>G</i>(<i>j</i>ω)|). Stability is <em>where the peaks stand</em>. A stable amp can have huge gain with every pole in the LHP. And a pole sitting <em>exactly</em> on the axis is a knife edge: in practice tiny parameter drift tips it to decay or grow, which is why real oscillators aim slightly RHP and let saturation hold the amplitude.
````

### What does a zero in the right half-plane actually do?

<b>It's not a growing mode: zeros aren't modes.</b> A zero at <i>s</i> = +<i>z</i> just means the input shape <i>e</i><sup>+<i>zt</i></sup> gets blocked (<i>G</i> = 0 there). On the surface it is still a <b>sinkhole</b>, only one standing in the RHP. Nothing in the free response grows because of it. What it changes is <b>phase</b>, and through phase, what feedback can do. Systems with RHP zeros are called <b>non-minimum phase</b>.

````callout:recognize Recognize


- Click the explorer's <b>“RHP zero (sinkhole in RHP)”</b> preset: the ○ sits right of the jω axis, the surface still dips to 0 there, and the poles (and so stability) are unchanged. The status line flags non-minimum phase.
- Numerator factor like (1 − <i>s</i>/<i>z</i>) or (<i>z</i> − <i>s</i>) with <i>z</i> &gt; 0, i.e. a sign flip between the <i>s</i> term and the constant: suspect an RHP zero.
- If complex RHP zeros sit close to the jω axis, the Bode slice still shows a <b>notch</b> there, exactly like LHP zeros would. The magnitude can't tell them apart; the phase can.
````

````callout:trap Trap
Don't confuse an <b>RHP zero</b> with an <b>RHP pole</b>. RHP pole: a mode that grows with no input, so the system is unstable (M8). RHP zero: no mode at all, the system can be perfectly stable, but it starts the wrong way and limits how aggressive your controller can be. Also, you can't cancel an RHP zero with an RHP controller pole: that pole would be an unstable hidden mode.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Turn the zero on at −2 and drag it toward the origin: more overshoot. Drag it across to the right half-plane: the output dips below zero before it rises.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **ζ, ωn**: damping ratio and natural frequency of a pole pair
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **C(s)**: the controller transfer function (PID: Kp + Ki/s + Kd·s)
````
