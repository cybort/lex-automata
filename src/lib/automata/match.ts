import { eClosureTrace, move } from "./nfa";
import { cloneTags, EPS, type DFA, type NFA, type TagOp } from "./types";

export type Verdict = "run" | "accept" | "reject";

export type Capture = {
  id: number;
  slot: number;
  name: string;
  rule: number;
  start: number | null;
  end: number | null;
  text: string;
};

export type MatchFrame = {
  step: number;
  title: string;
  detail: string;
  active: number[];
  hot: { from: number; to: number; sym: string }[];
  index: number;
  verdict: Verdict;
  tags: number[];
};

export function simulateCaptures(nfa: NFA, symbols: string[]): Capture[][] {
  const groups = nfa.groups;
  const width = groups.length;
  if (!width) return Array.from({ length: symbols.length + 1 }, () => []);
  const blank = () => Array<number>(width * 2).fill(-1);
  const at = new Map(groups.map((g, i) => [g.id, i]));

  const apply = (reg: number[], ops: TagOp[] | undefined, index: number) => {
    if (!ops?.length) return reg;
    const next = reg.slice();
    for (const op of ops) {
      const i = at.get(op.id);
      if (i === undefined) continue;
      if (op.kind === "open") {
        next[2 * i] = index;
        next[2 * i + 1] = -1;
      } else next[2 * i + 1] = index;
    }
    return next;
  };

  const better = (a: number[], b: number[]) => {
    for (let i = 0; i < width; i++) {
      const as = a[2 * i];
      const bs = b[2 * i];
      if (as !== bs) {
        if (as < 0) return false;
        if (bs < 0) return true;
        return as < bs;
      }
      const ae = a[2 * i + 1];
      const be = b[2 * i + 1];
      if (ae !== be) {
        if (ae < 0) return false;
        if (be < 0) return true;
        return ae > be;
      }
    }
    return false;
  };

  const close = (seeds: { state: number; reg: number[] }[], index: number) => {
    const best = new Map<number, number[]>();
    const queue: number[] = [];
    const offer = (state: number, reg: number[]) => {
      const old = best.get(state);
      if (old && !better(reg, old)) return;
      best.set(state, reg);
      queue.push(state);
    };
    for (const seed of seeds) offer(seed.state, seed.reg);
    let qi = 0;
    let guard = 0;
    while (qi < queue.length && guard++ < 20000) {
      const state = queue[qi++];
      const reg = best.get(state);
      if (!reg) continue;
      for (const edge of nfa.adj[state] ?? []) {
        if (edge.sym !== EPS) continue;
        offer(edge.to, apply(reg, edge.ops, index));
      }
    }
    return best;
  };

  const project = (map: Map<number, number[]>, index: number): Capture[] =>
    groups.flatMap((group, i) => {
      const owned = [...map.entries()].filter(([state]) => (nfa.accept[state] ?? []).includes(group.rule));
      const pool = owned.length ? owned : [...map.entries()];
      let best: number[] | null = null;
      for (const [, reg] of pool) {
        if (!owned.length && reg[2 * i] < 0) continue;
        if (!best || better(reg, best)) best = reg;
      }
      if (!best || best[2 * i] < 0) return [];
      const start = best[2 * i];
      const end = best[2 * i + 1];
      const stop = end < 0 ? index : end;
      return [
        {
          id: group.id,
          slot: group.slot,
          name: group.name,
          rule: group.rule,
          start,
          end: end < 0 ? null : end,
          text: symbols.slice(start, Math.max(start, stop)).join(""),
        },
      ];
    });

  const shots: Capture[][] = [];
  let map = close([{ state: nfa.start, reg: blank() }], 0);
  shots.push(project(map, 0));
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    if (!nfa.alphabet.includes(sym)) {
      shots.push([]);
      break;
    }
    const seeds: { state: number; reg: number[] }[] = [];
    for (const [state, reg] of map) {
      for (const edge of nfa.adj[state] ?? []) {
        if (edge.sym === sym) seeds.push({ state: edge.to, reg });
      }
    }
    map = close(seeds, i + 1);
    shots.push(project(map, i + 1));
  }
  while (shots.length < symbols.length + 1) shots.push([]);
  return shots;
}

