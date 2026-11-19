import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { mountBoard } from './guide/board';
import { popFigures } from './figs/pop';
import { overviewFigure } from './figs/overview';
import { houseFigure, tfbuildFigure, splaneFigure, firstFigure, reduceFigure, partialFigure, rlcFigure, planeFigure, regulateFigure, sensFigure, scFigure } from './figs/house';
import { cornerFigure, specsFigure, dominantFigure, loopFigure, statesFigure, ccFigure, sfFigure, obsFigure, sepFigure, refinFigure } from './figs/corner';
import { antennaFigure, locusFigure, speedFigure, sseFigure, integralFigure, derivativeFigure, gainsFigure, tunetableFigure, indexFigure, windupFigure, znFigure } from './figs/dish';
import { labFigure } from './figs/lab';
import { problemFigure, bodepidFigure } from './figs/misc';
import { caseFigure, CASE_IDS } from './figs/cases';
import { cartFigure, heightFigure, pzFigure, shiftFigure, fvtFigure, bodeFigure } from './figs/legacy';
import './quiz.css';

// Three running examples: the house (core HOUSE model), the car corner and the antenna dish (PID series, Lab default plant).
const figures: Record<string, typeof houseFigure> = {
  overview: overviewFigure,
  // house
  house: houseFigure, tfbuild: tfbuildFigure, splane: splaneFigure, first: firstFigure, reduce: reduceFigure, partial: partialFigure, rlc: rlcFigure, plane: planeFigure, regulate: regulateFigure, sens: sensFigure, sc: scFigure,
  // car corner
  corner: cornerFigure, specs: specsFigure, dominant: dominantFigure, loop: loopFigure, states: statesFigure, cc: ccFigure, sf: sfFigure, obs: obsFigure, sep: sepFigure, refin: refinFigure,
  // antenna dish
  antenna: antennaFigure, locus: locusFigure, speed: speedFigure, sse: sseFigure, integral: integralFigure, derivative: derivativeFigure, gains: gainsFigure, tunetable: tunetableFigure, index: indexFigure, windup: windupFigure, zn: znFigure, lab: labFigure,
  // kept tools (legacy plants)
  problem: problemFigure, bodepid: bodepidFigure, cart: cartFigure, height: heightFigure, pz: pzFigure, shift: shiftFigure, fvt: fvtFigure, bode: bodeFigure,
};
for (const id of CASE_IDS) figures[`fail-${id}`] = caseFigure(id);

mountApp(content, { board: (host) => mountBoard(host), figures, quizFigures: popFigures });
