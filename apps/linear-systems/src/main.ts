import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { mountExpm } from './figs/expm';
import { ssFigure, flowFigure, stabFigure, ctrlFigure, obsFigure, kalmanFigure } from './figs/dynamics';
import { eigFigure, diagFigure, jordanFigure, orthoFigure } from './figs/linalg';

mountApp(content, { figures: { expm: mountExpm, eig: eigFigure, diag: diagFigure, jordan: jordanFigure, ortho: orthoFigure, ss: ssFigure, flow: flowFigure, stab: stabFigure, ctrl: ctrlFigure, obs: obsFigure, kalman: kalmanFigure } });
