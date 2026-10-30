import { brzozowski } from "./brzozowski";
import { determinize } from "./determinize";
import { hopcroft } from "./hopcroft";
import { dfaTags, nfaTags } from "./nfa";
import { collectSyms, groundAst, parseAlphabet, parseProgram, parseRegex, RxError, stampGroups } from "./parse";
import { buildThompson } from "./thompson";
import { tagsKey, type BrzResult, type DFA, type Group, type HopResult, type NFA, type Pattern } from "./types";

export type AlgoResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type Model = {
  patterns: Pattern[];
  alphabet: string[];
  nfa: NFA;
  lazy: ReturnType<typeof determinize>;
  thompson: ReturnType<typeof determinize>;
  hopLazy: AlgoResult<HopResult>;
  brzLazy: AlgoResult<BrzResult>;
  hopThom: AlgoResult<HopResult>;
  brzThom: AlgoResult<BrzResult>;
  iso: {
    lazyVsThom: boolean;
    hopLazyVsBrz: boolean;
    hopThomVsBrz: boolean;
    minsAcross: boolean;
  };
};

export type Compile =
  | { ok: true; model: Model }
  | { ok: false; message: string; line?: number; column?: number };

function failOf(e: unknown): string {
  return e instanceof Error ? e.message : "构造失败";
}

function guard<T>(fn: () => T): AlgoResult<T> {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false, error: failOf(e) };
  }
}

export function isomorphic(a: DFA, b: DFA): boolean {
  if (a.alphabet.length !== b.alphabet.length) return false;
  for (const s of a.alphabet) if (!b.alphabet.includes(s)) return false;
  const map = new Map<number, number>();
  const qa = [a.start];
  const qb = [b.start];
  map.set(a.start, b.start);
  const seenB = new Set<number>([b.start]);
  let i = 0;
  while (i < qa.length) {
    const x = qa[i];
    const y = qb[i];
    i++;
    if (tagsKey(a.accept[x] ?? []) !== tagsKey(b.accept[y] ?? [])) return false;
    for (const sym of a.alphabet) {
      const nx = a.delta[x][a.alphabet.indexOf(sym)];
      const ny = b.delta[y][b.alphabet.indexOf(sym)];
      if (nx < 0 || ny < 0) {
        if (nx !== ny) return false;
        continue;
      }
      if (!map.has(nx)) {
        map.set(nx, ny);
        qa.push(nx);
        qb.push(ny);
        seenB.add(ny);
      } else if (map.get(nx) !== ny) return false;
    }
  }
  return map.size === a.states.length && seenB.size === b.states.length;
}

export function compile(source: string, alphabetText: string): Compile {
  try {
    const raw = parseProgram(source);
    const patterns: Pattern[] = raw.map((rule, id) => {
      const groups: Group[] = [];
      const ast = stampGroups(parseRegex(rule.source, rule.line), id, groups);
      return { id, name: rule.name, source: rule.source, ast, line: rule.line, groups };
    });
    const syms = new Set(parseAlphabet(alphabetText));
    let needsAny = false;
    const neg: string[][] = [];
    for (const p of patterns) {
      const info = collectSyms(p.ast, syms);
      if (info.any) needsAny = true;
      for (const n of info.neg) {
        neg.push(n.syms);
        for (const s of n.syms) syms.add(s);
      }
    }
    if ((needsAny || neg.length) && syms.size === 0) {
      return {
        ok: false,
        message: "用了「.」或否定字符类，但字母表是空的。在字母表栏填 a b c，或改成具体字符",
      };
    }
    const alphabet = [...syms].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
    if (alphabet.length > 36) {
      return { ok: false, message: `字母表有 ${alphabet.length} 个符号，超过 36。缩小字符类或字母表` };
    }
    const grounded = patterns.map((p) => {
      const groups: Group[] = [];
      const ast = stampGroups(groundAst(p.ast, alphabet), p.id, groups);
      return { ...p, ast, groups };
    });
    const nfa = buildThompson(grounded, alphabet);
    const names = grounded.map((p) => p.name);
    const lazy = determinize(nfa, "dfs", names);
    const thompson = determinize(nfa, "bfs", names);
    const hopLazy = guard(() => hopcroft(lazy.dfa, names));
    const hopThom = guard(() => hopcroft(thompson.dfa, names));
    const brzLazy = guard(() => brzozowski(lazy.dfa, names));
    const brzThom = guard(() => brzozowski(thompson.dfa, names));
    const hopL = hopLazy.ok ? hopLazy.value.dfa : null;
    const hopT = hopThom.ok ? hopThom.value.dfa : null;
    const brzL = brzLazy.ok ? brzLazy.value.dfa : null;
    const brzT = brzThom.ok ? brzThom.value.dfa : null;
    return {
      ok: true,
      model: {
        patterns: grounded,
        alphabet,
        nfa,
        lazy,
        thompson,
        hopLazy,
        brzLazy,
        hopThom,
        brzThom,
        iso: {
          lazyVsThom: isomorphic(lazy.dfa, thompson.dfa),
          hopLazyVsBrz: hopL && brzL ? isomorphic(hopL, brzL) : false,
          hopThomVsBrz: hopT && brzT ? isomorphic(hopT, brzT) : false,
          minsAcross: hopL && hopT ? isomorphic(hopL, hopT) : false,
        },
      },
    };
  } catch (e) {
    if (e instanceof RxError) return { ok: false, message: e.message, line: e.line, column: e.column };
    return { ok: false, message: failOf(e) };
  }
}

export function agrees(nfa: NFA, dfa: DFA, words: string[][]): string | null {
  for (const w of words) {
    const a = nfaTags(nfa, w).join(",");
    const b = dfaTags(dfa, w).join(",");
    if (a !== b) return `「${w.join("") || "ε"}」 NFA={${a}} DFA={${b}}`;
  }
  return null;
}
