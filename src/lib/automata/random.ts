import { compile } from "./pipeline";

export type Rng = () => number;

const FALLBACK = `# 随机 · 稳妥
结尾: (?:a|b)*ab
非空: (?:a|b)+
字面: ba`;

const PAIRS = [
  ["a", "b"],
  ["0", "1"],
  ["x", "y"],
] as const;

const TRIOS = [
  ["a", "b", "c"],
  ["x", "y", "z"],
] as const;

export function randomProgram(rng: Rng = Math.random): string {
  const makers = [
    endsProgram,
    parityProgram,
    blocksProgram,
    lexerProgram,
    finiteProgram,
    opsProgram,
    zhProgram,
    captureProgram,
  ];
  for (let i = 0; i < 16; i++) {
    const source = pick(rng, makers)(rng);
    if (fits(source)) return source;
  }
  return FALLBACK;
}

function fits(source: string): boolean {
  const compiled = compile(source, "");
  if (!compiled.ok) return false;
  const { nfa, thompson, hopThom, patterns, alphabet } = compiled.model;
  if (patterns.length < 2 || patterns.length > 5) return false;
  if (alphabet.length > 6) return false;
  if (nfa.states.length > 56) return false;
  if (thompson.dfa.states.length > 36) return false;
  return hopThom.ok;
}

function endsProgram(rng: Rng): string {
  const alpha = pick(rng, [...PAIRS, ...TRIOS]);
  const star = any(alpha);
  const pool = [
    `结尾: ${star}*${word(rng, alpha, int(rng, 2, 3))}`,
    `开头: ${word(rng, alpha, int(rng, 1, 2))}${star}*`,
    `含有: ${star}*${word(rng, alpha, 2)}${star}*`,
    `字面: ${word(rng, alpha, int(rng, 2, 4))}`,
    `非空: ${star}+`,
  ];
  return block("位置", take(rng, pool, int(rng, 3, 4)));
}

function parityProgram(rng: Rng): string {
  const [a, b] = pick(rng, PAIRS);
  const even = `(?:${b}|${a}${b}*${a})*`;
  const pool = [
    `偶数个${a}: ${even}`,
    `奇数个${a}: ${even}${a}${b}*`,
    `以${a}结尾: (?:${a}|${b})*${a}`,
    `只含${b}: ${b}*`,
    `至少一个${a}: (?:${a}|${b})*${a}(?:${a}|${b})*`,
  ];
  return block("计数", take(rng, pool, int(rng, 2, 3)));
}

function blocksProgram(rng: Rng): string {
  const alpha = pick(rng, PAIRS);
  const [u, v] = twoWords(rng, alpha, 2);
  const tail = word(rng, alpha, int(rng, 1, 2));
  const pool = [
    `重复: (?:${u})*`,
    `至少一块: (?:${u})+`,
    `二选一: (?:${u}|${v})+`,
    `可选前缀: (?:${u})?${tail}`,
    `交替: (?:${u}${v})*`,
  ];
  return block("重复块", take(rng, pool, int(rng, 3, 4)));
}

function lexerProgram(rng: Rng): string {
  const letters = pick(rng, [["a", "b"], ["x", "y"], ["a", "b", "c"]] as const);
  const [k1, k2] = twoWords(rng, letters, int(rng, 2, 3));
  const head = letters[0];
  const rest = [...letters, "0", "1"].join("");
  const pool = [
    `标识: ${head}[${rest}]*`,
    `整数: [0-1]+`,
    `带号: [+-]?[0-1]+`,
    `关键字: ${k1}|${k2}`,
  ];
  return block("词法", take(rng, pool, int(rng, 3, 4)));
}

function finiteProgram(rng: Rng): string {
  const alpha = pick(rng, PAIRS);
  const [u, v] = twoWords(rng, alpha, int(rng, 1, 3));
  const w = word(rng, alpha, int(rng, 1, 2));
  const pool = [
    `短串: ${u}|${v}|ε`,
    `可选: (?:${u})?${v}`,
    `一或更多: (?:${w})+`,
    `至多一次: (?:${u}|${v})?`,
    `并列: ${u}${v}`,
  ];
  return block("有限", take(rng, pool, int(rng, 3, 4)));
}

function opsProgram(rng: Rng): string {
  const alpha = pick(rng, PAIRS);
  const [p, q] = alpha;
  const [u, v] = twoWords(rng, alpha, 2);
  const pool = [
    `星: ${p}*`,
    `加: ${q}+`,
    `可选: ${p}?${q}`,
    `选择: ${u}|${v}`,
    `分组: (?:${u})*`,
    `连接: ${word(rng, alpha, 3)}`,
    `尾: (?:${p}|${q})*${u}`,
  ];
  return block("运算", take(rng, pool, int(rng, 3, 4)));
}

function zhProgram(rng: Rng): string {
  const sets = [
    ["问候: 你好+", "疑问: 你好吗?", "告别: 再见"],
    ["是: 是+", "否: 不+", "或许: 也许?"],
    ["早: 早", "安: 早安+", "问候: (?:早|你)好?"],
    ["谢: 谢谢+", "不客气: 不客气", "回应: (?:谢|不)+"],
  ];
  return block("短句", pick(rng, sets));
}

function captureProgram(rng: Rng): string {
  const [a, b] = pick(rng, PAIRS);
  const sep = pick(rng, [":", "-", "="]);
  return block("捕获", [
    `键值: (?<键>[${a}${b}]+)${sep}(?<值>[${a}${b}]+)`,
    `单字: (?<字>${a}|${b})`,
  ]);
}

function block(title: string, lines: string[]): string {
  return `# 随机 · ${title}\n${lines.join("\n")}`;
}

function any(alpha: readonly string[]): string {
  return `(?:${alpha.join("|")})`;
}

function word(rng: Rng, alpha: readonly string[], n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += pick(rng, alpha);
  return s;
}

function twoWords(rng: Rng, alpha: readonly string[], n: number): [string, string] {
  const a = word(rng, alpha, n);
  let b = word(rng, alpha, n);
  for (let i = 0; i < 8 && b === a; i++) b = word(rng, alpha, n);
  if (b === a) {
    const flip = alpha.find((ch) => ch !== a[0]) ?? alpha[0];
    b = flip.repeat(n);
  }
  return [a, b];
}

function int(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function pick<T>(rng: Rng, xs: readonly T[]): T {
  return xs[Math.floor(rng() * xs.length)]!;
}

function take<T>(rng: Rng, xs: readonly T[], n: number): T[] {
  const copy = [...xs];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = swap;
  }
  return copy.slice(0, Math.min(n, copy.length));
}
