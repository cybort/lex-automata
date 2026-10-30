import { computeDead, eClosure, move } from "./nfa";
import { cloneTags, type DFA, type DetResult, type NFA, type Note } from "./types";

const STATE_CAP = 160;

function brief(ss: number[]): string {
  if (!ss.length) return "∅";
  const inner = ss.join(",");
  return inner.length > 28 ? `{${ss.length} 个 NFA 状态}` : `{${inner}}`;
}

function tagsOf(nfa: NFA, subset: number[]): number[] {
  const set = new Set<number>();
  for (const s of subset) for (const t of nfa.accept[s] ?? []) set.add(t);
  return [...set].sort((a, b) => a - b);
}

export function determinize(
  nfa: NFA,
  order: "bfs" | "dfs",
  names: string[],
  seeds?: number[],
): DetResult {
  const alpha = nfa.alphabet;
  const startSet = eClosure(nfa, seeds ?? [nfa.start]);
  const subsets: number[][] = [startSet];
  const keyOf = (ss: number[]) => ss.join(",");
  const idOf = new Map<string, number>([[keyOf(startSet), 0]]);
  const accept: number[][] = [tagsOf(nfa, startSet)];
  const born: number[] = [0];
  const delta: number[][] = [Array(alpha.length).fill(-1)];
  const edgeStep: number[][] = [Array(alpha.length).fill(0)];
  const log: Note[] = [
    {
      step: 0,
      title: "起始子集",
      detail: seeds
        ? `反转不引入会污染子集的辅助点。初始集合取旧接受态 ${brief(seeds)}，ε-闭包为 ${brief(startSet)}，记作 q0${
            accept[0].length ? `，接受 ${accept[0].map((id) => names[id] ?? id).join("·")}` : ""
          }。`
        : `从 NFA 起点 q${nfa.start} 取 ε-闭包，得到 ${brief(startSet)}，记作 DFA 的 q0${
            accept[0].length ? `，接受 ${accept[0].map((id) => names[id] ?? id).join("·")}` : ""
          }。`,
    },
  ];
  let step = 0;
  const nextSym = [0];

  const explore = (sid: number, si: number) => {
    const sym = alpha[si];
    const moved = move(nfa, subsets[sid], sym).states;
    const target = eClosure(nfa, moved);
    const k = keyOf(target);
    let tid = idOf.get(k);
    let created = false;
    if (tid === undefined) {
      if (subsets.length + 1 > STATE_CAP) {
        throw new Error(`子集构造超过 ${STATE_CAP} 个 DFA 状态。字母表或表达式太大`);
      }
      tid = subsets.length;
      subsets.push(target);
      idOf.set(k, tid);
      accept.push(tagsOf(nfa, target));
      delta.push(Array(alpha.length).fill(-1));
      edgeStep.push(Array(alpha.length).fill(0));
      nextSym[tid] = 0;
      created = true;
    }
    step += 1;
    if (created) born[tid] = step;
    delta[sid][si] = tid;
    edgeStep[sid][si] = step;
    const tag = accept[tid].length
      ? `，接受 ${accept[tid].map((id) => names[id] ?? id).join("·")}`
      : "";
    log.push({
      step,
      title: created ? `新状态 q${tid}` : `回到 q${tid}`,
      detail: `请求 δ(q${sid}, ${sym})。move 得到 ${brief(moved)}，再取 ε-闭包为 ${brief(target)}${
        created ? "。这个子集第一次出现，分配新状态" : "。子集已经存在，复用旧状态"
      }${tag}。`,
    });
    return created ? tid : -1;
  };

  if (order === "bfs") {
    const queue = [0];
    let qi = 0;
    while (qi < queue.length) {
      const sid = queue[qi++];
      for (let si = 0; si < alpha.length; si++) {
        const created = explore(sid, si);
        if (created >= 0) queue.push(created);
      }
    }
  } else {
    const stack = [0];
    while (stack.length) {
      const sid = stack[stack.length - 1];
      const si = nextSym[sid] ?? 0;
      if (si >= alpha.length) {
        stack.pop();
        continue;
      }
      nextSym[sid] = si + 1;
      const created = explore(sid, si);
      if (created >= 0) stack.push(created);
    }
  }

  const n = subsets.length;
  const edges: DFA["edges"] = [];
  for (let s = 0; s < n; s++) {
    for (let si = 0; si < alpha.length; si++) {
      const t = delta[s][si];
      if (t >= 0) edges.push({ from: s, to: t, sym: alpha[si], step: edgeStep[s][si] });
    }
  }
  const dfa: DFA = {
    states: Array.from({ length: n }, (_, i) => i),
    start: 0,
    alphabet: alpha,
    delta,
    accept: accept.map(cloneTags),
    subsets,
    origins: null,
    labels: null,
    stateBorn: born,
    dead: computeDead(accept, delta),
    edges,
    symAlias: nfa.symAlias,
  };
  return { dfa, log };
}
