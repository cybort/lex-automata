import type { Ast, DFA, Pattern } from "./types";
import type { ViewEdge, ViewModel, ViewNode } from "./view";
import type { Verdict } from "./match";

export type FilterKind = "ac" | "teddy";

export type TeddyRow = { lit: string; fp: string; bit: boolean; hit: boolean };

export type TeddySnap = { w: number; window: string; rows: TeddyRow[] };

export type PreFrame = {
  title: string;
  detail: string;
  index: number;
  verdict: Verdict;
  active: number[];
  hot: { from: number; to: number; sym: string }[];
  hits: { start: number; end: number }[];
  teddy: TeddySnap | null;
};

type Needle = { text: string; symbols: string[]; rules: number[] };

type AcNode = {
  id: number;
  next: Map<string, number>;
  fail: number;
  out: { text: string; rules: number[] }[];
};

export type AcMachine = { nodes: AcNode[]; needles: Needle[] };

export type Cut = { rule: number; name: string; literals: string[] | null };

export type Preplay = {
  blocked: boolean;
  frames: PreFrame[];
  cuts: Cut[];
  spans: { start: number; end: number }[];
  ac: AcMachine | null;
  kind: FilterKind;
};

const chars = (s: string) => [...s];

function uniq(xs: string[]): string[] {
  return [...new Set(xs)];
}

function canEmpty(ast: Ast): boolean {
  switch (ast.k) {
    case "eps":
    case "star":
    case "opt":
      return true;
    case "sym":
    case "any":
    case "class":
      return false;
    case "cap":
      return canEmpty(ast.x);
    case "plus":
      return canEmpty(ast.x);
    case "alt":
      return ast.xs.some(canEmpty);
    case "concat":
      return ast.xs.every(canEmpty);
  }
}

function fullyExactSet(ast: Ast): string[] | null {
  switch (ast.k) {
    case "eps":
      return [""];
    case "sym":
      return [ast.sym];
    case "any":
    case "star":
    case "plus":
    case "opt":
      return null;
    case "class":
      if (ast.neg || ast.syms.length === 0 || ast.syms.length > 8) return null;
      return uniq(ast.syms);
    case "cap":
      return fullyExactSet(ast.x);
    case "alt": {
      const parts = ast.xs.map(fullyExactSet);
      if (parts.some((p) => !p)) return null;
      const u = uniq(parts.flat() as string[]);
      return u.length <= 8 ? u : null;
    }
    case "concat": {
      let acc = [""];
      for (const x of ast.xs) {
        const p = fullyExactSet(x);
        if (!p) return null;
        const next: string[] = [];
        for (const a of acc) for (const b of p) next.push(a + b);
        acc = uniq(next);
        if (acc.length > 8) return null;
      }
      return acc;
    }
  }
}

function prefixSet(ast: Ast): string[] | null {
  switch (ast.k) {
    case "sym":
      return [ast.sym];
    case "class":
      if (ast.neg || ast.syms.length === 0 || ast.syms.length > 8) return null;
      return uniq(ast.syms);
    case "eps":
      return [""];
    case "any":
      return null;
    case "cap":
      return prefixSet(ast.x);
    case "opt":
    case "star":
      return [""];
    case "plus": {
      const p = prefixSet(ast.x);
      if (!p) return null;
      const u = uniq(p.filter((s) => s.length));
      return u.length && u.length <= 12 ? u : null;
    }
    case "alt": {
      const parts = ast.xs.map(prefixSet);
      if (parts.some((p) => !p)) return null;
      const u = uniq(parts.flat() as string[]);
      if (u.some((s) => s.length === 0)) return [""];
      return u.length <= 12 ? u : null;
    }
    case "concat": {
      let acc = [""];
      for (const x of ast.xs) {
        const p = prefixSet(x);
        if (!p) return nonempty(acc);
        if (p.length === 1 && p[0] === "") continue;
        const next: string[] = [];
        for (const a of acc) {
          for (const b of p) {
            const joined = a + b;
            if (chars(joined).length <= 16) next.push(joined);
          }
        }
        acc = uniq(next);
        if (!acc.length) return null;
        if (!fullyExactSet(x)) return nonempty(acc);
      }
      return acc.some((s) => s.length) ? acc.filter((s) => s.length) : [""];
    }
  }
}

