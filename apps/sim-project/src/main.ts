import content from 'virtual:study-content';
import { mountApp, type ControlSet, type FigureDef, type FigureMountOpts } from '@study/core';
import { blocksFigure } from './figs/blocks';
import { motorFigure } from './figs/motor';
import { borerFigure, tradeoffFigure, sensFigure } from './figs/borer';
import { diskFigure } from './figs/disk';
import { piFigure, tunerFigure } from './figs/engine';
import { loopFigure } from './figs/loop';
import { engineFitFigure } from './figs/enginefit';
import { popFigures } from './figs/pop';
import { applyTabLocalControls } from './figs/tablocal';

type Mounter = (host: HTMLElement, def: FigureDef, controls: ControlSet, opts?: FigureMountOpts) => (() => void) | void;

const raw: Record<string, Mounter> = {
  blocks: blocksFigure,
  motor: motorFigure,
  borer: borerFigure,
  tradeoff: tradeoffFigure,
  sens: sensFigure,
  disk: diskFigure,
  pi: piFigure,
  tuner: tunerFigure,
  loop: loopFigure,
  'engine-fit': engineFitFigure,
};

const figures = Object.fromEntries(Object.entries(raw).map(([id, fn]) => [
  id,
  (host: HTMLElement, def: FigureDef, controls: ControlSet, opts?: FigureMountOpts) => {
    if (id !== 'loop') applyTabLocalControls(id, host, controls);
    return fn(host, def, controls, opts);
  },
]));

mountApp(content, { figures, quizFigures: popFigures });
