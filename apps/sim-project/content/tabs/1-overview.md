---
id: overview
order: 1
title: Overview
summary: "What the Simulation Project asks you to hand in, when, and what each of the four problems teaches about feedback."
quizTags: [overview]
---

## What feedback means here

- **Feedback:** measure the output, compare it with what you asked for (the *command*), and use the difference (the *error*) to correct the input.
- **The project rebuilds four solved examples** in MATLAB and Simulink. Each one shows feedback buying something, and each has *knobs* (gains and settings) whose values trade one good thing for another.

## The four problems, one line each

| Tab | Problem | What it teaches about feedback |
|---|---|---|
| Engine speed with the PID Tuner | Project 1 (MathWorks example) | **Software tuning:** when the machine is too tangled to write down, MATLAB copies it near its operating point and picks P and I from two sliders; the I term is what removes the steady error. |
| Speed controlled motor | Dorf Example 4.4, Figs. 4.23–4.24 | **Rejecting pushes:** measuring the speed and correcting cuts the speed lost to a load from 0.667 to 0.00185 rad/s per N·m. |
| Boring machine | Dorf Example 4.5, Figs. 4.25–4.27 | **One knob, two goals:** a higher gain holds the line better against the rock but overshoots more, and it also makes the loop care less about changes in the machine. |
| Disk drive head | Dorf §4.10, Figs. 4.30–4.31 | **Zero error for free, with a ceiling:** the arm's own build-up gives zero step error, but the gain still trades speed against swing, and too much gain makes the loop unstable (the ceiling is not in lab handout). |

## Deliverables and dates (from the project page)

| What | Details | Due |
|---|---|---|
| **Groups** | at most two students; email the TA (subject "Group Formation"), copying all members | Oct 1 |
| **TA meetings** | Oct 13 (3:20–6:20 PM); Oct 26, Nov 9, Nov 23 (5:20–6:20 PM); a progress report is due at the end of each meeting day | – |
| **Technical report** | 6–8 pages, IEEE article format (the template paper shows the style); sections Abstract, Problem statement, Proposed Solution (Design), Simulations and Results, Discussion of Results, Conclusion, References; file EECE5130-FL2026-TR-Group#, PDF plus Word or LaTeX, with your MATLAB files; one submission per group | Dec 4 |
| **Slides** | at most 4: a title slide (group number, members), then 3 slides, one exercise each, each with a picture of the input, of the output and of the code; PPT and PDF named EECE5130_First Name_Last Name_PPT | Dec 4 |
| **Presentation** | 5 minutes including questions, virtual, screen shared; have your code ready to run once; attendance is graded | Dec 7 (last class) |
| **Peer assessment** | individual; one PDF with your evaluations of every other group, every item completed, named EECE5130_First Name_Last Name_Peer.pdf | Dec 7 (the page says both 10 PM and end of day) |

## How to use the tabs

- **Each problem tab has the same six parts:** the problem, the setup, what's going on, try it, check your work, and for your report.
- **Words marked "(not in lab handout)"** are this page's own explanations or extra numbers. Everything else is what the handout says or shows.
- **Quiz and glossary:** in the menu.

## Slide suggestion (not in lab handout)

Three exercises that cover the most ground:
- **Engine:** the PID Tuner's final design, and the Simulink scope.
- **Motor:** the load step, open vs closed (Figs. 4.23–4.24).
- **Boring machine:** K = 20 vs K = 100 (Figs. 4.25–4.26).

<p class="src">Sources: project page (deliverables and dates); Dorf §4.9 introduction (the advantages each example shows); PID Tuner handout p.1 (goals).</p>
