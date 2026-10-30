export type Pt = { x: number; y: number };

export function layoutGraph(
  ids: number[],
  edges: { from: number; to: number }[],
  start: number,
): Map<number, Pt> {
  const idSet = new Set(ids);
  const adj = new Map<number, number[]>();
  const pred = new Map<number, number[]>();
  for (const id of ids) {
    adj.set(id, []);
    pred.set(id, []);
  }
  for (const e of edges) {
    if (!idSet.has(e.from) || !idSet.has(e.to) || e.from === e.to) continue;
    adj.get(e.from)!.push(e.to);
    pred.get(e.to)!.push(e.from);
  }
  const rank = new Map<number, number>();
  const queue: number[] = [];
  if (idSet.has(start)) {
    rank.set(start, 0);
    queue.push(start);
  }
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of adj.get(u) ?? []) {
      if (!rank.has(v)) {
        rank.set(v, (rank.get(u) ?? 0) + 1);
        queue.push(v);
      }
    }
  }
  let extra = Math.max(-1, ...rank.values()) + 1;
  for (const id of ids) {
    if (!rank.has(id)) rank.set(id, extra++);
  }
  const maxR = Math.max(0, ...rank.values());
  const layers: number[][] = Array.from({ length: maxR + 1 }, () => []);
  for (const id of ids) layers[rank.get(id)!].push(id);
  for (const layer of layers) layer.sort((a, b) => a - b);

  const avg = (xs: number[]) => xs.reduce((s, n) => s + n, 0) / xs.length;
  for (let iter = 0; iter < 6; iter++) {
    for (let r = 1; r <= maxR; r++) {
      const index = new Map(layers[r - 1].map((id, i) => [id, i]));
      const scored = layers[r].map((v, i) => {
        const ps = (pred.get(v) ?? []).filter((p) => rank.get(p) === r - 1);
        return { v, s: ps.length ? avg(ps.map((p) => index.get(p) ?? i)) : i };
      });
      scored.sort((a, b) => a.s - b.s || a.v - b.v);
      layers[r] = scored.map((x) => x.v);
    }
    for (let r = maxR - 1; r >= 0; r--) {
      const index = new Map(layers[r + 1].map((id, i) => [id, i]));
      const scored = layers[r].map((v, i) => {
        const ss = (adj.get(v) ?? []).filter((p) => rank.get(p) === r + 1);
        return { v, s: ss.length ? avg(ss.map((p) => index.get(p) ?? i)) : i };
      });
      scored.sort((a, b) => a.s - b.s || a.v - b.v);
      layers[r] = scored.map((x) => x.v);
    }
  }

  const pos = new Map<number, Pt>();
  layers.forEach((layer, r) => {
    layer.forEach((id, i) => pos.set(id, { x: r * 176, y: i * 112 }));
  });
  return pos;
}
