---
id: disk
order: 4
title: Disk drive head
summary: "Dorf §4.10 (Figs. 4.30–4.31): moving a disk drive's read head to a new track, and holding it there through a shock, with one amplifier gain Ka."
figures: [loop, disk, tradeoff, blocks]
quizTags: [disk]
---

## (a) The problem

A disk drive's read head sits on an arm that swings across the disk. To read a new track, the arm must *seek*: move there fast and stop without swinging past. A shock (a bump to the laptop) pushes the arm off. An amplifier with gain Ka turns the position error into coil voltage. The handout compares Ka = 10 and Ka = 80 for a seek (Fig. 4.30) and looks at a unit shock at Ka = 80 (Fig. 4.31).

- **Takeaway:** **the head always ends exactly on the new track** (zero step error for any stable Ka), but **Ka trades speed against swing**: Ka = 10 has no overshoot and takes 1.40 s, Ka = 80 takes 0.41 s with 17 % overshoot ("unacceptably oscillatory"). A larger Ka also shrinks the shock offset (−0.0025 at Ka = 80).
- **One step further (not in lab handout):** past Ka = 4080 the loop becomes unstable, so the gain has a ceiling.

## (b) The setup

**Live figure:** `loop`, preset `disk` (new figure, see FIGURES.md). The handout's own diagrams are Fig. 4.28 (in symbols) and Fig. 4.29 (with the typical values).

```figure:loop preset=disk
```


