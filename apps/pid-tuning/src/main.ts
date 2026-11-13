import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { mountBoard } from './guide/board';
import { labFigure } from './figs/lab';
import './quiz.css';

// The legacy interactive guide (migrated 1:1) stays as the full reference board; the figures are core Figures on the core simulator.
mountApp(content, { board: (host) => mountBoard(host), figures: { lab: labFigure } });
