import { determinize } from "./determinize";
import { computeDead } from "./nfa";
import {
  cloneTags,
  EPS,
  tagsKey,
  type BrzPhase,
  type BrzResult,
  type DFA,
  type NFA,
} from "./types";

function booleanize(dfa: DFA): DFA {
  return {
    ...dfa,
    accept: dfa.accept.map((t) => (t.length ? [0] : [])),
    origins: null,
    subsets: dfa.subsets,
  };
}

function reverseCore(dfa: DFA): { nfa: NFA; seeds: number[] } {
  const n = dfa.states.length;
  const trans = dfa.edges.map((e) => ({ from: e.to, to: e.from, sym: e.sym, step: 0 }));
  const accept: number[][] = Array.from({ length: n }, () => []);
  accept[dfa.start] = [0];
  const seeds: number[] = [];
  for (let s = 0; s < n; s++) if (dfa.accept[s].length) seeds.push(s);
  const adj: NFA["adj"] = Array.from({ length: n }, () => []);
  for (const t of trans) adj[t.from].push({ to: t.to, sym: t.sym });
  return {
    seeds,
    nfa: {
      states: Array.from({ length: n }, (_, i) => i),
      start: dfa.start,
      accept,
      trans,
      adj,
      stateStep: Array(n).fill(0),
      tagStep: Array(n).fill(0),
      alphabet: dfa.alphabet,
      symAlias: dfa.symAlias,
      steps: [],
      groups: [],
    },
  };
}

function reversePicture(dfa: DFA): NFA {
  const n = dfa.states.length;
  const trans = dfa.edges.map((e) => ({ from: e.to, to: e.from, sym: e.sym, step: 0 }));
  const start = n;
  for (let s = 0; s < n; s++) {
    if (dfa.accept[s].length) trans.push({ from: start, to: s, sym: EPS, step: 0 });
  }
  const accept: number[][] = Array.from({ length: n + 1 }, () => []);
  accept[dfa.start] = [0];
  const stateStep = Array(n + 1).fill(0);
  const tagStep = Array(n + 1).fill(Number.POSITIVE_INFINITY);
  tagStep[dfa.start] = 0;
  const adj: NFA["adj"] = Array.from({ length: n + 1 }, () => []);
  for (const t of trans) adj[t.from].push({ to: t.to, sym: t.sym });
  return {
    states: Array.from({ length: n + 1 }, (_, i) => i),
    start,
    accept,
    trans,
    adj,
    stateStep,
    tagStep,
    alphabet: dfa.alphabet,
    symAlias: dfa.symAlias,
    steps: [
      {
        step: 0,
        title: "反转",
        detail: "边反向。图上的新起点只是把多个旧接受态收成一个入口；真正确定化时从这些接受态本身出发，不把辅助点算进子集。",
      },
    ],
    groups: [],
  };
}

function signatures(dfa: DFA): number[][] {
  const seen = new Set<string>();
  const out: number[][] = [];
  for (const tags of dfa.accept) {
    if (!tags.length) continue;
    const k = tagsKey(tags);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(cloneTags(tags));
  }
  return out;
}

function augment(
  dfa: DFA,
  sigs: number[][],
  names: string[],
): { dfa: DFA; probes: { sym: string; tags: number[] }[] } {
  const probes = sigs.map((tags, i) => ({
    sym: `\u0001${i}`,
    tags,
    label: `↵${tags.map((id) => names[id] ?? id).join("·")}`,
  }));
  const alphabet = [...dfa.alphabet, ...probes.map((p) => p.sym)];
  const n = dfa.states.length;
  const sinkA = n;
  const sinkD = n + 1;
  const count = n + 2;
  const delta = Array.from({ length: count }, () => Array(alphabet.length).fill(sinkD));
  const idx = new Map(alphabet.map((s, i) => [s, i]));
  for (const e of dfa.edges) delta[e.from][idx.get(e.sym)!] = e.to;
  const sigOf = dfa.accept.map((t) => tagsKey(t));
  for (let q = 0; q < n; q++) {
    for (const p of probes) {
      const si = idx.get(p.sym)!;
      delta[q][si] = tagsKey(p.tags) === sigOf[q] ? sinkA : sinkD;
    }
  }
  const accept: number[][] = Array.from({ length: count }, () => []);
  accept[sinkA] = [0];
  const edges: DFA["edges"] = [];
  for (let s = 0; s < count; s++) {
    for (let si = 0; si < alphabet.length; si++) {
      edges.push({ from: s, to: delta[s][si], sym: alphabet[si], step: 0 });
    }
  }
  const labels = Array.from({ length: count }, (_, i) =>
    i === sinkA ? "汇" : i === sinkD ? "沉" : `q${i}`,
  );
  return {
    probes,
    dfa: {
      states: Array.from({ length: count }, (_, i) => i),
      start: dfa.start,
      alphabet,
      delta,
      accept,
      subsets: null,
      origins: null,
      labels,
      stateBorn: Array(count).fill(0),
      dead: computeDead(accept, delta),
      edges,
      symAlias: Object.fromEntries(probes.map((p) => [p.sym, p.label])),
    },
  };
}

