> **The question this class keeps answering.** How does a linear system turn inputs into outputs, and how do we predict and steer it?

A linear system is completely known once you know what it does to a few simple pieces. Split any input into those pieces, let the system act on each one, and add the answers back up. The whole course is a search for the best pieces.

The first answer is impulses: the response to one sharp kick, h, gives every other response by convolution. The better answer is pieces the system does not reshape at all, only scales. For signals those are the exponentials e^(st) and zⁿ, and the scale factor is the transfer function H(s) or H(z): Laplace and Z transforms expand in them, and Fourier analysis is the special case on the jω axis or the unit circle. For a state model ẋ = Ax + Bu they are the eigenvectors of A, the modes: e^(At) moves each mode on its own, and controllability and observability ask whether the input can push, and the output can show, every mode. The last box asks which input is best, and answers with Pontryagin's principle.

```callout:note Two running examples
**The earbud speaker** carries the signals view: a click gives its impulse response, tones show the transfer function and frequency response, sampling and digital filters run its noise cancelling. **The two-room house** carries the state view: its two modes (the average and the difference of the room temperatures), e^(At), stability, controllability, observability, Gramians and the least-energy warm-up. Switch between them on the map's picture; each box says which one it uses.
```

```callout:note How the map works
Each box shows its question and a one-line answer. Tap a box for a short explanation, a key equation and a button into the deep dive; tap a line for why one idea leads to the next. **Big picture** is the whole course in 14 boxes; **Full detail** adds the boxes the exams use (ROC rules, Parseval, windowing, Jordan form, Cayley–Hamilton, PBH, Gramians, the Kalman split). Diamonds are questions; dashed lines join the same idea seen from two sides. Switch to **Review** on the map to track what you have seen, quiz a branch, or hide the text and rebuild the chain from memory.
```
