import { useEffect, useId, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import { layoutGraph, type Pt } from "@/lib/automata/layout";
import type { ViewModel } from "@/lib/automata/view";

const R = 24;

export function AutomatonFigure({
  model,
  machineKey,
  caption,
}: {
  model: ViewModel;
  machineKey: string;
  caption: string;
}) {
  const uid = useId().replace(/:/g, "");
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 420 });
  const [follow, setFollow] = useState(true);
  const [cam, setCam] = useState({ x: 24, y: 24, k: 1 });
  const [picked, setPicked] = useState<number | null>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number; k: number } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const apply = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setFollow(true);
    setPicked(null);
  }, [machineKey]);

  const pos = useMemo(() => {
    const ids = model.nodes.map((n) => n.id);
    const edges = model.edges.map((e) => ({ from: e.from, to: e.to }));
    return layoutGraph(ids, edges, model.start);
  }, [model]);

  const fit = useMemo(() => fitView(model, pos, size), [model, pos, size]);
  const view = follow ? fit : cam;
  const drawnEdges = model.edges.filter((e) => e.on);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    host.current?.setPointerCapture(event.pointerId);
    const current = follow ? fit : cam;
    drag.current = { px: event.clientX, py: event.clientY, x: current.x, y: current.y, k: current.k };
    setFollow(false);
    setCam(current);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setCam({ x: d.x + event.clientX - d.px, y: d.y + event.clientY - d.py, k: d.k });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const zoom = (factor: number) => {
    const current = follow ? fit : cam;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const k = Math.min(2.4, Math.max(0.35, current.k * factor));
    const ratio = k / current.k;
    setFollow(false);
    setCam({
      k,
      x: cx - (cx - current.x) * ratio,
      y: cy - (cy - current.y) * ratio,
    });
  };

  const bounds = useMemo(() => {
    let maxX = 240;
    let maxY = 180;
    for (const p of pos.values()) {
      maxX = Math.max(maxX, p.x + 96);
      maxY = Math.max(maxY, p.y + 96);
    }
    return { w: maxX, h: maxY };
  }, [pos]);
  const blocks = blockBoxes(model, pos);
  const pickedNode = model.nodes.find((n) => n.id === picked && n.on);

  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <p className="truncate font-mono text-xs tracking-wide text-muted uppercase">{caption}</p>
        <div className="flex shrink-0 gap-1">
          <IconButton label="缩小" onClick={() => zoom(1 / 1.15)}>
            <Minus className="size-4" />
          </IconButton>
          <IconButton label="放大" onClick={() => zoom(1.15)}>
            <Plus className="size-4" />
          </IconButton>
          <IconButton
            label="复位视图"
            onClick={() => {
              setFollow(true);
            }}
          >
            <Crosshair className="size-4" />
          </IconButton>
        </div>
      </div>
      <div
        ref={host}
        className="relative h-72 touch-none md:h-96"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          width={bounds.w}
          height={bounds.h}
          className="absolute top-0 left-0 overflow-visible"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: "0 0" }}
        >
          <defs>
            <marker id={`${uid}-m`} viewBox="0 0 10 8" refX="9" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0 0 L10 4 L0 8 Z" fill="var(--color-muted)" />
            </marker>
            <marker id={`${uid}-h`} viewBox="0 0 10 8" refX="9" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0 0 L10 4 L0 8 Z" fill="var(--color-sage)" />
            </marker>
          </defs>
          {blocks.map((b) => (
            <rect
              key={b.id}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx="16"
              fill="var(--color-sage)"
              opacity={0.07 + (b.id % 3) * 0.03}
              stroke="var(--color-sage)"
              strokeOpacity={0.45}
            />
          ))}
          {drawnEdges.map((e) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            const drawn = drawEdge(a, b, e.from, e.to);
            return (
              <g key={e.key}>
                <path
                  d={drawn.d}
                  fill="none"
                  stroke={e.hot ? "var(--color-sage)" : "var(--color-muted)"}
                  strokeWidth={e.hot ? 2.4 : 1.4}
                  strokeDasharray={e.eps ? "4 4" : undefined}
                  markerEnd={`url(#${uid}-${e.hot ? "h" : "m"})`}
                />
                {e.label ? (
                  <>
                    <rect x={drawn.lx - e.label.length * 4.2 - 4} y={drawn.ly - 9} width={e.label.length * 8.4 + 8} height={18} rx="4" fill="var(--color-surface)" />
                    <text x={drawn.lx} y={drawn.ly + 4} textAnchor="middle" fill={e.hot ? "var(--color-sage)" : "var(--color-fg)"} fontSize="12" fontFamily="IBM Plex Mono, ui-monospace, monospace">
                      {e.label}
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}
          {model.nodes
            .filter((n) => n.on)
            .map((n) => {
              const p = pos.get(n.id);
              if (!p) return null;
              const sub = n.sub.length > 16 ? `${n.sub.slice(0, 15)}…` : n.sub;
              return (
                <g key={n.id} onPointerDown={(event) => event.stopPropagation()} onClick={() => setPicked(n.id)} className="cursor-pointer">
                  <title>{n.tip}</title>
                  {n.accept ? <circle cx={p.x} cy={p.y} r={R + 5} fill="none" stroke="var(--color-sage)" strokeWidth="1.4" /> : null}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={R}
                    fill={n.hot ? "var(--color-ink)" : "var(--color-raised)"}
                    stroke={n.hot ? "var(--color-sage)" : n.dead ? "var(--color-muted)" : "var(--color-line)"}
                    strokeWidth={n.hot ? 2.5 : 1.5}
                    strokeDasharray={n.dead ? "3 3" : undefined}
                  />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" fill="var(--color-fg)" fontSize="13" fontFamily="IBM Plex Mono, ui-monospace, monospace">
                    {n.name}
                  </text>
                  {sub ? (
                    <text x={p.x} y={p.y + R + 16} textAnchor="middle" fill={n.accept ? "var(--color-sage)" : "var(--color-muted)"} fontSize="11" fontFamily="IBM Plex Mono, ui-monospace, monospace">
                      {sub}
                    </text>
                  ) : null}
                </g>
              );
            })}
          {(() => {
            const start = model.nodes.find((n) => n.id === model.start && n.on);
            const p = pos.get(model.start);
            if (!start || !p) return null;
            return (
              <line
                x1={p.x - 58}
                y1={p.y}
                x2={p.x - R - 2}
                y2={p.y}
                stroke="var(--color-sage)"
                strokeWidth="1.6"
                markerEnd={`url(#${uid}-h)`}
              />
            );
          })()}
        </svg>
        {pickedNode ? (
          <p className="pointer-events-none absolute right-3 bottom-3 left-3 rounded-sm bg-bg/90 px-3 py-2 font-mono text-xs text-fg">
            {pickedNode.tip}
          </p>
        ) : (
          <p className="pointer-events-none absolute bottom-3 left-3 font-mono text-xs text-muted">拖动平移 · 点状态看子集</p>
        )}
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-sm border border-line text-fg hover:border-sage hover:text-sage"
    >
      {children}
    </button>
  );
}

function fitView(model: ViewModel, pos: Map<number, Pt>, size: { w: number; h: number }) {
  const pts = model.nodes.filter((n) => n.on).map((n) => pos.get(n.id)).filter((p): p is Pt => !!p);
  if (!pts.length || size.w < 40) return { x: 32, y: 48, k: 1 };
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
    k,
  };
}

function blockBoxes(model: ViewModel, pos: Map<number, Pt>) {
  const groups = new Map<number, Pt[]>();
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
    return { id, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  });
}

