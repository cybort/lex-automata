export const EPS = "ε";

export type Ast =
  | { k: "eps" }
  | { k: "sym"; sym: string }
  | { k: "any" }
  | { k: "class"; syms: string[]; neg: boolean }
  | { k: "concat"; xs: Ast[] }
  | { k: "alt"; xs: Ast[] }
  | { k: "star"; x: Ast }
  | { k: "plus"; x: Ast }
  | { k: "opt"; x: Ast }
  | { k: "cap"; slot: number; name: string; id: number; x: Ast };

export type Note = { step: number; title: string; detail: string };

export type TagOp = { id: number; kind: "open" | "close" };

export type Trans = { from: number; to: number; sym: string; step: number; ops?: TagOp[] };

export type NFA = {
  states: number[];
  start: number;
  accept: number[][];
  trans: Trans[];
  adj: { to: number; sym: string; ops?: TagOp[] }[][];
  stateStep: number[];
  tagStep: number[];
  alphabet: string[];
  symAlias?: Record<string, string>;
  steps: Note[];
  groups: Group[];
};

export type DFA = {
  states: number[];
  start: number;
  alphabet: string[];
  delta: number[][];
  accept: number[][];
  subsets: number[][] | null;
  origins: number[][] | null;
  labels: string[] | null;
  stateBorn: number[];
  dead: boolean[];
  edges: { from: number; to: number; sym: string; step: number }[];
  symAlias?: Record<string, string>;
};

export type Group = { id: number; slot: number; name: string; rule: number };

export type Pattern = {
  id: number;
  name: string;
  source: string;
  ast: Ast;
  line: number;
  groups: Group[];
};

export type DetResult = { dfa: DFA; log: Note[] };

export type HopFrame = {
  step: number;
  title: string;
  detail: string;
  blocks: number[][];
  work: string[];
  result: boolean;
};

export type HopResult = { dfa: DFA; frames: HopFrame[] };

export type BrzPhase = {
  id: string;
  title: string;
  detail: string;
  kind: "nfa" | "dfa";
  nfa?: NFA;
  dfa?: DFA;
  log?: Note[];
};

export type BrzResult = { dfa: DFA; phases: BrzPhase[] };

export function tagsKey(tags: number[]): string {
  return tags.join(",");
}

export function cloneTags(tags: number[]): number[] {
  return [...tags].sort((a, b) => a - b);
}
