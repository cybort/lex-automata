import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dices, Download, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { AutomatonFigure } from "@/components/lexica/graph";
import { randomProgram } from "@/lib/automata/random";
import { lazyWalk, matchDfa, matchNfa, simulateCaptures, textToSymbols, witnesses, type Capture } from "@/lib/automata/match";
import { printAst } from "@/lib/automata/parse";
import { compile, type Model } from "@/lib/automata/pipeline";
import type { BrzPhase, DFA, HopFrame, NFA, Note } from "@/lib/automata/types";
import { viewDfa, viewNfa, type ViewModel } from "@/lib/automata/view";

const PRESETS = [
  { name: "以 abb 结尾", source: "(a|b)*abb" },
  { name: "a(b|c)*", source: "a(b|c)*" },
  { name: "a*b", source: "a*b" },
  { name: "奇数二进制", source: "(0|1)*1" },
  { name: "规则集合", source: "整数: (0|1)+\n标识: (a|b)(a|b|0|1)*" },
  { name: "捕获", source: "键值: (?<键>[ab]+):(?<值>[01]+)" },
  { name: "中文", source: "你: 你\n好: 你好+" },
];

const STAGES = [
  { id: "grammar", label: "文法" },
  { id: "thompson", label: "Thompson" },
  { id: "determinize", label: "确定化" },
  { id: "minimize", label: "最小化" },
  { id: "match", label: "匹配" },
] as const;

type Stage = (typeof STAGES)[number]["id"];
type Pace = 900 | 560 | 280;

function embed(value: string) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

async function downloadStandalone(source: string, alphabet: string) {
  const seed =
    `<script id="lexica-seed">try{localStorage.setItem("lexica-source",${embed(source)});` +
    `localStorage.setItem("lexica-alpha",${embed(alphabet)});}catch(e){}</script>`;
  const marker = '<script type="module">';
  let html = "";
  try {
    const url = new URL("lexica-standalone.html", window.location.href);
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      if (text.includes(marker)) html = text;
    }
  } catch {
    html = "";
  }
  if (!html) html = `<!doctype html>\n${document.documentElement.outerHTML}`;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("这份页面没有打成单文件，没法导出。");
  // 只改模块脚本之前的头部。模板源码里也有这段标记，扫整份文件会把脚本截断。
  const head = html.slice(0, start).replace(/<script id="lexica-seed">[\s\S]*?<\/script>/g, "");
  html = head + seed + html.slice(start);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  const href = URL.createObjectURL(blob);
  a.href = href;
  a.download = "词法机.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

const OPS = [
  ["连接", "ab", "先 a 再 b"],
  ["选择", "a|b", "a 或 b"],
  ["星", "a*", "零次或多次"],
  ["加", "a+", "至少一次"],
  ["可选", "a?", "零次或一次"],
  ["分组", "(?:ab)*", "整体重复，不记文本"],
  ["捕获", "(?<名>ab)", "给这段文本贴标签"],
  ["字符类", "[0-1]", "范围内任一字符"],
  ["任意", ".", "字母表里的任一字符"],
  ["空串", "ε", "不消耗字符"],
  ["转义", "\\.", "点本身，不是任意字符"],
];

