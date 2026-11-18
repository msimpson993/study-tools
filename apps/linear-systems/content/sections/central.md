> **The question this class keeps answering.** What is a linear system, and how do we predict what it does to any input?

A system is a rule that turns an input signal into an output signal. It is linear when it respects sums and scaling: the response to a sum of inputs is the sum of their responses, and doubling the input doubles the output. That one property is what makes prediction possible. A linear system is completely known once you know what it does to a few simple pieces: split any input into those pieces, let the system act on each one, and add the answers back up. The whole course is a search for the best pieces.

The first answer is impulses: the response to one sharp kick, h, gives every other response by convolution. The better answer is pieces the system does not reshape at all, only scales. For signals those are the exponentials $e^{st}$ and $z^n$, and the scale factor is the transfer function H(s) or H(z): Laplace and Z transforms expand in them, and Fourier analysis is the special case on the jω axis or the unit circle. For a state model ẋ = Ax + Bu they are the eigenvectors of A, the modes: $e^{At}$ moves each mode on its own. Two structural questions finish the analysis: which modes can the input excite (reachability) and which can a measurement reveal (observability), and how to build a state model from a transfer function (realization). Feedback and optimal control then appear as applications of the same tools.

```callout:note Two running examples
**The earbud speaker** carries the signals view: a click gives its impulse response, tones show the transfer function and frequency response, sampling and digital filters run its noise cancelling. **The two-room house** carries the state view: its two modes (the average and the difference of the room temperatures), $e^{At}$, stability, reachability, observability, Gramians and, as an application, the least-energy warm-up. Switch between them on the map's picture; each box says which one it uses.
```

```callout:note Where this shows up
The same tools work in every field below; only the names of the signals change.

- **RF and microwave.** A filter is an LTI system shaped by its poles and zeros; an amplifier is linear for small signals about its bias, so its S-parameters are a transfer-function matrix; an antenna array is a spatial filter whose beam is the Fourier transform of its element weights. *Tools:* H(s) and frequency response, linearization, Fourier.
- **Communications.** A channel is convolution with its impulse response (multipath); modulation shifts a spectrum; an equalizer undoes the channel's frequency response. *Tools:* convolution, Fourier, Z transforms.
- **Audio and DSP.** The earbud: a click gives the impulse response, tones give the frequency response, and sampled digital filters run the noise cancelling. *Tools:* convolution, Laplace, Z, DFT.
- **Circuits.** RLC networks and op-amp stages are linear differential equations; impedances are transfer functions in s. *Tools:* Laplace, poles and zeros, state space.
- **Mechanics and structures.** A beam, a bridge or a building vibrates in modes, the eigenvectors of its mass–stiffness model. *Tools:* eigenvalues, modes, $e^{At}$.
- **Thermal.** The house: two rooms and a wall form a two-state model with a slow average mode and a fast difference mode. *Tools:* state space, modes, $e^{At}$, reachability.
- **Imaging and optics.** Blur is 2-D convolution with the point-spread function; its Fourier transform is the optical transfer function. *Tools:* 2-D convolution, Fourier, inverse filtering.
- **Control.** Feedback moves the poles to steer a system; optimal control picks the best input. *Tools:* stability, reachability and observability, Pontryagin.
```

```callout:note How the map works
Each box shows its question and a one-line answer. Tap a box for a short explanation, a key equation and a button into the deep dive; tap a line for why one idea leads to the next. **Big picture** is the whole course in 14 boxes; **Full detail** adds the boxes the exams use (ROC rules, Parseval, windowing, Jordan form, Cayley–Hamilton, PBH, Gramians, the Kalman split). Diamonds are questions; dashed lines join the same idea seen from two sides. Switch to **Review** on the map to track what you have seen, quiz a branch, or hide the text and rebuild the chain from memory.
```
