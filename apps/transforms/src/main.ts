import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { mountBoard } from './board/board';
import { ringFigure, spectrumFigure, sampledFigure, zmapFigure, leakageFigure } from './figs';

mountApp(content, { board: (host, params) => mountBoard(host, params), figures: { ring: ringFigure, spectrum: spectrumFigure, sampled: sampledFigure, zmap: zmapFigure, leakage: leakageFigure } });