export function Workbench() {
  const [source, setSource] = useState(PRESETS[0].source);
  const [alphabet, setAlphabet] = useState("");
  const [stage, setStage] = useState<Stage>("thompson");
  const [showDead, setShowDead] = useState(true);
  const [pace, setPace] = useState<Pace>(560);
  const [ready, setReady] = useState(false);
  const [exportFault, setExportFault] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lexica-source");
      const alpha = localStorage.getItem("lexica-alpha");
      if (saved) setSource(saved);
      if (alpha) setAlphabet(alpha);
    } catch {
      /* 用文件打开时浏览器可能禁用本地存储 */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("lexica-source", source);
      localStorage.setItem("lexica-alpha", alphabet);
    } catch {
      /* 同上 */
    }
  }, [ready, source, alphabet]);

  const compiled = useMemo(() => compile(source, alphabet), [source, alphabet]);

  return (
    <main className="mx-auto w-full max-w-wide px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-sage uppercase">Lexica</p>
          <h1 className="text-3xl font-medium tracking-tight text-fg">词法机</h1>
        </div>
        <p className="max-w-md text-sm text-muted">
          正则集合摊成 Thompson NFA、惰性 DFA 和完全子集 DFA，再并排做 Hopcroft 与 Brzozowski 最小化。
        </p>
      </header>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-4">
      <section className="rounded-md border border-line bg-surface p-4 lg:col-span-1">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              let next = randomProgram();
              for (let i = 0; i < 6 && next === source; i++) next = randomProgram();
              setSource(next);
              setAlphabet("");
            }}
            className="inline-flex h-11 items-center gap-1.5 rounded-sm bg-sage px-3 text-sm text-ink hover:bg-fg"
          >
            <Dices className="size-4" aria-hidden />
            随机集合
          </button>
          <button
            type="button"
            onClick={() => {
              setExportFault("");
              void downloadStandalone(source, alphabet).catch((err: unknown) => {
                setExportFault(err instanceof Error ? err.message : "导出失败");
              });
            }}
            className="inline-flex h-11 items-center gap-1.5 rounded-sm border border-sage px-3 text-sm text-sage hover:bg-sage hover:text-ink"
          >
            <Download className="size-4" aria-hidden />
            导出静态页
          </button>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setSource(p.source)}
              className="h-11 rounded-sm border border-line px-3 text-sm text-fg hover:border-sage"
            >
              {p.name}
            </button>
          ))}
        </div>
        {exportFault ? <p className="mt-2 text-sm text-ember">{exportFault}</p> : null}
        <label className="mt-4 block text-sm text-muted" htmlFor="rules">
          规则。一行一条。<span className="font-mono text-fg">名字: 表达式</span> 给规则贴标签，没有冒号就按 R1、R2 编号。# 开头是注释。捕获写成{" "}
          <span className="font-mono text-fg">{"(?<名字>…)"}</span> 或 <span className="font-mono text-fg">(…)</span>，只分组用{" "}
          <span className="font-mono text-fg">{"(?:…)"}</span>。
        </label>
        <textarea
          id="rules"
          value={source}
          spellCheck={false}
          onChange={(e) => setSource(e.target.value)}
          className="mt-2 min-h-24 w-full resize-y rounded-sm border border-line bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus-visible:border-sage"
        />
        <label className="mt-4 block text-sm text-muted" htmlFor="alpha">
          字母表。留空就从表达式里收集。写上额外字符后，「.」和否定字符类会把它们算进去。
        </label>
        <input
          id="alpha"
          value={alphabet}
          spellCheck={false}
          onChange={(e) => setAlphabet(e.target.value)}
          placeholder="a b 0 1"
          className="mt-2 h-11 w-full rounded-sm border border-line bg-bg px-3 font-mono text-sm text-fg outline-none placeholder:text-muted focus-visible:border-sage"
        />
        {compiled.ok ? <Counts model={compiled.model} /> : <Fault failure={compiled} source={source} />}
      </section>

      <div className="min-w-0 lg:col-span-3">
      <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="构造阶段">
        {STAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={stage === item.id}
            onClick={() => setStage(item.id)}
            className={
              "h-11 shrink-0 rounded-sm px-4 text-sm " +
              (stage === item.id ? "bg-sage text-ink" : "border border-line text-fg hover:border-sage")
            }
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowDead((v) => !v)}
          className="ml-auto h-11 shrink-0 rounded-sm border border-line px-3 text-sm text-muted hover:text-fg"
          aria-pressed={showDead}
        >
          {showDead ? "死状态显示中" : "死状态已隐藏"}
        </button>
      </div>

      <div className="mt-4">
        {!compiled.ok ? null : stage === "grammar" ? (
          <Grammar model={compiled.model} />
        ) : stage === "thompson" ? (
          <Thompson model={compiled.model} pace={pace} setPace={setPace} />
        ) : stage === "determinize" ? (
          <Determinize model={compiled.model} showDead={showDead} pace={pace} setPace={setPace} />
        ) : stage === "minimize" ? (
          <Minimize model={compiled.model} showDead={showDead} pace={pace} setPace={setPace} />
        ) : (
          <Match model={compiled.model} showDead={showDead} pace={pace} setPace={setPace} />
        )}
      </div>
      </div>
      </div>
    </main>
  );
}

