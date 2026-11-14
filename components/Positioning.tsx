import { useMemo, useState } from "react";
import type { AssetStats, CPosition, Trader } from "@/lib/types";
import { DOWN, UP, dirColor, fmtPct, fmtPrice, timeAgo } from "@/lib/format";
import { TraderAvatar } from "./TraderAvatar";

interface Props {
  symbol: string;
  stats: AssetStats | null;
  positions: CPosition[];
  traders: Record<number, Trader>;
  lastPrice?: number;
}

/** Positioning on the selected asset: long/short split + every tracked trader's open position. */
export function Positioning({ symbol, stats, positions, traders, lastPrice }: Props) {
  const [f, setF] = useState<"all" | "long" | "short">("all");
  const [sort, setSort] = useState<"time" | "ret">("time");

  const rows = useMemo(() => {
    const r = positions.filter((p) => f === "all" || p.direction === f);
    return [...r].sort((a, b) => (sort === "ret" ? b.ret - a.ret : +new Date(b.openAt) - +new Date(a.openAt)));
  }, [positions, f, sort]);

  const sample = useMemo(() => {
    const l = positions.filter((p) => p.direction === "long"), s = positions.filter((p) => p.direction === "short");
    const avg = (a: CPosition[]) => (a.length ? a.reduce((x, p) => x + p.ret, 0) / a.length : 0);
    return { l: l.length, s: s.length, lr: avg(l), sr: avg(s) };
  }, [positions]);

  return (
    <div className="flex h-full flex-col text-xs">
      <div className="border-b border-white/10 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-semibold text-zinc-200">{symbol} social positioning</span>
          {stats && <span className="text-zinc-500">{(stats.longCount + stats.shortCount).toLocaleString()} open positions tracked</span>}
        </div>
        {stats ? (
          <>
            <div className="flex h-2.5 overflow-hidden rounded-full">
              <div style={{ width: stats.longPct + "%", background: UP }} />
              <div style={{ width: stats.shortPct + "%", background: DOWN }} />
            </div>
            <div className="mt-1 flex justify-between font-semibold">
              <span style={{ color: UP }}>{stats.longPct}% long · {stats.longCount.toLocaleString()}</span>
              <span style={{ color: DOWN }}>{stats.shortCount.toLocaleString()} · {stats.shortPct}% short</span>
            </div>
          </>
        ) : <div className="text-zinc-500">No aggregate positioning for {symbol}.</div>}
        {positions.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
            <div className="rounded bg-white/[0.04] p-1.5">Longs in sample: {sample.l} · avg PnL <b style={{ color: sample.lr >= 0 ? UP : DOWN }}>{fmtPct(sample.lr, 1)}</b></div>
            <div className="rounded bg-white/[0.04] p-1.5">Shorts in sample: {sample.s} · avg PnL <b style={{ color: sample.sr >= 0 ? UP : DOWN }}>{fmtPct(sample.sr, 1)}</b></div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-1.5 text-[11px]">
        {(["all", "long", "short"] as const).map((k) => (
          <button key={k} onClick={() => setF(k)} className={`rounded-full px-2.5 py-0.5 capitalize ${f === k ? "bg-white/15 text-white" : "text-zinc-500"}`}>{k}</button>
        ))}
        <div className="ml-auto flex gap-2 text-zinc-500">
          Sort:
          <button className={sort === "time" ? "text-white" : ""} onClick={() => setSort("time")}>newest</button>
          <button className={sort === "ret" ? "text-white" : ""} onClick={() => setSort("ret")}>PnL</button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 && <div className="p-4 text-center text-zinc-500">No individual positions available for {symbol} in this data source.</div>}
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0f1318] text-[10px] uppercase text-zinc-500">
            <tr><th className="px-3 py-1 text-left">Trader</th><th className="text-left">Side</th><th className="text-right">Entry</th><th className="text-right">PnL</th><th className="px-3 text-right">Age</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const tr = traders[p.traderId];
              const ret = lastPrice ? ((p.direction === "long" ? lastPrice - p.openPrice : p.openPrice - lastPrice) / p.openPrice) * 100 : p.ret;
              return (
                <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-3 py-1.5"><div className="flex items-center gap-2"><TraderAvatar trader={tr} id={p.traderId} size={20} /><span className="max-w-[110px] truncate text-zinc-200">{tr?.name || `Trader #${p.traderId}`}</span></div></td>
                  <td className="font-semibold uppercase" style={{ color: dirColor(p.direction) }}>{p.direction}</td>
                  <td className="text-right font-mono text-zinc-300">{fmtPrice(p.openPrice)}</td>
                  <td className="text-right font-mono font-semibold" style={{ color: ret >= 0 ? UP : DOWN }}>{fmtPct(ret, 2)}</td>
                  <td className="px-3 text-right text-zinc-500">{timeAgo(p.openAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
