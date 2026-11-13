---
id: lab
order: 9
title: "The PID Lab: drag the gains yourself"
category: tune
chain:
  - title: "Can I feel the trade-offs myself?"
  - title: "What happens if I drag the gains myself?"
  - title: "the PID Lab"
neighbors:
  - tuning
  - methods
exampleScene: { overlays: [sensor, push, trace], caption: "The plant in the Lab: a push in, the sensor reading out. Drag the gains and watch the same trace change." }
---
**What happens if I drag the gains myself?**

**Picture it first.** The full lab: three gains, the derivative filter, a load, noise, an actuator limit, anti-windup and D on measurement. The ghost keeps the run you just left.

```figure:lab
```

The PID Lab runs a parallel PID with a filtered derivative on a choice of three teaching plants, with live sliders for Kp, Ki, Kd, N and the time window, and toggles for a load disturbance, sensor noise, an actuator limit, anti-windup, D on measurement, and a ghost of the previous run.

This is the same simulator that the Tuner and the failure gallery use, so everything you learn here transfers. The three controls you will touch most are **Kp** (speed), **Ki** (offset) and **Kd** (damping); the toggles under *More controls* switch on the real-world effects one at a time. Pick a preset, then move one thing and watch what the ghost shows.

````callout:predict Predict
Before you touch a slider, predict what it will do. Start from PID on the third-order lag, then raise Kp: the poles slide toward the jω axis, overshoot grows and the phase margin falls. Kp = 8 with Ki = Kd = 0 sits exactly on the axis (Ku).
````

````callout:note Symbols used here
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **N**: pole of the derivative filter (rad/s): how fast D may react
- **Ku, Tu**: ultimate gain (P-only loop on the edge of instability) and its oscillation period
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
