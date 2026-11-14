import { useEffect, useMemo, useRef, useState } from "react";
import type { CEvent, CPosition, Candle, Trader } from "@/lib/types";
import { DOWN, UP, dirColor, fmtPrice, fmtTime, timeAgo } from "@/lib/format";

interface Props {
  candles: Candle[];
  intervalMs: number;
  events: CEvent[];
  positions: CPosition[];
  traders: Record<number, Trader>;
  lastPrice?: number;
  showTrades: boolean;
  showLevels: boolean;
  selectedId?: number | null;
  onSelect?: (e: CEvent | null) => void;
}

const PAD = { r: 68, b: 24, t: 8, l: 4 };
const TYPE_LABEL: Record<string, string> = { open: "Opened", close: "Closed", increase: "Added to", decrease: "Trimmed" };
const TYPE_GLYPH: Record<string, string> = { open: "●", close: "✕", increase: "+", decrease: "−" };

export function Chart({ candles, intervalMs, events, positions, traders, lastPrice, showTrades, showLevels, selectedId, onSelect }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 480 });
  const [n, setN] = useState(168);
  const [off, setOff] = useState(0);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<CEvent | null>(null);
  const dragRef = useRef<{ x: number; off: number } | null>(null);

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { setOff(0); }, [intervalMs]);

  const total = candles.length;
  const nn = Math.min(Math.max(20, n), Math.max(20, total));
  const maxOff = Math.max(0, total - nn);
  const o = Math.min(off, maxOff);
  const vis = useMemo(() => candles.slice(Math.max(0, total - nn - o), total - o), [candles, nn, o, total]);

  const W = size.w - PAD.l - PAD.r;
  const H = size.h - PAD.t - PAD.b;

  const view = useMemo(() => {
    if (!vis.length) return null;
    let lo = Infinity, hi = -Infinity, vmax = 0;
    for (const c of vis) { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); vmax = Math.max(vmax, c.v); }
    const pad = (hi - lo) * 0.08 || hi * 0.01;
    return { lo: lo - pad, hi: hi + pad, vmax, t0: vis[0].t, t1: vis[vis.length - 1].t + intervalMs };
  }, [vis, intervalMs]);

  // Merge Centaur events + position opens (deduped by positionId) into one marker set.
  const markers = useMemo(() => {
    const seen = new Set<number>();
    const out: CEvent[] = [...events];
    events.forEach((e) => e.positionId && e.type === "open" && seen.add(e.positionId));
    for (const p of positions) {
      if (seen.has(p.id)) continue;
      out.push({ id: -p.id, type: "open", direction: p.direction, price: p.openPrice, time: p.openAt, traderId: p.traderId, positionId: p.id, symbol: p.symbol });
    }
    return out;
  }, [events, positions]);

  const levels = useMemo(() => {
    const avg = (d: "long" | "short") => {
      const a = positions.filter((p) => p.direction === d);
      return a.length ? { px: a.reduce((s, p) => s + p.openPrice, 0) / a.length, n: a.length } : null;
    };
    return { long: avg("long"), short: avg("short") };
  }, [positions]);

  if (!view) return <div ref={wrap} className="flex h-full items-center justify-center text-sm text-zinc-500">Loading chart…</div>;

  const x = (t: number) => PAD.l + ((t - view.t0) / (view.t1 - view.t0)) * W;
  const y = (p: number) => PAD.t + (1 - (p - view.lo) / (view.hi - view.lo)) * H;
  const cw = Math.max(1, (W / vis.length) * 0.72);

  // y-axis ticks
  const ticks: number[] = [];
  const step = niceStep((view.hi - view.lo) / 7);
  for (let v = Math.ceil(view.lo / step) * step; v < view.hi; v += step) ticks.push(v);

  // time ticks
  const tt: number[] = [];
  const tspan = view.t1 - view.t0;
  const tstep = niceTime(tspan / 7);
  for (let t = Math.ceil(view.t0 / tstep) * tstep; t < view.t1; t += tstep) tt.push(t);

  // marker layout w/ simple vertical stacking per x-bucket
  const bucket: Record<number, number> = {};
  const placed = showTrades
    ? markers
        .map((e) => ({ e, t: new Date(e.time).getTime() }))
        .filter(({ t }) => t >= view.t0 && t <= view.t1)
        .sort((a, b) => a.t - b.t)
        .map(({ e, t }) => {
          const px = x(t);
          const k = Math.round(px / 16);
          const stack = bucket[k] || 0;
          bucket[k] = stack + 1;
          const py = Math.min(Math.max(y(e.price), PAD.t + 12), PAD.t + H - 12) - stack * 20 * (e.price > (view.hi + view.lo) / 2 ? -1 : 1);
          return { e, px, py, truePy: y(e.price) };
        })
    : [];

  const cur = lastPrice ?? vis[vis.length - 1].c;
  const crossPrice = mouse ? view.lo + (1 - (mouse.y - PAD.t) / H) * (view.hi - view.lo) : null;
  const crossT = mouse ? view.t0 + ((mouse.x - PAD.l) / W) * (view.t1 - view.t0) : null;

  return (
    <div
      ref={wrap}
      className="relative h-full w-full select-none overflow-hidden"
      onWheel={(e) => { setN((v) => Math.round(Math.min(Math.max(20, v * (e.deltaY > 0 ? 1.12 : 0.89)), Math.max(20, total)))); }}
    >
      <svg
        width={size.w}
        height={size.h}
        className="block cursor-crosshair"
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const mx = e.clientX - r.left, my = e.clientY - r.top;
          setMouse({ x: mx, y: my });
          if (dragRef.current) {
            const dx = mx - dragRef.current.x;
            setOff(Math.max(0, Math.min(maxOff, dragRef.current.off + Math.round(dx / (W / vis.length)))));
          }
        }}
        onMouseDown={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); dragRef.current = { x: e.clientX - r.left, off: o }; }}
        onMouseUp={() => (dragRef.current = null)}
        onMouseLeave={() => { setMouse(null); dragRef.current = null; }}
        onClick={() => { if (!hover) onSelect?.(null); }}
      >
        <defs>
          {placed.map(({ e }) => (
            <clipPath id={`clip${e.id < 0 ? "n" + -e.id : e.id}`} key={e.id}>
              <circle r={9} />
            </clipPath>
          ))}
        </defs>

        {/* grid */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={PAD.l + W} y1={y(v)} y2={y(v)} stroke="#ffffff10" />
            <text x={PAD.l + W + 6} y={y(v) + 3} fontSize={10} fill="#71717a">{fmtPrice(v)}</text>
          </g>
        ))}
        {tt.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={PAD.t} y2={PAD.t + H} stroke="#ffffff08" />
            <text x={x(t)} y={size.h - 8} fontSize={10} fill="#71717a" textAnchor="middle">{tspan > 2 * 86400000 ? fmtTime(t).split(",")[0] : fmtTime(t).split(", ")[1] || fmtTime(t)}</text>
          </g>
        ))}

        {/* volume */}
        {vis.map((c) => (
          <rect key={"v" + c.t} x={x(c.t) + (W / vis.length - cw) / 2} width={cw} y={PAD.t + H - (c.v / (view.vmax || 1)) * H * 0.16} height={(c.v / (view.vmax || 1)) * H * 0.16} fill={c.c >= c.o ? "#22c55e22" : "#ef444422"} />
        ))}

        {/* candles */}
        {vis.map((c) => {
          const up = c.c >= c.o;
          const cx = x(c.t) + W / vis.length / 2;
          const col = up ? UP : DOWN;
          return (
            <g key={c.t}>
              <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth={1} />
              <rect x={cx - cw / 2} width={cw} y={Math.min(y(c.o), y(c.c))} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill={col} />
            </g>
          );
        })}

        {/* avg entry levels */}
        {showLevels && (["long", "short"] as const).map((d) => {
          const l = levels[d];
          if (!l || l.px < view.lo || l.px > view.hi) return null;
          return (
            <g key={d}>
              <line x1={PAD.l} x2={PAD.l + W} y1={y(l.px)} y2={y(l.px)} stroke={dirColor(d)} strokeDasharray="5 4" strokeOpacity={0.65} />
              <rect x={PAD.l + 6} y={y(l.px) - 9} width={170} height={16} rx={3} fill="#0b0e11" fillOpacity={0.85} stroke={dirColor(d)} strokeOpacity={0.5} />
              <text x={PAD.l + 12} y={y(l.px) + 3} fontSize={10} fill={dirColor(d)}>
                avg {d} entry {fmtPrice(l.px)} · {l.n} traders
              </text>
            </g>
          );
        })}

        {/* last price */}
        <line x1={PAD.l} x2={PAD.l + W} y1={y(cur)} y2={y(cur)} stroke="#a1a1aa" strokeDasharray="2 3" strokeOpacity={0.6} />
        <rect x={PAD.l + W} y={y(cur) - 9} width={PAD.r - 2} height={18} fill={cur >= vis[vis.length - 1].o ? UP : DOWN} />
        <text x={PAD.l + W + 5} y={y(cur) + 4} fontSize={10.5} fontWeight={700} fill="#000">{fmtPrice(cur)}</text>

        {/* trader markers */}
        {placed.map(({ e, px, py, truePy }) => {
          const tr = traders[e.traderId];
          const col = dirColor(e.direction);
          const sel = selectedId === e.id || hover?.id === e.id;
          const id = e.id < 0 ? "n" + -e.id : String(e.id);
          return (
            <g key={e.id} transform={`translate(${px},${py})`} style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(e)} onMouseLeave={() => setHover(null)}
              onClick={(ev) => { ev.stopPropagation(); onSelect?.(e); }}>
              {Math.abs(py - truePy) > 10 && <line x1={0} y1={0} x2={0} y2={truePy - py} stroke={col} strokeOpacity={0.4} strokeDasharray="2 2" />}
              <circle r={sel ? 13 : 11} fill="#0b0e11" stroke={col} strokeWidth={sel ? 3 : 2} strokeDasharray={e.type === "close" || e.type === "decrease" ? "3 2" : undefined} />
              {tr?.avatar ? (
                <g clipPath={`url(#clip${id})`} transform={sel ? "scale(1.1)" : undefined}>
                  <image href={tr.avatar} x={-9} y={-9} width={18} height={18} preserveAspectRatio="xMidYMid slice" />
                </g>
              ) : (
                <text textAnchor="middle" y={3} fontSize={8} fill="#e4e4e7">{(tr?.name || "?").slice(0, 2).toUpperCase()}</text>
              )}
              <circle cx={8} cy={-8} r={5.5} fill={col} />
              <text x={8} y={-5} fontSize={8} fontWeight={800} textAnchor="middle" fill="#000">{TYPE_GLYPH[e.type]}</text>
            </g>
          );
        })}

        {/* crosshair */}
        {mouse && mouse.x > PAD.l && mouse.x < PAD.l + W && mouse.y > PAD.t && mouse.y < PAD.t + H && (
          <g pointerEvents="none">
            <line x1={PAD.l} x2={PAD.l + W} y1={mouse.y} y2={mouse.y} stroke="#ffffff40" strokeDasharray="3 3" />
            <line x1={mouse.x} x2={mouse.x} y1={PAD.t} y2={PAD.t + H} stroke="#ffffff40" strokeDasharray="3 3" />
            <rect x={PAD.l + W} y={mouse.y - 9} width={PAD.r - 2} height={18} fill="#3f3f46" />
            <text x={PAD.l + W + 5} y={mouse.y + 4} fontSize={10.5} fill="#fff">{fmtPrice(crossPrice!)}</text>
            <rect x={mouse.x - 40} y={size.h - 22} width={80} height={16} fill="#3f3f46" />
            <text x={mouse.x} y={size.h - 10} fontSize={10} fill="#fff" textAnchor="middle">{fmtTime(crossT!)}</text>
          </g>
        )}
      </svg>

      {/* marker tooltip */}
      {hover && (() => {
        const tr = traders[hover.traderId];
        const p = placed.find((m) => m.e.id === hover.id);
        if (!p) return null;
        const left = Math.min(Math.max(8, p.px - 120), size.w - 260);
        const topPos = p.py > 150 ? p.py - 112 : p.py + 20;
        return (
          <div className="pointer-events-none absolute z-20 w-60 rounded-lg border border-white/15 bg-[#0b0e11]/95 p-2.5 text-xs shadow-xl" style={{ left, top: topPos }}>
            <div className="flex items-center gap-2">
              <div className="font-semibold text-zinc-100">{tr?.name || `Trader #${hover.traderId}`}</div>
              {tr?.platform && <span className="text-[10px] text-zinc-500">{tr.platform === "X" ? "X" : "Telegram"}{tr.audience ? ` · ${tr.audience.toLocaleString()} followers` : ""}</span>}
            </div>
            <div className="mt-1" style={{ color: dirColor(hover.direction) }}>
              {TYPE_LABEL[hover.type]} {hover.direction.toUpperCase()} @ {fmtPrice(hover.price)}
              {hover.assumed ? <span className="ml-1 text-zinc-500">(inferred)</span> : null}
            </div>
            <div className="mt-0.5 text-zinc-500">{fmtTime(new Date(hover.time).getTime())} · {timeAgo(hover.time)} ago</div>
            {lastPrice ? (
              <div className="mt-0.5 text-zinc-400">
                Since: <span style={{ color: (hover.direction === "long" ? lastPrice - hover.price : hover.price - lastPrice) >= 0 ? UP : DOWN }}>
                  {(((hover.direction === "long" ? lastPrice - hover.price : hover.price - lastPrice) / hover.price) * 100).toFixed(2)}%
                </span>
              </div>
            ) : null}
          </div>
        );
      })()}

      <div className="pointer-events-none absolute bottom-7 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-zinc-500">scroll = zoom · drag = pan{o > 0 ? ` · ${o} bars back` : ""}</div>
    </div>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}
function niceTime(raw: number) {
  const steps = [60e3, 300e3, 900e3, 1800e3, 3600e3, 7200e3, 14400e3, 21600e3, 43200e3, 86400e3, 172800e3, 604800e3];
  return steps.find((s) => s >= raw) || steps[steps.length - 1];
}
