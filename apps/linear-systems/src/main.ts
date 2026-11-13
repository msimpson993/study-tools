import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { mountExpm } from './figs/expm';
import { eigFigure, diagFigure, jordanFigure, orthoFigure } from './figs/linalg';

mountApp(content, { figures: { expm: mountExpm, eig: eigFigure, diag: diagFigure, jordan: jordanFigure, ortho: orthoFigure } });
