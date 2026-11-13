import { mountFigure, drawPlot, cssVar, type FigurePanel, type ControlSet, type FigureDef } from '@study/core';
import { modalModel, stateTrajectory, modalTrajectory } from '../modal';

export function mountExpm(host: HTMLElement, def: FigureDef, controls: ControlSet) {
  const range = (a: number[], b: number[]): [number, number] => {
    const all = [...a, ...b], lo = Math.min(...all, 0), hi = Math.max(...all, 0);
    const pad = (hi - lo || 1) * 0.08; return [lo - pad, hi + pad];
  };
  const v = (c: ControlSet) => ({ a1: c.values.a1 as number, a0: c.values.a0 as number, x0: [c.values.x1 as number, c.values.x2 as number] as [number, number], tmax: c.values.tmax as number });
  const panels: FigurePanel[] = [
    {
      id: 'x', title: 'State x(t) = e^{At} x(0)', x: 'time t (s)', y: 'x₁ = y, x₂ = dy/dt',
      draw(g, w, h) {
        const p = v(controls), m = modalModel(p.a1, p.a0), tr = stateTrajectory(m.A, p.x0, p.tmax);
        const yr = range(tr.x1, tr.x2);
        drawPlot(g, w, h, { xr: [0, p.tmax], yr: [Math.max(yr[0], -50), Math.min(yr[1], 50)], xLabel: 'time t (s)', yLabel: 'state', series: [
          { xs: tr.t, ys: tr.x1.map((q) => Math.max(-50, Math.min(50, q))), color: cssVar('--cyan') },
          { xs: tr.t, ys: tr.x2.map((q) => Math.max(-50, Math.min(50, q))), color: cssVar('--org') },
        ] });
      },
    },
    {
      id: 'xi', title: 'Modal coordinates ξ(t) = V⁻¹ x(t)', x: 'time t (s)', y: 'ξ₁, ξ₂',
      draw(g, w, h) {
        const p = v(controls), m = modalModel(p.a1, p.a0), mt = modalTrajectory(m, p.x0, p.tmax);
        if (!mt) {
          g.clearRect(0, 0, w, h); g.fillStyle = cssVar('--muted'); g.font = '12px system-ui,sans-serif'; g.textAlign = 'center';
          const msg = ['Complex or repeated eigenvalues:', 'no real diagonalization.', 'See the Jordan form dive.'];
          msg.forEach((t, i) => g.fillText(t, w / 2, h / 2 - 14 + i * 16));
          return;
        }
        const yr = range(mt.z1, mt.z2);
        drawPlot(g, w, h, { xr: [0, p.tmax], yr: [Math.max(yr[0], -50), Math.min(yr[1], 50)], xLabel: 'time t (s)', yLabel: 'mode coordinate', series: [
          { xs: mt.t, ys: mt.z1, color: cssVar('--grn'), dash: [6, 4] }, { xs: mt.t, ys: mt.z2, color: cssVar('--vio'), dash: [6, 4] },
        ] });
      },
    },
  ];
  const api = mountFigure(host, def, panels, controls);
  return () => api.destroy();
}

