---
id: report-guide
order: 1
title: "The project report: what to reproduce, what to say"
summary: "Deliverables and dates from the project page, a figure-by-figure checklist of what Project 1 and Project 2 ask you to reproduce with the numbers you should get, the handout's typos to avoid, and discussion points organised around the four advantages of feedback."
covers: "Project page (deliverables), Project 1 handout (PID Tuner, 6 pp.), Project 2 handout (Dorf §4.9–4.10, pp.257–267)"
---
**How to use this page.** Work down the checklist with MATLAB open. For each item, reproduce the plot, compare your number with the one listed, and open the map box for anything you cannot explain in a sentence. Numbers marked *exact* are from numbers.py; numbers in quotes are the handout's own.

### Deliverables (from the project page)

| What | Details | Due |
|---|---|---|
| Groups | at most two students; email the TA (subject "Group Formation") | Oct 1 |
| TA meetings | Oct 13 (3:20–6:20 PM); Oct 26, Nov 9, Nov 23 (5:20–6:20 PM); progress report due end of day after each | – |
| Technical report | 6–8 pages, IEEE article format (the template paper shows the style); sections: Abstract, Problem statement, Proposed Solution (Design), Simulations and Results, Discussion of Results, Conclusion, References; file EECE5130-FL2026-TR-Group#, PDF plus Word or LaTeX, with the MATLAB files; one submission per group | Dec 4 |
| Slides | at most 4: a title slide (group number, members) and 3 slides, one exercise each, each with a picture of the input, of the output and of the code; PPT and PDF named EECE5130_First Name_Last Name_PPT | Dec 4 |
| Presentation | 5 minutes including questions, virtual, run the code live once; attendance graded | Dec 7 |
| Peer assessment | individual; one PDF of your evaluations of all other groups, every item completed, named EECE5130_First Name_Last Name_Peer.pdf | Dec 7 (the page says both 10 PM and end of day) |

### Checklist: Project 2 (Dorf §4.9–4.10)

| Item | Reproduce | You should get | Map box |
|---|---|---|---|
| Fig. 4.23 | open-loop speed after a unit load | "−0.66 rad/s" at 7 s (exact −0.663; final −0.667) | [No feedback](#/node/OPEN) |
| Fig. 4.24 | closed-loop speed, Ka = 54, Kt = 1 | "−0.002 rad/s" (exact −0.00185); ratio "0.003" (exact 0.0028) < 0.02 | [Measure and correct](#/node/CLOSED) |
| Fig. 4.25 | step, K = 100 and K = 20 | Table 4.3: "22 %, 0.7 s" and "4 %, 1.0 s" (exact 22.0 %, 0.67 s; 3.9 %, 0.91 s) | [K and the command](#/node/KSTEP) |
| Fig. 4.26 | unit push, K = 100 and K = 20 | "0.01" and "0.05" | [K and the rock's push](#/node/KPUSH) |
| Fig. 4.27 | sensitivity, K = 20 | the arc from 0 to 1 (top), |S| and s/K (bottom) | [When the machine changes](#/node/SENS) |
| Fig. 4.30 | seek, Ka = 10 and 80 | Ka = 80 peaks near 1.2 (exact 1.17 at 0.18 s, 17.1 %) | [Ka: fast or calm](#/node/KA) |
| Fig. 4.31 | shock, Ka = 80 | "−2.5×10⁻³" (dip −0.0029 at 0.18 s) | [Ka and a shock](#/node/KAPUSH) |

### Checklist: Project 1 (PID Tuner)

| Step | Do | You should see |
|---|---|---|
| 1 | `open_system('scdspeedctrlpidblock')`, open the PID block, press Tune | initial PI: P = 0.0042253, I = 0.0092411; rise 0.45 s, settling 1.96 s, overshoot 7.5 % |
| 2 | Response time to 3.1 s (robustness 0.6) | P = 0, I = 0.0021263; settling 3.45 s, overshoot 0.401 % |
| 3 | Response time 1.5 s, robustness 0.72 | P = 0.0014551, I = 0.0043791; settling 1.81 s, overshoot 0 % |
| 4 | Update Block, run the model | speed steps 2000 → 3000 rpm, meets both requirements |

Your MATLAB version may give slightly different P and I; report what you get beside the handout's.

````callout:trap Handout typos to avoid
- **Fig. 4.23(b)** sets `f=0.5` but uses `b`: write `b=0.5`, or the script stops.
- **Project 1 text** says response time "3.4" s for the slower design; the screenshot and table match **3.1** s. It says that design has "zero" overshoot and "4 seconds" settling; the table shows **0.401 %** and **3.45 s**.
- **Table 4.3** rounds the K = 20 settling time to 1.0 s; MATLAB's `stepinfo` gives 0.91 s.
(These checks are mine, not in lab handout.)
````

### Discussion points (one per advantage)

- **Disturbance rejection (motor):** the loop adds Km·Ka·Kt/Ra = 540 N·m·s of effective friction; the sag and the time constant both divide by 1 + loop gain = 361.
- **Transient response (boring machine):** K is a spring, the 12 a damper; ζ = 6/√K falls as K rises, so overshoot rises (4 % → 22 %) as settling falls.
- **Sensitivity (boring machine):** S ≈ s/K: slow drift in the machine is hidden, more so at higher K; fast changes are not.
- **Steady-state error (disk head, engine):** the arm's integrator gives zero step error for any stable Ka; the engine needs the I term for the same result.
- **The price:** every gain that improves the steady error makes the response swing more (boring machine, disk head), and past a limit the loop goes unstable (disk head, Ka > 4080, not in lab handout). "The final decision on how to choose K rests with the designer" (Dorf p.263).

### Slide suggestion (not in lab handout)

Three exercises that cover the most ground: the motor open vs closed (Figs. 4.23–4.24, one picture of the load step, one of both responses), the boring machine at K = 20 vs 100 (Figs. 4.25–4.26), and the PID Tuner's final design on the engine (the tuner window and the Simulink scope).

<p class="src">Sources: project page (deliverables and dates), Project 1 and Project 2 handouts as cited. Not in lab handout: exact values, typo checks, discussion wording and the slide suggestion.</p>