function nonempty(acc: string[]): string[] | null {
  const u = uniq(acc.filter((s) => s.length));
  return u.length ? u : null;
}

function bestCut(cands: string[][]): string[] | null {
  const usable = cands.filter((c) => c.length && c.every((s) => s.length));
  if (!usable.length) return null;
  const score = (c: string[]) => {
    const lens = c.map((s) => chars(s).length);
    return [Math.min(...lens), -c.length, lens.reduce((a, b) => a + b, 0)] as const;
  };
  usable.sort((a, b) => {
    const [a0, a1, a2] = score(a);
    const [b0, b1, b2] = score(b);
    return b0 - a0 || b1 - a1 || b2 - a2;
  });
  return usable[0];
}

function sameMembers(a: string[] | null, b: string[]): boolean {
  if (!a || a.length !== b.length) return false;
  const left = uniq(a).sort();
  const right = uniq(b).sort();
  return left.length === right.length && left.every((s, i) => s === right[i]);
}

/** Literals such that every match contains at least one of them. Null means "no useful filter". */
export function requiredLiterals(ast: Ast): string[] | null {
  switch (ast.k) {
    case "eps":
    case "any":
    case "star":
    case "opt":
      return null;
    case "sym":
      return [ast.sym];
    case "class":
      if (ast.neg || ast.syms.length === 0 || ast.syms.length > 8) return null;
      return uniq(ast.syms);
    case "cap":
      return requiredLiterals(ast.x);
    case "plus":
      return requiredLiterals(ast.x);
    case "alt": {
      const parts = ast.xs.map(requiredLiterals);
      if (parts.some((p) => !p)) return null;
      const u = uniq(parts.flat() as string[]);
      return u.length && u.length <= 12 ? u : null;
    }
    case "concat": {
      const candidates: string[][] = [];
      let bufs = [""];
      const commit = () => {
        const solid = uniq(bufs.filter((s) => s.length));
        if (solid.length && solid.length <= 12) candidates.push(solid);
        bufs = [""];
      };
      for (const x of ast.xs) {
        const full = fullyExactSet(x);
        if (full && full.every((s) => s.length) && bufs.length * full.length <= 12) {
          const next = new Set<string>();
          for (const b of bufs) for (const f of full) next.add(b + f);
          bufs = [...next];
          continue;
        }
        if (canEmpty(x)) {
          commit();
          continue;
        }
        const cut = requiredLiterals(x);
        const prefs = prefixSet(x)?.filter((s) => s.length) ?? null;
        if (cut && cut.every((s) => s.length) && sameMembers(prefs, cut)) {
          const base = bufs.some((b) => b.length) ? bufs : [""];
          const glued = uniq(base.flatMap((b) => cut.map((c) => b + c)));
          if (glued.length && glued.length <= 12) candidates.push(glued);
          bufs = [""];
          continue;
        }
        commit();
        if (cut) candidates.push(cut);
      }
      commit();
      return bestCut(candidates);
    }
  }
}

export function cutsOf(patterns: Pattern[]): Cut[] {
  return patterns.map((p) => ({ rule: p.id, name: p.name, literals: requiredLiterals(p.ast) }));
}

function needlesOf(cuts: Cut[]): Needle[] {
  const byText = new Map<string, number[]>();
  for (const cut of cuts) {
    for (const lit of cut.literals ?? []) {
      const rules = byText.get(lit) ?? [];
      if (!rules.includes(cut.rule)) rules.push(cut.rule);
      byText.set(lit, rules);
    }
  }
  return [...byText.entries()].map(([text, rules]) => ({ text, symbols: chars(text), rules }));
}

