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
  /** ids of the running examples (runningExample.refs) this box uses: opt-in; when any box has it the map marks those boxes
   *  with the example's glyph, and hovering / opening the Example node lights them */
  examples?: string[];
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
export interface NodePop { rough: string; eqKey?: string; figures?: QuizFigureRef[]; /** HTML caption for the figure strip: what each panel shows and what it demonstrates (label panels (a), (b)… via each figure's caption) */ figCaption?: string; /** opt-in sound examples (ids registered with the app's `audio` hook; see audio.ts) */ audio?: string[]; example?: string; next?: string; ask?: string }

export interface MapEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** draw the arrowhead at the `from` end */
  reverse?: boolean;
  /** a side path (a shortcut) out of a fork: listed after the main path, styled and labelled as a side path, and never part of the main chain */
  side?: boolean;
  /** display order among a box's next questions (lower first; unset = 0); the layout ignores it */
  rank?: number;
  /** the follow-up question this line asks (the next box answers it) (rendered HTML) */
  question: string;
  /** the idea behind the link (rendered HTML) */
  idea: string;
  /** why you would ask this question at this point (rendered HTML, may be several paragraphs): what the previous box left unanswered, why that gap matters, and what kind of answer we are looking for */
  why?: string;
  /** optional figures for the why text (reuse quiz-figure renderers), with one caption saying what they show and demonstrate */
  whyFigures?: QuizFigureRef[];
  whyFigCaption?: string;
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
  /** practice sets that belong to no box (never in a box or subtree quiz); questions carry the tag, cards show the label */
  quizSets?: { tag: string; label: string }[];
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
  runningExample?: { title: string; summary: string; details?: string; /** which core example scene draws it (`cart`, `tine`) and the overlays of the small hero on the map page */ scene?: SceneRef; /** further scenes (more than one running example): the map hero switches between them, dives pick one with exampleScene.scene */ moreScenes?: SceneRef[]; /** Example nodes on the map: each beside its host box, opening the example's introduction; never part of the Next/Back chain */ refs?: ExampleRef[] };
  /** box id → the glossary section the Variables drawer opens at (boxes without one inherit their nearest main-path ancestor's) */
  glossaryTopics?: Record<string, string>;
  board?: { pairs: string[] };
  /** `chain`: the unfiltered, unshuffled quiz runs in map order (questions tagged to box 1 first, each box's own quick check leading), so it opens on an easy foundational question */
  quizOrder?: 'authored' | 'chain';
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
/** An Example node on the map (runningExample.refs): one running example as its own dashed node beside its host box (a dotted link joins
 *  them); its pop-up is the example's introduction. Never part of the Next/Back chain or the step count. */
export interface ExampleRef {
  id: string;
  /** the host box (node id); the node shows on every map that has this box */
  at: string;
  /** what the node says after "Example:" (e.g. "the earbud speaker") */
  label: string;
  /** the card's heading */
  title: string;
  /** a live core scene (one of scenedefs) ... */
  scene?: SceneRef;
  /** ... or a live figure from figures.yaml (with its play control), optionally on one preset */
  figure?: string;
  preset?: string;
  /** a figure's panels to show (the animated picture); the introduction never shows the figure's controls or "Look for" */
  panels?: string[];
  /** the caption under a figure (a scene brings its own) */
  caption?: string;
  /** the restated question at the top of its pop-up (default "What's the running example?") */
  question?: string;
  /** "What it is and why we use it": a few bullets (markdown; HTML after the build) */
  about: string;
  /** key numbers: ONLY those the path has introduced by the host box (no circularity; markdown, HTML after the build) */
  numbers: string;
}
/** A subject-level scene reference (runningExample.scene / moreScenes). */
export interface SceneRef { id: string; title?: string; overlays?: string[]; params?: Record<string, number>; caption?: string; diagram?: DiagramSpec | string | string[] }