export type LazyWalk = { dfa: DFA; frames: MatchFrame[] };

function nameTags(tags: number[], names: string[]): string {
  return tags.length ? tags.map((id) => names[id] ?? String(id)).join("·") : "";
}

export function matchNfa(nfa: NFA, symbols: string[], names: string[]): MatchFrame[] {
  const frames: MatchFrame[] = [];
  const push = (partial: Omit<MatchFrame, "step">) => {
    frames.push({ ...partial, step: frames.length });
  };
  let cur = eClosureTrace(nfa, [nfa.start]);
  const tagsNow = () => {
    const set = new Set<number>();
    for (const s of cur.states) for (const t of nfa.accept[s] ?? []) set.add(t);
    return [...set].sort((a, b) => a - b);
  };
  push({
    title: "起点闭包",
    detail: `从 q${nfa.start} 沿 ε 走到 ${setText(cur.states)}。${
      cur.edges.length ? `用到 ${cur.edges.length} 条 ε 边。` : "没有额外的 ε。"
    }`,
    active: cur.states,
    hot: cur.edges,
    index: 0,
    verdict: "run",
    tags: tagsNow(),
  });

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    if (!nfa.alphabet.includes(sym)) {
      push({
        title: "字母表之外",
        detail: `「${shown(sym)}」不在字母表 {${nfa.alphabet.join(" ")}} 里，匹配失败。`,
        active: [],
        hot: [],
        index: i,
        verdict: "reject",
        tags: [],
      });
      return frames;
    }
    const mv = move(nfa, cur.states, sym);
    push({
      title: `读取「${shown(sym)}」`,
      detail: mv.states.length
        ? `活动集沿 ${shown(sym)} 到达 ${setText(mv.states)}。`
        : `没有任何活动状态读得出「${shown(sym)}」。`,
      active: mv.states,
      hot: mv.edges,
      index: i + 1,
      verdict: "run",
      tags: [],
    });
    const closed = eClosureTrace(nfa, mv.states);
    const grew = closed.states.join(",") !== mv.states.join(",");
    if (grew) {
      cur = closed;
      push({
        title: "ε-闭包",
        detail: `再沿 ε 补进状态，活动集成为 ${setText(cur.states)}。`,
        active: cur.states,
        hot: closed.edges,
        index: i + 1,
        verdict: "run",
        tags: tagsNow(),
      });
    } else {
      cur = closed;
      frames[frames.length - 1].tags = tagsNow();
    }
  }

  const tags = tagsNow();
  push({
    title: tags.length ? "接受" : "拒绝",
    detail: tags.length
      ? `整串读完，活动集里有接受态。命中规则 ${nameTags(tags, names)}。`
      : "整串读完，活动集里没有接受态。这条文本不属于任何规则。",
    active: cur.states,
    hot: [],
    index: symbols.length,
    verdict: tags.length ? "accept" : "reject",
    tags,
  });
  return frames;
}

