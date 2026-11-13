/** Normalised sinc, sin(πx)/(πx). */
export const sinc = (x: number): number => (Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

export type Interp = 'zoh' | 'foh' | 'sinc';

/** Magnitude (dB) of the reconstruction kernel relative to its DC gain, at frequency f for sample rate fs. */
export function interpDroopDb(kind: Interp, f: number, fs: number): number {
  const s = Math.abs(sinc(f / fs));
  if (kind === 'zoh') return 20 * Math.log10(s);
  if (kind === 'foh') return 20 * Math.log10(s * s);
  return Math.abs(f) <= fs / 2 ? 0 : -Infinity;
}

/** Half-sample delay of the ZOH, seconds. */
export const zohDelay = (fs: number): number => 1 / (2 * fs);
