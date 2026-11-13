> **The question this class keeps answering.** Given a linear operator A, what is the best basis in which to understand it, and what does that basis make easy?

Linear algebra has a computational question (when does Ax = b have a solution, and how do we find it?) and a conceptual one: what does A do to vectors? The two meet when you change coordinates so A becomes simple: a diagonal matrix of scale factors, one per mode. In that basis, solving Ax = b is dividing by eigenvalues; evolving x′ = Ax is multiplying by e^{λt}; and filtering an LTI system is multiplying by a frequency response.

That last step is the same idea in another language. Complex exponentials are eigenfunctions of convolution, so Fourier, Laplace, and Z transforms are changes of basis that diagonalize an LTI operator. The four Fourier tools (FS, FT, DTFT, DFT) are the four combinations of time being continuous or discrete and periodic or aperiodic. The state transition matrix e^{At} is easy in the eigenbasis. Controllability and observability then ask the Ax = b style questions about those modes: can the input reach every one (range of the controllability matrix), and can the output see every one (null space of the observability matrix)? The PBH tests restate both in the language of eigenvectors.

```callout:note Running example
The state-space topics share one companion matrix: A = [[0, 1], [−2, −3]], from ÿ + 3ẏ + 2y = u with x₁ = y, x₂ = ẏ. Eigenvalues λ = −1, −2; right eigenvectors v₁ = [1, −1]ᵀ, v₂ = [1, −2]ᵀ; left eigenvectors w₁ = [2, 1]ᵀ, w₂ = [1, 1]ᵀ. With B = [0, 1]ᵀ and C = [1, 0], this is a minimal realization of G(s) = 1/((s+1)(s+2)).
```

```callout:note How the map works
Tap any box or any connecting line on the map. A box opens a short explanation, a key equation, and a button into the full deep dive. A line explains why one idea leads to the next. Diamonds are questions; solid arrows are the next step in the chain; dashed arrows mark the same idea in another language. Switch to **Review** to track what you have seen, quiz a branch, or hide the text and rebuild the chain from memory.
```