**The blocks, in plain words:**
- **What s means:** read s as "rate of change" and 1/s as "add up over time". A block's fraction in s is its *transfer function*, its input-to-output rule.
- **The amplifier, Ka:** volts out per unit of position error. This is the knob.
- **The coil, G₁ = 5000/(s + 1000):** volts in, force out. The "+1000" means the force builds up in about 1/1000 s = 1 ms, very fast. Its steady gain is 5000/1000 = 5.
- **The arm and head, G₂ = 1/(s(s + 20)):** force in, position out. The 1/s means a held force keeps moving the arm (it adds up). The 20 is bearing friction ÷ arm inertia (the b/J of Fig. 4.28's 1/(s(Js + b)); not in lab handout); the arm responds over about 1/20 s = 50 ms.
- **The shock, T_d:** enters between coil and arm with a minus sign (Fig. 4.29).
- **The sensor, H(s) = 1:** the head's position is read and compared directly.

**The models (Dorf Eqs. 4.67–4.69):**

```eq
seek:   T(s) = Ka·G₁·G₂/(1 + Ka·G₁·G₂) = 5000·Ka/(s³ + 1020s² + 20000s + 5000·Ka)
error:  e(∞) = lim_{s→0} s · 1/(1 + Ka·G₁·G₂) · 1/s = 0
shock:  Y/T_d = −G₂/(1 + Ka·G₁·G₂)       (the handout prints it without the minus; see Check your work)
```

## (c) What's going on

1. **The head always lands on the track.** The arm's 1/s means any leftover error would keep the arm moving, so the loop can only come to rest at zero error. The *final value theorem* (set s = 0 to read where a response ends up) gives e(∞) = 0 for any stable Ka. *Stable* means it settles after a nudge instead of swinging ever wider. The handout notes this holds "in spite of changes in the system parameters". **Live figure:** `disk`, preset `ka10`, input *seek*.

```figure:disk preset=ka10
```

2. **Ka trades speed against swing.** At Ka = 10 the head creeps in: no overshoot, settling (within 2 %) in 1.40 s. At Ka = 80 it gets there in 0.41 s but swings 17.1 % past the track first. **Live figure:** `disk`, presets `ka10` then `ka80`.

```figure:disk preset=ka10
```

3. **Why it behaves like the boring machine: the coil is 50× faster than the arm.** Drop the coil but keep its steady gain 5, and the loop becomes 5·Ka/(s² + 20s + 5·Ka), a spring of stiffness 5·Ka with a damper of 20 (not in lab handout). Its *damping ratio* ζ = 10/√(5·Ka) (how fast swings die out; below 1 means overshoot) is 1.41 at Ka = 10 and 0.50 at Ka = 80. The stand-in predicts 16.3 % overshoot, close to the real 17.1 %. **Live figure:** `disk`, preset `ka80`, which turns on *drop the coil*.

```figure:disk preset=ka80
```

4. **A shock leaves an offset of −1/(5·Ka).** A steady push needs a steady counter-force, and the loop only makes force from error. At Ka = 80 the head dips to −0.0029 at 0.18 s and settles at −0.0025 (the handout's −2.5×10⁻³). Halving that offset means doubling Ka, which means more swing on every seek: the same trade as step 2. **Live figure:** `disk`, preset `shock`; then `tradeoff`, preset `disk`.

```figure:disk preset=shock
```
```figure:tradeoff preset=disk
```

5. **The ceiling: past Ka = 4080 it goes unstable (not in lab handout).** The two-part stand-in says any Ka is stable, but the real loop has three lags in a ring, and the coil's 1 ms lag is the third. The *Routh test* (a shortcut that checks stability straight from the polynomial's coefficients) says s³ + 1020s² + 20000s + 5000·Ka is stable only while 1020 × 20000 > 5000·Ka, so Ka < 4080. At the ceiling the head rings forever at √20000 = 141 rad/s. **Live figure:** `disk`, preset `limit` (Ka = 3981, barely stable; the stand-in shows nothing).

```figure:disk preset=limit
```


## (d) Try it

| Handout case | Live figure and preset | What you should see |
|---|---|---|
| Fig. 4.30, Ka = 10 | `disk` → **Ka = 10** (`ka10`) | no overshoot, 1.40 s |
| Fig. 4.30, Ka = 80 | `disk` → **Ka = 80 (Fig. 4.30)** (`ka80`) | 17.1 % (stand-in 16.3 %), 0.41 s |
| Fig. 4.31, shock at Ka = 80 | `disk` → **shock, Ka = 80 (Fig. 4.31)** (`shock`) | dip −0.0029 at 0.18 s, settles −0.0025 |
| The trade | `tradeoff` → **disk head, Ka = 80** (`disk`) | the two handout points on the curve |
| Offset of 0.001 (not in lab handout) | `disk` → **shock target** (new preset `ka200`) | Ka = 200: 37 % overshoot |
| The ceiling (not in lab handout) | `disk` → **near the ceiling (own)** (`limit`) | barely stable at Ka = 3981 |
| The scripts, line by line | `blocks` → **Fig. 4.30 (disk seek)** (new preset `diskseek`) and **Fig. 4.31 (disk shock)** (`diskshock`) | each line lights its block |

**Sliders to play with:** Ka (log scale, 1 to about 5000), input (seek, shock, both), *drop the coil* (overlays the two-part stand-in).

| Knob | Turn it up | Turn it down |
|---|---|---|
| **Ka** | faster seek, smaller shock offset, more overshoot (Ka = 160: 32 %); unstable past 4080 | slower, calmer; at Ka = 20 the stand-in is *critically damped* (ζ = 1: the quickest it can be with no swing) |
| **Coil speed, 1000** | the ceiling rises; the stand-in fits better | the ceiling falls |
| **Arm damping, 20** | calmer seek at a given Ka | swingier |

Values beyond Ka = 10 and 80, and the coil and arm knobs, are not in lab handout.

## (e) Check your work

| Check | Handout | Exact (numbers.py) |
|---|---|---|
| Step error | 0 | 0 for any stable Ka |
| Ka = 10, overshoot and T_s (2 %) | – (plot) | 0 %, 1.40 s |
| Ka = 80, overshoot and T_s | "unacceptably oscillatory"; plot peak about 1.2 | 17.1 % (peak 1.17 at 0.18 s), 0.41 s |
| Ka = 80 poles | – | −1000.4 and −9.80 ± 17.43j |
| Shock, Ka = 80, final | −2.5×10⁻³ | −0.00250 |
| Shock, Ka = 80, dip | – (plot) | −0.00293 at 0.18 s |
| Ceiling (not in lab handout) | – | Ka < 4080, rings at 141 rad/s |

**MATLAB, Fig. 4.31 with the check numbers** (the handout's script; the `dcgain`, `stepinfo` and `roots` lines are not in lab handout):

```matlab
Ka=80; nf=[5000]; df=[1 1000]; sysf=tf(nf,df);
ng=[1]; dg=[1 20 0]; sysg=tf(ng,dg);
sys=feedback(sysg,Ka*sysf);
sys=-sys;                 % disturbance enters the summer with a negative sign
t=[0:0.01:2]; y=step(sys,t); plot(t,y), grid
dcgain(sys)               % -0.0025
% Fig. 4.30, the seek
seek=feedback(series(Ka*sysf,sysg),[1]);
stepinfo(seek)            % Overshoot 17.1, SettlingTime 0.409
% the ceiling (not in lab handout)
roots([1 1020 20000 5000*4080])   % a pair on the imaginary axis at ±141j
```

````callout:trap Eq. 4.69 is missing its minus sign
The handout prints Y(s) = G₂/(1 + Ka·G₁·G₂)·T_d(s). But Fig. 4.29 shows the shock entering the summer with a minus sign, the Fig. 4.31 script flips the sign (`sys=-sys`, "Disturbance enters summer with a negative sign"), and the plot settles at −2.5×10⁻³. The correct form is **Y/T_d = −G₂/(1 + Ka·G₁·G₂)**. If you code Eq. 4.69 as printed, your plot comes out upside down.
````

````callout:note Reading the plots
- **Fig. 4.30's Ka = 80 peak** looks like about 1.2 on the plot; the exact peak is 1.17.
- **The handout gives no settling times for the disk**; the 1.40 s and 0.41 s above are from `stepinfo` with its 2 % band.
````

## (f) For your report

- **Advantages shown:** zero steady-state error to a step command that holds "in spite of changes in the system parameters"; a shock offset that feedback shrinks as Ka grows; and the speed-versus-swing trade in the transient response.
- **Discussion points:**
  - **The trade:** a larger Ka gives a faster seek and a smaller shock offset, but more overshoot. The handout stops at "we would need to raise Ka above 80" and defers the best Ka to the next chapter.
  - **Why a two-part model is good enough at Ka = 80 (not in lab handout):** the coil pole at −1000 is far to the left of the arm's pair at −9.80 ± 17.43j (the coil is 50× faster than the arm), so it barely affects the seek (16.3 % stand-in vs 17.1 % exact).
  - **What the simple model hides (not in lab handout):** the coil's 1 ms lag sets a hard ceiling of Ka = 4080. Dropping a fast part is fine for moderate gains but can hide instability at high gain.

<p class="src">Sources: Dorf §4.10, Figs. 4.28–4.31, Eqs. 4.67–4.69 (pp.263–267). Not in lab handout: the two-part stand-in and ζ, the knob values outside Ka = 10 and 80, the Routh ceiling, the settling times and the check-script lines.</p>
