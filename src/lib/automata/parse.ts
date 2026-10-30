import type { Ast, Group } from "./types";

export class RxError extends Error {
  line: number;
  column: number;
  constructor(message: string, line: number, column: number) {
    super(message);
    this.name = "RxError";
    this.line = line;
    this.column = column;
  }
}

const META = new Set(["|", "*", "+", "?", "(", ")", "[", "]", ".", "\\"]);

export type RawRule = { name: string; source: string; line: number; named: boolean };

export function parseProgram(source: string): RawRule[] {
  const lines = source.split(/\r?\n/);
  const rules: RawRule[] = [];
  for (let li = 0; li < lines.length; li++) {
    const raw = lines[li].trim();
    if (!raw || raw.startsWith("#")) continue;
    const named = raw.match(/^([\p{L}_][\p{L}\p{N}_]*):([\s\S]*)$/u);
    if (named) {
      const body = named[2].trim();
      if (!body) throw new RxError("冒号后面还没有表达式", li + 1, named[1].length + 1);
      rules.push({ name: named[1], source: body, line: li + 1, named: true });
    } else {
      rules.push({ name: `R${rules.length + 1}`, source: raw, line: li + 1, named: false });
    }
    if (rules.length > 8) throw new RxError("最多 8 条规则", li + 1, 0);
  }
  if (!rules.length) throw new RxError("写一条正则。空行和 # 注释会被跳过", 1, 0);
  return rules;
}

export function parseAlphabet(text: string): string[] {
  const syms = new Set<string>();
  const trimmed = text.trim();
  if (!trimmed) return [];
  for (const part of trimmed.split(/\s+/)) {
    for (const ch of part) syms.add(ch);
  }
  return [...syms];
}

export function parseRegex(source: string, line: number): Ast {
  const chars = [...source];
  if (chars.length > 160) throw new RxError("单条表达式请控制在 160 个字符内", line, 0);
  let i = 0;
  let slot = 0;
  const used = new Set<string>();

  const peek = () => chars[i];
  const err = (message: string) => {
    throw new RxError(message, line, i);
  };

  function parseAlt(): Ast {
    const xs = [parseConcat()];
    while (peek() === "|") {
      i++;
      xs.push(parseConcat());
    }
    return xs.length === 1 ? xs[0] : { k: "alt", xs };
  }

  function parseConcat(): Ast {
    const xs: Ast[] = [];
    while (i < chars.length && peek() !== "|" && peek() !== ")") xs.push(parseUnary());
    if (!xs.length) return { k: "eps" };
    return xs.length === 1 ? xs[0] : { k: "concat", xs };
  }

  function parseUnary(): Ast {
    let node = parseAtom();
    while (peek() === "*" || peek() === "+" || peek() === "?") {
      const op = peek();
      i++;
      if (op === "*") node = { k: "star", x: node };
      else if (op === "+") node = { k: "plus", x: node };
      else node = { k: "opt", x: node };
    }
    return node;
  }

  function parseAtom(): Ast {
    const c = peek();
    if (c === undefined) err("表达式在这里意外结束");
    if (c === "{") err("暂不支持 {m,n}。请改用 *、+，或把重复展开");
    if (c === ")" || c === "|" || c === "*" || c === "+" || c === "?") err(`这里不该出现「${c}」`);
    if (c === "(") {
      i++;
      if (peek() === "?") {
        i++;
        if (peek() === ":") {
          i++;
          const inner = parseAlt();
          if (peek() !== ")") err("缺少右括号 )");
          i++;
          return inner;
        }
        if (peek() === "P") {
          i++;
          if (peek() !== "<") err("命名捕获写成 (?P<名字>…)");
        }
        if (peek() === "<") {
          i++;
          if (peek() === "=" || peek() === "!") err("暂不支持前瞻或后顾");
          const name = readName();
          if (peek() !== ">") err("捕获组名字后面要有 >");
          i++;
          return capture(name);
        }
        err("暂不支持这种 (?…)。分组用 (?:…)，捕获用 (?<名字>…)");
      }
      return capture(null);
    }
    if (c === "[") return parseClass();
    if (c === ".") {
      i++;
      return { k: "any" };
    }
    if (c === "\\") {
      const esc = parseEscape(false);
      if (typeof esc === "string") return { k: "sym", sym: esc };
      return esc;
    }
    if (c === "ε") {
      i++;
      return { k: "eps" };
    }
    i++;
    return { k: "sym", sym: c };
  }

  function readName(): string {
    const start = i;
    const c = peek();
    if (c === undefined || !/^[\p{L}_]$/u.test(c)) err("捕获组的名字要以字母或下划线开头");
    i++;
    while (peek() !== undefined && /^[\p{L}\p{N}_]$/u.test(peek()!)) i++;
    return chars.slice(start, i).join("");
  }

  function capture(name: string | null): Ast {
    slot++;
    if (slot > 12) err("一条规则最多 12 个捕获组");
    const label = name ?? String(slot);
    if (used.has(label)) err(`捕获组「${label}」重复了`);
    used.add(label);
    const inner = parseAlt();
    if (peek() !== ")") err("缺少右括号 )");
    i++;
    return { k: "cap", slot, name: label, id: slot - 1, x: inner };
  }

  function parseEscape(inClass: boolean): Ast | string {
    i++;
    const c = peek();
    if (c === undefined) err("反斜杠后面缺少字符");
    i++;
    if (c === "e") return inClass ? "ε" : { k: "eps" };
    if (c === "n") return inClass ? "\n" : { k: "sym", sym: "\n" };
    if (c === "t") return inClass ? "\t" : { k: "sym", sym: "\t" };
    if (inClass) return c;
    return { k: "sym", sym: c };
  }

  function parseClassChar(): string {
    const c = peek();
    if (c === undefined) err("字符类没有结束");
    if (c === "\\") {
      const esc = parseEscape(true);
      return esc as string;
    }
    i++;
    return c;
  }

  function parseClass(): Ast {
    i++;
    let neg = false;
    if (peek() === "^") {
      neg = true;
      i++;
    }
    const syms: string[] = [];
    if (peek() === undefined) err("字符类没有结束");
    if (peek() === "]") err("空字符类匹配不了任何串");
    while (peek() !== undefined && peek() !== "]") {
      const a = parseClassChar();
      if (peek() === "-" && chars[i + 1] !== undefined && chars[i + 1] !== "]") {
        i++;
        const b = parseClassChar();
        const ac = a.codePointAt(0)!;
        const bc = b.codePointAt(0)!;
        if ([...a].length !== 1 || [...b].length !== 1 || bc < ac) err(`无效范围 ${a}-${b}`);
        if (bc - ac > 36) err("单个范围最多 37 个字符");
        for (let cp = ac; cp <= bc; cp++) syms.push(String.fromCodePoint(cp));
      } else syms.push(a);
    }
    if (peek() !== "]") err("字符类缺少 ]");
    i++;
    const uniq = [...new Set(syms)];
    if (!uniq.length) err("空字符类匹配不了任何串");
    return { k: "class", syms: uniq, neg };
  }

  const ast = parseAlt();
  if (i < chars.length) err(`「${peek()}」多余`);
  return ast;
}

