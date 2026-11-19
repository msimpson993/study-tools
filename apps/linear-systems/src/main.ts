import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { popFigures } from './figs/pop';
import { expmFigure, eigFigure, diagFigure, flowFigure, cayleyFigure, stabFigure, ctrlFigure, obsFigure, kalmanFigure, gramianFigure, optimalFigure } from './figs/house';
import { ssFigure, ltiFigure, eigfnFigure, ftFigure, fsFigure, orthoFigure, samplingFigure, dtftFigure, dftFigure, windowFigure, laplaceFigure, inverseFigure, tfFigure, zfilterFigure, lintestFigure } from './figs/speaker';

mountApp(content, {
  quizFigures: popFigures,
  figures: {
    // house
    expm: expmFigure, eig: eigFigure, diag: diagFigure, flow: flowFigure, cayley: cayleyFigure, stab: stabFigure, ctrl: ctrlFigure, obs: obsFigure, kalman: kalmanFigure, gramian: gramianFigure, optimal: optimalFigure,
    // speaker
    ss: ssFigure, lti: ltiFigure, eigfn: eigfnFigure, ft: ftFigure, fs: fsFigure, ortho: orthoFigure, sampling: samplingFigure, dtft: dtftFigure, dft: dftFigure, window: windowFigure, laplace: laplaceFigure, inverse: inverseFigure, jordan: inverseFigure, tf: tfFigure, zfilter: zfilterFigure, lintest: lintestFigure,
  },
});