function Counts({ model }: { model: Model }) {
  const hop = model.hopThom.ok ? String(model.hopThom.value.dfa.states.length) : "—";
  const items = [
    ["NFA", String(model.nfa.states.length)],
    ["惰性 DFA", String(model.lazy.dfa.states.length)],
    ["Thompson DFA", String(model.thompson.dfa.states.length)],
    ["最小", hop],
  ];
  return (
    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="text-muted">{k}</dt>
          <dd className="text-sage">{v}</dd>
        </div>
      ))}
      <div className="text-muted">字母表 {model.alphabet.join(" ") || "ε"}</div>
    </dl>
  );
}

function Fault({
  failure,
  source,
}: {
  failure: { message: string; line?: number; column?: number };
  source: string;
}) {
  const line = failure.line ? source.split(/\r?\n/)[failure.line - 1] : "";
  return (
    <div className="mt-4 border-l-2 border-ember bg-bg px-3 py-3 text-sm">
      <p className="text-ember">{failure.message}</p>
      {failure.line ? <p className="mt-2 font-mono text-xs text-muted">第 {failure.line} 行</p> : null}
      {line ? (
        <pre className="mt-1 overflow-x-auto font-mono text-sm text-fg">
          {line}
          {"\n"}
          {" ".repeat(failure.column ?? 0)}^
        </pre>
      ) : null}
    </div>
  );
}

