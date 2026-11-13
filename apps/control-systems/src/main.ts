import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { mountBoard } from './guide/board';
import './quiz.css';

// Legacy interactive guide (migrated 1:1) hosted as the app's single board; figures arrive in later commits.
mountApp(content, { board: (host) => mountBoard(host) });
