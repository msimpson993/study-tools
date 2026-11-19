import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { popFigures } from './figs/pop';
import { pictures } from './figs/pictures';
import { audioHook } from '@study/core/audio';
import { sounds } from './figs/sounds';
import { mountBoard } from './board/board';
import { expmFigure, eigFigure, diagFigure, flowFigure, cayleyFigure, stabFigure, ctrlFigure, obsFigure, kalmanFigure, gramianFigure, optimalFigure, skyhookFigure } from './figs/carfigs';
import { ssFigure, ltiFigure, eigfnFigure, ftFigure, fsFigure, orthoFigure, samplingFigure, dtftFigure, dftFigure, windowFigure, laplaceFigure, inverseFigure, tfFigure, zfilterFigure, lintestFigure } from './figs/speaker';

mountApp(content, {
  board: (host, params) => mountBoard(host, params),
  quizFigures: { ...popFigures, ...pictures },
  audio: audioHook(sounds),
  figures: {
    // car
    expm: expmFigure, eig: eigFigure, diag: diagFigure, flow: flowFigure, cayley: cayleyFigure, stab: stabFigure, ctrl: ctrlFigure, obs: obsFigure, kalman: kalmanFigure, gramian: gramianFigure, optimal: optimalFigure, skyhook: skyhookFigure,
    // speaker
    ss: ssFigure, lti: ltiFigure, eigfn: eigfnFigure, ft: ftFigure, fs: fsFigure, ortho: orthoFigure, sampling: samplingFigure, dtft: dtftFigure, dft: dftFigure, window: windowFigure, laplace: laplaceFigure, inverse: inverseFigure, jordan: inverseFigure, tf: tfFigure, zfilter: zfilterFigure, lintest: lintestFigure,
  },
});