function buildAc(needles: Needle[]): AcMachine {
  const nodes: AcNode[] = [{ id: 0, next: new Map(), fail: 0, out: [] }];
  for (const needle of needles) {
    let s = 0;
    for (const ch of needle.symbols) {
      const have = nodes[s].next.get(ch);
      if (have !== undefined) {
        s = have;
        continue;
      }
      const id = nodes.length;
      nodes.push({ id, next: new Map(), fail: 0, out: [] });
      nodes[s].next.set(ch, id);
      s = id;
    }
    nodes[s].out.push({ text: needle.text, rules: needle.rules });
  }
  const queue: number[] = [];
  for (const id of nodes[0].next.values()) queue.push(id);
  let qi = 0;
  while (qi < queue.length) {
    const u = queue[qi++];
    for (const [ch, v] of nodes[u].next) {
      let f = nodes[u].fail;
      let guard = 0;
      while (f !== 0 && !nodes[f].next.has(ch) && guard++ < nodes.length) f = nodes[f].fail;
      const down = nodes[f].next.get(ch);
      nodes[v].fail = down !== undefined && down !== v ? down : 0;
      queue.push(v);
    }
  }
  return { nodes, needles };
}

export function viewAc(ac: AcMachine, active: number): ViewModel {
  const nodes: ViewNode[] = ac.nodes.map((n) => {
    const lits = uniq(n.out.map((o) => o.text));
    return {
      id: n.id,
      name: `q${n.id}`,
      sub: lits.join(" "),
      tip: lits.length ? `输出 ${lits.join(" ")}` : n.id === 0 ? "根" : `q${n.id}`,
      accept: lits.length > 0,
      dead: false,
      on: true,
      hot: n.id === active,
      block: null,
    };
  });
  const edges: ViewEdge[] = [];
  for (const n of ac.nodes) {
    for (const [sym, to] of n.next) {
      edges.push({
        key: `${n.id}|${sym}|${to}`,
        from: n.id,
        to,
        label: sym,
        eps: false,
        on: true,
        hot: false,
      });
    }
    if (n.fail !== 0) {
      edges.push({
        key: `f|${n.id}|${n.fail}`,
        from: n.id,
        to: n.fail,
        label: "fail",
        eps: true,
        on: true,
        hot: false,
      });
    }
  }
  return { nodes, edges, start: 0 };
}

function paintHot(view: ViewModel, hot: { from: number; to: number; sym: string }[]): ViewModel {
  const keys = new Set(hot.map((e) => `${e.from}|${e.sym}|${e.to}`));
  return {
    ...view,
    edges: view.edges.map((e) => ({ ...e, hot: keys.has(e.key) })),
  };
}

function cutSentence(cuts: Cut[]): string {
  if (!cuts.length) return "没有规则。";
  return cuts
    .map((c) => (c.literals ? `${c.name} 必现 ${c.literals.join(" 或 ")}` : `${c.name} 没有必现子串`))
    .join("。");
}

function ruleNames(cuts: Cut[], ids: Set<number>): string {
  const names = cuts.filter((c) => ids.has(c.rule)).map((c) => c.name);
  return names.length ? names.join("、") : "无";
}

