import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Play, c as Dices, i as Plus, l as Crosshair, n as SkipForward, o as Pause, r as SkipBack, s as Minus } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CRWqWGxz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function layoutGraph(ids, edges, start) {
	const idSet = new Set(ids);
	const adj = /* @__PURE__ */ new Map();
	const pred = /* @__PURE__ */ new Map();
	for (const id of ids) {
		adj.set(id, []);
		pred.set(id, []);
	}
	for (const e of edges) {
		if (!idSet.has(e.from) || !idSet.has(e.to) || e.from === e.to) continue;
		adj.get(e.from).push(e.to);
		pred.get(e.to).push(e.from);
	}
	const rank = /* @__PURE__ */ new Map();
	const queue = [];
	if (idSet.has(start)) {
		rank.set(start, 0);
		queue.push(start);
	}
	while (queue.length) {
		const u = queue.shift();
		for (const v of adj.get(u) ?? []) if (!rank.has(v)) {
			rank.set(v, (rank.get(u) ?? 0) + 1);
			queue.push(v);
		}
	}
	let extra = Math.max(-1, ...rank.values()) + 1;
	for (const id of ids) if (!rank.has(id)) rank.set(id, extra++);
	const maxR = Math.max(0, ...rank.values());
	const layers = Array.from({ length: maxR + 1 }, () => []);
	for (const id of ids) layers[rank.get(id)].push(id);
	for (const layer of layers) layer.sort((a, b) => a - b);
	const avg = (xs) => xs.reduce((s, n) => s + n, 0) / xs.length;
	for (let iter = 0; iter < 6; iter++) {
		for (let r = 1; r <= maxR; r++) {
			const index = new Map(layers[r - 1].map((id, i) => [id, i]));
			const scored = layers[r].map((v, i) => {
				const ps = (pred.get(v) ?? []).filter((p) => rank.get(p) === r - 1);
				return {
					v,
					s: ps.length ? avg(ps.map((p) => index.get(p) ?? i)) : i
				};
			});
			scored.sort((a, b) => a.s - b.s || a.v - b.v);
			layers[r] = scored.map((x) => x.v);
		}
		for (let r = maxR - 1; r >= 0; r--) {
			const index = new Map(layers[r + 1].map((id, i) => [id, i]));
			const scored = layers[r].map((v, i) => {
				const ss = (adj.get(v) ?? []).filter((p) => rank.get(p) === r + 1);
				return {
					v,
					s: ss.length ? avg(ss.map((p) => index.get(p) ?? i)) : i
				};
			});
			scored.sort((a, b) => a.s - b.s || a.v - b.v);
			layers[r] = scored.map((x) => x.v);
		}
	}
	const pos = /* @__PURE__ */ new Map();
	layers.forEach((layer, r) => {
		layer.forEach((id, i) => pos.set(id, {
			x: r * 176,
			y: i * 112
		}));
	});
	return pos;
}
var R = 24;
function AutomatonFigure({ model, machineKey, caption }) {
	const uid = (0, import_react.useId)().replace(/:/g, "");
	const host = (0, import_react.useRef)(null);
	const [size, setSize] = (0, import_react.useState)({
		w: 640,
		h: 420
	});
	const [follow, setFollow] = (0, import_react.useState)(true);
	const [cam, setCam] = (0, import_react.useState)({
		x: 24,
		y: 24,
		k: 1
	});
	const [picked, setPicked] = (0, import_react.useState)(null);
	const drag = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = host.current;
		if (!el) return;
		const apply = () => setSize({
			w: el.clientWidth,
			h: el.clientHeight
		});
		apply();
		const ro = new ResizeObserver(apply);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	(0, import_react.useEffect)(() => {
		setFollow(true);
		setPicked(null);
	}, [machineKey]);
	const pos = (0, import_react.useMemo)(() => {
		return layoutGraph(model.nodes.map((n) => n.id), model.edges.map((e) => ({
			from: e.from,
			to: e.to
		})), model.start);
	}, [model]);
	const fit = (0, import_react.useMemo)(() => fitView(model, pos, size), [
		model,
		pos,
		size
	]);
	const view = follow ? fit : cam;
	const drawnEdges = model.edges.filter((e) => e.on);
	const onPointerDown = (event) => {
		if (event.button !== 0) return;
		host.current?.setPointerCapture(event.pointerId);
		const current = follow ? fit : cam;
		drag.current = {
			px: event.clientX,
			py: event.clientY,
			x: current.x,
			y: current.y,
			k: current.k
		};
		setFollow(false);
		setCam(current);
	};
	const onPointerMove = (event) => {
		const d = drag.current;
		if (!d) return;
		setCam({
			x: d.x + event.clientX - d.px,
			y: d.y + event.clientY - d.py,
			k: d.k
		});
	};
	const onPointerUp = () => {
		drag.current = null;
	};
	const zoom = (factor) => {
		const current = follow ? fit : cam;
		const cx = size.w / 2;
		const cy = size.h / 2;
		const k = Math.min(2.4, Math.max(.35, current.k * factor));
		const ratio = k / current.k;
		setFollow(false);
		setCam({
			k,
			x: cx - (cx - current.x) * ratio,
			y: cy - (cy - current.y) * ratio
		});
	};
	const bounds = (0, import_react.useMemo)(() => {
		let maxX = 240;
		let maxY = 180;
		for (const p of pos.values()) {
			maxX = Math.max(maxX, p.x + 96);
			maxY = Math.max(maxY, p.y + 96);
		}
		return {
			w: maxX,
			h: maxY
		};
	}, [pos]);
	const blocks = blockBoxes(model, pos);
	const pickedNode = model.nodes.find((n) => n.id === picked && n.on);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "overflow-hidden rounded-md border border-line bg-surface",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3 border-b border-line px-3 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "truncate font-mono text-xs tracking-wide text-muted uppercase",
				children: caption
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
						label: "缩小",
						onClick: () => zoom(1 / 1.15),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
						label: "放大",
						onClick: () => zoom(1.15),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
						label: "复位视图",
						onClick: () => {
							setFollow(true);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crosshair, { className: "size-4" })
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			ref: host,
			className: "relative h-72 touch-none md:h-96",
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel: onPointerUp,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				width: bounds.w,
				height: bounds.h,
				className: "absolute top-0 left-0 overflow-visible",
				style: {
					transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
					transformOrigin: "0 0"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("marker", {
						id: `${uid}-m`,
						viewBox: "0 0 10 8",
						refX: "9",
						refY: "4",
						markerWidth: "8",
						markerHeight: "8",
						orient: "auto-start-reverse",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M0 0 L10 4 L0 8 Z",
							fill: "var(--color-muted)"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("marker", {
						id: `${uid}-h`,
						viewBox: "0 0 10 8",
						refX: "9",
						refY: "4",
						markerWidth: "8",
						markerHeight: "8",
						orient: "auto-start-reverse",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M0 0 L10 4 L0 8 Z",
							fill: "var(--color-sage)"
						})
					})] }),
					blocks.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: b.x,
						y: b.y,
						width: b.w,
						height: b.h,
						rx: "16",
						fill: "var(--color-sage)",
						opacity: .07 + b.id % 3 * .03,
						stroke: "var(--color-sage)",
						strokeOpacity: .45
					}, b.id)),
					drawnEdges.map((e) => {
						const a = pos.get(e.from);
						const b = pos.get(e.to);
						if (!a || !b) return null;
						const drawn = drawEdge(a, b, e.from, e.to);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: drawn.d,
							fill: "none",
							stroke: e.hot ? "var(--color-sage)" : "var(--color-muted)",
							strokeWidth: e.hot ? 2.4 : 1.4,
							strokeDasharray: e.eps ? "4 4" : void 0,
							markerEnd: `url(#${uid}-${e.hot ? "h" : "m"})`
						}), e.label ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
							x: drawn.lx - e.label.length * 4.2 - 4,
							y: drawn.ly - 9,
							width: e.label.length * 8.4 + 8,
							height: 18,
							rx: "4",
							fill: "var(--color-surface)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
							x: drawn.lx,
							y: drawn.ly + 4,
							textAnchor: "middle",
							fill: e.hot ? "var(--color-sage)" : "var(--color-fg)",
							fontSize: "12",
							fontFamily: "IBM Plex Mono, ui-monospace, monospace",
							children: e.label
						})] }) : null] }, e.key);
					}),
					model.nodes.filter((n) => n.on).map((n) => {
						const p = pos.get(n.id);
						if (!p) return null;
						const sub = n.sub.length > 16 ? `${n.sub.slice(0, 15)}…` : n.sub;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
							onPointerDown: (event) => event.stopPropagation(),
							onClick: () => setPicked(n.id),
							className: "cursor-pointer",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", { children: n.tip }),
								n.accept ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									cx: p.x,
									cy: p.y,
									r: 29,
									fill: "none",
									stroke: "var(--color-sage)",
									strokeWidth: "1.4"
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
									cx: p.x,
									cy: p.y,
									r: R,
									fill: n.hot ? "var(--color-ink)" : "var(--color-raised)",
									stroke: n.hot ? "var(--color-sage)" : n.dead ? "var(--color-muted)" : "var(--color-line)",
									strokeWidth: n.hot ? 2.5 : 1.5,
									strokeDasharray: n.dead ? "3 3" : void 0
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
									x: p.x,
									y: p.y + 4,
									textAnchor: "middle",
									fill: "var(--color-fg)",
									fontSize: "13",
									fontFamily: "IBM Plex Mono, ui-monospace, monospace",
									children: n.name
								}),
								sub ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
									x: p.x,
									y: p.y + R + 16,
									textAnchor: "middle",
									fill: n.accept ? "var(--color-sage)" : "var(--color-muted)",
									fontSize: "11",
									fontFamily: "IBM Plex Mono, ui-monospace, monospace",
									children: sub
								}) : null
							]
						}, n.id);
					}),
					(() => {
						const start = model.nodes.find((n) => n.id === model.start && n.on);
						const p = pos.get(model.start);
						if (!start || !p) return null;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: p.x - 58,
							y1: p.y,
							x2: p.x - R - 2,
							y2: p.y,
							stroke: "var(--color-sage)",
							strokeWidth: "1.6",
							markerEnd: `url(#${uid}-h)`
						});
					})()
				]
			}), pickedNode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "pointer-events-none absolute right-3 bottom-3 left-3 rounded-sm bg-bg/90 px-3 py-2 font-mono text-xs text-fg",
				children: pickedNode.tip
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "pointer-events-none absolute bottom-3 left-3 font-mono text-xs text-muted",
				children: "拖动平移 · 点状态看子集"
			})]
		})]
	});
}
function IconButton({ label, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		onClick,
		className: "flex size-11 items-center justify-center rounded-sm border border-line text-fg hover:border-sage hover:text-sage",
		children
	});
}
function fitView(model, pos, size) {
	const pts = model.nodes.filter((n) => n.on).map((n) => pos.get(n.id)).filter((p) => !!p);
	if (!pts.length || size.w < 40) return {
		x: 32,
		y: 48,
		k: 1
	};
	const minX = Math.min(...pts.map((p) => p.x)) - 78;
	const maxX = Math.max(...pts.map((p) => p.x)) + 70;
	const minY = Math.min(...pts.map((p) => p.y)) - 36;
	const maxY = Math.max(...pts.map((p) => p.y)) + 56;
	const bw = Math.max(80, maxX - minX);
	const bh = Math.max(80, maxY - minY);
	const k = Math.min((size.w - 12) / bw, (size.h - 12) / bh, 1.25);
	return {
		x: (size.w - bw * k) / 2 - minX * k,
		y: (size.h - bh * k) / 2 - minY * k,
		k
	};
}
function blockBoxes(model, pos) {
	const groups = /* @__PURE__ */ new Map();
	for (const n of model.nodes) {
		if (!n.on || n.block === null) continue;
		const p = pos.get(n.id);
		if (!p) continue;
		const list = groups.get(n.block) ?? [];
		list.push(p);
		groups.set(n.block, list);
	}
	return [...groups.entries()].map(([id, pts]) => {
		const minX = Math.min(...pts.map((p) => p.x)) - 40;
		const maxX = Math.max(...pts.map((p) => p.x)) + 40;
		const minY = Math.min(...pts.map((p) => p.y)) - 36;
		const maxY = Math.max(...pts.map((p) => p.y)) + 48;
		return {
			id,
			x: minX,
			y: minY,
			w: maxX - minX,
			h: maxY - minY
		};
	});
}
function drawEdge(a, b, from, to) {
	if (from === to) {
		const y = a.y - R;
		return {
			d: `M ${a.x - 6} ${y} C ${a.x - 34} ${y - 52}, ${a.x + 34} ${y - 52}, ${a.x + 8} ${y - 2}`,
			lx: a.x,
			ly: a.y - R - 46
		};
	}
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const len = Math.hypot(dx, dy) || 1;
	const bend = (from < to ? 1 : -1) * (Math.abs(dx) < 24 ? 46 : 26);
	const c = {
		x: (a.x + b.x) / 2 + -dy / len * bend,
		y: (a.y + b.y) / 2 + dx / len * bend
	};
	const t0 = tOutside(a, c, b, a, false);
	const t1 = tOutside(a, c, b, b, true);
	const steps = 14;
	let d = "";
	let mid = pointOn(a, c, b, (t0 + t1) / 2);
	for (let i = 0; i <= steps; i++) {
		const p = pointOn(a, c, b, t0 + (t1 - t0) * i / steps);
		d += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
		if (i === Math.floor(steps / 2)) mid = p;
	}
	return {
		d,
		lx: mid.x,
		ly: mid.y - 10
	};
}
function pointOn(a, c, b, t) {
	const u = 1 - t;
	return {
		x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
		y: u * u * a.y + 2 * u * t * c.y + t * t * b.y
	};
}
function tOutside(a, c, b, center, end) {
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 14; i++) {
		const mid = (lo + hi) / 2;
		const p = pointOn(a, c, b, mid);
		const dist = Math.hypot(p.x - center.x, p.y - center.y);
		if (end) {
			if (dist < 27) hi = mid;
			else lo = mid;
		} else if (dist < 25) lo = mid;
		else hi = mid;
	}
	return end ? lo : hi;
}
function tagsKey(tags) {
	return tags.join(",");
}
function cloneTags(tags) {
	return [...tags].sort((a, b) => a - b);
}
function eClosure(nfa, seeds) {
	const seen = /* @__PURE__ */ new Set();
	const stack = [];
	for (const s of seeds) if (s >= 0 && !seen.has(s)) {
		seen.add(s);
		stack.push(s);
	}
	const used = [];
	while (stack.length) {
		const s = stack.pop();
		for (const e of nfa.adj[s] ?? []) if (e.sym === "ε" && !seen.has(e.to)) {
			seen.add(e.to);
			stack.push(e.to);
			used.push({
				from: s,
				to: e.to,
				sym: "ε",
				step: 0
			});
		}
	}
	return [...seen].sort((a, b) => a - b);
}
function eClosureTrace(nfa, seeds) {
	const seen = /* @__PURE__ */ new Set();
	const stack = [];
	for (const s of seeds) if (!seen.has(s)) {
		seen.add(s);
		stack.push(s);
	}
	const edges = [];
	while (stack.length) {
		const s = stack.pop();
		for (const e of nfa.adj[s] ?? []) if (e.sym === "ε" && !seen.has(e.to)) {
			seen.add(e.to);
			stack.push(e.to);
			edges.push({
				from: s,
				to: e.to,
				sym: "ε",
				step: 0
			});
		}
	}
	return {
		states: [...seen].sort((a, b) => a - b),
		edges
	};
}
function move(nfa, states, sym) {
	const want = new Set(states);
	const out = /* @__PURE__ */ new Set();
	const edges = [];
	for (const s of want) for (const e of nfa.adj[s] ?? []) if (e.sym === sym) {
		out.add(e.to);
		edges.push({
			from: s,
			to: e.to,
			sym,
			step: 0
		});
	}
	return {
		states: [...out].sort((a, b) => a - b),
		edges
	};
}
function indexAdj(stateCount, trans) {
	const adj = Array.from({ length: stateCount }, () => []);
	for (const t of trans) adj[t.from].push(t.ops?.length ? {
		to: t.to,
		sym: t.sym,
		ops: t.ops
	} : {
		to: t.to,
		sym: t.sym
	});
	return adj;
}
function computeDead(accept, delta) {
	const n = accept.length;
	const can = accept.map((a) => a.length > 0);
	const rev = Array.from({ length: n }, () => []);
	for (let s = 0; s < n; s++) for (const t of delta[s] ?? []) if (t >= 0 && t < n) rev[t].push(s);
	const stack = [];
	for (let i = 0; i < n; i++) if (can[i]) stack.push(i);
	while (stack.length) {
		const u = stack.pop();
		for (const v of rev[u]) if (!can[v]) {
			can[v] = true;
			stack.push(v);
		}
	}
	return can.map((c) => !c);
}
var STATE_CAP = 160;
function brief(ss) {
	if (!ss.length) return "∅";
	const inner = ss.join(",");
	return inner.length > 28 ? `{${ss.length} 个 NFA 状态}` : `{${inner}}`;
}
function tagsOf(nfa, subset) {
	const set = /* @__PURE__ */ new Set();
	for (const s of subset) for (const t of nfa.accept[s] ?? []) set.add(t);
	return [...set].sort((a, b) => a - b);
}
function determinize(nfa, order, names, seeds) {
	const alpha = nfa.alphabet;
	const startSet = eClosure(nfa, seeds ?? [nfa.start]);
	const subsets = [startSet];
	const keyOf = (ss) => ss.join(",");
	const idOf = /* @__PURE__ */ new Map([[keyOf(startSet), 0]]);
	const accept = [tagsOf(nfa, startSet)];
	const born = [0];
	const delta = [Array(alpha.length).fill(-1)];
	const edgeStep = [Array(alpha.length).fill(0)];
	const log = [{
		step: 0,
		title: "起始子集",
		detail: seeds ? `反转不引入会污染子集的辅助点。初始集合取旧接受态 ${brief(seeds)}，ε-闭包为 ${brief(startSet)}，记作 q0${accept[0].length ? `，接受 ${accept[0].map((id) => names[id] ?? id).join("·")}` : ""}。` : `从 NFA 起点 q${nfa.start} 取 ε-闭包，得到 ${brief(startSet)}，记作 DFA 的 q0${accept[0].length ? `，接受 ${accept[0].map((id) => names[id] ?? id).join("·")}` : ""}。`
	}];
	let step = 0;
	const nextSym = [0];
	const explore = (sid, si) => {
		const sym = alpha[si];
		const moved = move(nfa, subsets[sid], sym).states;
		const target = eClosure(nfa, moved);
		const k = keyOf(target);
		let tid = idOf.get(k);
		let created = false;
		if (tid === void 0) {
			if (subsets.length + 1 > STATE_CAP) throw new Error(`子集构造超过 ${STATE_CAP} 个 DFA 状态。字母表或表达式太大`);
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
		const tag = accept[tid].length ? `，接受 ${accept[tid].map((id) => names[id] ?? id).join("·")}` : "";
		log.push({
			step,
			title: created ? `新状态 q${tid}` : `回到 q${tid}`,
			detail: `请求 δ(q${sid}, ${sym})。move 得到 ${brief(moved)}，再取 ε-闭包为 ${brief(target)}${created ? "。这个子集第一次出现，分配新状态" : "。子集已经存在，复用旧状态"}${tag}。`
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
	const edges = [];
	for (let s = 0; s < n; s++) for (let si = 0; si < alpha.length; si++) {
		const t = delta[s][si];
		if (t >= 0) edges.push({
			from: s,
			to: t,
			sym: alpha[si],
			step: edgeStep[s][si]
		});
	}
	return {
		dfa: {
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
			symAlias: nfa.symAlias
		},
		log
	};
}
function booleanize(dfa) {
	return {
		...dfa,
		accept: dfa.accept.map((t) => t.length ? [0] : []),
		origins: null,
		subsets: dfa.subsets
	};
}
function reverseCore(dfa) {
	const n = dfa.states.length;
	const trans = dfa.edges.map((e) => ({
		from: e.to,
		to: e.from,
		sym: e.sym,
		step: 0
	}));
	const accept = Array.from({ length: n }, () => []);
	accept[dfa.start] = [0];
	const seeds = [];
	for (let s = 0; s < n; s++) if (dfa.accept[s].length) seeds.push(s);
	const adj = Array.from({ length: n }, () => []);
	for (const t of trans) adj[t.from].push({
		to: t.to,
		sym: t.sym
	});
	return {
		seeds,
		nfa: {
			states: Array.from({ length: n }, (_, i) => i),
			start: dfa.start,
			accept,
			trans,
			adj,
			stateStep: Array(n).fill(0),
			tagStep: Array(n).fill(0),
			alphabet: dfa.alphabet,
			symAlias: dfa.symAlias,
			steps: [],
			groups: []
		}
	};
}
function reversePicture(dfa) {
	const n = dfa.states.length;
	const trans = dfa.edges.map((e) => ({
		from: e.to,
		to: e.from,
		sym: e.sym,
		step: 0
	}));
	const start = n;
	for (let s = 0; s < n; s++) if (dfa.accept[s].length) trans.push({
		from: start,
		to: s,
		sym: "ε",
		step: 0
	});
	const accept = Array.from({ length: n + 1 }, () => []);
	accept[dfa.start] = [0];
	const stateStep = Array(n + 1).fill(0);
	const tagStep = Array(n + 1).fill(Number.POSITIVE_INFINITY);
	tagStep[dfa.start] = 0;
	const adj = Array.from({ length: n + 1 }, () => []);
	for (const t of trans) adj[t.from].push({
		to: t.to,
		sym: t.sym
	});
	return {
		states: Array.from({ length: n + 1 }, (_, i) => i),
		start,
		accept,
		trans,
		adj,
		stateStep,
		tagStep,
		alphabet: dfa.alphabet,
		symAlias: dfa.symAlias,
		steps: [{
			step: 0,
			title: "反转",
			detail: "边反向。图上的新起点只是把多个旧接受态收成一个入口；真正确定化时从这些接受态本身出发，不把辅助点算进子集。"
		}],
		groups: []
	};
}
function signatures(dfa) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const tags of dfa.accept) {
		if (!tags.length) continue;
		const k = tagsKey(tags);
		if (seen.has(k)) continue;
		seen.add(k);
		out.push(cloneTags(tags));
	}
	return out;
}
function augment(dfa, sigs, names) {
	const probes = sigs.map((tags, i) => ({
		sym: `\u0001${i}`,
		tags,
		label: `↵${tags.map((id) => names[id] ?? id).join("·")}`
	}));
	const alphabet = [...dfa.alphabet, ...probes.map((p) => p.sym)];
	const n = dfa.states.length;
	const sinkA = n;
	const sinkD = n + 1;
	const count = n + 2;
	const delta = Array.from({ length: count }, () => Array(alphabet.length).fill(sinkD));
	const idx = new Map(alphabet.map((s, i) => [s, i]));
	for (const e of dfa.edges) delta[e.from][idx.get(e.sym)] = e.to;
	const sigOf = dfa.accept.map((t) => tagsKey(t));
	for (let q = 0; q < n; q++) for (const p of probes) {
		const si = idx.get(p.sym);
		delta[q][si] = tagsKey(p.tags) === sigOf[q] ? sinkA : sinkD;
	}
	const accept = Array.from({ length: count }, () => []);
	accept[sinkA] = [0];
	const edges = [];
	for (let s = 0; s < count; s++) for (let si = 0; si < alphabet.length; si++) edges.push({
		from: s,
		to: delta[s][si],
		sym: alphabet[si],
		step: 0
	});
	const labels = Array.from({ length: count }, (_, i) => i === sinkA ? "汇" : i === sinkD ? "沉" : `q${i}`);
	return {
		probes,
		dfa: {
			states: Array.from({ length: count }, (_, i) => i),
			start: dfa.start,
			alphabet,
			delta,
			accept,
			subsets: null,
			origins: null,
			labels,
			stateBorn: Array(count).fill(0),
			dead: computeDead(accept, delta),
			edges,
			symAlias: Object.fromEntries(probes.map((p) => [p.sym, p.label]))
		}
	};
}
function retag(dfa, tags) {
	return {
		...dfa,
		accept: dfa.accept.map((t) => t.length ? cloneTags(tags) : [])
	};
}
function project(min, alphabet, probes) {
	const seen = /* @__PURE__ */ new Set([min.start]);
	const queue = [min.start];
	const reach = [];
	while (queue.length) {
		const s = queue.shift();
		reach.push(s);
		for (const sym of alphabet) {
			const si = min.alphabet.indexOf(sym);
			if (si < 0) continue;
			const t = min.delta[s][si];
			if (t >= 0 && !seen.has(t)) {
				seen.add(t);
				queue.push(t);
			}
		}
	}
	const map = new Map(reach.map((s, i) => [s, i]));
	const m = reach.length;
	const delta = Array.from({ length: m }, () => Array(alphabet.length).fill(0));
	const accept = [];
	const edges = [];
	reach.forEach((s, id) => {
		let tags = [];
		for (const p of probes) {
			const si = min.alphabet.indexOf(p.sym);
			if (si < 0) continue;
			const t = min.delta[s][si];
			if (t >= 0 && min.accept[t].length) tags = cloneTags(p.tags);
		}
		accept.push(tags);
		alphabet.forEach((sym, si) => {
			const src = min.alphabet.indexOf(sym);
			const to = map.get(min.delta[s][src]);
			delta[id][si] = to;
			edges.push({
				from: id,
				to,
				sym,
				step: 0
			});
		});
	});
	return {
		states: Array.from({ length: m }, (_, i) => i),
		start: 0,
		alphabet,
		delta,
		accept,
		subsets: null,
		origins: null,
		labels: null,
		stateBorn: Array(m).fill(0),
		dead: computeDead(accept, delta),
		edges
	};
}
function renameReachable(dfa) {
	const seen = /* @__PURE__ */ new Set();
	const order = [];
	const queue = [dfa.start];
	seen.add(dfa.start);
	while (queue.length) {
		const s = queue.shift();
		order.push(s);
		for (let si = 0; si < dfa.alphabet.length; si++) {
			const t = dfa.delta[s][si];
			if (t >= 0 && !seen.has(t)) {
				seen.add(t);
				queue.push(t);
			}
		}
	}
	const map = new Map(order.map((s, i) => [s, i]));
	const m = order.length;
	const A = dfa.alphabet.length;
	const delta = Array.from({ length: m }, () => Array(A).fill(0));
	const edges = [];
	order.forEach((s, id) => {
		for (let si = 0; si < A; si++) {
			const to = map.get(dfa.delta[s][si]);
			delta[id][si] = to;
			edges.push({
				from: id,
				to,
				sym: dfa.alphabet[si],
				step: dfa.edges.find((e) => e.from === s && e.sym === dfa.alphabet[si])?.step ?? 0
			});
		}
	});
	return {
		states: Array.from({ length: m }, (_, i) => i),
		start: 0,
		alphabet: dfa.alphabet,
		delta,
		accept: order.map((s) => cloneTags(dfa.accept[s])),
		subsets: dfa.subsets ? order.map((s) => dfa.subsets[s]) : null,
		origins: dfa.origins ? order.map((s) => dfa.origins[s]) : null,
		labels: dfa.labels ? order.map((s) => dfa.labels[s]) : null,
		stateBorn: order.map((s) => dfa.stateBorn[s] ?? 0),
		dead: [],
		edges,
		symAlias: dfa.symAlias
	};
}
function brzozowski(input, names) {
	const sigs = signatures(input);
	const multi = sigs.length > 1;
	const phases = [];
	let current = booleanize(input);
	let probes = [];
	if (multi) {
		const aug = augment(input, sigs, names);
		probes = aug.probes;
		current = aug.dfa;
		const probeText = probes.map((p) => `↵${p.tags.map((id) => names[id] ?? id).join("·")}`).join("、");
		phases.push({
			id: "aug",
			title: "标签探针",
			detail: `不同规则标签不能在反转时被 ε 糊成一种接受。给每种标签一条探针 ${probeText}，指向接受汇；其余符号进死汇。最小化这段增广语言，标签就写在探针上。`,
			kind: "dfa",
			dfa: current
		});
	} else phases.push({
		id: "src",
		title: "待最小化的 DFA",
		detail: "Brzozowski：最小 DFA = 确定化(反转(确定化(反转(DFA))))。反转把接受态和起点对调，两次之后只留下不可区分的状态。",
		kind: "dfa",
		dfa: input
	});
	const shown = reversePicture(current);
	const core = reverseCore(current);
	phases.push({
		id: "rev1",
		title: "第一次反转",
		detail: `箭头掉头。原接受态改由辅助起点 q${shown.start} 经 ε 进入，原起点 q${current.start} 是唯一接受态。接下来的子集构造从旧接受态出发，辅助点不进子集，否则会凭空拆出等价状态。`,
		kind: "nfa",
		nfa: shown
	});
	const det1 = determinize(core.nfa, "bfs", ["接受"], core.seeds);
	const dfa1 = renameReachable(det1.dfa);
	dfa1.dead = computeDead(dfa1.accept, dfa1.delta);
	phases.push({
		id: "det1",
		title: "第一次确定化",
		detail: "对反转后的 NFA 做子集构造，得到反语言的 DFA。可以逐条请求看子集怎么长出来。",
		kind: "dfa",
		dfa: dfa1,
		log: det1.log
	});
	const shown2 = reversePicture(dfa1);
	const core2 = reverseCore(dfa1);
	phases.push({
		id: "rev2",
		title: "第二次反转",
		detail: "再反转一次。这一步之后的语言回到原来的方向，确定化会直接得到最小 DFA。",
		kind: "nfa",
		nfa: shown2
	});
	const det2 = determinize(core2.nfa, "bfs", ["接受"], core2.seeds);
	let min = renameReachable(det2.dfa);
	min.dead = computeDead(min.accept, min.delta);
	phases.push({
		id: "det2",
		title: "第二次确定化",
		detail: "再做一次子集构造。对单一语言，这一步的结果就是最小完全 DFA。",
		kind: "dfa",
		dfa: min,
		log: det2.log
	});
	if (multi) {
		min = project(min, input.alphabet, probes);
		phases.push({
			id: "proj",
			title: "收回探针",
			detail: "删掉探针符号和两个汇。一个状态读哪条探针能到接受汇，就标上对应规则。得到的是带标签的最小 DFA。",
			kind: "dfa",
			dfa: min
		});
	} else if (sigs.length === 1) {
		min = retag(min, sigs[0]);
		min.dead = computeDead(min.accept, min.delta);
		phases.push({
			id: "min",
			title: "最小 DFA",
			detail: `接受态统一标回「${sigs[0].map((id) => names[id] ?? id).join("·")}」。状态数 ${min.states.length}（含死状态，若有）。`,
			kind: "dfa",
			dfa: min
		});
	} else {
		min = retag(min, []);
		phases.push({
			id: "min",
			title: "最小 DFA",
			detail: "这台机器什么都不接受。",
			kind: "dfa",
			dfa: min
		});
	}
	return {
		dfa: min,
		phases
	};
}
function hopcroft(dfa, names) {
	const n = dfa.states.length;
	const alpha = dfa.alphabet;
	const sig = dfa.accept.map((t) => tagsKey(t));
	const grouped = /* @__PURE__ */ new Map();
	for (let s = 0; s < n; s++) {
		const k = sig[s];
		const g = grouped.get(k);
		if (g) g.push(s);
		else grouped.set(k, [s]);
	}
	const P = /* @__PURE__ */ new Map();
	for (const g of grouped.values()) {
		g.sort((a, b) => a - b);
		P.set(g.join(","), g);
	}
	const label = (block) => `{${block.join(",")}}`;
	const snap = () => [...P.values()].map((b) => [...b]);
	const workNames = () => [...P.keys()].filter((k) => W.has(k)).map((k) => label(P.get(k)));
	let W = new Set(P.keys());
	const frames = [{
		step: 0,
		title: "初始划分",
		detail: `按接受标签分组，而不是只分成接受 / 非接受。当前 ${P.size} 块，工作表放入全部分组。标签不同的状态永远不会被并到一起。`,
		blocks: snap(),
		work: workNames(),
		result: false
	}];
	let guard = 0;
	while (W.size) {
		if (++guard > 8e3) throw new Error("Hopcroft 细化步数过多");
		const Akey = W.values().next().value;
		W.delete(Akey);
		const A = P.get(Akey);
		if (!A) continue;
		const Aset = new Set(A);
		for (let si = 0; si < alpha.length; si++) {
			const Xset = /* @__PURE__ */ new Set();
			for (let q = 0; q < n; q++) if (Aset.has(dfa.delta[q][si])) Xset.add(q);
			if (!Xset.size) continue;
			const snapshot = [...P.entries()];
			for (const [yk, Y] of snapshot) {
				const y1 = [];
				const y2 = [];
				for (const s of Y) (Xset.has(s) ? y1 : y2).push(s);
				if (!y1.length || !y2.length) continue;
				P.delete(yk);
				const k1 = y1.join(",");
				const k2 = y2.join(",");
				P.set(k1, y1);
				P.set(k2, y2);
				let back;
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
					detail: `工作表取出 ${label(A)}。读「${alpha[si]}」能进入它的状态是 ${Xset.size ? `{${[...Xset].sort((a, b) => a - b).join(",")}}` : "∅"}。块 ${label(Y)} 拆成 ${label(y1)} 与 ${label(y2)}。${back}。`,
					blocks: snap(),
					work: workNames(),
					result: false
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
		result: false
	});
	const blocks = [...P.values()];
	const blockOf = new Array(n);
	blocks.forEach((b, i) => {
		for (const s of b) blockOf[s] = i;
	});
	const startB = blockOf[dfa.start];
	const order = [];
	const seen = /* @__PURE__ */ new Set();
	const queue = [startB];
	seen.add(startB);
	while (queue.length) {
		const b = queue.shift();
		order.push(b);
		const rep = blocks[b][0];
		for (let si = 0; si < alpha.length; si++) {
			const nb = blockOf[dfa.delta[rep][si]];
			if (nb === void 0 || blocks[nb] === void 0) continue;
			if (!seen.has(nb)) {
				seen.add(nb);
				queue.push(nb);
			}
		}
	}
	const remap = new Array(blocks.length);
	order.forEach((b, i) => {
		remap[b] = i;
	});
	const m = order.length;
	const delta = Array.from({ length: m }, () => Array(alpha.length).fill(0));
	const accept = Array.from({ length: m }, () => []);
	const origins = Array.from({ length: m }, () => []);
	const edges = [];
	for (const b of order) {
		const id = remap[b];
		const members = [...blocks[b]];
		origins[id] = members;
		accept[id] = cloneTags(dfa.accept[members[0]]);
		const rep = members[0];
		for (let si = 0; si < alpha.length; si++) {
			const to = remap[blockOf[dfa.delta[rep][si]]];
			delta[id][si] = to;
			edges.push({
				from: id,
				to,
				sym: alpha[si],
				step: 0
			});
		}
	}
	const min = {
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
		edges
	};
	const named = (tags) => tags.length ? tags.map((id) => names[id] ?? String(id)).join("·") : "非接受";
	frames.push({
		step: frames.length,
		title: "商自动机",
		detail: `Hopcroft 最小 DFA 有 ${m} 个状态。起点来自原块 {${blocks[startB].join(",")}}。${origins.map((mem, i) => `q${i} ← {${mem.join(",")}}（${named(accept[i])}）`).join("；")}。`,
		blocks: snap(),
		work: [],
		result: true
	});
	return {
		dfa: min,
		frames
	};
}
var RxError = class extends Error {
	line;
	column;
	constructor(message, line, column) {
		super(message);
		this.name = "RxError";
		this.line = line;
		this.column = column;
	}
};
var META = /* @__PURE__ */ new Set([
	"|",
	"*",
	"+",
	"?",
	"(",
	")",
	"[",
	"]",
	".",
	"\\"
]);
function parseProgram(source) {
	const lines = source.split(/\r?\n/);
	const rules = [];
	for (let li = 0; li < lines.length; li++) {
		const raw = lines[li].trim();
		if (!raw || raw.startsWith("#")) continue;
		const named = raw.match(/^([\p{L}_][\p{L}\p{N}_]*):([\s\S]*)$/u);
		if (named) {
			const body = named[2].trim();
			if (!body) throw new RxError("冒号后面还没有表达式", li + 1, named[1].length + 1);
			rules.push({
				name: named[1],
				source: body,
				line: li + 1,
				named: true
			});
		} else rules.push({
			name: `R${rules.length + 1}`,
			source: raw,
			line: li + 1,
			named: false
		});
		if (rules.length > 8) throw new RxError("最多 8 条规则", li + 1, 0);
	}
	if (!rules.length) throw new RxError("写一条正则。空行和 # 注释会被跳过", 1, 0);
	return rules;
}
function parseAlphabet(text) {
	const syms = /* @__PURE__ */ new Set();
	const trimmed = text.trim();
	if (!trimmed) return [];
	for (const part of trimmed.split(/\s+/)) for (const ch of part) syms.add(ch);
	return [...syms];
}
function parseRegex(source, line) {
	const chars = [...source];
	if (chars.length > 160) throw new RxError("单条表达式请控制在 160 个字符内", line, 0);
	let i = 0;
	let slot = 0;
	const used = /* @__PURE__ */ new Set();
	const peek = () => chars[i];
	const err = (message) => {
		throw new RxError(message, line, i);
	};
	function parseAlt() {
		const xs = [parseConcat()];
		while (peek() === "|") {
			i++;
			xs.push(parseConcat());
		}
		return xs.length === 1 ? xs[0] : {
			k: "alt",
			xs
		};
	}
	function parseConcat() {
		const xs = [];
		while (i < chars.length && peek() !== "|" && peek() !== ")") xs.push(parseUnary());
		if (!xs.length) return { k: "eps" };
		return xs.length === 1 ? xs[0] : {
			k: "concat",
			xs
		};
	}
	function parseUnary() {
		let node = parseAtom();
		while (peek() === "*" || peek() === "+" || peek() === "?") {
			const op = peek();
			i++;
			if (op === "*") node = {
				k: "star",
				x: node
			};
			else if (op === "+") node = {
				k: "plus",
				x: node
			};
			else node = {
				k: "opt",
				x: node
			};
		}
		return node;
	}
	function parseAtom() {
		const c = peek();
		if (c === void 0) err("表达式在这里意外结束");
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
			if (typeof esc === "string") return {
				k: "sym",
				sym: esc
			};
			return esc;
		}
		if (c === "ε") {
			i++;
			return { k: "eps" };
		}
		i++;
		return {
			k: "sym",
			sym: c
		};
	}
	function readName() {
		const start = i;
		const c = peek();
		if (c === void 0 || !/^[\p{L}_]$/u.test(c)) err("捕获组的名字要以字母或下划线开头");
		i++;
		while (peek() !== void 0 && /^[\p{L}\p{N}_]$/u.test(peek())) i++;
		return chars.slice(start, i).join("");
	}
	function capture(name) {
		slot++;
		if (slot > 12) err("一条规则最多 12 个捕获组");
		const label = name ?? String(slot);
		if (used.has(label)) err(`捕获组「${label}」重复了`);
		used.add(label);
		const inner = parseAlt();
		if (peek() !== ")") err("缺少右括号 )");
		i++;
		return {
			k: "cap",
			slot,
			name: label,
			id: slot - 1,
			x: inner
		};
	}
	function parseEscape(inClass) {
		i++;
		const c = peek();
		if (c === void 0) err("反斜杠后面缺少字符");
		i++;
		if (c === "e") return inClass ? "ε" : { k: "eps" };
		if (c === "n") return inClass ? "\n" : {
			k: "sym",
			sym: "\n"
		};
		if (c === "t") return inClass ? "	" : {
			k: "sym",
			sym: "	"
		};
		if (inClass) return c;
		return {
			k: "sym",
			sym: c
		};
	}
	function parseClassChar() {
		const c = peek();
		if (c === void 0) err("字符类没有结束");
		if (c === "\\") return parseEscape(true);
		i++;
		return c;
	}
	function parseClass() {
		i++;
		let neg = false;
		if (peek() === "^") {
			neg = true;
			i++;
		}
		const syms = [];
		if (peek() === void 0) err("字符类没有结束");
		if (peek() === "]") err("空字符类匹配不了任何串");
		while (peek() !== void 0 && peek() !== "]") {
			const a = parseClassChar();
			if (peek() === "-" && chars[i + 1] !== void 0 && chars[i + 1] !== "]") {
				i++;
				const b = parseClassChar();
				const ac = a.codePointAt(0);
				const bc = b.codePointAt(0);
				if ([...a].length !== 1 || [...b].length !== 1 || bc < ac) err(`无效范围 ${a}-${b}`);
				if (bc - ac > 36) err("单个范围最多 37 个字符");
				for (let cp = ac; cp <= bc; cp++) syms.push(String.fromCodePoint(cp));
			} else syms.push(a);
		}
		if (peek() !== "]") err("字符类缺少 ]");
		i++;
		const uniq = [...new Set(syms)];
		if (!uniq.length) err("空字符类匹配不了任何串");
		return {
			k: "class",
			syms: uniq,
			neg
		};
	}
	const ast = parseAlt();
	if (i < chars.length) err(`「${peek()}」多余`);
	return ast;
}
function collectSyms(ast, into) {
	let any = false;
	const neg = [];
	const walk = (n) => {
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
	return {
		any,
		neg
	};
}
function groundAst(ast, alphabet) {
	const go = (n) => {
		if (n.k === "any") {
			if (!alphabet.length) throw new Error("用了「.」但字母表是空的。在字母表栏写上 a b c，或改成具体字符");
			return {
				k: "class",
				syms: [...alphabet],
				neg: false
			};
		}
		if (n.k === "class" && n.neg) {
			const ban = new Set(n.syms);
			const syms = alphabet.filter((s) => !ban.has(s));
			if (!syms.length) throw new Error("否定字符类在当前字母表下是空的。请补几个允许的字母");
			return {
				k: "class",
				syms,
				neg: false
			};
		}
		if (n.k === "class") return n;
		if (n.k === "cap") return {
			...n,
			x: go(n.x)
		};
		if (n.k === "concat" || n.k === "alt") return {
			...n,
			xs: n.xs.map(go)
		};
		if (n.k === "star" || n.k === "plus" || n.k === "opt") return {
			...n,
			x: go(n.x)
		};
		return n;
	};
	return go(ast);
}
function stampGroups(ast, rule, into) {
	const go = (n) => {
		if (n.k === "cap") {
			const id = into.length;
			into.push({
				id,
				slot: n.slot,
				name: n.name,
				rule
			});
			return {
				k: "cap",
				slot: n.slot,
				name: n.name,
				id,
				x: go(n.x)
			};
		}
		if (n.k === "concat" || n.k === "alt") return {
			...n,
			xs: n.xs.map(go)
		};
		if (n.k === "star" || n.k === "plus" || n.k === "opt") return {
			...n,
			x: go(n.x)
		};
		return n;
	};
	return go(ast);
}
function escSym(sym) {
	if (sym === "\n") return "\\n";
	if (sym === "	") return "\\t";
	if (META.has(sym) || sym === "ε") return `\\${sym}`;
	return sym;
}
function printAst(ast) {
	const prec = (n) => n.k === "alt" ? 1 : n.k === "concat" ? 2 : 3;
	const wrap = (n, parent) => {
		const s = walk(n);
		return prec(n) < parent ? `(?:${s})` : s;
	};
	const walk = (n) => {
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
function compactSyms(syms) {
	if (!syms.every((s) => [...s].length === 1)) return syms.map(escSym).join("");
	const sorted = [...syms].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
	const parts = [];
	let i = 0;
	while (i < sorted.length) {
		let j = i;
		while (j + 1 < sorted.length && sorted[j + 1].codePointAt(0) === sorted[j].codePointAt(0) + 1) j++;
		if (j >= i + 2) parts.push(`${escSym(sorted[i])}–${escSym(sorted[j])}`);
		else for (let k = i; k <= j; k++) parts.push(escSym(sorted[k]));
		i = j + 1;
	}
	return parts.join("");
}
function buildThompson(rules, alphabet) {
	let next = 0;
	const stateStep = [];
	const tagStep = [];
	const steps = [];
	const fresh = () => {
		const id = next++;
		stateStep[id] = 0;
		tagStep[id] = Number.POSITIVE_INFINITY;
		return id;
	};
	const note = (title, detail) => {
		const step = steps.length;
		steps.push({
			step,
			title,
			detail
		});
		return step;
	};
	const born = (id, step) => {
		stateStep[id] = step;
	};
	const build = (ast) => {
		if (ast.k === "sym") {
			const s = fresh();
			const t = fresh();
			const step = note("字面量", `「${ast.sym}」连出一条边：q${s} —${ast.sym}→ q${t}。`);
			born(s, step);
			born(t, step);
			return {
				start: s,
				accept: t,
				trans: [{
					from: s,
					to: t,
					sym: ast.sym,
					step
				}]
			};
		}
		if (ast.k === "eps") {
			const s = fresh();
			const t = fresh();
			const step = note("空串", `ε 片段：q${s} —ε→ q${t}，不消耗字符。`);
			born(s, step);
			born(t, step);
			return {
				start: s,
				accept: t,
				trans: [{
					from: s,
					to: t,
					sym: "ε",
					step
				}]
			};
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
				trans: ast.syms.map((sym) => ({
					from: s,
					to: t,
					sym,
					step
				}))
			};
		}
		if (ast.k === "concat") {
			const parts = ast.xs.map(build);
			const step = note("连接", "前一段的接受态用 ε 接上后一段的起点。");
			const trans = parts.flatMap((p) => p.trans);
			for (let i = 0; i < parts.length - 1; i++) trans.push({
				from: parts[i].accept,
				to: parts[i + 1].start,
				sym: "ε",
				step
			});
			return {
				start: parts[0].start,
				accept: parts[parts.length - 1].accept,
				trans
			};
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
				trans.push({
					from: s,
					to: p.start,
					sym: "ε",
					step
				});
				trans.push({
					from: p.accept,
					to: t,
					sym: "ε",
					step
				});
			}
			return {
				start: s,
				accept: t,
				trans
			};
		}
		if (ast.k === "plus") {
			note("加号", "r+ 展开成 r 连接 r*，至少走一次。");
			return build({
				k: "concat",
				xs: [ast.x, {
					k: "star",
					x: ast.x
				}]
			});
		}
		if (ast.k === "opt") {
			note("可选", "r? 展开成 r | ε。");
			return build({
				k: "alt",
				xs: [ast.x, { k: "eps" }]
			});
		}
		if (ast.k === "cap") {
			const inner = build(ast.x);
			const s = fresh();
			const t = fresh();
			const step = note("捕获", `组「${ast.name}」在进入时打开、离开时关闭：q${s} —ε开→ 内部 —ε闭→ q${t}。重复时后一次覆盖前一次。`);
			born(s, step);
			born(t, step);
			return {
				start: s,
				accept: t,
				trans: [
					...inner.trans,
					{
						from: s,
						to: inner.start,
						sym: "ε",
						step,
						ops: [{
							id: ast.id,
							kind: "open"
						}]
					},
					{
						from: inner.accept,
						to: t,
						sym: "ε",
						step,
						ops: [{
							id: ast.id,
							kind: "close"
						}]
					}
				]
			};
		}
		if (ast.k !== "star") throw new Error("表达式里还有未展开的任意字符");
		const inner = build(ast.x);
		const s = fresh();
		const t = fresh();
		const step = note("星闭包", `q${s} 可直接 ε 到 q${t}（零次），也可进入内部；内部接受态可回到内部起点或离开。`);
		born(s, step);
		born(t, step);
		return {
			start: s,
			accept: t,
			trans: [
				...inner.trans,
				{
					from: s,
					to: inner.start,
					sym: "ε",
					step
				},
				{
					from: s,
					to: t,
					sym: "ε",
					step
				},
				{
					from: inner.accept,
					to: inner.start,
					sym: "ε",
					step
				},
				{
					from: inner.accept,
					to: t,
					sym: "ε",
					step
				}
			]
		};
	};
	const frags = rules.map((rule) => {
		const frag = build(rule.ast);
		const step = note("标记", `q${frag.accept} 是规则「${rule.name}」的接受态。`);
		tagStep[frag.accept] = step;
		return frag;
	});
	const accept = Array.from({ length: next }, () => []);
	for (let i = 0; i < rules.length; i++) accept[frags[i].accept] = [rules[i].id];
	let start;
	let trans;
	if (frags.length === 1) {
		start = frags[0].start;
		trans = frags[0].trans;
	} else {
		start = fresh();
		accept.push([]);
		const step = note("集合", "为整组规则增加起点，用 ε 分叉到每一条规则。");
		born(start, step);
		trans = frags.flatMap((f) => f.trans);
		for (const f of frags) trans.push({
			from: start,
			to: f.start,
			sym: "ε",
			step
		});
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
		groups: rules.flatMap((rule) => rule.groups)
	};
}
function failOf(e) {
	return e instanceof Error ? e.message : "构造失败";
}
function guard(fn) {
	try {
		return {
			ok: true,
			value: fn()
		};
	} catch (e) {
		return {
			ok: false,
			error: failOf(e)
		};
	}
}
function isomorphic(a, b) {
	if (a.alphabet.length !== b.alphabet.length) return false;
	for (const s of a.alphabet) if (!b.alphabet.includes(s)) return false;
	const map = /* @__PURE__ */ new Map();
	const qa = [a.start];
	const qb = [b.start];
	map.set(a.start, b.start);
	const seenB = /* @__PURE__ */ new Set([b.start]);
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
function compile(source, alphabetText) {
	try {
		const patterns = parseProgram(source).map((rule, id) => {
			const groups = [];
			const ast = stampGroups(parseRegex(rule.source, rule.line), id, groups);
			return {
				id,
				name: rule.name,
				source: rule.source,
				ast,
				line: rule.line,
				groups
			};
		});
		const syms = new Set(parseAlphabet(alphabetText));
		let needsAny = false;
		const neg = [];
		for (const p of patterns) {
			const info = collectSyms(p.ast, syms);
			if (info.any) needsAny = true;
			for (const n of info.neg) {
				neg.push(n.syms);
				for (const s of n.syms) syms.add(s);
			}
		}
		if ((needsAny || neg.length) && syms.size === 0) return {
			ok: false,
			message: "用了「.」或否定字符类，但字母表是空的。在字母表栏填 a b c，或改成具体字符"
		};
		const alphabet = [...syms].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
		if (alphabet.length > 36) return {
			ok: false,
			message: `字母表有 ${alphabet.length} 个符号，超过 36。缩小字符类或字母表`
		};
		const grounded = patterns.map((p) => {
			const groups = [];
			const ast = stampGroups(groundAst(p.ast, alphabet), p.id, groups);
			return {
				...p,
				ast,
				groups
			};
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
					minsAcross: hopL && hopT ? isomorphic(hopL, hopT) : false
				}
			}
		};
	} catch (e) {
		if (e instanceof RxError) return {
			ok: false,
			message: e.message,
			line: e.line,
			column: e.column
		};
		return {
			ok: false,
			message: failOf(e)
		};
	}
}
var FALLBACK = `# 随机 · 稳妥
结尾: (?:a|b)*ab
非空: (?:a|b)+
字面: ba`;
var PAIRS = [
	["a", "b"],
	["0", "1"],
	["x", "y"]
];
var TRIOS = [[
	"a",
	"b",
	"c"
], [
	"x",
	"y",
	"z"
]];
function randomProgram(rng = Math.random) {
	const makers = [
		endsProgram,
		parityProgram,
		blocksProgram,
		lexerProgram,
		finiteProgram,
		opsProgram,
		zhProgram,
		captureProgram
	];
	for (let i = 0; i < 16; i++) {
		const source = pick(rng, makers)(rng);
		if (fits(source)) return source;
	}
	return FALLBACK;
}
function fits(source) {
	const compiled = compile(source, "");
	if (!compiled.ok) return false;
	const { nfa, thompson, hopThom, patterns, alphabet } = compiled.model;
	if (patterns.length < 2 || patterns.length > 5) return false;
	if (alphabet.length > 6) return false;
	if (nfa.states.length > 56) return false;
	if (thompson.dfa.states.length > 36) return false;
	return hopThom.ok;
}
function endsProgram(rng) {
	const alpha = pick(rng, [...PAIRS, ...TRIOS]);
	const star = any(alpha);
	return block("位置", take(rng, [
		`结尾: ${star}*${word(rng, alpha, int(rng, 2, 3))}`,
		`开头: ${word(rng, alpha, int(rng, 1, 2))}${star}*`,
		`含有: ${star}*${word(rng, alpha, 2)}${star}*`,
		`字面: ${word(rng, alpha, int(rng, 2, 4))}`,
		`非空: ${star}+`
	], int(rng, 3, 4)));
}
function parityProgram(rng) {
	const [a, b] = pick(rng, PAIRS);
	const even = `(?:${b}|${a}${b}*${a})*`;
	return block("计数", take(rng, [
		`偶数个${a}: ${even}`,
		`奇数个${a}: ${even}${a}${b}*`,
		`以${a}结尾: (?:${a}|${b})*${a}`,
		`只含${b}: ${b}*`,
		`至少一个${a}: (?:${a}|${b})*${a}(?:${a}|${b})*`
	], int(rng, 2, 3)));
}
function blocksProgram(rng) {
	const alpha = pick(rng, PAIRS);
	const [u, v] = twoWords(rng, alpha, 2);
	const tail = word(rng, alpha, int(rng, 1, 2));
	return block("重复块", take(rng, [
		`重复: (?:${u})*`,
		`至少一块: (?:${u})+`,
		`二选一: (?:${u}|${v})+`,
		`可选前缀: (?:${u})?${tail}`,
		`交替: (?:${u}${v})*`
	], int(rng, 3, 4)));
}
function lexerProgram(rng) {
	const letters = pick(rng, [
		["a", "b"],
		["x", "y"],
		[
			"a",
			"b",
			"c"
		]
	]);
	const [k1, k2] = twoWords(rng, letters, int(rng, 2, 3));
	return block("词法", take(rng, [
		`标识: ${letters[0]}[${[
			...letters,
			"0",
			"1"
		].join("")}]*`,
		`整数: [0-1]+`,
		`带号: [+-]?[0-1]+`,
		`关键字: ${k1}|${k2}`
	], int(rng, 3, 4)));
}
function finiteProgram(rng) {
	const alpha = pick(rng, PAIRS);
	const [u, v] = twoWords(rng, alpha, int(rng, 1, 3));
	const w = word(rng, alpha, int(rng, 1, 2));
	return block("有限", take(rng, [
		`短串: ${u}|${v}|ε`,
		`可选: (?:${u})?${v}`,
		`一或更多: (?:${w})+`,
		`至多一次: (?:${u}|${v})?`,
		`并列: ${u}${v}`
	], int(rng, 3, 4)));
}
function opsProgram(rng) {
	const alpha = pick(rng, PAIRS);
	const [p, q] = alpha;
	const [u, v] = twoWords(rng, alpha, 2);
	return block("运算", take(rng, [
		`星: ${p}*`,
		`加: ${q}+`,
		`可选: ${p}?${q}`,
		`选择: ${u}|${v}`,
		`分组: (?:${u})*`,
		`连接: ${word(rng, alpha, 3)}`,
		`尾: (?:${p}|${q})*${u}`
	], int(rng, 3, 4)));
}
function zhProgram(rng) {
	return block("短句", pick(rng, [
		[
			"问候: 你好+",
			"疑问: 你好吗?",
			"告别: 再见"
		],
		[
			"是: 是+",
			"否: 不+",
			"或许: 也许?"
		],
		[
			"早: 早",
			"安: 早安+",
			"问候: (?:早|你)好?"
		],
		[
			"谢: 谢谢+",
			"不客气: 不客气",
			"回应: (?:谢|不)+"
		]
	]));
}
function captureProgram(rng) {
	const [a, b] = pick(rng, PAIRS);
	return block("捕获", [`键值: (?<键>[${a}${b}]+)${pick(rng, [
		":",
		"-",
		"="
	])}(?<值>[${a}${b}]+)`, `单字: (?<字>${a}|${b})`]);
}
function block(title, lines) {
	return `# 随机 · ${title}\n${lines.join("\n")}`;
}
function any(alpha) {
	return `(?:${alpha.join("|")})`;
}
function word(rng, alpha, n) {
	let s = "";
	for (let i = 0; i < n; i++) s += pick(rng, alpha);
	return s;
}
function twoWords(rng, alpha, n) {
	const a = word(rng, alpha, n);
	let b = word(rng, alpha, n);
	for (let i = 0; i < 8 && b === a; i++) b = word(rng, alpha, n);
	if (b === a) b = (alpha.find((ch) => ch !== a[0]) ?? alpha[0]).repeat(n);
	return [a, b];
}
function int(rng, lo, hi) {
	return lo + Math.floor(rng() * (hi - lo + 1));
}
function pick(rng, xs) {
	return xs[Math.floor(rng() * xs.length)];
}
function take(rng, xs, n) {
	const copy = [...xs];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const swap = copy[i];
		copy[i] = copy[j];
		copy[j] = swap;
	}
	return copy.slice(0, Math.min(n, copy.length));
}
function simulateCaptures(nfa, symbols) {
	const groups = nfa.groups;
	const width = groups.length;
	if (!width) return Array.from({ length: symbols.length + 1 }, () => []);
	const blank = () => Array(width * 2).fill(-1);
	const at = new Map(groups.map((g, i) => [g.id, i]));
	const apply = (reg, ops, index) => {
		if (!ops?.length) return reg;
		const next = reg.slice();
		for (const op of ops) {
			const i = at.get(op.id);
			if (i === void 0) continue;
			if (op.kind === "open") {
				next[2 * i] = index;
				next[2 * i + 1] = -1;
			} else next[2 * i + 1] = index;
		}
		return next;
	};
	const better = (a, b) => {
		for (let i = 0; i < width; i++) {
			const as = a[2 * i];
			const bs = b[2 * i];
			if (as !== bs) {
				if (as < 0) return false;
				if (bs < 0) return true;
				return as < bs;
			}
			const ae = a[2 * i + 1];
			const be = b[2 * i + 1];
			if (ae !== be) {
				if (ae < 0) return false;
				if (be < 0) return true;
				return ae > be;
			}
		}
		return false;
	};
	const close = (seeds, index) => {
		const best = /* @__PURE__ */ new Map();
		const queue = [];
		const offer = (state, reg) => {
			const old = best.get(state);
			if (old && !better(reg, old)) return;
			best.set(state, reg);
			queue.push(state);
		};
		for (const seed of seeds) offer(seed.state, seed.reg);
		let qi = 0;
		let guard = 0;
		while (qi < queue.length && guard++ < 2e4) {
			const state = queue[qi++];
			const reg = best.get(state);
			if (!reg) continue;
			for (const edge of nfa.adj[state] ?? []) {
				if (edge.sym !== "ε") continue;
				offer(edge.to, apply(reg, edge.ops, index));
			}
		}
		return best;
	};
	const project = (map, index) => groups.flatMap((group, i) => {
		const owned = [...map.entries()].filter(([state]) => (nfa.accept[state] ?? []).includes(group.rule));
		const pool = owned.length ? owned : [...map.entries()];
		let best = null;
		for (const [, reg] of pool) {
			if (!owned.length && reg[2 * i] < 0) continue;
			if (!best || better(reg, best)) best = reg;
		}
		if (!best || best[2 * i] < 0) return [];
		const start = best[2 * i];
		const end = best[2 * i + 1];
		const stop = end < 0 ? index : end;
		return [{
			id: group.id,
			slot: group.slot,
			name: group.name,
			rule: group.rule,
			start,
			end: end < 0 ? null : end,
			text: symbols.slice(start, Math.max(start, stop)).join("")
		}];
	});
	const shots = [];
	let map = close([{
		state: nfa.start,
		reg: blank()
	}], 0);
	shots.push(project(map, 0));
	for (let i = 0; i < symbols.length; i++) {
		const sym = symbols[i];
		if (!nfa.alphabet.includes(sym)) {
			shots.push([]);
			break;
		}
		const seeds = [];
		for (const [state, reg] of map) for (const edge of nfa.adj[state] ?? []) if (edge.sym === sym) seeds.push({
			state: edge.to,
			reg
		});
		map = close(seeds, i + 1);
		shots.push(project(map, i + 1));
	}
	while (shots.length < symbols.length + 1) shots.push([]);
	return shots;
}
function nameTags(tags, names) {
	return tags.length ? tags.map((id) => names[id] ?? String(id)).join("·") : "";
}
function matchNfa(nfa, symbols, names) {
	const frames = [];
	const push = (partial) => {
		frames.push({
			...partial,
			step: frames.length
		});
	};
	let cur = eClosureTrace(nfa, [nfa.start]);
	const tagsNow = () => {
		const set = /* @__PURE__ */ new Set();
		for (const s of cur.states) for (const t of nfa.accept[s] ?? []) set.add(t);
		return [...set].sort((a, b) => a - b);
	};
	push({
		title: "起点闭包",
		detail: `从 q${nfa.start} 沿 ε 走到 ${setText(cur.states)}。${cur.edges.length ? `用到 ${cur.edges.length} 条 ε 边。` : "没有额外的 ε。"}`,
		active: cur.states,
		hot: cur.edges,
		index: 0,
		verdict: "run",
		tags: tagsNow()
	});
	for (let i = 0; i < symbols.length; i++) {
		const sym = symbols[i];
		if (!nfa.alphabet.includes(sym)) {
			push({
				title: "字母表之外",
				detail: `「${shown(sym)}」不在字母表 {${nfa.alphabet.join(" ")}} 里，匹配失败。`,
				active: [],
				hot: [],
				index: i,
				verdict: "reject",
				tags: []
			});
			return frames;
		}
		const mv = move(nfa, cur.states, sym);
		push({
			title: `读取「${shown(sym)}」`,
			detail: mv.states.length ? `活动集沿 ${shown(sym)} 到达 ${setText(mv.states)}。` : `没有任何活动状态读得出「${shown(sym)}」。`,
			active: mv.states,
			hot: mv.edges,
			index: i + 1,
			verdict: "run",
			tags: []
		});
		const closed = eClosureTrace(nfa, mv.states);
		if (closed.states.join(",") !== mv.states.join(",")) {
			cur = closed;
			push({
				title: "ε-闭包",
				detail: `再沿 ε 补进状态，活动集成为 ${setText(cur.states)}。`,
				active: cur.states,
				hot: closed.edges,
				index: i + 1,
				verdict: "run",
				tags: tagsNow()
			});
		} else {
			cur = closed;
			frames[frames.length - 1].tags = tagsNow();
		}
	}
	const tags = tagsNow();
	push({
		title: tags.length ? "接受" : "拒绝",
		detail: tags.length ? `整串读完，活动集里有接受态。命中规则 ${nameTags(tags, names)}。` : "整串读完，活动集里没有接受态。这条文本不属于任何规则。",
		active: cur.states,
		hot: [],
		index: symbols.length,
		verdict: tags.length ? "accept" : "reject",
		tags
	});
	return frames;
}
function matchDfa(dfa, symbols, names) {
	const frames = [];
	const push = (partial) => frames.push({
		...partial,
		step: frames.length
	});
	let s = dfa.start;
	push({
		title: "起点",
		detail: `从 q${s} 开始${dfa.accept[s].length ? `，它已经接受 ${nameTags(dfa.accept[s], names)}` : ""}。`,
		active: [s],
		hot: [],
		index: 0,
		verdict: "run",
		tags: cloneTags(dfa.accept[s] ?? [])
	});
	for (let i = 0; i < symbols.length; i++) {
		const sym = symbols[i];
		const si = dfa.alphabet.indexOf(sym);
		if (si < 0) {
			push({
				title: "字母表之外",
				detail: `「${shown(sym)}」不在字母表 {${dfa.alphabet.join(" ")}} 里。`,
				active: [s],
				hot: [],
				index: i,
				verdict: "reject",
				tags: []
			});
			return frames;
		}
		const nxt = dfa.delta[s][si];
		const dead = dfa.dead[nxt];
		push({
			title: `读取「${shown(sym)}」`,
			detail: `δ(q${s}, ${shown(sym)}) = q${nxt}${dead ? "。这是死状态，后面不可能再接受" : dfa.accept[nxt].length ? `，接受 ${nameTags(dfa.accept[nxt], names)}` : ""}。`,
			active: [nxt],
			hot: [{
				from: s,
				to: nxt,
				sym
			}],
			index: i + 1,
			verdict: "run",
			tags: cloneTags(dfa.accept[nxt] ?? [])
		});
		s = nxt;
	}
	const tags = cloneTags(dfa.accept[s] ?? []);
	push({
		title: tags.length ? "接受" : "拒绝",
		detail: tags.length ? `停在 q${s}，命中 ${nameTags(tags, names)}。` : `停在 q${s}，它不接受任何规则。`,
		active: [s],
		hot: [],
		index: symbols.length,
		verdict: tags.length ? "accept" : "reject",
		tags
	});
	return frames;
}
function lazyWalk(nfa, symbols, names) {
	const alpha = nfa.alphabet;
	const frames = [];
	const subsets = [];
	const idOf = /* @__PURE__ */ new Map();
	const accept = [];
	const born = [];
	const delta = [];
	const known = [];
	const ensureRow = (id) => {
		if (!delta[id]) {
			delta[id] = Array(alpha.length).fill(-1);
			known[id] = Array(alpha.length).fill(false);
		}
	};
	const addSubset = (ss, step) => {
		const k = ss.join(",");
		const hit = idOf.get(k);
		if (hit !== void 0) return {
			id: hit,
			created: false
		};
		const id = subsets.length;
		subsets.push(ss);
		idOf.set(k, id);
		const tags = /* @__PURE__ */ new Set();
		for (const s of ss) for (const t of nfa.accept[s] ?? []) tags.add(t);
		accept[id] = [...tags].sort((a, b) => a - b);
		born[id] = step;
		ensureRow(id);
		return {
			id,
			created: true
		};
	};
	const start = addSubset(eClosureTrace(nfa, [nfa.start]).states, 0);
	const push = (partial) => frames.push({
		...partial,
		step: frames.length
	});
	const edgeRec = [];
	let sid = start.id;
	push({
		title: "惰性起点",
		detail: `只物化起点子集 ${setText(subsets[0])}。其余转移先不算。`,
		active: [sid],
		hot: [],
		index: 0,
		verdict: "run",
		tags: cloneTags(accept[sid])
	});
	for (let i = 0; i < symbols.length; i++) {
		const sym = symbols[i];
		const si = alpha.indexOf(sym);
		if (si < 0) {
			push({
				title: "字母表之外",
				detail: `「${shown(sym)}」不在字母表里，停止展开。`,
				active: [sid],
				hot: [],
				index: i,
				verdict: "reject",
				tags: []
			});
			break;
		}
		const step = i + 1;
		let tid = known[sid][si] ? delta[sid][si] : -1;
		let created = false;
		if (!known[sid][si]) {
			const moved = move(nfa, subsets[sid], sym).states;
			const target = eClosureTrace(nfa, moved).states;
			const got = addSubset(target, step);
			tid = got.id;
			created = got.created;
			delta[sid][si] = tid;
			known[sid][si] = true;
			edgeRec.push({
				from: sid,
				to: tid,
				sym,
				step
			});
		}
		push({
			title: created ? `新建 q${tid}` : `沿用 q${tid}`,
			detail: created ? `第一次请求 δ(q${sid}, ${shown(sym)})，子集 ${setText(subsets[tid])} 成为 q${tid}。` : `δ(q${sid}, ${shown(sym)}) 已经算过，直接走到 q${tid}。`,
			active: [tid],
			hot: [{
				from: sid,
				to: tid,
				sym
			}],
			index: step,
			verdict: "run",
			tags: cloneTags(accept[tid] ?? [])
		});
		sid = tid;
	}
	const tags = cloneTags(accept[sid] ?? []);
	if (!(frames[frames.length - 1]?.verdict === "reject")) push({
		title: tags.length ? "接受" : "拒绝",
		detail: tags.length ? `文本走完。惰性 DFA 只生成了 ${subsets.length} 个状态，命中 ${nameTags(tags, names)}。` : `文本走完。惰性 DFA 共 ${subsets.length} 个状态，没有命中规则。`,
		active: [sid],
		hot: [],
		index: symbols.length,
		verdict: tags.length ? "accept" : "reject",
		tags
	});
	return {
		dfa: {
			states: subsets.map((_, i) => i),
			start: 0,
			alphabet: alpha,
			delta: subsets.map((_, s) => delta[s] ?? Array(alpha.length).fill(-1)),
			accept,
			subsets,
			origins: null,
			labels: null,
			stateBorn: born,
			dead: subsets.map((ss) => ss.length === 0),
			edges: edgeRec
		},
		frames
	};
}
function witnesses(dfa, names) {
	const out = [];
	const parent = /* @__PURE__ */ new Map();
	parent.set(dfa.start, null);
	const queue = [dfa.start];
	const wanted = new Set(names.map((_, i) => i));
	let reject = dfa.accept[dfa.start].length ? null : [];
	const wordOf = (state) => {
		const syms = [];
		let s = state;
		const guard = /* @__PURE__ */ new Set();
		while (parent.get(s)) {
			if (guard.has(s)) break;
			guard.add(s);
			const p = parent.get(s);
			syms.push(p.sym);
			s = p.prev;
		}
		return syms.reverse();
	};
	if (dfa.accept[dfa.start].length) for (const id of dfa.accept[dfa.start]) {
		if (!wanted.has(id)) continue;
		wanted.delete(id);
		out.push({
			label: names[id] ?? String(id),
			symbols: [],
			kind: "accept"
		});
	}
	let qi = 0;
	while (qi < queue.length && queue.length < 400) {
		const s = queue[qi++];
		for (const sym of dfa.alphabet) {
			const si = dfa.alphabet.indexOf(sym);
			const t = dfa.delta[s][si];
			if (t < 0 || parent.has(t)) continue;
			parent.set(t, {
				prev: s,
				sym
			});
			queue.push(t);
			const w = wordOf(t);
			if (w.length > 12) continue;
			for (const id of dfa.accept[t] ?? []) {
				if (!wanted.has(id)) continue;
				wanted.delete(id);
				out.push({
					label: names[id] ?? String(id),
					symbols: w,
					kind: "accept"
				});
			}
			if (!reject && !(dfa.accept[t] ?? []).length && w.length) reject = w;
		}
	}
	if (reject) out.push({
		label: "拒绝",
		symbols: reject,
		kind: "reject"
	});
	return out;
}
function setText(ss) {
	if (!ss.length) return "∅";
	const inner = ss.join(",");
	return inner.length > 36 ? `{${ss.length} 个状态}` : `{${inner}}`;
}
function shown(sym) {
	if (sym === "\n") return "\\n";
	if (sym === "	") return "\\t";
	if (sym === " ") return "␣";
	return sym;
}
function textToSymbols(text) {
	return [...text];
}
function briefIds(ids) {
	if (!ids.length) return "∅";
	const inner = ids.join(",");
	return inner.length > 18 ? `${ids.length} 个` : inner;
}
function aliasOf(nfa, sym) {
	return nfa.symAlias?.[sym] ?? aliasSym(sym);
}
function aliasSym(sym, alias) {
	if (alias) return alias(sym);
	if (sym === "\n") return "\\n";
	if (sym === "	") return "\\t";
	if (sym === " ") return "␣";
	return sym;
}
function viewNfa(nfa, opt) {
	const show = (born) => opt.step === null || born <= opt.step;
	const hot = new Set(opt.hot);
	const hotEdge = new Set(opt.hotEdges.map((e) => `${e.from}|${e.sym}|${e.to}`));
	const blockOf = /* @__PURE__ */ new Map();
	opt.blocks?.forEach((b, i) => b.forEach((id) => blockOf.set(id, i)));
	const nodes = nfa.states.map((id) => {
		const tags = nfa.accept[id] ?? [];
		const names = show(nfa.tagStep[id] ?? Number.POSITIVE_INFINITY) ? tags.map((t) => opt.names[t] ?? String(t)) : [];
		return {
			id,
			name: `q${id}`,
			sub: names.join("·"),
			tip: names.length ? `接受 ${names.join("·")}` : `q${id}`,
			accept: names.length > 0,
			dead: false,
			on: show(nfa.stateStep[id] ?? 0),
			hot: hot.has(id),
			block: blockOf.get(id) ?? null
		};
	});
	const buckets = /* @__PURE__ */ new Map();
	for (const e of nfa.trans) {
		const eps = e.sym === "ε";
		const mark = eps ? tagMark(e.ops, nfa.groups) : "";
		const key = `${e.from}>${e.to}>${eps ? "e" : "s"}>${mark}`;
		const on = show(e.step) && show(nfa.stateStep[e.from] ?? 0) && show(nfa.stateStep[e.to] ?? 0);
		let b = buckets.get(key);
		if (!b) {
			b = {
				from: e.from,
				to: e.to,
				eps,
				syms: [],
				mark,
				on: false,
				hot: false
			};
			buckets.set(key, b);
		}
		if (on) {
			b.on = true;
			if (!eps) b.syms.push(aliasOf(nfa, e.sym));
		}
		if (hotEdge.has(`${e.from}|${e.sym}|${e.to}`)) b.hot = true;
	}
	return {
		nodes,
		edges: [...buckets.values()].map((b) => ({
			key: `${b.from}-${b.to}-${b.eps ? "e" : b.syms.join("")}-${b.mark}`,
			from: b.from,
			to: b.to,
			label: b.eps ? b.mark ? `ε ${b.mark}` : "ε" : labelSyms(b.syms),
			eps: b.eps,
			on: b.on,
			hot: b.hot && b.on
		})),
		start: nfa.start
	};
}
function viewDfa(dfa, opt) {
	const show = (born) => opt.step === null || born <= opt.step;
	const hot = new Set(opt.hot);
	const hotEdge = new Set(opt.hotEdges.map((e) => `${e.from}|${e.sym}|${e.to}`));
	const blockOf = /* @__PURE__ */ new Map();
	opt.blocks?.forEach((b, i) => b.forEach((id) => blockOf.set(id, i)));
	const nodes = dfa.states.map((id) => {
		const tags = (dfa.accept[id] ?? []).map((t) => opt.names[t] ?? String(t));
		const origin = dfa.origins?.[id];
		const subset = dfa.subsets?.[id];
		const sub = origin ? `⟨${briefIds(origin)}⟩` : subset ? `{${briefIds(subset)}}` : "";
		const dead = dfa.dead[id] ?? false;
		const on = show(dfa.stateBorn[id] ?? 0) && (opt.showDead || !dead);
		return {
			id,
			name: dfa.labels?.[id] ?? `q${id}`,
			sub: tags.length ? tags.join("·") : sub,
			tip: [
				dfa.labels?.[id] ?? `q${id}`,
				subset ? `子集 {${subset.join(",") || "∅"}}` : "",
				origin ? `合并自 {${origin.join(",")}}` : "",
				tags.length ? `接受 ${tags.join("·")}` : "",
				dead ? "死状态" : ""
			].filter(Boolean).join(" · "),
			accept: (dfa.accept[id] ?? []).length > 0,
			dead,
			on,
			hot: hot.has(id),
			block: blockOf.get(id) ?? null
		};
	});
	const onNode = new Map(nodes.map((n) => [n.id, n.on]));
	const buckets = /* @__PURE__ */ new Map();
	for (const e of dfa.edges) {
		const key = `${e.from}>${e.to}`;
		let b = buckets.get(key);
		if (!b) {
			b = {
				from: e.from,
				to: e.to,
				syms: [],
				on: false,
				hot: false
			};
			buckets.set(key, b);
		}
		const born = e.step;
		if (show(born) && onNode.get(e.from) && onNode.get(e.to)) {
			b.on = true;
			b.syms.push(dfa.symAlias?.[e.sym] ?? aliasSym(e.sym, opt.alias));
		}
		if (hotEdge.has(`${e.from}|${e.sym}|${e.to}`)) b.hot = true;
	}
	return {
		nodes,
		edges: [...buckets.values()].map((b) => ({
			key: `${b.from}-${b.to}-${b.syms.join("")}`,
			from: b.from,
			to: b.to,
			label: labelSyms(b.syms),
			eps: false,
			on: b.on,
			hot: b.hot && b.on
		})),
		start: dfa.start
	};
}
function tagMark(ops, groups) {
	if (!ops?.length) return "";
	return ops.map((op) => {
		const g = groups.find((item) => item.id === op.id);
		return (op.kind === "open" ? "开" : "闭") + (g?.name ?? String(op.id));
	}).join(" ");
}
function labelSyms(syms) {
	if (!syms.length) return "";
	if (syms.some((s) => [...s].length !== 1 || s === "ε")) return syms.join(",");
	return compactSyms(syms).replace(/–/g, "–");
}
var PRESETS = [
	{
		name: "以 abb 结尾",
		source: "(a|b)*abb"
	},
	{
		name: "a(b|c)*",
		source: "a(b|c)*"
	},
	{
		name: "a*b",
		source: "a*b"
	},
	{
		name: "奇数二进制",
		source: "(0|1)*1"
	},
	{
		name: "规则集合",
		source: "整数: (0|1)+\n标识: (a|b)(a|b|0|1)*"
	},
	{
		name: "捕获",
		source: "键值: (?<键>[ab]+):(?<值>[01]+)"
	},
	{
		name: "中文",
		source: "你: 你\n好: 你好+"
	}
];
var STAGES = [
	{
		id: "grammar",
		label: "文法"
	},
	{
		id: "thompson",
		label: "Thompson"
	},
	{
		id: "determinize",
		label: "确定化"
	},
	{
		id: "minimize",
		label: "最小化"
	},
	{
		id: "match",
		label: "匹配"
	}
];
var OPS = [
	[
		"连接",
		"ab",
		"先 a 再 b"
	],
	[
		"选择",
		"a|b",
		"a 或 b"
	],
	[
		"星",
		"a*",
		"零次或多次"
	],
	[
		"加",
		"a+",
		"至少一次"
	],
	[
		"可选",
		"a?",
		"零次或一次"
	],
	[
		"分组",
		"(?:ab)*",
		"整体重复，不记文本"
	],
	[
		"捕获",
		"(?<名>ab)",
		"给这段文本贴标签"
	],
	[
		"字符类",
		"[0-1]",
		"范围内任一字符"
	],
	[
		"任意",
		".",
		"字母表里的任一字符"
	],
	[
		"空串",
		"ε",
		"不消耗字符"
	],
	[
		"转义",
		"\\.",
		"点本身，不是任意字符"
	]
];
function Workbench() {
	const [source, setSource] = (0, import_react.useState)(PRESETS[0].source);
	const [alphabet, setAlphabet] = (0, import_react.useState)("");
	const [stage, setStage] = (0, import_react.useState)("thompson");
	const [showDead, setShowDead] = (0, import_react.useState)(true);
	const [pace, setPace] = (0, import_react.useState)(560);
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const saved = localStorage.getItem("lexica-source");
		const alpha = localStorage.getItem("lexica-alpha");
		if (saved) setSource(saved);
		if (alpha) setAlphabet(alpha);
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		localStorage.setItem("lexica-source", source);
		localStorage.setItem("lexica-alpha", alphabet);
	}, [
		ready,
		source,
		alphabet
	]);
	const compiled = (0, import_react.useMemo)(() => compile(source, alphabet), [source, alphabet]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto w-full max-w-wide px-4 py-6 md:px-8 md:py-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex flex-wrap items-end justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-xs tracking-[0.18em] text-sage uppercase",
				children: "Lexica"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-medium tracking-tight text-fg",
				children: "词法机"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm text-muted",
				children: "正则集合摊成 Thompson NFA、惰性 DFA 和完全子集 DFA，再并排做 Hopcroft 与 Brzozowski 最小化。"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 grid items-start gap-5 lg:grid-cols-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-md border border-line bg-surface p-4 lg:col-span-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								let next = randomProgram();
								for (let i = 0; i < 6 && next === source; i++) next = randomProgram();
								setSource(next);
								setAlphabet("");
							},
							className: "inline-flex h-11 items-center gap-1.5 rounded-sm bg-sage px-3 text-sm text-ink hover:bg-fg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dices, {
								className: "size-4",
								"aria-hidden": true
							}), "随机集合"]
						}), PRESETS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSource(p.source),
							className: "h-11 rounded-sm border border-line px-3 text-sm text-fg hover:border-sage",
							children: p.name
						}, p.name))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-4 block text-sm text-muted",
						htmlFor: "rules",
						children: [
							"规则。一行一条。",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-fg",
								children: "名字: 表达式"
							}),
							" 给规则贴标签，没有冒号就按 R1、R2 编号。# 开头是注释。捕获写成",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-fg",
								children: "(?<名字>…)"
							}),
							" 或 ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-fg",
								children: "(…)"
							}),
							"，只分组用",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-fg",
								children: "(?:…)"
							}),
							"。"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						id: "rules",
						value: source,
						spellCheck: false,
						onChange: (e) => setSource(e.target.value),
						className: "mt-2 min-h-24 w-full resize-y rounded-sm border border-line bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus-visible:border-sage"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "mt-4 block text-sm text-muted",
						htmlFor: "alpha",
						children: "字母表。留空就从表达式里收集。写上额外字符后，「.」和否定字符类会把它们算进去。"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						id: "alpha",
						value: alphabet,
						spellCheck: false,
						onChange: (e) => setAlphabet(e.target.value),
						placeholder: "a b 0 1",
						className: "mt-2 h-11 w-full rounded-sm border border-line bg-bg px-3 font-mono text-sm text-fg outline-none placeholder:text-muted focus-visible:border-sage"
					}),
					compiled.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Counts, { model: compiled.model }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fault, {
						failure: compiled,
						source
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 lg:col-span-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2 overflow-x-auto",
					role: "tablist",
					"aria-label": "构造阶段",
					children: [STAGES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						"aria-selected": stage === item.id,
						onClick: () => setStage(item.id),
						className: "h-11 shrink-0 rounded-sm px-4 text-sm " + (stage === item.id ? "bg-sage text-ink" : "border border-line text-fg hover:border-sage"),
						children: item.label
					}, item.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setShowDead((v) => !v),
						className: "ml-auto h-11 shrink-0 rounded-sm border border-line px-3 text-sm text-muted hover:text-fg",
						"aria-pressed": showDead,
						children: showDead ? "死状态显示中" : "死状态已隐藏"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4",
					children: !compiled.ok ? null : stage === "grammar" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Grammar, { model: compiled.model }) : stage === "thompson" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thompson, {
						model: compiled.model,
						pace,
						setPace
					}) : stage === "determinize" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Determinize, {
						model: compiled.model,
						showDead,
						pace,
						setPace
					}) : stage === "minimize" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minimize, {
						model: compiled.model,
						showDead,
						pace,
						setPace
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Match, {
						model: compiled.model,
						showDead,
						pace,
						setPace
					})
				})]
			})]
		})]
	});
}
function Counts({ model }) {
	const hop = model.hopThom.ok ? String(model.hopThom.value.dfa.states.length) : "—";
	const items = [
		["NFA", String(model.nfa.states.length)],
		["惰性 DFA", String(model.lazy.dfa.states.length)],
		["Thompson DFA", String(model.thompson.dfa.states.length)],
		["最小", hop]
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
		className: "mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm",
		children: [items.map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
				className: "text-muted",
				children: k
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
				className: "text-sage",
				children: v
			})]
		}, k)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-muted",
			children: ["字母表 ", model.alphabet.join(" ") || "ε"]
		})]
	});
}
function Fault({ failure, source }) {
	const line = failure.line ? source.split(/\r?\n/)[failure.line - 1] : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4 border-l-2 border-ember bg-bg px-3 py-3 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-ember",
				children: failure.message
			}),
			failure.line ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 font-mono text-xs text-muted",
				children: [
					"第 ",
					failure.line,
					" 行"
				]
			}) : null,
			line ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("pre", {
				className: "mt-1 overflow-x-auto font-mono text-sm text-fg",
				children: [
					line,
					"\n",
					" ".repeat(failure.column ?? 0),
					"^"
				]
			}) : null
		]
	});
}
function Grammar({ model }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 md:grid-cols-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-md border border-line bg-surface p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-lg text-fg",
				children: "规则"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 space-y-4",
				children: model.patterns.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-sm text-sage",
						children: p.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-mono text-sm text-fg",
						children: printAst(p.ast)
					}),
					p.groups.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 font-mono text-xs text-sage",
						children: [
							"捕获",
							" ",
							p.groups.map((g) => g.name === String(g.slot) ? g.name : `${g.slot}:${g.name}`).join(" · ")
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-muted",
						children: [
							"第 ",
							p.line,
							" 行原文 ",
							p.source
						]
					})
				] }, p.id))
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-md border border-line bg-surface p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-lg text-fg",
				children: "写法"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
				className: "mt-3 w-full text-left text-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: OPS.map(([name, sample, meaning]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-line",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "py-2 pr-3 font-normal text-muted",
							children: name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 pr-3 font-mono text-fg",
							children: sample
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-2 text-fg",
							children: meaning
						})
					]
				}, name)) })
			})]
		})]
	});
}
function Thompson({ model, pace, setPace }) {
	const notes = model.nfa.steps;
	const [step, setStep] = (0, import_react.useState)(0);
	const [playing, setPlaying] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setStep(0);
		setPlaying(false);
	}, [model]);
	const safe = Math.min(step, Math.max(0, notes.length - 1));
	const note = notes[safe];
	const view = viewNfa(model.nfa, {
		step: note?.step ?? 0,
		names: model.patterns.map((p) => p.name),
		hot: [],
		hotEdges: []
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(StageShell, {
		kicker: "Thompson 构造",
		title: "自底向上把表达式焊成 NFA",
		body: "字面量是一条边。连接、选择、星号各自加 ε。多条规则共用一个起点，接受态带着规则名。",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AutomatonFigure, {
			model: view,
			machineKey: `nfa-${safe}`,
			caption: "Thompson NFA"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Player, {
			step: safe,
			count: notes.length,
			playing,
			pace,
			setPace,
			onStep: setStep,
			onPlay: setPlaying,
			note,
			notes
		})]
	});
}
function Determinize({ model, showDead, pace, setPace }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(StageShell, {
		kicker: "子集构造",
		title: "同一台 NFA，两种确定化",
		body: "惰性 DFA 按深度优先，一次只请求一个符号，状态沿着一条路径先长出来。Thompson DFA 按广度把每个状态的整行字母表一次铺开。全部请求完之后两者同构，只是出生顺序不同。",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-3 font-mono text-sm text-muted",
			children: [
				"完全展开 ",
				model.lazy.dfa.states.length,
				" 个状态",
				model.iso.lazyVsThom ? " · 同构校验通过" : " · 同构校验失败"
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4 md:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DetPane, {
				title: "惰性 DFA",
				kicker: "深度优先，按需请求",
				dfa: model.lazy.dfa,
				log: model.lazy.log,
				names: model.patterns.map((p) => p.name),
				showDead,
				pace,
				setPace,
				resetKey: model.nfa.states.length + model.alphabet.join("")
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DetPane, {
				title: "Thompson DFA",
				kicker: "广度优先，完全子集",
				dfa: model.thompson.dfa,
				log: model.thompson.log,
				names: model.patterns.map((p) => p.name),
				showDead,
				pace,
				setPace,
				resetKey: `b${model.nfa.states.length}${model.alphabet.join("")}`
			})]
		})]
	});
}
function DetPane({ title, kicker, dfa, log, names, showDead, pace, setPace, resetKey }) {
	const [step, setStep] = (0, import_react.useState)(0);
	const [playing, setPlaying] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
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
		showDead
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs text-sage uppercase",
			children: kicker
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "mt-1 text-lg text-fg",
			children: title
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AutomatonFigure, {
				model: view,
				machineKey: `${title}-${safe}-${showDead}`,
				caption: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Player, {
				step: safe,
				count: log.length,
				playing,
				pace,
				setPace,
				onStep: setStep,
				onPlay: setPlaying,
				note,
				notes: log
			})]
		})
	] });
}
function Minimize({ model, showDead, pace, setPace }) {
	const [which, setWhich] = (0, import_react.useState)("thompson");
	const names = model.patterns.map((p) => p.name);
	const base = which === "thompson" ? model.thompson.dfa : model.lazy.dfa;
	const hop = which === "thompson" ? model.hopThom : model.hopLazy;
	const brz = which === "thompson" ? model.brzThom : model.brzLazy;
	const iso = which === "thompson" ? model.iso.hopThomVsBrz : model.iso.hopLazyVsBrz;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(StageShell, {
		kicker: "并行最小化",
		title: "Hopcroft 细化，Brzozowski 两次反转",
		body: "Hopcroft 用接受标签做初始划分，再按「谁能走进被观察的块」把块拆开。Brzozowski 把边反向再确定化，做两遍，直接得到最小 DFA。多条规则标签不同时，反转前会先接上探针，避免不同规则被当成同一种接受。",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex flex-wrap items-center gap-2",
				children: [[["thompson", "在 Thompson DFA 上"], ["lazy", "在惰性 DFA 上"]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setWhich(id),
					className: "h-11 rounded-sm px-3 text-sm " + (which === id ? "bg-sage text-ink" : "border border-line text-fg"),
					children: label
				}, id)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-sm " + (iso ? "text-sage" : "text-ember"),
					children: [iso ? "两台最小机同构" : "两台最小机不同构", model.iso.minsAcross ? " · 惰性与 Thompson 的最小机也同构" : ""]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-4 overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[32rem] text-left font-mono text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 font-normal",
								children: "机器"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 font-normal",
								children: "展开"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 font-normal",
								children: "Hopcroft"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 font-normal",
								children: "Brzozowski"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CountRow, {
						label: "惰性 DFA",
						n: model.lazy.dfa.states.length,
						hop: model.hopLazy,
						brz: model.brzLazy
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CountRow, {
						label: "Thompson DFA",
						n: model.thompson.dfa.states.length,
						hop: model.hopThom,
						brz: model.brzThom
					})] })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-2",
				children: [hop.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HopPane, {
					dfa: base,
					result: hop.value,
					names,
					showDead,
					pace,
					setPace,
					resetKey: which + base.states.length
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-ember",
					children: hop.error
				}), brz.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrzPane, {
					result: brz.value,
					names,
					showDead,
					pace,
					setPace,
					resetKey: which + "b"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-ember",
					children: brz.error
				})]
			})
		]
	});
}
function CountRow({ label, n, hop, brz }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
		className: "border-t border-line text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-2",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-2",
				children: n
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-2",
				children: hop.ok ? hop.value.dfa.states.length : hop.error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "py-2",
				children: brz.ok ? brz.value.dfa.states.length : brz.error
			})
		]
	});
}
function HopPane({ dfa, result, names, showDead, pace, setPace, resetKey }) {
	const [step, setStep] = (0, import_react.useState)(0);
	const [playing, setPlaying] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setStep(0);
		setPlaying(false);
	}, [resetKey]);
	const frames = result.frames;
	const safe = Math.min(step, Math.max(0, frames.length - 1));
	const frame = frames[safe];
	const view = frame?.result ? viewDfa(result.dfa, {
		step: null,
		names,
		hot: [],
		hotEdges: [],
		showDead
	}) : viewDfa(dfa, {
		step: null,
		names,
		hot: [],
		hotEdges: [],
		blocks: frame?.blocks,
		showDead
	});
	const notes = frames.map((f) => ({
		step: f.step,
		title: f.title,
		detail: f.detail
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs text-sage uppercase",
			children: "划分细化"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "mt-1 text-lg text-fg",
			children: "Hopcroft"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AutomatonFigure, {
					model: view,
					machineKey: `hop-${resetKey}-${safe}-${showDead}`,
					caption: "Hopcroft"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Player, {
					step: safe,
					count: frames.length,
					playing,
					pace,
					setPace,
					onStep: setStep,
					onPlay: setPlaying,
					note: frame,
					notes
				}),
				frame && !frame.result ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 font-mono text-xs text-muted",
					children: ["工作表 ", frame.work.length ? frame.work.join("  ") : "空"]
				}) : null
			]
		})
	] });
}
function BrzPane({ result, names, showDead, pace, setPace, resetKey }) {
	const flat = (0, import_react.useMemo)(() => flatten(result.phases), [result]);
	const [step, setStep] = (0, import_react.useState)(0);
	const [playing, setPlaying] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setStep(0);
		setPlaying(false);
	}, [resetKey]);
	const safe = Math.min(step, Math.max(0, flat.length - 1));
	const cur = flat[safe];
	const view = cur ? phaseView(cur, names, showDead) : {
		nodes: [],
		edges: [],
		start: 0
	};
	const notes = flat.map((f, i) => ({
		step: i,
		title: f.title,
		detail: f.detail
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs text-sage uppercase",
			children: "反转 · 确定化 · 反转 · 确定化"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "mt-1 text-lg text-fg",
			children: "Brzozowski"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AutomatonFigure, {
				model: view,
				machineKey: `brz-${resetKey}-${safe}-${showDead}`,
				caption: "Brzozowski"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Player, {
				step: safe,
				count: flat.length,
				playing,
				pace,
				setPace,
				onStep: setStep,
				onPlay: setPlaying,
				note: cur,
				notes
			})]
		})
	] });
}
function flatten(phases) {
	const out = [];
	for (const phase of phases) if (phase.log && phase.log.length > 1) for (const note of phase.log) out.push({
		title: `${phase.title} · ${note.title}`,
		detail: note.detail,
		phase,
		inner: note.step
	});
	else out.push({
		title: phase.title,
		detail: phase.detail,
		phase,
		inner: null
	});
	return out;
}
function phaseView(cur, names, showDead) {
	const phaseNames = (/* @__PURE__ */ new Set([
		"min",
		"proj",
		"src"
	])).has(cur.phase.id) ? names : ["接受"];
	if (cur.phase.kind === "nfa" && cur.phase.nfa) return viewNfa(cur.phase.nfa, {
		step: null,
		names: ["接受"],
		hot: [],
		hotEdges: []
	});
	if (cur.phase.dfa) return viewDfa(cur.phase.dfa, {
		step: cur.inner,
		names: phaseNames,
		hot: [],
		hotEdges: [],
		showDead
	});
	return {
		nodes: [],
		edges: [],
		start: 0
	};
}
function Match({ model, showDead, pace, setPace }) {
	const names = model.patterns.map((p) => p.name);
	const [text, setText] = (0, import_react.useState)("abb");
	const [mode, setMode] = (0, import_react.useState)("nfa");
	const symbols = textToSymbols(text);
	const caps = (0, import_react.useMemo)(() => simulateCaptures(model.nfa, symbols), [model, text]);
	const hopDfa = model.hopThom.ok ? model.hopThom.value.dfa : model.thompson.dfa;
	const brzDfa = model.brzThom.ok ? model.brzThom.value.dfa : model.thompson.dfa;
	const lazy = (0, import_react.useMemo)(() => lazyWalk(model.nfa, symbols, names), [
		model,
		text,
		names
	]);
	const frames = (0, import_react.useMemo)(() => {
		if (mode === "nfa") return matchNfa(model.nfa, symbols, names);
		if (mode === "lazy") return lazy.frames;
		if (mode === "hop") return matchDfa(hopDfa, symbols, names);
		return matchDfa(brzDfa, symbols, names);
	}, [
		mode,
		model,
		symbols,
		names,
		lazy,
		hopDfa,
		brzDfa
	]);
	const [step, setStep] = (0, import_react.useState)(0);
	const [playing, setPlaying] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setStep(0);
		setPlaying(false);
	}, [
		text,
		mode,
		model
	]);
	const safe = Math.min(step, Math.max(0, frames.length - 1));
	const frame = frames[safe];
	const view = matchView(mode, model.nfa, lazy.dfa, hopDfa, brzDfa, frame, names, showDead);
	const samples = witnesses(hopDfa, names);
	const verdict = frames[frames.length - 1];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(StageShell, {
		kicker: "匹配回放",
		title: "把文本喂进四台机器",
		body: "NFA 用活动集和 ε-闭包。惰性 DFA 只沿着这段文本现算子集。最小 DFA 在完整转移上一步一格。捕获组写在 Thompson 的 ε 边上，开时记下位置，闭时截断；同一组再碰上就覆盖。",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3 flex flex-wrap gap-2",
				children: [
					["nfa", "Thompson 模拟"],
					["lazy", "惰性展开"],
					["hop", "Hopcroft"],
					["brz", "Brzozowski"]
				].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setMode(id),
					className: "h-11 rounded-sm px-3 text-sm " + (mode === id ? "bg-sage text-ink" : "border border-line text-fg"),
					children: label
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
				className: "text-sm text-muted",
				htmlFor: "sample",
				children: "待匹配文本。整串必须属于某条规则才算接受。"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				id: "sample",
				value: text,
				spellCheck: false,
				onChange: (e) => setText(e.target.value),
				className: "mt-2 h-11 w-full rounded-sm border border-line bg-bg px-3 font-mono text-sm text-fg outline-none focus-visible:border-sage"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: samples.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setText(w.symbols.join("")),
					className: "h-11 rounded-sm border border-line px-3 font-mono text-sm text-fg hover:border-sage",
					children: [
						w.kind === "accept" ? w.label : "拒绝",
						" ",
						w.symbols.join("") || "ε"
					]
				}, w.kind + w.label + w.symbols.join("")))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tape, {
				symbols,
				index: frame?.index ?? 0,
				verdict: verdict?.verdict,
				tags: verdict?.tags ?? [],
				names,
				captures: caps[frame?.index ?? 0] ?? []
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AutomatonFigure, {
					model: view,
					machineKey: `m-${mode}-${safe}-${text}`,
					caption: mode === "lazy" ? `惰性 ${lazy.dfa.states.length} 状态 / 完全 ${model.thompson.dfa.states.length}` : "匹配"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Player, {
					step: safe,
					count: frames.length,
					playing,
					pace,
					setPace,
					onStep: setStep,
					onPlay: setPlaying,
					note: frame,
					notes: frames.map((f) => ({
						step: f.step,
						title: f.title,
						detail: f.detail
					}))
				})]
			})
		]
	});
}
function matchView(mode, nfa, lazy, hop, brz, frame, names, showDead) {
	const hot = frame?.active ?? [];
	const hotEdges = frame?.hot ?? [];
	if (mode === "nfa") return viewNfa(nfa, {
		step: null,
		names,
		hot,
		hotEdges
	});
	return viewDfa(mode === "lazy" ? lazy : mode === "hop" ? hop : brz, {
		step: mode === "lazy" ? frame?.step ?? 0 : null,
		names,
		hot,
		hotEdges,
		showDead
	});
}
function Tape({ symbols, index, verdict, tags, names, captures }) {
	const done = verdict === "accept" || verdict === "reject";
	const live = verdict === "accept" ? captures.filter((c) => tags.includes(c.rule)) : captures;
	const marked = /* @__PURE__ */ new Set();
	for (const cap of live) {
		if (cap.start === null || cap.end === null) continue;
		for (let i = cap.start; i < cap.end; i++) marked.add(i);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4 rounded-md border border-line bg-surface px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-1 font-mono text-lg",
				children: [symbols.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: "ε"
				}) : null, symbols.map((ch, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "inline-flex h-11 min-w-8 items-center justify-center px-1 " + (i < index ? "text-muted " : i === index && !done ? "bg-sage text-ink " : "text-fg ") + (marked.has(i) ? "border-b-2 border-sage" : ""),
					children: ch
				}, `${ch}-${i}`))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm " + (verdict === "accept" ? "text-sage" : verdict === "reject" ? "text-ember" : "text-muted"),
				children: verdict === "accept" ? `接受 ${tags.map((id) => names[id] ?? id).join(" · ")}` : verdict === "reject" ? "拒绝" : "还在走"
			}),
			live.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 font-mono text-sm text-fg",
				children: live.map((cap) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "mr-4",
					children: [
						cap.name,
						"=",
						cap.end === null ? `${cap.text}…` : cap.text || "ε"
					]
				}, cap.id))
			}) : null
		]
	});
}
function StageShell({ kicker, title, body, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-mono text-xs tracking-wide text-sage uppercase",
			children: kicker
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mt-1 text-2xl text-fg",
			children: title
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 max-w-3xl text-sm text-muted",
			children: body
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4",
			children
		})
	] });
}
function Player({ step, count, playing, pace, setPace, onStep, onPlay, note, notes }) {
	(0, import_react.useEffect)(() => {
		if (!playing) return;
		if (count <= 1 || step >= count - 1) {
			onPlay(false);
			return;
		}
		const id = window.setInterval(() => {
			onStep(step + 1);
		}, pace);
		return () => window.clearInterval(id);
	}, [
		playing,
		step,
		count,
		pace,
		onStep,
		onPlay
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "flex size-11 items-center justify-center rounded-sm border border-line",
						"aria-label": "上一步",
						onClick: () => onStep(Math.max(0, step - 1)),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipBack, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "flex size-11 items-center justify-center rounded-sm bg-sage text-ink",
						"aria-label": playing ? "暂停" : "播放",
						onClick: () => {
							if (!playing && step >= count - 1) onStep(0);
							onPlay(!playing);
						},
						children: playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "flex size-11 items-center justify-center rounded-sm border border-line",
						"aria-label": "下一步",
						onClick: () => onStep(Math.min(count - 1, step + 1)),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkipForward, { className: "size-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-sm text-muted",
						children: [
							count ? step + 1 : 0,
							"/",
							count
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "ml-auto flex gap-1",
						children: [
							[900, "慢"],
							[560, "中"],
							[280, "快"]
						].map(([ms, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setPace(ms),
							className: "h-11 rounded-sm px-3 text-sm " + (pace === ms ? "bg-raised text-fg" : "text-muted"),
							children: label
						}, ms))
					})
				]
			}),
			note ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-base text-fg",
					children: note.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: note.detail
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-3 max-h-48 space-y-1 overflow-y-auto pr-1",
				children: notes.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onStep(i),
					className: "w-full rounded-sm px-2 py-2 text-left text-sm " + (i === step ? "bg-raised text-fg" : "text-muted hover:text-fg"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs text-sage",
							children: String(i + 1).padStart(2, "0")
						}),
						" ",
						item.title
					]
				}) }, `${item.step}-${item.title}-${i}`))
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Workbench, {});
}
//#endregion
export { Home as component };