function Grammar({ model }: { model: Model }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-md border border-line bg-surface p-4">
        <h2 className="text-lg text-fg">规则</h2>
        <ul className="mt-3 space-y-4">
          {model.patterns.map((p) => (
            <li key={p.id}>
              <p className="font-mono text-sm text-sage">{p.name}</p>
              <p className="mt-1 font-mono text-sm text-fg">{printAst(p.ast)}</p>
              {p.groups.length ? (
                <p className="mt-1 font-mono text-xs text-sage">
                  捕获{" "}
                  {p.groups
                    .map((g) => (g.name === String(g.slot) ? g.name : `${g.slot}:${g.name}`))
                    .join(" · ")}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-muted">第 {p.line} 行原文 {p.source}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-md border border-line bg-surface p-4">
        <h2 className="text-lg text-fg">写法</h2>
        <table className="mt-3 w-full text-left text-sm">
          <tbody>
            {OPS.map(([name, sample, meaning]) => (
              <tr key={name} className="border-t border-line">
                <th className="py-2 pr-3 font-normal text-muted">{name}</th>
                <td className="py-2 pr-3 font-mono text-fg">{sample}</td>
                <td className="py-2 text-fg">{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Thompson({ model, pace, setPace }: { model: Model; pace: Pace; setPace: (p: Pace) => void }) {
  const notes = model.nfa.steps;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [model]);
  const safe = Math.min(step, Math.max(0, notes.length - 1));
  const note = notes[safe];
  const view = viewNfa(model.nfa, {
    step: note?.step ?? 0,
    names: model.patterns.map((p) => p.name),
    hot: [],
    hotEdges: [],
  });
  return (
    <StageShell
      kicker="Thompson 构造"
      title="自底向上把表达式焊成 NFA"
      body="字面量是一条边。连接、选择、星号各自加 ε。多条规则共用一个起点，接受态带着规则名。"
    >
      <AutomatonFigure model={view} machineKey={`nfa-${safe}`} caption="Thompson NFA" />
      <Player
        step={safe}
        count={notes.length}
        playing={playing}
        pace={pace}
        setPace={setPace}
        onStep={setStep}
        onPlay={setPlaying}
        note={note}
        notes={notes}
      />
    </StageShell>
  );
}

function Determinize({
  model,
  showDead,
  pace,
  setPace,
}: {
  model: Model;
  showDead: boolean;
  pace: Pace;
  setPace: (p: Pace) => void;
}) {
  return (
    <StageShell
      kicker="子集构造"
      title="同一台 NFA，两种确定化"
      body="惰性 DFA 按深度优先，一次只请求一个符号，状态沿着一条路径先长出来。Thompson DFA 按广度把每个状态的整行字母表一次铺开。全部请求完之后两者同构，只是出生顺序不同。"
    >
      <p className="mb-3 font-mono text-sm text-muted">
        完全展开 {model.lazy.dfa.states.length} 个状态
        {model.iso.lazyVsThom ? " · 同构校验通过" : " · 同构校验失败"}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <DetPane
          title="惰性 DFA"
          kicker="深度优先，按需请求"
          dfa={model.lazy.dfa}
          log={model.lazy.log}
          names={model.patterns.map((p) => p.name)}
          showDead={showDead}
          pace={pace}
          setPace={setPace}
          resetKey={model.nfa.states.length + model.alphabet.join("")}
        />
        <DetPane
          title="Thompson DFA"
          kicker="广度优先，完全子集"
          dfa={model.thompson.dfa}
          log={model.thompson.log}
          names={model.patterns.map((p) => p.name)}
          showDead={showDead}
          pace={pace}
          setPace={setPace}
          resetKey={`b${model.nfa.states.length}${model.alphabet.join("")}`}
        />
      </div>
    </StageShell>
  );
}

function DetPane({
  title,
  kicker,
  dfa,
  log,
  names,
  showDead,
  pace,
  setPace,
  resetKey,
}: {
  title: string;
  kicker: string;
  dfa: DFA;
  log: Note[];
  names: string[];
  showDead: boolean;
  pace: Pace;
  setPace: (p: Pace) => void;
  resetKey: string;
}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [resetKey]);
  const safe = Math.min(step, Math.max(0, log.length - 1));
  const note = log[safe];
  const view = viewDfa(dfa, {
    step: note?.step ?? 0,
    names,
    hot: [],
    hotEdges: [],
    showDead,
  });
  return (
    <div>
      <p className="font-mono text-xs text-sage uppercase">{kicker}</p>
      <h3 className="mt-1 text-lg text-fg">{title}</h3>
      <div className="mt-3">
        <AutomatonFigure model={view} machineKey={`${title}-${safe}-${showDead}`} caption={title} />
        <Player step={safe} count={log.length} playing={playing} pace={pace} setPace={setPace} onStep={setStep} onPlay={setPlaying} note={note} notes={log} />
      </div>
    </div>
  );
}

function Minimize({
  model,
  showDead,
  pace,
  setPace,
}: {
  model: Model;
  showDead: boolean;
  pace: Pace;
  setPace: (p: Pace) => void;
}) {
  const [which, setWhich] = useState<"thompson" | "lazy">("thompson");
  const names = model.patterns.map((p) => p.name);
  const base = which === "thompson" ? model.thompson.dfa : model.lazy.dfa;
  const hop = which === "thompson" ? model.hopThom : model.hopLazy;
  const brz = which === "thompson" ? model.brzThom : model.brzLazy;
  const iso = which === "thompson" ? model.iso.hopThomVsBrz : model.iso.hopLazyVsBrz;
  return (
    <StageShell
      kicker="并行最小化"
      title="Hopcroft 细化，Brzozowski 两次反转"
      body="Hopcroft 用接受标签做初始划分，再按「谁能走进被观察的块」把块拆开。Brzozowski 把边反向再确定化，做两遍，直接得到最小 DFA。多条规则标签不同时，反转前会先接上探针，避免不同规则被当成同一种接受。"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["thompson", "在 Thompson DFA 上"],
            ["lazy", "在惰性 DFA 上"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setWhich(id)}
            className={"h-11 rounded-sm px-3 text-sm " + (which === id ? "bg-sage text-ink" : "border border-line text-fg")}
          >
            {label}
          </button>
        ))}
        <p className={"font-mono text-sm " + (iso ? "text-sage" : "text-ember")}>
          {iso ? "两台最小机同构" : "两台最小机不同构"}
          {model.iso.minsAcross ? " · 惰性与 Thompson 的最小机也同构" : ""}
        </p>
      </div>
      <div className="mb-4 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left font-mono text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-2 font-normal">机器</th>
              <th className="py-2 font-normal">展开</th>
              <th className="py-2 font-normal">Hopcroft</th>
              <th className="py-2 font-normal">Brzozowski</th>
            </tr>
          </thead>
          <tbody>
            <CountRow label="惰性 DFA" n={model.lazy.dfa.states.length} hop={model.hopLazy} brz={model.brzLazy} />
            <CountRow label="Thompson DFA" n={model.thompson.dfa.states.length} hop={model.hopThom} brz={model.brzThom} />
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {hop.ok ? (
          <HopPane dfa={base} result={hop.value} names={names} showDead={showDead} pace={pace} setPace={setPace} resetKey={which + base.states.length} />
        ) : (
          <p className="text-sm text-ember">{hop.error}</p>
        )}
        {brz.ok ? (
          <BrzPane result={brz.value} names={names} showDead={showDead} pace={pace} setPace={setPace} resetKey={which + "b"} />
        ) : (
          <p className="text-sm text-ember">{brz.error}</p>
        )}
      </div>
    </StageShell>
  );
}

function CountRow({
  label,
  n,
  hop,
  brz,
}: {
  label: string;
  n: number;
  hop: Model["hopThom"];
  brz: Model["brzThom"];
}) {
  return (
    <tr className="border-t border-line text-fg">
      <td className="py-2">{label}</td>
      <td className="py-2">{n}</td>
      <td className="py-2">{hop.ok ? hop.value.dfa.states.length : hop.error}</td>
      <td className="py-2">{brz.ok ? brz.value.dfa.states.length : brz.error}</td>
    </tr>
  );
}

function HopPane({
  dfa,
  result,
  names,
  showDead,
  pace,
  setPace,
  resetKey,
}: {
  dfa: DFA;
  result: { dfa: DFA; frames: HopFrame[] };
  names: string[];
  showDead: boolean;
  pace: Pace;
  setPace: (p: Pace) => void;
  resetKey: string;
}) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [resetKey]);
  const frames = result.frames;
  const safe = Math.min(step, Math.max(0, frames.length - 1));
  const frame = frames[safe];
  const view = frame?.result
    ? viewDfa(result.dfa, { step: null, names, hot: [], hotEdges: [], showDead })
    : viewDfa(dfa, { step: null, names, hot: [], hotEdges: [], blocks: frame?.blocks, showDead });
  const notes = frames.map((f) => ({ step: f.step, title: f.title, detail: f.detail }));
  return (
    <div>
      <p className="font-mono text-xs text-sage uppercase">划分细化</p>
      <h3 className="mt-1 text-lg text-fg">Hopcroft</h3>
      <div className="mt-3">
        <AutomatonFigure model={view} machineKey={`hop-${resetKey}-${safe}-${showDead}`} caption="Hopcroft" />
        <Player step={safe} count={frames.length} playing={playing} pace={pace} setPace={setPace} onStep={setStep} onPlay={setPlaying} note={frame} notes={notes} />
        {frame && !frame.result ? (
          <p className="mt-2 font-mono text-xs text-muted">工作表 {frame.work.length ? frame.work.join("  ") : "空"}</p>
        ) : null}
      </div>
    </div>
  );
}

function BrzPane({
  result,
  names,
  showDead,
  pace,
  setPace,
  resetKey,
}: {
  result: { dfa: DFA; phases: BrzPhase[] };
  names: string[];
  showDead: boolean;
  pace: Pace;
  setPace: (p: Pace) => void;
  resetKey: string;
}) {
  const flat = useMemo(() => flatten(result.phases), [result]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [resetKey]);
  const safe = Math.min(step, Math.max(0, flat.length - 1));
  const cur = flat[safe];
  const view = cur ? phaseView(cur, names, showDead) : { nodes: [], edges: [], start: 0 };
  const notes = flat.map((f, i) => ({ step: i, title: f.title, detail: f.detail }));
  return (
    <div>
      <p className="font-mono text-xs text-sage uppercase">反转 · 确定化 · 反转 · 确定化</p>
      <h3 className="mt-1 text-lg text-fg">Brzozowski</h3>
      <div className="mt-3">
        <AutomatonFigure model={view} machineKey={`brz-${resetKey}-${safe}-${showDead}`} caption="Brzozowski" />
        <Player
          step={safe}
          count={flat.length}
          playing={playing}
          pace={pace}
          setPace={setPace}
          onStep={setStep}
          onPlay={setPlaying}
          note={cur}
          notes={notes}
        />
      </div>
    </div>
  );
}

function flatten(phases: BrzPhase[]) {
  const out: { title: string; detail: string; phase: BrzPhase; inner: number | null }[] = [];
  for (const phase of phases) {
    if (phase.log && phase.log.length > 1) {
      for (const note of phase.log) {
        out.push({ title: `${phase.title} · ${note.title}`, detail: note.detail, phase, inner: note.step });
      }
    } else {
      out.push({ title: phase.title, detail: phase.detail, phase, inner: null });
    }
  }
  return out;
}

function phaseView(
  cur: { phase: BrzPhase; inner: number | null },
  names: string[],
  showDead: boolean,
): ViewModel {
  const finalIds = new Set(["min", "proj", "src"]);
  const phaseNames = finalIds.has(cur.phase.id) ? names : ["接受"];
  if (cur.phase.kind === "nfa" && cur.phase.nfa) {
    return viewNfa(cur.phase.nfa, { step: null, names: ["接受"], hot: [], hotEdges: [] });
  }
  if (cur.phase.dfa) {
    return viewDfa(cur.phase.dfa, {
      step: cur.inner,
      names: phaseNames,
      hot: [],
      hotEdges: [],
      showDead,
    });
  }
  return { nodes: [], edges: [], start: 0 };
}

function Match({
  model,
  showDead,
  pace,
  setPace,
}: {
  model: Model;
  showDead: boolean;
  pace: Pace;
  setPace: (p: Pace) => void;
}) {
  const names = model.patterns.map((p) => p.name);
  const [text, setText] = useState("abb");
  const [mode, setMode] = useState<"nfa" | "lazy" | "hop" | "brz">("nfa");
  const symbols = textToSymbols(text);
  const caps = useMemo(() => simulateCaptures(model.nfa, symbols), [model, text]);
  const hopDfa = model.hopThom.ok ? model.hopThom.value.dfa : model.thompson.dfa;
  const brzDfa = model.brzThom.ok ? model.brzThom.value.dfa : model.thompson.dfa;
  const lazy = useMemo(() => lazyWalk(model.nfa, symbols, names), [model, text, names]);
  const frames = useMemo(() => {
    if (mode === "nfa") return matchNfa(model.nfa, symbols, names);
    if (mode === "lazy") return lazy.frames;
    if (mode === "hop") return matchDfa(hopDfa, symbols, names);
    return matchDfa(brzDfa, symbols, names);
  }, [mode, model, symbols, names, lazy, hopDfa, brzDfa]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [text, mode, model]);
  const safe = Math.min(step, Math.max(0, frames.length - 1));
  const frame = frames[safe];
  const view = matchView(mode, model.nfa, lazy.dfa, hopDfa, brzDfa, frame, names, showDead);
  const samples = witnesses(hopDfa, names);
  const verdict = frames[frames.length - 1];
  return (
    <StageShell
      kicker="匹配回放"
      title="把文本喂进四台机器"
      body="NFA 用活动集和 ε-闭包。惰性 DFA 只沿着这段文本现算子集。最小 DFA 在完整转移上一步一格。捕获组写在 Thompson 的 ε 边上，开时记下位置，闭时截断；同一组再碰上就覆盖。"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["nfa", "Thompson 模拟"],
            ["lazy", "惰性展开"],
            ["hop", "Hopcroft"],
            ["brz", "Brzozowski"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={"h-11 rounded-sm px-3 text-sm " + (mode === id ? "bg-sage text-ink" : "border border-line text-fg")}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="text-sm text-muted" htmlFor="sample">
        待匹配文本。整串必须属于某条规则才算接受。
      </label>
      <input
        id="sample"
        value={text}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        className="mt-2 h-11 w-full rounded-sm border border-line bg-bg px-3 font-mono text-sm text-fg outline-none focus-visible:border-sage"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {samples.map((w) => (
          <button
            key={w.kind + w.label + w.symbols.join("")}
            type="button"
            onClick={() => setText(w.symbols.join(""))}
            className="h-11 rounded-sm border border-line px-3 font-mono text-sm text-fg hover:border-sage"
          >
            {w.kind === "accept" ? w.label : "拒绝"} {w.symbols.join("") || "ε"}
          </button>
        ))}
      </div>
      <Tape
        symbols={symbols}
        index={frame?.index ?? 0}
        verdict={verdict?.verdict}
        tags={verdict?.tags ?? []}
        names={names}
        captures={caps[frame?.index ?? 0] ?? []}
      />
      <div className="mt-3">
        <AutomatonFigure model={view} machineKey={`m-${mode}-${safe}-${text}`} caption={mode === "lazy" ? `惰性 ${lazy.dfa.states.length} 状态 / 完全 ${model.thompson.dfa.states.length}` : "匹配"} />
        <Player
          step={safe}
          count={frames.length}
          playing={playing}
          pace={pace}
          setPace={setPace}
          onStep={setStep}
          onPlay={setPlaying}
          note={frame}
          notes={frames.map((f) => ({ step: f.step, title: f.title, detail: f.detail }))}
        />
      </div>
    </StageShell>
  );
}

function matchView(
  mode: "nfa" | "lazy" | "hop" | "brz",
  nfa: NFA,
  lazy: DFA,
  hop: DFA,
  brz: DFA,
  frame: { active: number[]; hot: { from: number; to: number; sym: string }[]; step: number } | undefined,
  names: string[],
  showDead: boolean,
): ViewModel {
  const hot = frame?.active ?? [];
  const hotEdges = frame?.hot ?? [];
  if (mode === "nfa") return viewNfa(nfa, { step: null, names, hot, hotEdges });
  const dfa = mode === "lazy" ? lazy : mode === "hop" ? hop : brz;
  return viewDfa(dfa, {
    step: mode === "lazy" ? (frame?.step ?? 0) : null,
    names,
    hot,
    hotEdges,
    showDead,
  });
}

function Tape({
  symbols,
  index,
  verdict,
  tags,
  names,
  captures,
}: {
  symbols: string[];
  index: number;
  verdict?: string;
  tags: number[];
  names: string[];
  captures: Capture[];
}) {
  const done = verdict === "accept" || verdict === "reject";
  const live = verdict === "accept" ? captures.filter((c) => tags.includes(c.rule)) : captures;
  const marked = new Set<number>();
  for (const cap of live) {
    if (cap.start === null || cap.end === null) continue;
    for (let i = cap.start; i < cap.end; i++) marked.add(i);
  }
  return (
    <div className="mt-4 rounded-md border border-line bg-surface px-3 py-3">
      <div className="flex flex-wrap gap-1 font-mono text-lg">
        {symbols.length === 0 ? <span className="text-muted">ε</span> : null}
        {symbols.map((ch, i) => (
          <span
            key={`${ch}-${i}`}
            className={
              "inline-flex h-11 min-w-8 items-center justify-center px-1 " +
              (i < index ? "text-muted " : i === index && !done ? "bg-sage text-ink " : "text-fg ") +
              (marked.has(i) ? "border-b-2 border-sage" : "")
            }
          >
            {ch}
          </span>
        ))}
      </div>
      <p className={"mt-2 text-sm " + (verdict === "accept" ? "text-sage" : verdict === "reject" ? "text-ember" : "text-muted")}>
        {verdict === "accept"
          ? `接受 ${tags.map((id) => names[id] ?? id).join(" · ")}`
          : verdict === "reject"
            ? "拒绝"
            : "还在走"}
      </p>
      {live.length ? (
        <p className="mt-2 font-mono text-sm text-fg">
          {live.map((cap) => (
            <span key={cap.id} className="mr-4">
              {cap.name}={cap.end === null ? `${cap.text}…` : cap.text || "ε"}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

function StageShell({
  kicker,
  title,
  body,
  children,
}: {
  kicker: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="font-mono text-xs tracking-wide text-sage uppercase">{kicker}</p>
      <h2 className="mt-1 text-2xl text-fg">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">{body}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Player({
  step,
  count,
  playing,
  pace,
  setPace,
  onStep,
  onPlay,
  note,
  notes,
}: {
  step: number;
  count: number;
  playing: boolean;
  pace: Pace;
  setPace: (p: Pace) => void;
  onStep: (n: number) => void;
  onPlay: (p: boolean) => void;
  note?: { title: string; detail: string };
  notes: Note[];
}) {
  useEffect(() => {
    if (!playing) return;
    if (count <= 1 || step >= count - 1) {
      onPlay(false);
      return;
    }
    const id = window.setInterval(() => {
      onStep(step + 1);
    }, pace);
    return () => window.clearInterval(id);
  }, [playing, step, count, pace, onStep, onPlay]);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="flex size-11 items-center justify-center rounded-sm border border-line" aria-label="上一步" onClick={() => onStep(Math.max(0, step - 1))}>
          <SkipBack className="size-4" />
        </button>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-sm bg-sage text-ink"
          aria-label={playing ? "暂停" : "播放"}
          onClick={() => {
            if (!playing && step >= count - 1) onStep(0);
            onPlay(!playing);
          }}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button type="button" className="flex size-11 items-center justify-center rounded-sm border border-line" aria-label="下一步" onClick={() => onStep(Math.min(count - 1, step + 1))}>
          <SkipForward className="size-4" />
        </button>
        <p className="font-mono text-sm text-muted">
          {count ? step + 1 : 0}/{count}
        </p>
        <div className="ml-auto flex gap-1">
          {(
            [
              [900, "慢"],
              [560, "中"],
              [280, "快"],
            ] as const
          ).map(([ms, label]) => (
            <button
              key={ms}
              type="button"
              onClick={() => setPace(ms)}
              className={"h-11 rounded-sm px-3 text-sm " + (pace === ms ? "bg-raised text-fg" : "text-muted")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {note ? (
        <div className="mt-3">
          <p className="text-base text-fg">{note.title}</p>
          <p className="mt-1 text-sm text-muted">{note.detail}</p>
        </div>
      ) : null}
      <ol className="mt-3 max-h-48 space-y-1 overflow-y-auto pr-1">
        {notes.map((item, i) => (
          <li key={`${item.step}-${item.title}-${i}`}>
            <button
              type="button"
              onClick={() => onStep(i)}
              className={"w-full rounded-sm px-2 py-2 text-left text-sm " + (i === step ? "bg-raised text-fg" : "text-muted hover:text-fg")}
            >
              <span className="font-mono text-xs text-sage">{String(i + 1).padStart(2, "0")}</span> {item.title}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