export function playPrefilter(patterns: Pattern[], symbols: string[], kind: FilterKind): Preplay {
  const cuts = cutsOf(patterns);
  const needles = needlesOf(cuts);
  const free = new Set(cuts.filter((c) => !c.literals).map((c) => c.rule));
  const frames: PreFrame[] = [];
  const push = (partial: Omit<PreFrame, "verdict"> & { verdict?: Verdict }) => {
    frames.push({
      verdict: partial.verdict ?? "run",
      title: partial.title,
      detail: partial.detail,
      index: partial.index,
      active: partial.active,
      hot: partial.hot,
      hits: partial.hits,
      teddy: partial.teddy,
    });
  };

  push({
    title: "拆出子串",
    detail: `${cutSentence(cuts)}。匹配里至少要出现其中一条，否则这条规则可以直接丢掉。`,
    index: 0,
    active: [],
    hot: [],
    hits: [],
    teddy: null,
  });

  if (!needles.length) {
    push({
      title: "过滤器让路",
      detail: "没有任何必现子串。Aho-Corasick 和 Teddy 都无从下手，整串交给后面的机器。",
      index: 0,
      active: [],
      hot: [],
      hits: [],
      teddy: null,
    });
    return { blocked: false, frames, cuts, spans: [], ac: null, kind };
  }

  const alive = new Set(free);
  const hits: { start: number; end: number }[] = [];
  const remember = (start: number, end: number) => {
    if (!hits.some((h) => h.start === start && h.end === end)) hits.push({ start, end });
  };

  if (kind === "ac") {
    const ac = buildAc(needles);
    const linked = ac.nodes.some((n) => n.fail !== 0);
    push({
      title: "Aho-Corasick",
      detail: linked
        ? `把 ${needles.map((n) => n.text).join("、")} 收进字典树，共 ${ac.nodes.length} 个状态。虚线是失败链，连向当前串的最长真后缀。指向根的失败链不画。`
        : `把 ${needles.map((n) => n.text).join("、")} 收进字典树，共 ${ac.nodes.length} 个状态。这些子串没有可重叠的真后缀，失败链都指回根，图上省略。`,
      index: 0,
      active: [0],
      hot: [],
      hits: [],
      teddy: null,
    });
    let s = 0;
    for (let i = 0; i < symbols.length; i++) {
      const ch = symbols[i];
      const prev = s;
      let guard = 0;
      while (s !== 0 && !ac.nodes[s].next.has(ch) && guard++ < ac.nodes.length) s = ac.nodes[s].fail;
      const down = ac.nodes[s].next.get(ch);
      const hot = down !== undefined ? [{ from: s, to: down, sym: ch }] : [];
      if (down !== undefined) s = down;
      const found: string[] = [];
      const seen = new Set<number>();
      let o = s;
      while (o && !seen.has(o)) {
        seen.add(o);
        for (const out of ac.nodes[o].out) {
          found.push(out.text);
          for (const rule of out.rules) alive.add(rule);
          remember(i + 1 - chars(out.text).length, i + 1);
        }
        o = ac.nodes[o].fail;
      }
      const moved = s !== prev || down !== undefined;
      push({
        title: `过滤「${ch}」`,
        detail: found.length
          ? `走到 q${s}，认出 ${found.join("、")}。还活着的规则：${ruleNames(cuts, alive)}。`
          : moved
            ? `沿字典树走到 q${s}。这一步没有输出。`
            : `q${prev} 没有「${ch}」，失败链也接不下去，停在根上。`,
        index: i + 1,
        active: [s],
        hot,
        hits: hits.map((h) => ({ ...h })),
        teddy: null,
      });
    }
    const blocked = alive.size === 0;
    push({
      title: blocked ? "过滤拦截" : "过滤放行",
      detail: blocked
        ? "每条规则的必现子串都没出现。后面的 NFA / DFA 不用启动。"
        : `留下 ${ruleNames(cuts, alive)}。再用所选机器核对整串是不是真的属于它。`,
      index: symbols.length,
      verdict: blocked ? "reject" : "run",
      active: [s],
      hot: [],
      hits: hits.map((h) => ({ ...h })),
      teddy: null,
    });
    return { blocked, frames, cuts, spans: hits.map((h) => ({ ...h })), ac, kind };
  }

  const w = Math.min(...needles.map((n) => n.symbols.length));
  const cols: Map<string, boolean[]>[] = Array.from({ length: w }, () => new Map());
  needles.forEach((nd, i) => {
    for (let k = 0; k < w; k++) {
      const ch = nd.symbols[k];
      const row = cols[k].get(ch) ?? Array(needles.length).fill(false);
      row[i] = true;
      cols[k].set(ch, row);
    }
  });
  const snap = (window: string, bits: boolean[] | null, hitAt: Set<number>): TeddySnap => ({
    w,
    window,
    rows: needles.map((nd, i) => ({
      lit: nd.text,
      fp: nd.symbols.slice(0, w).join(""),
      bit: bits ? bits[i] : false,
      hit: hitAt.has(i),
    })),
  });
  frames[0].teddy = snap("", null, new Set());
  push({
    title: "Teddy 掩码",
    detail: `窗宽 ${w}，取每条子串的前 ${w} 个字符做指纹。窗口对齐后按位与，亮着的位再核对整段。教学里用布尔掩码代替 SIMD 寄存器。`,
    index: 0,
    active: [],
    hot: [],
    hits: [],
    teddy: snap("", null, new Set()),
  });
  if (symbols.length < w) {
    const blocked = alive.size === 0;
    push({
      title: blocked ? "过滤拦截" : "过滤放行",
      detail: blocked
        ? `文本比窗短，长度至少为 ${w} 的子串放不进去。机器不用启动。`
        : `文本比窗短，但 ${ruleNames(cuts, alive)} 没有必现子串，仍然交给机器。`,
      index: symbols.length,
      verdict: blocked ? "reject" : "run",
      active: [],
      hot: [],
      hits: [],
      teddy: snap("", null, new Set()),
    });
    return { blocked, frames, cuts, spans: hits.map((h) => ({ ...h })), ac: null, kind };
  }
  for (let end = w - 1; end < symbols.length; end++) {
    const start = end - w + 1;
    let bits = Array(needles.length).fill(true);
    for (let k = 0; k < w; k++) {
      const row = cols[k].get(symbols[start + k]);
      bits = bits.map((on, i) => on && !!row?.[i]);
    }
    const hitAt = new Set<number>();
    const found: string[] = [];
    bits.forEach((on, i) => {
      if (!on) return;
      const nd = needles[i];
      const slice = symbols.slice(start, start + nd.symbols.length);
      if (slice.join("") !== nd.symbols.join("")) return;
      hitAt.add(i);
      found.push(nd.text);
      for (const rule of nd.rules) alive.add(rule);
      remember(start, start + nd.symbols.length);
    });
    const window = symbols.slice(start, end + 1).join("");
    push({
      title: `窗口「${window}」`,
      detail: found.length
        ? `按位与后核对通过：${found.join("、")}。还活着的规则：${ruleNames(cuts, alive)}。`
        : bits.some(Boolean)
          ? "指纹碰上了，整段对不上，这个窗口丢掉。"
          : "按位与是空的，窗口里没有哪条子串的指纹。",
      index: end + 1,
      active: [],
      hot: [],
      hits: hits.map((h) => ({ ...h })),
      teddy: snap(window, bits, hitAt),
    });
  }
  const blocked = alive.size === 0;
  push({
    title: blocked ? "过滤拦截" : "过滤放行",
    detail: blocked
      ? "每个窗口都没有核对通过的必现子串。后面的机器不用启动。"
      : `留下 ${ruleNames(cuts, alive)}。再用所选机器核对整串。`,
    index: symbols.length,
    verdict: blocked ? "reject" : "run",
    active: [],
    hot: [],
    hits: hits.map((h) => ({ ...h })),
    teddy: snap("", null, new Set()),
  });
  return { blocked, frames, cuts, spans: hits.map((h) => ({ ...h })), ac: null, kind };
}

