import { compactSyms } from "./parse";
import { EPS, type DFA, type Group, type NFA, type TagOp } from "./types";

export type ViewNode = {
  id: number;
  name: string;
  sub: string;
  tip: string;
  accept: boolean;
  dead: boolean;
  on: boolean;
  hot: boolean;
  block: number | null;
};

export type ViewEdge = {
  key: string;
  from: number;
  to: number;
  label: string;
  eps: boolean;
  on: boolean;
  hot: boolean;
};

export type ViewModel = {
  nodes: ViewNode[];
  edges: ViewEdge[];
  start: number;
};

function briefIds(ids: number[]): string {
  if (!ids.length) return "∅";
  const inner = ids.join(",");
  return inner.length > 18 ? `${ids.length} 个` : inner;
}

function aliasOf(nfa: NFA, sym: string): string {
  return nfa.symAlias?.[sym] ?? aliasSym(sym);
}

function aliasSym(sym: string, alias?: (s: string) => string): string {
  if (alias) return alias(sym);
  if (sym === "\n") return "\\n";
  if (sym === "\t") return "\\t";
  if (sym === " ") return "␣";
  return sym;
}

export function viewNfa(
  nfa: NFA,
  opt: {
    step: number | null;
    names: string[];
    hot: number[];
    hotEdges: { from: number; to: number; sym: string }[];
    blocks?: number[][];
  },
): ViewModel {
  const show = (born: number) => opt.step === null || born <= opt.step;
  const hot = new Set(opt.hot);
  const hotEdge = new Set(opt.hotEdges.map((e) => `${e.from}|${e.sym}|${e.to}`));
  const blockOf = new Map<number, number>();
  opt.blocks?.forEach((b, i) => b.forEach((id) => blockOf.set(id, i)));
  const nodes: ViewNode[] = nfa.states.map((id) => {
    const tags = nfa.accept[id] ?? [];
    const tagOn = show(nfa.tagStep[id] ?? Number.POSITIVE_INFINITY);
    const names = tagOn ? tags.map((t) => opt.names[t] ?? String(t)) : [];
    return {
      id,
      name: `q${id}`,
      sub: names.join("·"),
      tip: names.length ? `接受 ${names.join("·")}` : `q${id}`,
      accept: names.length > 0,
      dead: false,
      on: show(nfa.stateStep[id] ?? 0),
      hot: hot.has(id),
      block: blockOf.get(id) ?? null,
    };
  });
  const buckets = new Map<string, { from: number; to: number; eps: boolean; syms: string[]; mark: string; on: boolean; hot: boolean }>();
  for (const e of nfa.trans) {
    const eps = e.sym === EPS;
    const mark = eps ? tagMark(e.ops, nfa.groups) : "";
    const key = `${e.from}>${e.to}>${eps ? "e" : "s"}>${mark}`;
    const on = show(e.step) && show(nfa.stateStep[e.from] ?? 0) && show(nfa.stateStep[e.to] ?? 0);
    let b = buckets.get(key);
    if (!b) {
      b = { from: e.from, to: e.to, eps, syms: [], mark, on: false, hot: false };
      buckets.set(key, b);
    }
    if (on) {
      b.on = true;
      if (!eps) b.syms.push(aliasOf(nfa, e.sym));
    }
    if (hotEdge.has(`${e.from}|${e.sym}|${e.to}`)) b.hot = true;
  }
  const edges: ViewEdge[] = [...buckets.values()].map((b) => ({
    key: `${b.from}-${b.to}-${b.eps ? "e" : b.syms.join("")}-${b.mark}`,
    from: b.from,
    to: b.to,
    label: b.eps ? (b.mark ? `ε ${b.mark}` : "ε") : labelSyms(b.syms),
    eps: b.eps,
    on: b.on,
    hot: b.hot && b.on,
  }));
  return { nodes, edges, start: nfa.start };
}

export function viewDfa(
  dfa: DFA,
  opt: {
    step: number | null;
    names: string[];
    hot: number[];
    hotEdges: { from: number; to: number; sym: string }[];
    blocks?: number[][];
    alias?: (s: string) => string;
    showDead: boolean;
  },
): ViewModel {
  const show = (born: number) => opt.step === null || born <= opt.step;
  const hot = new Set(opt.hot);
  const hotEdge = new Set(opt.hotEdges.map((e) => `${e.from}|${e.sym}|${e.to}`));
  const blockOf = new Map<number, number>();
  opt.blocks?.forEach((b, i) => b.forEach((id) => blockOf.set(id, i)));
  const nodes: ViewNode[] = dfa.states.map((id) => {
    const tags = (dfa.accept[id] ?? []).map((t) => opt.names[t] ?? String(t));
    const origin = dfa.origins?.[id];
    const subset = dfa.subsets?.[id];
    const sub = origin ? `⟨${briefIds(origin)}⟩` : subset ? `{${briefIds(subset)}}` : "";
    const dead = dfa.dead[id] ?? false;
    const on = show(dfa.stateBorn[id] ?? 0) && (opt.showDead || !dead);
    return {
      id,
      name: dfa.labels?.[id] ?? `q${id}`,
      sub: tags.length ? tags.join("·") : sub,
      tip: [
        dfa.labels?.[id] ?? `q${id}`,
        subset ? `子集 {${subset.join(",") || "∅"}}` : "",
        origin ? `合并自 {${origin.join(",")}}` : "",
        tags.length ? `接受 ${tags.join("·")}` : "",
        dead ? "死状态" : "",
      ]
        .filter(Boolean)
        .join(" · "),
      accept: (dfa.accept[id] ?? []).length > 0,
      dead,
      on,
      hot: hot.has(id),
      block: blockOf.get(id) ?? null,
    };
  });
  const onNode = new Map(nodes.map((n) => [n.id, n.on]));
  const buckets = new Map<string, { from: number; to: number; syms: string[]; on: boolean; hot: boolean }>();
  for (const e of dfa.edges) {
    const key = `${e.from}>${e.to}`;
    let b = buckets.get(key);
    if (!b) {
      b = { from: e.from, to: e.to, syms: [], on: false, hot: false };
      buckets.set(key, b);
    }
    const born = e.step;
    const visible = show(born) && onNode.get(e.from) && onNode.get(e.to);
    if (visible) {
      b.on = true;
      b.syms.push(dfa.symAlias?.[e.sym] ?? aliasSym(e.sym, opt.alias));
    }
    if (hotEdge.has(`${e.from}|${e.sym}|${e.to}`)) b.hot = true;
  }
  const edges: ViewEdge[] = [...buckets.values()].map((b) => ({
    key: `${b.from}-${b.to}-${b.syms.join("")}`,
    from: b.from,
    to: b.to,
    label: labelSyms(b.syms),
    eps: false,
    on: b.on,
    hot: b.hot && b.on,
  }));
  return { nodes, edges, start: dfa.start };
}

function tagMark(ops: TagOp[] | undefined, groups: Group[]): string {
  if (!ops?.length) return "";
  return ops
    .map((op) => {
      const g = groups.find((item) => item.id === op.id);
      return (op.kind === "open" ? "开" : "闭") + (g?.name ?? String(op.id));
    })
    .join(" ");
}

function labelSyms(syms: string[]): string {
  if (!syms.length) return "";
  if (syms.some((s) => [...s].length !== 1 || s === "ε")) return syms.join(",");
  return compactSyms(syms).replace(/–/g, "–");
}