function drawEdge(a: Pt, b: Pt, from: number, to: number): { d: string; lx: number; ly: number } {
  if (from === to) {
    const y = a.y - R;
    return {
      d: `M ${a.x - 6} ${y} C ${a.x - 34} ${y - 52}, ${a.x + 34} ${y - 52}, ${a.x + 8} ${y - 2}`,
      lx: a.x,
      ly: a.y - R - 46,
    };
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const same = Math.abs(dx) < 24;
  const bend = (from < to ? 1 : -1) * (same ? 46 : 26);
  const c = { x: (a.x + b.x) / 2 + (-dy / len) * bend, y: (a.y + b.y) / 2 + (dx / len) * bend };
  const t0 = tOutside(a, c, b, a, false);
  const t1 = tOutside(a, c, b, b, true);
  const steps = 14;
  let d = "";
  let mid = pointOn(a, c, b, (t0 + t1) / 2);
  for (let i = 0; i <= steps; i++) {
    const p = pointOn(a, c, b, t0 + ((t1 - t0) * i) / steps);
    d += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
    if (i === Math.floor(steps / 2)) mid = p;
  }
  return { d, lx: mid.x, ly: mid.y - 10 };
}

function pointOn(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

function tOutside(a: Pt, c: Pt, b: Pt, center: Pt, end: boolean): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    const p = pointOn(a, c, b, mid);
    const dist = Math.hypot(p.x - center.x, p.y - center.y);
    if (end) {
      if (dist < R + 3) hi = mid;
      else lo = mid;
    } else if (dist < R + 1) lo = mid;
    else hi = mid;
  }
  return end ? lo : hi;
}
