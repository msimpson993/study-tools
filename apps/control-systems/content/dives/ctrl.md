---
id: ctrl
order: 13
title: "Turn up the gain (P), the controller menu, and faster loops"
category: pid
neighbors: [blocks, sse, integral, derivative]
level: Some algebra
check: [q-pgain, q-speed, ck-pgain-1]
---

**The question:** a car corner only follows the road; what happens when a motor we command pushes in proportion to the error? This is the box *Turn up the gain (P)*, with its side boxes *The controller menu* and *Feedback makes it faster*, after *Close the loop*.

### The big idea

P control pushes in proportion to the error. On the dish, torque Kp·e acts like a spring pulling the antenna onto the satellite. A stiffer spring is faster, but the friction that damps it is fixed, so the decay rate stays at B/(2J) = 1 /s while the swing gets faster: more gain, more bounce.

**The plant.** A satellite-tracking pedestal, azimuth axis. J = 10 kg·m² (a ~1.2 m dish on its mount), B = 20 N·m·s/rad (bearing and motor viscous friction), the motor and gearing modelled as a pure torque source up to ±200 N·m at the axis. Θ/T = 1/(Js² + Bs) = 0.1/(s(s + 2)).

### See it

The dish, the satellite marker and the error angle. Raise Kp: past Kp = 10 the poles split and climb straight up, faster swing, same decay.

```figure:antenna
```

The same path for every Kp at once (*preview: root locus, added*):

```figure:locus
```

### The math

```eq
Js² + Bs + Kp = 0  ⇒  s² + 2s + 0.1Kp = 0
```

```eq
ωₙ = √(Kp/J),   ζ = B/(2√(JKp)),   critical at Kp = B²/(4J) = 10
```

**What each symbol means.** θ: pointing angle (rad); T: motor torque (N·m); J: inertia (kg·m²); B: viscous friction (N·m·s/rad); Kp: proportional gain (N·m/rad).

<a id="menu"></a>**The controller menu.** On/off, P, I, PI, PD and PID, each with its op-amp circuit (board pair s5). The standard form is Gc = Kp(1 + 1/(Ti s) + T_D s), with Ki = Kp/Ti and Kd = Kp·T_D (LN1 slides 10–17). The slides write the derivative time Td; here it is T_D, because T_d is the wind torque.

<a id="speed"></a>**Feedback makes it faster.** Around a first-order plant, feedback divides the time constant: τ_cl = τ/(1 + loop gain). The dish's speed is Ω/T = 1/(Js + B); with a speed loop K_ω the time constant becomes J/(B + K_ω).

```figure:speed
```

### Worked example: on the dish

| Kp (N·m/rad) | ωₙ | ζ | %OS | Tₛ |
|---|---|---|---|---|
| 10 | 1 | 1 | 0 | 5.8 s |
| 40 | 2 | 0.5 | 16.3 % | 4.0 s |
| 250 | 5 | 0.2 | 52.7 % | 3.9 s |
| 1000 | 10 | 0.1 | 72.9 % | 3.8 s |

Settling barely changes (σ = 1 fixed); overshoot explodes. Speed loop: K_ω = 80 takes τ from 0.5 s to 0.1 s; 180 to 0.05 s.

### Exam examples

- LN1's servo (slides 50–51, 62): the same structure with symbols.
- LN2's tachometer (slides 15–18): τ 5 s → 0.833 s, a factor of 6; the final value 10 → 1.67.

### What it can't do

One knob can't set speed and damping separately; with a steady wind it also leaves an error (*Why it stops short*).