export function collectSyms(ast: Ast, into: Set<string>): { any: boolean; neg: { syms: string[] }[] } {
  let any = false;
  const neg: { syms: string[] }[] = [];
  const walk = (n: Ast) => {
    if (n.k === "sym") into.add(n.sym);
    else if (n.k === "any") any = true;
    else if (n.k === "class") {
      if (n.neg) neg.push({ syms: n.syms });
      else for (const s of n.syms) into.add(s);
    } else if (n.k === "cap") walk(n.x);
    else if (n.k === "concat" || n.k === "alt") n.xs.forEach(walk);
    else if (n.k === "star" || n.k === "plus" || n.k === "opt") walk(n.x);
  };
  walk(ast);
  return { any, neg };
}

export function groundAst(ast: Ast, alphabet: string[]): Ast {
  const go = (n: Ast): Ast => {
    if (n.k === "any") {
      if (!alphabet.length) throw new Error("用了「.」但字母表是空的。在字母表栏写上 a b c，或改成具体字符");
      return { k: "class", syms: [...alphabet], neg: false };
    }
    if (n.k === "class" && n.neg) {
      const ban = new Set(n.syms);
      const syms = alphabet.filter((s) => !ban.has(s));
      if (!syms.length) throw new Error("否定字符类在当前字母表下是空的。请补几个允许的字母");
      return { k: "class", syms, neg: false };
    }
    if (n.k === "class") return n;
    if (n.k === "cap") return { ...n, x: go(n.x) };
    if (n.k === "concat" || n.k === "alt") return { ...n, xs: n.xs.map(go) };
    if (n.k === "star" || n.k === "plus" || n.k === "opt") return { ...n, x: go(n.x) };
    return n;
  };
  return go(ast);
}

export function stampGroups(ast: Ast, rule: number, into: Group[]): Ast {
  const go = (n: Ast): Ast => {
    if (n.k === "cap") {
      const id = into.length;
      into.push({ id, slot: n.slot, name: n.name, rule });
      return { k: "cap", slot: n.slot, name: n.name, id, x: go(n.x) };
    }
    if (n.k === "concat" || n.k === "alt") return { ...n, xs: n.xs.map(go) };
    if (n.k === "star" || n.k === "plus" || n.k === "opt") return { ...n, x: go(n.x) };
    return n;
  };
  return go(ast);
}

function escSym(sym: string): string {
  if (sym === "\n") return "\\n";
  if (sym === "\t") return "\\t";
  if (META.has(sym) || sym === "ε") return `\\${sym}`;
  return sym;
}

export function printAst(ast: Ast): string {
  const prec = (n: Ast) => (n.k === "alt" ? 1 : n.k === "concat" ? 2 : 3);
  const wrap = (n: Ast, parent: number) => {
    const s = walk(n);
    return prec(n) < parent ? `(?:${s})` : s;
  };
  const walk = (n: Ast): string => {
    if (n.k === "eps") return "ε";
    if (n.k === "sym") return escSym(n.sym);
    if (n.k === "any") return ".";
    if (n.k === "class") {
      const body = compactSyms(n.syms);
      return n.neg ? `[^${body}]` : `[${body}]`;
    }
    if (n.k === "cap") return `(?<${n.name}>${walk(n.x)})`;
    if (n.k === "concat") return n.xs.map((x) => wrap(x, 2)).join("");
    if (n.k === "alt") return n.xs.map((x) => wrap(x, 1)).join("|");
    const op = n.k === "star" ? "*" : n.k === "plus" ? "+" : "?";
    return wrap(n.x, 3) + op;
  };
  return walk(ast);
}

export function compactSyms(syms: string[]): string {
  const one = syms.every((s) => [...s].length === 1);
  if (!one) return syms.map(escSym).join("");
  const sorted = [...syms].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].codePointAt(0)! === sorted[j].codePointAt(0)! + 1) {
      j++;
    }
    if (j >= i + 2) parts.push(`${escSym(sorted[i])}–${escSym(sorted[j])}`);
    else for (let k = i; k <= j; k++) parts.push(escSym(sorted[k]));
    i = j + 1;
  }
  return parts.join("");
}