function retag(dfa: DFA, tags: number[]): DFA {
  return {
    ...dfa,
    accept: dfa.accept.map((t) => (t.length ? cloneTags(tags) : [])),
  };
}

function project(min: DFA, alphabet: string[], probes: { sym: string; tags: number[] }[]): DFA {
  const seen = new Set<number>([min.start]);
  const queue = [min.start];
  const reach: number[] = [];
  while (queue.length) {
    const s = queue.shift()!;
    reach.push(s);
    for (const sym of alphabet) {
      const si = min.alphabet.indexOf(sym);
      if (si < 0) continue;
      const t = min.delta[s][si];
      if (t >= 0 && !seen.has(t)) {
        seen.add(t);
        queue.push(t);
      }
    }
  }
  const map = new Map(reach.map((s, i) => [s, i]));
  const m = reach.length;
  const delta = Array.from({ length: m }, () => Array(alphabet.length).fill(0));
  const accept: number[][] = [];
  const edges: DFA["edges"] = [];
  reach.forEach((s, id) => {
    let tags: number[] = [];
    for (const p of probes) {
      const si = min.alphabet.indexOf(p.sym);
      if (si < 0) continue;
      const t = min.delta[s][si];
      if (t >= 0 && min.accept[t].length) tags = cloneTags(p.tags);
    }
    accept.push(tags);
    alphabet.forEach((sym, si) => {
      const src = min.alphabet.indexOf(sym);
      const to = map.get(min.delta[s][src])!;
      delta[id][si] = to;
      edges.push({ from: id, to, sym, step: 0 });
    });
  });
  return {
    states: Array.from({ length: m }, (_, i) => i),
    start: 0,
    alphabet,
    delta,
    accept,
    subsets: null,
    origins: null,
    labels: null,
    stateBorn: Array(m).fill(0),
    dead: computeDead(accept, delta),
    edges,
  };
}

function renameReachable(dfa: DFA): DFA {
  const seen = new Set<number>();
  const order: number[] = [];
  const queue = [dfa.start];
  seen.add(dfa.start);
  while (queue.length) {
    const s = queue.shift()!;
    order.push(s);
    for (let si = 0; si < dfa.alphabet.length; si++) {
      const t = dfa.delta[s][si];
      if (t >= 0 && !seen.has(t)) {
        seen.add(t);
        queue.push(t);
      }
    }
  }
  const map = new Map(order.map((s, i) => [s, i]));
  const m = order.length;
  const A = dfa.alphabet.length;
  const delta = Array.from({ length: m }, () => Array(A).fill(0));
  const edges: DFA["edges"] = [];
  order.forEach((s, id) => {
    for (let si = 0; si < A; si++) {
      const to = map.get(dfa.delta[s][si])!;
      delta[id][si] = to;
      edges.push({ from: id, to, sym: dfa.alphabet[si], step: dfa.edges.find((e) => e.from === s && e.sym === dfa.alphabet[si])?.step ?? 0 });
    }
  });
  return {
    states: Array.from({ length: m }, (_, i) => i),
    start: 0,
    alphabet: dfa.alphabet,
    delta,
    accept: order.map((s) => cloneTags(dfa.accept[s])),
    subsets: dfa.subsets ? order.map((s) => dfa.subsets![s]) : null,
    origins: dfa.origins ? order.map((s) => dfa.origins![s]) : null,
    labels: dfa.labels ? order.map((s) => dfa.labels![s]) : null,
    stateBorn: order.map((s) => dfa.stateBorn[s] ?? 0),
    dead: [],
    edges,
    symAlias: dfa.symAlias,
  };
}

