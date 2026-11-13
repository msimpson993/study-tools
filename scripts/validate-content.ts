import { listApps, loadApp, ContentError, repoRoot } from '../packages/build/src';
import path from 'node:path';

let failed = 0;
for (const app of listApps()) {
  try {
    const { content } = loadApp(path.join(repoRoot, 'apps', app));
    const nodes = content.maps.reduce((a, m) => a + m.nodes.length, 0), edges = content.maps.reduce((a, m) => a + m.edges.length, 0);
    console.log(`ok  ${app}: ${content.maps.length} maps, ${nodes} nodes, ${edges} edges, ${content.dives.length} dives, ${content.quiz.length} questions, ${content.figures.length} figures`);
  } catch (e) {
    failed++;
    console.error(e instanceof ContentError ? e.message : e);
  }
}
if (failed) { console.error(`\n${failed} app(s) failed content validation`); process.exit(1); }
