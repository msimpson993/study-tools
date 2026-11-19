import type { DiagramSpec } from './blockdiagram';

/** Shapes produced by @study/build from an app's content/ folder and consumed by @study/core. */

export type NodeKind = 'box' | 'decision' | 'terminal';

export interface MapNode {
  id: string;
  label: string;
  detail?: string;
  kind?: NodeKind;
  /** colour series (0-4) */
  series?: number;
  /** rendered HTML (inline markdown) of the short answer */
  short: string;
  /** equation shown as plain (unicode) text */
  eq?: string;
  /** equation rendered by KaTeX at build time (HTML) */
  eqHtml?: string;
  why?: string;
  recognize?: string;
  trap?: string;
  predict?: string;
  /** what this box adds to the subject's running example (HTML) */
  addsToExample?: string;
  /** what it lets us account for (HTML) */
  accountsFor?: string;
  /** overlays of the example scene this box adds (the dive linked from it inherits them) */
  exampleScene?: { /** another scene than runningExample.scene (one of runningExample.moreScenes) */ scene?: string; overlays?: string[]; caption?: string; params?: Record<string, number>; /** staged block diagram under the picture */ diagram?: DiagramSpec | string | string[] };
  /** id of a deep dive in dives/ */
  dive?: string;
  /** live entry, "figure:<id>[?k=v]" or "board:<pair>[?preset=<id>]" */
  live?: string;
  /** quiz tag; defaults to dive then node id */
  quizTag?: string;
  /** link to another app / page */
  link?: { href: string; label: string };
  /** opt-in fixed pop-up template (HTML strings); when present the pop-up shows only this */
  pop?: NodePop;
}
export interface NodePop { rough: string; eqKey?: string; figures?: QuizFigureRef[]; /** opt-in sound examples (ids registered with the app's `audio` hook; see audio.ts) */ audio?: string[]; example?: string; next?: string; ask?: string }

export interface MapEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** draw the arrowhead at the `from` end */
  reverse?: boolean;
  /** the follow-up question this line answers (rendered HTML) */
  question: string;
  /** the idea behind the link (rendered HTML) */
  idea: string;
  eq?: string;
}

export interface MapDef {
  id: string;
  title: string;
  caption?: string;
  /** names of the colour families node.series 0..4 (legend chips) */
  seriesNames?: string[];
  nodes: MapNode[];
  edges: MapEdge[];
}

export interface DiveStep { title: string; detail?: string }
export interface Dive {
  id: string;
  order?: number;
  title: string;
  category: string;
  chain: DiveStep[];
  neighbors: string[];
  matlab?: string;
  /** math-level tag; turns on the 'At a glance' outline */
  level?: string;
  /** quiz ids shown inline as 'Check yourself' */
  check?: string[];
  /** from front matter, else inherited from the first map node that links here (HTML) */
  addsToExample?: string;
  accountsFor?: string;
  /** which overlays of the subject's example scene this dive shows beside "what this adds" (front matter, else from a node linking here) */
  exampleScene?: { /** another scene than runningExample.scene (one of runningExample.moreScenes) */ scene?: string; overlays?: string[]; caption?: string; params?: Record<string, number>; /** staged block diagram under the picture */ diagram?: DiagramSpec | string | string[] };
  html: string;
}

/** A review page (mini exam): lives outside the map, listed under the Review section. */
export interface ReviewPage { id: string; order?: number; title: string; summary: string; covers?: string; /** quiz tag of the self-test */ quizTag?: string; /** named subsets of the self-test, by shared quiz tag */ quizSubsets?: { tag: string; label: string }[]; html: string }

export type QuestionKind = 'recall' | 'recognize' | 'action' | 'compute' | 'trap';
/** A small non-interactive plot shown under the question text. `id` names a renderer registered by the app (`quizFigures` hook); `params` are FIXED inputs for it. */
export interface QuizFigureRef { id: string; params?: Record<string, number | string | boolean>; /** accessible description (required): what the plot shows */ alt: string; caption?: string }
export interface Question {
  id: string;
  tags: string[];
  kind: QuestionKind;
  q: string;          // HTML
  choices?: string[]; // HTML
  answer?: number;    // index into choices (mcq)
  a?: string;         // HTML (recall)
  why?: string;       // HTML
  figure?: QuizFigureRef;
  /** keep the choices in the authored order (they refer to each other by position or letter) */
  fixedOrder?: boolean;
}

export interface Term { term: string; meaning: string; units?: string; section?: string }

export interface ControlDef {
  id: string;
  label: string;
  type: 'range' | 'select' | 'seg' | 'toggle';
  min?: number; max?: number; step?: number;
  options?: { value: string; label: string }[];
  default: number | string | boolean;
  group: 'primary' | 'more';
  unit?: string;
}
export interface PresetDef { id: string; label: string; set: Record<string, number | string | boolean>; about?: string }
export interface FigureDef {
  id: string;
  title: string;
  x: string;
  y: string;
  legend: { label: string; color: string; dash?: boolean }[];
  howToRead: string;
  controls: ControlDef[];
  presets: PresetDef[];
  pair?: { forward: string; inverse: string; forwardName: string; inverseName: string; strip?: string };
  lookFor?: string;
  animate?: { control: string; speed: number; loop?: boolean };
  height?: number;
}

export interface SectionDef { id: string; title: string; kind: 'map' | 'dives' | 'md' | 'quiz' | 'board' | 'glossary' | 'figures' | 'review'; html?: string }
export interface Subject {
  id: string;
  title: string;
  centralQuestion: string;
  blurb: string;
  archetype: string;
  categories?: { id: string; label: string }[];
  sections: SectionDef[];
  hub?: { order?: number };
  /** ids of the quiz-figure renderers this app registers; when present, `figure.id` in quiz.yaml is validated against it */
  quizFigures?: string[];
  /** ids of the opt-in sound examples this app registers; pop.audio ids are validated against it */
  audio?: string[];
  runningExample?: { title: string; summary: string; details?: string; /** which core example scene draws it (`cart`, `tine`) and the overlays of the small hero on the map page */ scene?: SceneRef; /** further scenes (more than one running example): the map hero switches between them, dives pick one with exampleScene.scene */ moreScenes?: SceneRef[] };
  board?: { pairs: string[] };
}

export interface AppContent {
  subject: Subject;
  maps: MapDef[];
  dives: Dive[];
  /** review pages (mini exams) reachable from the Review section, not from the map */
  review?: ReviewPage[];
  quiz: Question[];
  glossary: Term[];
  figures: FigureDef[];
  extra: Record<string, unknown>;
}
/** A subject-level scene reference (runningExample.scene / moreScenes). */
export interface SceneRef { id: string; title?: string; overlays?: string[]; params?: Record<string, number>; caption?: string; diagram?: DiagramSpec | string | string[] }
