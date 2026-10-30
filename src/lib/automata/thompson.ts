import { indexAdj } from "./nfa";
import { EPS, type Ast, type Group, type NFA, type Note, type Trans } from "./types";

type Frag = { start: number; accept: number; trans: Trans[] };

export function buildThompson(
  rules: { id: number; name: string; ast: Ast; groups: Group[] }[],
  alphabet: string[],
): NFA {
  let next = 0;
  const stateStep: number[] = [];
  const tagStep: number[] = [];
  const steps: Note[] = [];
  const fresh = () => {
    const id = next++;
    stateStep[id] = 0;
    tagStep[id] = Number.POSITIVE_INFINITY;
    return id;
  };
  const note = (title: string, detail: string) => {
    const step = steps.length;
    steps.push({ step, title, detail });
    return step;
  };
  const born = (id: number, step: number) => {
    stateStep[id] = step;
  };

  const build = (ast: Ast): Frag => {
    if (ast.k === "sym") {
      const s = fresh();
      const t = fresh();
      const step = note("字面量", `「${ast.sym}」连出一条边：q${s} —${ast.sym}→ q${t}。`);
      born(s, step);
      born(t, step);
      return { start: s, accept: t, trans: [{ from: s, to: t, sym: ast.sym, step }] };
    }
    if (ast.k === "eps") {
      const s = fresh();
      const t = fresh();
      const step = note("空串", `ε 片段：q${s} —ε→ q${t}，不消耗字符。`);
      born(s, step);
      born(t, step);
      return { start: s, accept: t, trans: [{ from: s, to: t, sym: EPS, step }] };
    }
    if (ast.k === "class") {
      const s = fresh();
      const t = fresh();
      const shown = ast.syms.length > 12 ? `${ast.syms.length} 个符号` : ast.syms.join("");
      const step = note("字符类", `q${s} 到 q${t} 平行连出 ${shown}。`);
      born(s, step);
      born(t, step);
      return {
        start: s,
        accept: t,
        trans: ast.syms.map((sym) => ({ from: s, to: t, sym, step })),
      };
    }
    if (ast.k === "concat") {
      const parts = ast.xs.map(build);
      const step = note("连接", "前一段的接受态用 ε 接上后一段的起点。");
      const trans = parts.flatMap((p) => p.trans);
      for (let i = 0; i < parts.length - 1; i++) {
        trans.push({ from: parts[i].accept, to: parts[i + 1].start, sym: EPS, step });
      }
      return { start: parts[0].start, accept: parts[parts.length - 1].accept, trans };
    }
    if (ast.k === "alt") {
      const parts = ast.xs.map(build);
      const s = fresh();
      const t = fresh();
      const step = note("选择", `新起点 q${s} 用 ε 分向各分支，各分支再汇入 q${t}。`);
      born(s, step);
      born(t, step);
      const trans = parts.flatMap((p) => p.trans);
      for (const p of parts) {
        trans.push({ from: s, to: p.start, sym: EPS, step });
        trans.push({ from: p.accept, to: t, sym: EPS, step });
      }
      return { start: s, accept: t, trans };
    }
    if (ast.k === "plus") {
      note("加号", "r+ 展开成 r 连接 r*，至少走一次。");
      return build({ k: "concat", xs: [ast.x, { k: "star", x: ast.x }] });
    }
    if (ast.k === "opt") {
      note("可选", "r? 展开成 r | ε。");
      return build({ k: "alt", xs: [ast.x, { k: "eps" }] });
    }
    if (ast.k === "cap") {
      const inner = build(ast.x);
      const s = fresh();
      const t = fresh();
      const step = note(
        "捕获",
        `组「${ast.name}」在进入时打开、离开时关闭：q${s} —ε开→ 内部 —ε闭→ q${t}。重复时后一次覆盖前一次。`,
      );
      born(s, step);
      born(t, step);
      return {
        start: s,
        accept: t,
        trans: [
          ...inner.trans,
          { from: s, to: inner.start, sym: EPS, step, ops: [{ id: ast.id, kind: "open" }] },
          { from: inner.accept, to: t, sym: EPS, step, ops: [{ id: ast.id, kind: "close" }] },
        ],
      };
    }
    if (ast.k !== "star") throw new Error("表达式里还有未展开的任意字符");
    const inner = build(ast.x);
    const s = fresh();
    const t = fresh();
    const step = note(
      "星闭包",
      `q${s} 可直接 ε 到 q${t}（零次），也可进入内部；内部接受态可回到内部起点或离开。`,
    );
    born(s, step);
    born(t, step);
    return {
      start: s,
      accept: t,
      trans: [
        ...inner.trans,
        { from: s, to: inner.start, sym: EPS, step },
        { from: s, to: t, sym: EPS, step },
        { from: inner.accept, to: inner.start, sym: EPS, step },
        { from: inner.accept, to: t, sym: EPS, step },
      ],
    };
  };

  const frags = rules.map((rule) => {
    const frag = build(rule.ast);
    const step = note("标记", `q${frag.accept} 是规则「${rule.name}」的接受态。`);
    tagStep[frag.accept] = step;
    return frag;
  });

  const accept: number[][] = Array.from({ length: next }, () => []);
  for (let i = 0; i < rules.length; i++) accept[frags[i].accept] = [rules[i].id];

  let start: number;
  let trans: Trans[];
  if (frags.length === 1) {
    start = frags[0].start;
    trans = frags[0].trans;
  } else {
    start = fresh();
    accept.push([]);
    const step = note("集合", "为整组规则增加起点，用 ε 分叉到每一条规则。");
    born(start, step);
    trans = frags.flatMap((f) => f.trans);
    for (const f of frags) trans.push({ from: start, to: f.start, sym: EPS, step });
  }

  if (next > 220) throw new Error("Thompson NFA 超过 220 个状态。请缩短表达式");

  return {
    states: Array.from({ length: next }, (_, i) => i),
    start,
    accept,
    trans,
    adj: indexAdj(next, trans),
    stateStep,
    tagStep,
    alphabet,
    steps,
    groups: rules.flatMap((rule) => rule.groups),
  };
}