export function brzozowski(input: DFA, names: string[]): BrzResult {
  const sigs = signatures(input);
  const multi = sigs.length > 1;
  const phases: BrzPhase[] = [];
  let current = booleanize(input);
  let probes: { sym: string; tags: number[] }[] = [];

  if (multi) {
    const aug = augment(input, sigs, names);
    probes = aug.probes;
    current = aug.dfa;
    const probeText = probes
      .map((p) => `↵${p.tags.map((id) => names[id] ?? id).join("·")}`)
      .join("、");
    phases.push({
      id: "aug",
      title: "标签探针",
      detail: `不同规则标签不能在反转时被 ε 糊成一种接受。给每种标签一条探针 ${probeText}，指向接受汇；其余符号进死汇。最小化这段增广语言，标签就写在探针上。`,
      kind: "dfa",
      dfa: current,
    });
  } else {
    phases.push({
      id: "src",
      title: "待最小化的 DFA",
      detail: "Brzozowski：最小 DFA = 确定化(反转(确定化(反转(DFA))))。反转把接受态和起点对调，两次之后只留下不可区分的状态。",
      kind: "dfa",
      dfa: input,
    });
  }

  const shown = reversePicture(current);
  const core = reverseCore(current);
  phases.push({
    id: "rev1",
    title: "第一次反转",
    detail: `箭头掉头。原接受态改由辅助起点 q${shown.start} 经 ε 进入，原起点 q${current.start} 是唯一接受态。接下来的子集构造从旧接受态出发，辅助点不进子集，否则会凭空拆出等价状态。`,
    kind: "nfa",
    nfa: shown,
  });

  const det1 = determinize(core.nfa, "bfs", ["接受"], core.seeds);
  const dfa1 = renameReachable(det1.dfa);
  dfa1.dead = computeDead(dfa1.accept, dfa1.delta);
  phases.push({
    id: "det1",
    title: "第一次确定化",
    detail: "对反转后的 NFA 做子集构造，得到反语言的 DFA。可以逐条请求看子集怎么长出来。",
    kind: "dfa",
    dfa: dfa1,
    log: det1.log,
  });

  const shown2 = reversePicture(dfa1);
  const core2 = reverseCore(dfa1);
  phases.push({
    id: "rev2",
    title: "第二次反转",
    detail: "再反转一次。这一步之后的语言回到原来的方向，确定化会直接得到最小 DFA。",
    kind: "nfa",
    nfa: shown2,
  });

  const det2 = determinize(core2.nfa, "bfs", ["接受"], core2.seeds);
  let min = renameReachable(det2.dfa);
  min.dead = computeDead(min.accept, min.delta);
  phases.push({
    id: "det2",
    title: "第二次确定化",
    detail: "再做一次子集构造。对单一语言，这一步的结果就是最小完全 DFA。",
    kind: "dfa",
    dfa: min,
    log: det2.log,
  });

  if (multi) {
    min = project(min, input.alphabet, probes);
    phases.push({
      id: "proj",
      title: "收回探针",
      detail: "删掉探针符号和两个汇。一个状态读哪条探针能到接受汇，就标上对应规则。得到的是带标签的最小 DFA。",
      kind: "dfa",
      dfa: min,
    });
  } else if (sigs.length === 1) {
    min = retag(min, sigs[0]);
    min.dead = computeDead(min.accept, min.delta);
    phases.push({
      id: "min",
      title: "最小 DFA",
      detail: `接受态统一标回「${sigs[0].map((id) => names[id] ?? id).join("·")}」。状态数 ${min.states.length}（含死状态，若有）。`,
      kind: "dfa",
      dfa: min,
    });
  } else {
    min = retag(min, []);
    phases.push({
      id: "min",
      title: "最小 DFA",
      detail: "这台机器什么都不接受。",
      kind: "dfa",
      dfa: min,
    });
  }

  return { dfa: min, phases };
}
