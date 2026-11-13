import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { mountBoard } from './guide/board';
import { locusFigure } from './figs/locus';
import * as ctl from './figs/ctl';
import { secondFigure } from './figs/second';
import './quiz.css';

// Legacy interactive guide (migrated 1:1) hosted as the app's single board; figures arrive in later commits.
mountApp(content, { board: (host) => mountBoard(host), figures: { locus: locusFigure, cart: ctl.cartFigure, second: secondFigure, height: ctl.heightFigure, first: ctl.firstFigure, dominant: ctl.dominantFigure, pidcart: ctl.pidcartFigure, sse: ctl.sseFigure, loop: ctl.loopFigure, states: ctl.statesFigure, rlc: ctl.rlcFigure, pz: ctl.pzFigure, shift: ctl.shiftFigure, partial: ctl.partialFigure, fvt: ctl.fvtFigure, bode: ctl.bodeFigure } });