export function matchDfa(dfa: DFA, symbols: string[], names: string[]): MatchFrame[] {
  const frames: MatchFrame[] = [];
  const push = (partial: Omit<MatchFrame, "step">) => frames.push({ ...partial, step: frames.length });
  let s = dfa.start;
  push({
    title: "起点",
    detail: `从 q${s} 开始${dfa.accept[s].length ? `，它已经接受 ${nameTags(dfa.accept[s], names)}` : ""}。`,
    active: [s],
    hot: [],
    index: 0,
    verdict: "run",
    tags: cloneTags(dfa.accept[s] ?? []),
  });
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const si = dfa.alphabet.indexOf(sym);
    if (si < 0) {
      push({
        title: "字母表之外",
        detail: `「${shown(sym)}」不在字母表 {${dfa.alphabet.join(" ")}} 里。`,
        active: [s],
        hot: [],
        index: i,
        verdict: "reject",
        tags: [],
      });
      return frames;
    }
    const nxt = dfa.delta[s][si];
    const dead = dfa.dead[nxt];
    push({
      title: `读取「${shown(sym)}」`,
      detail: `δ(q${s}, ${shown(sym)}) = q${nxt}${
        dead ? "。这是死状态，后面不可能再接受" : dfa.accept[nxt].length ? `，接受 ${nameTags(dfa.accept[nxt], names)}` : ""
      }。`,
      active: [nxt],
      hot: [{ from: s, to: nxt, sym }],
      index: i + 1,
      verdict: "run",
      tags: cloneTags(dfa.accept[nxt] ?? []),
    });
    s = nxt;
  }
  const tags = cloneTags(dfa.accept[s] ?? []);
  push({
    title: tags.length ? "接受" : "拒绝",
    detail: tags.length
      ? `停在 q${s}，命中 ${nameTags(tags, names)}。`
      : `停在 q${s}，它不接受任何规则。`,
    active: [s],
    hot: [],
    index: symbols.length,
    verdict: tags.length ? "accept" : "reject",
    tags,
  });
  return frames;
}

export function lazyWalk(nfa: NFA, symbols: string[], names: string[]): LazyWalk {
  const alpha = nfa.alphabet;
  const frames: MatchFrame[] = [];
  const subsets: number[][] = [];
  const idOf = new Map<string, number>();
  const accept: number[][] = [];
  const born: number[] = [];
  const delta: number[][] = [];
  const known: boolean[][] = [];

  const ensureRow = (id: number) => {
    if (!delta[id]) {
      delta[id] = Array(alpha.length).fill(-1);
      known[id] = Array(alpha.length).fill(false);
    }
  };

  const addSubset = (ss: number[], step: number) => {
    const k = ss.join(",");
    const hit = idOf.get(k);
    if (hit !== undefined) return { id: hit, created: false };
    const id = subsets.length;
    subsets.push(ss);
    idOf.set(k, id);
    const tags = new Set<number>();
    for (const s of ss) for (const t of nfa.accept[s] ?? []) tags.add(t);
    accept[id] = [...tags].sort((a, b) => a - b);
    born[id] = step;
    ensureRow(id);
    return { id, created: true };
  };

  const start = addSubset(eClosureTrace(nfa, [nfa.start]).states, 0);
  const push = (partial: Omit<MatchFrame, "step">) => frames.push({ ...partial, step: frames.length });
  const edgeRec: DFA["edges"] = [];
  let sid = start.id;
  push({
    title: "惰性起点",
    detail: `只物化起点子集 ${setText(subsets[0])}。其余转移先不算。`,
    active: [sid],
    hot: [],
    index: 0,
    verdict: "run",
    tags: cloneTags(accept[sid]),
  });

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const si = alpha.indexOf(sym);
    if (si < 0) {
      push({
        title: "字母表之外",
        detail: `「${shown(sym)}」不在字母表里，停止展开。`,
        active: [sid],
        hot: [],
        index: i,
        verdict: "reject",
        tags: [],
      });
      break;
    }
    const step = i + 1;
    let tid = known[sid][si] ? delta[sid][si] : -1;
    let created = false;
    if (!known[sid][si]) {
      const moved = move(nfa, subsets[sid], sym).states;
      const target = eClosureTrace(nfa, moved).states;
      const got = addSubset(target, step);
      tid = got.id;
      created = got.created;
      delta[sid][si] = tid;
      known[sid][si] = true;
      edgeRec.push({ from: sid, to: tid, sym, step });
    }
    push({
      title: created ? `新建 q${tid}` : `沿用 q${tid}`,
      detail: created
        ? `第一次请求 δ(q${sid}, ${shown(sym)})，子集 ${setText(subsets[tid])} 成为 q${tid}。`
        : `δ(q${sid}, ${shown(sym)}) 已经算过，直接走到 q${tid}。`,
      active: [tid],
      hot: [{ from: sid, to: tid, sym }],
      index: step,
      verdict: "run",
      tags: cloneTags(accept[tid] ?? []),
    });
    sid = tid;
  }

  const tags = cloneTags(accept[sid] ?? []);
  const stopped = frames[frames.length - 1]?.verdict === "reject";
  if (!stopped) {
    push({
      title: tags.length ? "接受" : "拒绝",
      detail: tags.length
        ? `文本走完。惰性 DFA 只生成了 ${subsets.length} 个状态，命中 ${nameTags(tags, names)}。`
        : `文本走完。惰性 DFA 共 ${subsets.length} 个状态，没有命中规则。`,
      active: [sid],
      hot: [],
      index: symbols.length,
      verdict: tags.length ? "accept" : "reject",
      tags,
    });
  }

  const dfa: DFA = {
    states: subsets.map((_, i) => i),
    start: 0,
    alphabet: alpha,
    delta: subsets.map((_, s) => delta[s] ?? Array(alpha.length).fill(-1)),
    accept,
    subsets,
    origins: null,
    labels: null,
    stateBorn: born,
    dead: subsets.map((ss) => ss.length === 0),
    edges: edgeRec,
  };
  return { dfa, frames };
}

