/** Shapes produced by @study/build from an app's content/ folder and consumed by @study/core. */

export type NodeKind = 'box' | 'decision' | 'terminal';

export interface MapNode {
  id: string;
  label: string;
  detail?: string;
  kind?: NodeKind;
  /** colour series (0-3) */
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
  exampleScene?: { overlays?: string[]; caption?: string };
  /** id of a deep dive in dives/ */
  dive?: string;
  /** live entry, "figure:<id>[?k=v]" or "board:<pair>[?preset=<id>]" */
  live?: string;
  /** quiz tag; defaults to dive then node id */
  quizTag?: string;
  /** link to another app / page */
  link?: { href: string; label: string };
}

export interface MapEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
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
  /** names of the colour families node.series 0..3 (legend chips) */
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
  /** from front matter, else inherited from the first map node that links here (HTML) */
  addsToExample?: string;
  accountsFor?: string;
  /** which overlays of the subject's example scene this dive shows beside "what this adds" (front matter, else from a node linking here) */
  exampleScene?: { overlays?: string[]; caption?: string };
  html: string;
}

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

export interface SectionDef { id: string; title: string; kind: 'map' | 'dives' | 'md' | 'quiz' | 'board' | 'glossary' | 'figures'; html?: string }
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
  runningExample?: { title: string; summary: string; details?: string; /** which core example scene draws it (`cart`, `tine`) and the overlays of the small hero on the map page */ scene?: { id: string; overlays?: string[] } };
  board?: { pairs: string[] };
}

export interface AppContent {
  subject: Subject;
  maps: MapDef[];
  dives: Dive[];
  quiz: Question[];
  glossary: Term[];
  figures: FigureDef[];
  extra: Record<string, unknown>;
}
