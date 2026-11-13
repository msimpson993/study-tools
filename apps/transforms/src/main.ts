import content from 'virtual:study-content';
import { mountApp } from '@study/core';
import { mountBoard } from './board/board';

mountApp(content, { board: (host, params) => mountBoard(host, params) });
