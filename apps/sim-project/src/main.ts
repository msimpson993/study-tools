import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { blocksFigure } from './figs/blocks';
import { motorFigure } from './figs/motor';
import { borerFigure, tradeoffFigure, sensFigure } from './figs/borer';
import { diskFigure } from './figs/disk';
import { piFigure, tunerFigure } from './figs/engine';
import { knobsFigure } from './figs/knobs';
import { popFigures } from './figs/pop';

const figures = {
  blocks: blocksFigure,
  motor: motorFigure,
  borer: borerFigure,
  tradeoff: tradeoffFigure,
  sens: sensFigure,
  disk: diskFigure,
  pi: piFigure,
  tuner: tunerFigure,
  knobs: knobsFigure,
};

mountApp(content, { figures, quizFigures: popFigures });