export function prefilterBlocks(patterns: Pattern[], symbols: string[], kind: FilterKind): boolean {
  return playPrefilter(patterns, symbols, kind).blocked;
}

export function viewPrefilter(ac: AcMachine | null, active: number, hot: { from: number; to: number; sym: string }[]): ViewModel {
  if (!ac) return { nodes: [], edges: [], start: 0 };
  return paintHot(viewAc(ac, active), hot);
}

export const FILTER_WEIGHT = 1;
export const DFA_WEIGHT = 4;
export const WAKE_FLOOR = 4;

export type Mark = "skip" | "tp" | "fp" | "linear";

export type WakeEvent = {
  start: number;
  end: number;
  ok: boolean;
  steps: number;
  rate: number;
};

export type Budget = {
  threshold: number;
  forced: boolean;
  linear: number;
  naive: number;
  adaptive: number;
  wakes: number;
  falsePos: number;
  truePos: number;
  rate: number;
  fallbackAt: number | null;
  marks: Mark[];
  events: WakeEvent[];
};

function confirmSlot(
  dfa: DFA,
  symbols: string[],
  hit: { start: number; end: number },
): { ok: boolean; steps: number; from: number; end: number } {
  const known = new Set(dfa.alphabet);
  let from = hit.start;
  while (from > 0 && known.has(symbols[from - 1])) from--;
  let to = Math.min(symbols.length, Math.max(hit.end, hit.start));
  while (to < symbols.length && known.has(symbols[to])) to++;
  let state = dfa.start;
  let steps = 0;
  for (let i = from; i < to; i++) {
    const si = dfa.alphabet.indexOf(symbols[i]);
    steps++;
    if (si < 0) return { ok: false, steps, from, end: i };
    state = dfa.delta[state][si];
    if (dfa.dead[state]) return { ok: false, steps, from, end: i + 1 };
  }
  return { ok: (dfa.accept[state] ?? []).length > 0, steps, from, end: to };
}

