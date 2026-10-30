import { EPS, type DFA, type NFA, type Trans } from "./types";

export function eClosure(nfa: NFA, seeds: number[]): number[] {
  const seen = new Set<number>();
  const stack: number[] = [];
  for (const s of seeds) {
    if (s >= 0 && !seen.has(s)) {
      seen.add(s);
      stack.push(s);
    }
  }
  const used: Trans[] = [];
  while (stack.length) {
    const s = stack.pop()!;
    for (const e of nfa.adj[s] ?? []) {
      if (e.sym === EPS && !seen.has(e.to)) {
        seen.add(e.to);
        stack.push(e.to);
        used.push({ from: s, to: e.to, sym: EPS, step: 0 });
      }
    }
  }
  return [...seen].sort((a, b) => a - b);
}

export function eClosureTrace(nfa: NFA, seeds: number[]): { states: number[]; edges: Trans[] } {
  const seen = new Set<number>();
  const stack: number[] = [];
  for (const s of seeds) {
    if (!seen.has(s)) {
      seen.add(s);
      stack.push(s);
    }
  }
  const edges: Trans[] = [];
  while (stack.length) {
    const s = stack.pop()!;
    for (const e of nfa.adj[s] ?? []) {
      if (e.sym === EPS && !seen.has(e.to)) {
        seen.add(e.to);
        stack.push(e.to);
        edges.push({ from: s, to: e.to, sym: EPS, step: 0 });
      }
    }
  }
  return { states: [...seen].sort((a, b) => a - b), edges };
}

export function move(nfa: NFA, states: number[], sym: string): { states: number[]; edges: Trans[] } {
  const want = new Set(states);
  const out = new Set<number>();
  const edges: Trans[] = [];
  for (const s of want) {
    for (const e of nfa.adj[s] ?? []) {
      if (e.sym === sym) {
        out.add(e.to);
        edges.push({ from: s, to: e.to, sym, step: 0 });
      }
    }
  }
  return { states: [...out].sort((a, b) => a - b), edges };
}

export function nfaTags(nfa: NFA, symbols: string[]): number[] {
  let cur = eClosure(nfa, [nfa.start]);
  for (const sym of symbols) {
    cur = eClosure(nfa, move(nfa, cur, sym).states);
  }
  const tags = new Set<number>();
  for (const s of cur) for (const t of nfa.accept[s] ?? []) tags.add(t);
  return [...tags].sort((a, b) => a - b);
}

export function dfaTags(dfa: DFA, symbols: string[]): number[] {
  let s = dfa.start;
  for (const sym of symbols) {
    const i = dfa.alphabet.indexOf(sym);
    if (i < 0) return [];
    const nxt = dfa.delta[s]?.[i];
    if (nxt === undefined || nxt < 0) return [];
    s = nxt;
  }
  return [...(dfa.accept[s] ?? [])].sort((a, b) => a - b);
}

export function indexAdj(stateCount: number, trans: Trans[]): NFA["adj"] {
  const adj: NFA["adj"] = Array.from({ length: stateCount }, () => []);
  for (const t of trans) adj[t.from].push(t.ops?.length ? { to: t.to, sym: t.sym, ops: t.ops } : { to: t.to, sym: t.sym });
  return adj;
}

export function wireNfa(partial: Omit<NFA, "adj" | "states"> & { stateCount: number }): NFA {
  const states = Array.from({ length: partial.stateCount }, (_, i) => i);
  return {
    states,
    start: partial.start,
    accept: partial.accept,
    trans: partial.trans,
    adj: indexAdj(partial.stateCount, partial.trans),
    stateStep: partial.stateStep,
    tagStep: partial.tagStep,
    alphabet: partial.alphabet,
    steps: partial.steps,
    groups: partial.groups,
  };
}

export function computeDead(accept: number[][], delta: number[][]): boolean[] {
  const n = accept.length;
  const can = accept.map((a) => a.length > 0);
  const rev: number[][] = Array.from({ length: n }, () => []);
  for (let s = 0; s < n; s++) {
    for (const t of delta[s] ?? []) {
      if (t >= 0 && t < n) rev[t].push(s);
    }
  }
  const stack: number[] = [];
  for (let i = 0; i < n; i++) if (can[i]) stack.push(i);
  while (stack.length) {
    const u = stack.pop()!;
    for (const v of rev[u]) {
      if (!can[v]) {
        can[v] = true;
        stack.push(v);
      }
    }
  }
  return can.map((c) => !c);
}
