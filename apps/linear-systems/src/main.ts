import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { mountExpm } from './figs/expm';
import { ssFigure, flowFigure, stabFigure, ctrlFigure, obsFigure, kalmanFigure } from './figs/dynamics';
import { tfFigure, ltiFigure, ftFigure, fsFigure, dtftFigure, dftFigure, laplaceFigure, samplingFigure } from './figs/signals';
import { eigFigure, diagFigure, jordanFigure, orthoFigure } from './figs/linalg';

mountApp(content, { figures: { expm: mountExpm, eig: eigFigure, diag: diagFigure, jordan: jordanFigure, ortho: orthoFigure, ss: ssFigure, flow: flowFigure, stab: stabFigure, ctrl: ctrlFigure, obs: obsFigure, kalman: kalmanFigure, tf: tfFigure, lti: ltiFigure, ft: ftFigure, fs: fsFigure, dtft: dtftFigure, dft: dftFigure, laplace: laplaceFigure, sampling: samplingFigure } });