export function assessBudget(
  dfa: DFA,
  symbols: string[],
  spans: { start: number; end: number }[],
  cuts: Cut[],
  threshold: number,
): Budget {
  const n = symbols.length;
  const forced = cuts.some((c) => !c.literals);
  const hits = spans
    .filter((h) => h.end > h.start && h.start >= 0 && h.start < n)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const unique: { start: number; end: number }[] = [];
  for (const hit of hits) {
    const prev = unique[unique.length - 1];
    if (prev && prev.start === hit.start) {
      if (hit.end > prev.end) prev.end = hit.end;
      continue;
    }
    unique.push({ ...hit });
  }

  const marks: Mark[] = Array(n).fill("skip");
  const events: WakeEvent[] = [];
  let naiveSteps = 0;
  let adaptiveSteps = 0;
  let wakes = 0;
  let falsePos = 0;
  let truePos = 0;
  let fallbackAt: number | null = null;

  for (const hit of unique) {
    const run = confirmSlot(dfa, symbols, hit);
    naiveSteps += run.steps;
    if (fallbackAt !== null) continue;
    wakes++;
    adaptiveSteps += run.steps;
    if (run.ok) truePos++;
    else falsePos++;
    const rate = wakes ? falsePos / wakes : 0;
    events.push({ start: hit.start, end: hit.end, ok: run.ok, steps: run.steps, rate });
    for (let i = run.from; i < Math.min(n, run.end); i++) marks[i] = run.ok ? "tp" : "fp";
    if (wakes >= WAKE_FLOOR && rate > threshold) fallbackAt = Math.min(n, run.end);
  }

  if (forced) {
    for (let i = 0; i < n; i++) if (marks[i] === "skip") marks[i] = "linear";
  }
  if (fallbackAt !== null) {
    for (let i = fallbackAt; i < n; i++) marks[i] = "linear";
  }

  const filterEnd = fallbackAt ?? n;
  const linearTail = forced ? n : fallbackAt === null ? 0 : n - fallbackAt;
  const linear = DFA_WEIGHT * n;
  const naive = FILTER_WEIGHT * n + DFA_WEIGHT * naiveSteps + (forced ? linear : 0);
  const adaptive = FILTER_WEIGHT * filterEnd + DFA_WEIGHT * adaptiveSteps + DFA_WEIGHT * linearTail;
  return {
    threshold,
    forced,
    linear,
    naive,
    adaptive,
    wakes,
    falsePos,
    truePos,
    rate: wakes ? falsePos / wakes : 0,
    fallbackAt,
    marks,
    events,
  };
}

export function exampleHaystacks(
  dfa: DFA,
  alphabet: string[],
  cuts: Cut[],
): { fast: string; slow: string; slowIsFp: boolean; mixed: string; mixedSplits: boolean } | null {
  const needles = cuts.flatMap((c) => c.literals ?? []);
  if (!needles.length || !alphabet.length) return null;
  const fastSyms: string[] = [];
  for (let i = 0; i < 24; i++) {
    let picked = alphabet[0];
    for (const ch of alphabet) {
      const trial = fastSyms.join("") + ch;
      if (needles.every((nd) => !trial.endsWith(nd))) {
        picked = ch;
        break;
      }
    }
    fastSyms.push(picked);
  }
  let slow = needles[0].repeat(8);
  let slowIsFp = false;
  for (const lit of [...needles].sort((a, b) => chars(a).length - chars(b).length)) {
    if (!wordOk(dfa, lit)) {
      slow = lit.repeat(8);
      slowIsFp = true;
      break;
    }
  }
  if (!slowIsFp) {
    const ch = chars(needles[0])[0];
    if (needles.includes(ch) && chars(ch.repeat(12)).every((_, i, all) => !confirmSlot(dfa, all, { start: i, end: i + 1 }).ok)) {
      slow = ch.repeat(12);
      slowIsFp = true;
    }
  }
  const mixed = criticalHaystack(dfa, cuts, needles);
  return { fast: fastSyms.join(""), slow, slowIsFp, mixed: mixed.text, mixedSplits: mixed.splits };
}

