import { agrees, compile, isomorphic } from "./pipeline";
import { dfaTags } from "./nfa";
import { simulateCaptures } from "./match";

function words(alpha: string[], maxLen: number): string[][] {
  const out: string[][] = [[]];
  let layer: string[][] = [[]];
  for (let len = 1; len <= maxLen; len++) {
    const next: string[][] = [];
    for (const w of layer) for (const c of alpha) next.push([...w, c]);
    out.push(...next);
    layer = next;
    if (out.length > 2500) break;
  }
  return out;
}

function check(source: string, alpha = "", maxLen = 5) {
  const compiled = compile(source, alpha);
  if (!compiled.ok) throw new Error(`${source} :: ${compiled.message}`);
  const m = compiled.model;
  const bag = words(m.alphabet, Math.min(maxLen, m.alphabet.length > 4 ? 3 : maxLen));
  const machines: [string, typeof m.thompson.dfa][] = [
    ["lazy", m.lazy.dfa],
    ["thompson", m.thompson.dfa],
  ];
  if (m.hopLazy.ok) machines.push(["hop-lazy", m.hopLazy.value.dfa]);
  else throw new Error(`hop lazy failed ${source}: ${m.hopLazy.error}`);
  if (m.hopThom.ok) machines.push(["hop-thom", m.hopThom.value.dfa]);
  else throw new Error(`hop thom failed ${source}: ${m.hopThom.error}`);
  if (m.brzLazy.ok) machines.push(["brz-lazy", m.brzLazy.value.dfa]);
  else throw new Error(`brz lazy failed ${source}: ${m.brzLazy.error}`);
  if (m.brzThom.ok) machines.push(["brz-thom", m.brzThom.value.dfa]);
  else throw new Error(`brz thom failed ${source}: ${m.brzThom.error}`);
  for (const [name, dfa] of machines) {
    const bad = agrees(m.nfa, dfa, bag);
    if (bad) throw new Error(`${source} [${name}] ${bad}`);
  }
  if (!m.iso.lazyVsThom) throw new Error(`${source} lazy 与 Thompson DFA 不同构`);
  if (!m.iso.hopThomVsBrz) {
    const h = m.hopThom.ok ? m.hopThom.value.dfa : null;
    const b = m.brzThom.ok ? m.brzThom.value.dfa : null;
    const dump = (d: typeof h) =>
      d &&
      d.states
        .map(
          (s) =>
            `q${s}${d.accept[s].length ? "!" : ""}:${d.alphabet.map((sym, i) => sym + "→" + d.delta[s][i]).join(",")}`,
        )
        .join(" | ");
    throw new Error(`${source} Hopcroft 与 Brzozowski 不同构\nH ${dump(h)}\nB ${dump(b)}`);
  }
  if (!m.iso.minsAcross) throw new Error(`${source} 两台最小机不同构`);
  if (m.lazy.dfa.states.length !== m.thompson.dfa.states.length) {
    throw new Error(`${source} 状态数 ${m.lazy.dfa.states.length} vs ${m.thompson.dfa.states.length}`);
  }
  return m;
}

const cases: [string, string?, number?][] = [
  ["a"],
  ["a*"],
  ["a+"],
  ["a?"],
  ["ab"],
  ["a|b"],
  ["(ab)*"],
  ["a*b"],
  ["a(b|c)*"],
  ["(0|1)*1"],
  ["(a|b)*abb"],
  ["(a|b)+\\.(a|b)+"],
  ["ε"],
  ["a|ε"],
  ["[a-c]+"],
  [".", "ab"],
  ["[^0]*", "01"],
  ["你|好"],
  ["你: 你\n好: 你好+"],
  ["整数: (0|1)+\n标识: (a|b)(a|b|0|1)*", "", 3],
  ["p: a+\nq: a"],
  ["p: a\nq: b"],
  ["(a|b)*a(a|b)"],
];

for (const [src, alpha, len] of cases) check(src, alpha ?? "", len ?? 5);

const abb = check("(a|b)*abb");
const nAbb = abb.hopThom.ok ? abb.hopThom.value.dfa.states.length : -1;
if (nAbb !== 4) throw new Error(`(a|b)*abb 最小状态数应为 4，得到 ${nAbb}`);
const odd = check("(0|1)*1");
const nOdd = odd.hopThom.ok ? odd.hopThom.value.dfa.states.length : -1;
if (nOdd !== 2) throw new Error(`奇数二进制最小状态数应为 2，得到 ${nOdd}`);
const ab = check("a*b");
const nAb = ab.hopThom.ok ? ab.hopThom.value.dfa.states.length : -1;
if (nAb !== 3) throw new Error(`a*b 最小状态数应为 3（含死状态），得到 ${nAb}`);

const multi = check("p: a+\nq: a");
const dfa = multi.hopThom.ok ? multi.hopThom.value.dfa : null;
if (!dfa) throw new Error("multi missing");
if (dfaTags(dfa, ["a"]).join(",") !== "0,1") throw new Error(`"a" tags ${dfaTags(dfa, ["a"])}`);
if (dfaTags(dfa, ["a", "a"]).join(",") !== "0") throw new Error(`"aa" tags ${dfaTags(dfa, ["a", "a"])}`);
if (dfaTags(dfa, []).length !== 0) throw new Error("empty should reject");

if (!isomorphic(abb.thompson.dfa, abb.lazy.dfa)) throw new Error("abb iso");

function capsOf(source: string, text: string) {
  const compiled = compile(source, "");
  if (!compiled.ok) throw new Error(`${source} :: ${compiled.message}`);
  const shot = simulateCaptures(compiled.model.nfa, [...text]);
  const last = shot[shot.length - 1] ?? [];
  return last
    .filter((c) => c.end !== null)
    .map((c) => `${c.name}=${c.text}`)
    .join(",");
}

if (capsOf("(?<词>a+)b", "aaab") !== "词=aaa") throw new Error(`词 ${capsOf("(?<词>a+)b", "aaab")}`);
if (capsOf("(a*)(a*)", "aaa") !== "1=aaa,2=") throw new Error(`star ${capsOf("(a*)(a*)", "aaa")}`);
if (capsOf("(a)*", "aaa") !== "1=a") throw new Error(`last ${capsOf("(a)*", "aaa")}`);
if (capsOf("(a|b)*abb", "abb") !== "") throw new Error(`abb cap ${capsOf("(a|b)*abb", "abb")}`);
if (capsOf("(a|b)*abb", "ababb") !== "1=b") throw new Error(`ababb cap ${capsOf("(a|b)*abb", "ababb")}`);
if (capsOf("(?:a|b)*abb", "ababb") !== "") throw new Error("noncap should be empty");
if (capsOf("键值: (?<键>[ab]+):(?<值>[01]+)", "ab:01") !== "键=ab,值=01") {
  throw new Error(`kv ${capsOf("键值: (?<键>[ab]+):(?<值>[01]+)", "ab:01")}`);
}
check("(?<词>a+)b");
check("(a*)(a*)");
check("键值: (?<键>[ab]+):(?<值>[01]+)", "", 3);

console.log("selfcheck ok", cases.length, "cases");
console.log(
  "abb",
  abb.thompson.dfa.states.length,
  "→",
  nAbb,
  "a*b",
  ab.thompson.dfa.states.length,
  "→",
  nAb,
);
