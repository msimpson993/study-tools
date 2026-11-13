import { storeGet, storeSet } from './store';
import type { MapDef, MapNode, Question } from './types';

export type NodeStatus = 'unseen' | 'seen' | 'correct' | 'missed';
interface Data { seen: Record<string, 1>; q: Record<string, 'c' | 'm'> }

export const nodeKey = (mapId: string, nodeId: string): string => `${mapId}/${nodeId}`;
export const quizTagOf = (n: Pick<MapNode, 'id' | 'dive' | 'quizTag'>): string => n.quizTag ?? n.dive ?? n.id;

/** Per-node progress (unseen / seen / correct / missed) persisted in localStorage per app. */
export class Progress {
  private d: Data;
  private key: string;
  private listeners = new Set<() => void>();
  constructor(appId: string, private questions: Question[], private maps: MapDef[]) {
    this.key = `study-tools:${appId}:progress`;
    this.d = storeGet<Data>(this.key, { seen: {}, q: {} });
    if (!this.d.seen || !this.d.q) this.d = { seen: {}, q: {} };
  }
  onChange(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private save(): void { storeSet(this.key, this.d); this.listeners.forEach((f) => f()); }
  markSeen(mapId: string, nodeId: string): void {
    const k = nodeKey(mapId, nodeId);
    if (!this.d.seen[k]) { this.d.seen[k] = 1; this.save(); }
  }
  setAnswer(qid: string, ok: boolean): void { this.d.q[qid] = ok ? 'c' : 'm'; this.save(); }
  answer(qid: string): 'c' | 'm' | undefined { return this.d.q[qid]; }
  questionsFor(tags: string[]): Question[] {
    const set = new Set(tags);
    return this.questions.filter((q) => q.tags.some((t) => set.has(t)));
  }
  status(mapId: string, n: MapNode): NodeStatus {
    const qs = this.questionsFor([quizTagOf(n)]);
    const marks = qs.map((q) => this.d.q[q.id]);
    if (marks.includes('m')) return 'missed';
    if (qs.length && marks.every((m) => m === 'c')) return 'correct';
    return this.d.seen[nodeKey(mapId, n.id)] ? 'seen' : 'unseen';
  }
  summary(): { total: number; unseen: number; seen: number; correct: number; missed: number } {
    const s = { total: 0, unseen: 0, seen: 0, correct: 0, missed: 0 };
    for (const m of this.maps) for (const n of m.nodes) { s.total++; s[this.status(m.id, n)]++; }
    return s;
  }
  reset(): void { this.d = { seen: {}, q: {} }; this.save(); }
}

/** Node ids reachable from `id` (inclusive), following edges downward. */
export function subtree(map: MapDef, id: string): string[] {
  const out = new Set<string>([id]);
  const q = [id];
  while (q.length) { const u = q.pop()!; for (const e of map.edges) if (e.from === u && !out.has(e.to)) { out.add(e.to); q.push(e.to); } }
  return [...out];
}