export function witnesses(dfa: DFA, names: string[]): { label: string; symbols: string[]; kind: "accept" | "reject" }[] {
  const out: { label: string; symbols: string[]; kind: "accept" | "reject" }[] = [];
  const parent = new Map<number, { prev: number; sym: string } | null>();
  parent.set(dfa.start, null);
  const queue = [dfa.start];
  const wanted = new Set(names.map((_, i) => i));
  let reject: string[] | null = dfa.accept[dfa.start].length ? null : [];
  const wordOf = (state: number) => {
    const syms: string[] = [];
    let s = state;
    const guard = new Set<number>();
    while (parent.get(s)) {
      if (guard.has(s)) break;
      guard.add(s);
      const p = parent.get(s)!;
      syms.push(p.sym);
      s = p.prev;
    }
    return syms.reverse();
  };
  if (dfa.accept[dfa.start].length) {
    for (const id of dfa.accept[dfa.start]) {
      if (!wanted.has(id)) continue;
      wanted.delete(id);
      out.push({ label: names[id] ?? String(id), symbols: [], kind: "accept" });
    }
  }
  let qi = 0;
  while (qi < queue.length && queue.length < 400) {
    const s = queue[qi++];
    for (const sym of dfa.alphabet) {
      const si = dfa.alphabet.indexOf(sym);
      const t = dfa.delta[s][si];
      if (t < 0 || parent.has(t)) continue;
      parent.set(t, { prev: s, sym });
      queue.push(t);
      const w = wordOf(t);
      if (w.length > 12) continue;
      for (const id of dfa.accept[t] ?? []) {
        if (!wanted.has(id)) continue;
        wanted.delete(id);
        out.push({ label: names[id] ?? String(id), symbols: w, kind: "accept" });
      }
      if (!reject && !(dfa.accept[t] ?? []).length && w.length) reject = w;
    }
  }
  if (reject) out.push({ label: "拒绝", symbols: reject, kind: "reject" });
  return out;
}

function setText(ss: number[]): string {
  if (!ss.length) return "∅";
  const inner = ss.join(",");
  return inner.length > 36 ? `{${ss.length} 个状态}` : `{${inner}}`;
}

function shown(sym: string): string {
  if (sym === "\n") return "\\n";
  if (sym === "\t") return "\\t";
  if (sym === " ") return "␣";
  return sym;
}

export function textToSymbols(text: string): string[] {
  return [...text];
}
