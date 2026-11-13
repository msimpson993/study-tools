import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { mountBoard } from './guide/board';
import { labFigure, makeLab } from './figs/lab';
import { problemFigure, bodeFigure, integralFigure } from './figs/misc';
import { secondFigure } from './figs/second';
import { caseFigure, CASE_IDS } from './figs/cases';
import { PRE } from './lab/model';
import { quizFigures } from './quizfigs';
import './quiz.css';

const ZN = PRE.p3.ZN!;
const figures: Record<string, ReturnType<typeof makeLab>> = {
  lab: labFigure,
  gains: makeLab({ panels: ['out', 'u', 'poles'], fixed: { plant: 'p2', T: 10 } }),
  derivative: makeLab({ panels: ['out', 'u'], fixed: { plant: 'p2', T: 10, Kp: 2, Ki: 1 } }),
  windup: makeLab({ panels: ['out', 'u'], fixed: { plant: 'p1', T: 6, Kd: 0, sat: true } }),
  zn: makeLab({ panels: ['out', 'u', 'poles', 'read'], fixed: { plant: 'p3', T: 30, Ki: 0, Kd: 0 }, map: (lv, v) => (v.zn ? { ...lv, Kp: ZN[0], Ki: ZN[1], Kd: ZN[2] } : lv) }),
  integral: integralFigure, problem: problemFigure, bodepid: bodeFigure, second: secondFigure,
};
for (const id of CASE_IDS) figures[`fail-${id}`] = caseFigure(id);

// The legacy interactive guide (migrated 1:1) stays as the full reference board; the figures are core Figures on the core simulator.
mountApp(content, { board: (host) => mountBoard(host), figures, quizFigures });