function wordOk(dfa: DFA, word: string): boolean {
  const syms = chars(word);
  if (!syms.length) return (dfa.accept[dfa.start] ?? []).length > 0;
  return confirmSlot(dfa, syms, { start: 0, end: syms.length }).ok;
}

function findSpans(needles: string[], symbols: string[]): { start: number; end: number }[] {
  const keys = needles.map((nd) => chars(nd)).filter((key) => key.length);
  const spans: { start: number; end: number }[] = [];
  for (let i = 0; i < symbols.length; i++) {
    for (const key of keys) {
      if (i + key.length > symbols.length) continue;
      if (key.every((ch, k) => symbols[i + k] === ch)) spans.push({ start: i, end: i + key.length });
    }
  }
  return spans;
}

function splitsAt(dfa: DFA, cuts: Cut[], needles: string[], text: string): { low: Budget; high: Budget } {
  const symbols = chars(text);
  const spans = findSpans(needles, symbols);
  return {
    low: assessBudget(dfa, symbols, spans, cuts, 0.4),
    high: assessBudget(dfa, symbols, spans, cuts, 0.9),
  };
}

function separates(low: Budget, high: Budget): boolean {
  return low.fallbackAt !== null && low.naive !== low.adaptive && high.fallbackAt === null && high.naive === high.adaptive;
}

function findBadCandidates(dfa: DFA, needles: string[], good: string | null): string[] {
  const alpha = dfa.alphabet;
  const seeds = [...needles].sort((a, b) => chars(a).length - chars(b).length);
  const cands: string[] = [];
  for (const lit of seeds) {
    cands.push(lit, lit.repeat(4), lit.repeat(6));
    for (const ch of alpha) {
      cands.push(lit + ch, ch + lit, lit + ch + ch, (lit + ch).repeat(3));
      if (chars(lit).length > 1) cands.push(chars(lit).slice(0, -1).join("") + ch);
    }
  }
  if (good) for (const ch of alpha) cands.push(good + ch, ch + good, (good + ch).repeat(2));
  const bad: string[] = [];
  const seen = new Set<string>();
  for (const cand of cands) {
    if (!cand || seen.has(cand) || !needles.some((nd) => cand.includes(nd))) continue;
    seen.add(cand);
    if (!wordOk(dfa, cand)) bad.push(cand);
  }
  return bad.sort((a, b) => chars(b).length - chars(a).length);
}

function criticalHaystack(dfa: DFA, cuts: Cut[], needles: string[]): { text: string; splits: boolean } {
  const sep = ["#", "·", "|", "/", "§", "※"].find((ch) => !dfa.alphabet.includes(ch)) ?? "※";
  const good = findGood(dfa, needles) ?? needles[0];
  const glue = (slots: string[]) => slots.join(sep);
  const bads = findBadCandidates(dfa, needles, good);
  if (!bads.length) return { text: glue(Array.from({ length: 8 }, () => good)), splits: false };
  let costly: string | null = null;
  const heads = [[good, good], [good, good, good], [good]];
  for (const bad of bads) {
    for (const head of heads) {
      const slots = [...head];
      for (let k = 0; k < 8; k++) {
        slots.push(bad);
        const text = glue(slots);
        const { low, high } = splitsAt(dfa, cuts, needles, text);
        if (!separates(low, high)) continue;
        if (low.naive > low.adaptive) return { text, splits: true };
        costly ??= text;
      }
    }
  }
  if (costly) return { text: costly, splits: true };
  return { text: glue([good, good, bads[0], bads[0], bads[0], bads[0]]), splits: false };
}

function findGood(dfa: DFA, needles: string[]): string | null {
  const alpha = dfa.alphabet;
  if (!alpha.length) return null;
  const depth = alpha.length > 6 ? 3 : 5;
  const seen = new Set<string>([""]);
  const queue = [""];
  while (queue.length) {
    const word = queue.shift() ?? "";
    if (word && needles.some((nd) => word.includes(nd)) && wordOk(dfa, word)) return word;
    if (chars(word).length >= depth) continue;
    for (const ch of alpha) {
      const next = word + ch;
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return null;
}

