export interface Cx { re: number; im: number }
export const TAU = 2 * Math.PI;
export const C = (re: number, im = 0): Cx => ({ re, im });
export const cadd = (a: Cx, b: Cx): Cx => C(a.re + b.re, a.im + b.im);
export const csub = (a: Cx, b: Cx): Cx => C(a.re - b.re, a.im - b.im);
export const cmul = (a: Cx, b: Cx): Cx => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const cdiv = (a: Cx, b: Cx): Cx => {
  const d = b.re * b.re + b.im * b.im;
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
export const cabs = (a: Cx): number => Math.hypot(a.re, a.im);
export const carg = (a: Cx): number => Math.atan2(a.im, a.re);
export const cexpj = (th: number): Cx => C(Math.cos(th), Math.sin(th));
export const cscale = (a: Cx, k: number): Cx => C(a.re * k, a.im * k);
/** e^{c} for complex c */
export const cexp = (c: Cx): Cx => cscale(cexpj(c.im), Math.exp(c.re));
