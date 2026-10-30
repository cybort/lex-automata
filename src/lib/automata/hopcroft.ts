import { computeDead } from "./nfa";
import { cloneTags, tagsKey, type DFA, type HopFrame, type HopResult } from "./types";

export function hopcroft(dfa: DFA, names: string[]): HopResult {
  const n = dfa.states.length;
  const alpha = dfa.alphabet;
  const sig = dfa.accept.map((t) => tagsKey(t));
  const grouped = new Map<string, number[]>();
  for (let s = 0; s < n; s++) {
    const k = sig[s];
    const g = grouped.get(k);
    if (g) g.push(s);
    else grouped.set(k, [s]);
  }
  const P = new Map<string, number[]>();
  for (const g of grouped.values()) {
    g.sort((a, b) => a - b);
    P.set(g.join(","), g);
  }

  const label = (block: number[]) => `{${block.join(",")}}`;
  const snap = () => [...P.values()].map((b) => [...b]);
  const workNames = () => [...P.keys()].filter((k) => W.has(k)).map((k) => label(P.get(k)!));

  let W = new Set<string>(P.keys());
  const frames: HopFrame[] = [
    {
      step: 0,
      title: "初始划分",
      detail: `按接受标签分组，而不是只分成接受 / 非接受。当前 ${P.size} 块，工作表放入全部分组。标签不同的状态永远不会被并到一起。`,
      blocks: snap(),
      work: workNames(),
      result: false,
    },
  ];

  let guard = 0;
  while (W.size) {
    if (++guard > 8000) throw new Error("Hopcroft 细化步数过多");
    const Akey = W.values().next().value as string;
    W.delete(Akey);
    const A = P.get(Akey);
    if (!A) continue;
    const Aset = new Set(A);
    for (let si = 0; si < alpha.length; si++) {
      const Xset = new Set<number>();
      for (let q = 0; q < n; q++) if (Aset.has(dfa.delta[q][si])) Xset.add(q);
      if (!Xset.size) continue;
      const snapshot = [...P.entries()];
      for (const [yk, Y] of snapshot) {
        const y1: number[] = [];
        const y2: number[] = [];
        for (const s of Y) (Xset.has(s) ? y1 : y2).push(s);
        if (!y1.length || !y2.length) continue;
        P.delete(yk);
        const k1 = y1.join(",");
        const k2 = y2.join(",");
        P.set(k1, y1);
        P.set(k2, y2);
        let back: string;
        if (W.has(yk)) {
          W.delete(yk);
          W.add(k1);
          W.add(k2);
          back = "原块还在工作表里，两半都留在表中";
        } else if (y1.length <= y2.length) {
          W.add(k1);
          back = "只把较小的一半放回工作表";
        } else {
          W.add(k2);
          back = "只把较小的一半放回工作表";
        }
        frames.push({
          step: frames.length,
          title: `按 ${alpha[si]} 拆分`,
          detail: `工作表取出 ${label(A)}。读「${alpha[si]}」能进入它的状态是 ${
            Xset.size ? `{${[...Xset].sort((a, b) => a - b).join(",")}}` : "∅"
          }。块 ${label(Y)} 拆成 ${label(y1)} 与 ${label(y2)}。${back}。`,
          blocks: snap(),
          work: workNames(),
          result: false,
        });
      }
    }
  }

  frames.push({
    step: frames.length,
    title: "划分稳定",
    detail: "工作表已空。每一块里的状态互相不可区分，块与块之间可以被某个字串分开。下面把每块收成一个状态。",
    blocks: snap(),
    work: [],
    result: false,
  });

  const blocks = [...P.values()];
  const blockOf = new Array<number>(n);
  blocks.forEach((b, i) => {
    for (const s of b) blockOf[s] = i;
  });
  const startB = blockOf[dfa.start];
  const order: number[] = [];
  const seen = new Set<number>();
  const queue = [startB];
  seen.add(startB);
  while (queue.length) {
    const b = queue.shift()!;
    order.push(b);
    const rep = blocks[b][0];
    for (let si = 0; si < alpha.length; si++) {
      const dest = dfa.delta[rep][si];
      const nb = blockOf[dest];
      if (nb === undefined || blocks[nb] === undefined) continue;
      if (!seen.has(nb)) {
        seen.add(nb);
        queue.push(nb);
      }
    }
  }
  const remap = new Array<number>(blocks.length);
  order.forEach((b, i) => {
    remap[b] = i;
  });

  const m = order.length;
  const delta = Array.from({ length: m }, () => Array(alpha.length).fill(0));
  const accept: number[][] = Array.from({ length: m }, () => []);
  const origins: number[][] = Array.from({ length: m }, () => []);
  const edges: DFA["edges"] = [];
  for (const b of order) {
    const id = remap[b];
    const members = [...blocks[b]];
    origins[id] = members;
    accept[id] = cloneTags(dfa.accept[members[0]]);
    const rep = members[0];
    for (let si = 0; si < alpha.length; si++) {
      const to = remap[blockOf[dfa.delta[rep][si]]];
      delta[id][si] = to;
      edges.push({ from: id, to, sym: alpha[si], step: 0 });
    }
  }

  const min: DFA = {
    states: Array.from({ length: m }, (_, i) => i),
    start: 0,
    alphabet: alpha,
    delta,
    accept,
    subsets: null,
    origins,
    labels: null,
    stateBorn: Array(m).fill(0),
    dead: computeDead(accept, delta),
    edges,
  };

  const named = (tags: number[]) =>
    tags.length ? tags.map((id) => names[id] ?? String(id)).join("·") : "非接受";
  frames.push({
    step: frames.length,
    title: "商自动机",
    detail: `Hopcroft 最小 DFA 有 ${m} 个状态。起点来自原块 {${blocks[startB].join(",")}}。${origins
      .map((mem, i) => `q${i} ← {${mem.join(",")}}（${named(accept[i])}）`)
      .join("；")}。`,
    blocks: snap(),
    work: [],
    result: true,
  });

  return { dfa: min, frames };
}
