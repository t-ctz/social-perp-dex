import { useState } from "react";
import { fmtPrice, DOWN, UP } from "@/lib/format";
import { hl, usePoll } from "@/lib/hooks";

interface Lvl { px: string; sz: string; n: number }

export function OrderBook({ symbol, onPick }: { symbol: string; onPick?: (px: number) => void }) {
  const [tab, setTab] = useState<"book" | "trades">("book");
  const [bids, setBids] = useState<Lvl[]>([]);
  const [asks, setAsks] = useState<Lvl[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  usePoll(async () => {
    const b = await hl<{ levels: [Lvl[], Lvl[]] }>({ type: "l2Book", coin: symbol });
    setBids(b.levels[0].slice(0, 13));
    setAsks(b.levels[1].slice(0, 13));
  }, 1200, [symbol]);

  usePoll(async () => {
    if (tab !== "trades") return;
    const t = await hl<any[]>({ type: "recentTrades", coin: symbol });
    setTrades(t.slice(-40).reverse());
  }, 1500, [symbol, tab]);

  const cum = (a: Lvl[]) => { let s = 0; return a.map((l) => (s += Number(l.sz))); };
  const bc = cum(bids), ac = cum(asks);
  const max = Math.max(bc[bc.length - 1] || 0, ac[ac.length - 1] || 0, 1e-9);
  const spread = asks[0] && bids[0] ? Number(asks[0].px) - Number(bids[0].px) : 0;
  const mid = asks[0] && bids[0] ? (Number(asks[0].px) + Number(bids[0].px)) / 2 : 0;

  return (
    <div className="flex h-full flex-col text-[11px]">
      <div className="flex border-b border-white/10 text-xs">
        {(["book", "trades"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 font-medium capitalize ${tab === t ? "border-b-2 border-emerald-400 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            {t === "book" ? "Order Book" : "Trades"}
          </button>
        ))}
      </div>
      {tab === "book" ? (
        <div className="flex min-h-0 flex-1 flex-col font-mono">
          <div className="flex justify-between px-2 py-1 text-[10px] text-zinc-500"><span>Price</span><span>Size ({symbol})</span><span>Total</span></div>
          <div className="flex flex-1 flex-col justify-end overflow-hidden">
            {[...asks].reverse().map((l, i) => {
              const idx = asks.length - 1 - i;
              return <Row key={l.px} l={l} total={ac[idx]} max={max} color={DOWN} onPick={onPick} />;
            })}
          </div>
          <div className="flex items-center justify-between border-y border-white/10 bg-white/[0.03] px-2 py-1.5">
            <span className="text-sm font-semibold text-zinc-100">{fmtPrice(mid)}</span>
            <span className="text-zinc-500">spread {fmtPrice(spread)} ({mid ? ((spread / mid) * 100).toFixed(3) : 0}%)</span>
          </div>
          <div className="flex-1 overflow-hidden">
            {bids.map((l, i) => <Row key={l.px} l={l} total={bc[i]} max={max} color={UP} onPick={onPick} />)}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto font-mono">
          <div className="flex justify-between px-2 py-1 text-[10px] text-zinc-500"><span>Price</span><span>Size</span><span>Time</span></div>
          {trades.map((t) => (
            <div key={t.tid} className="flex justify-between px-2 py-[3px]">
              <span style={{ color: t.side === "B" ? UP : DOWN }}>{fmtPrice(Number(t.px))}</span>
              <span className="text-zinc-300">{Number(t.sz).toFixed(4)}</span>
              <span className="text-zinc-500">{new Date(t.time).toLocaleTimeString("en-US", { hour12: false })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ l, total, max, color, onPick }: { l: Lvl; total: number; max: number; color: string; onPick?: (px: number) => void }) {
  return (
    <div className="relative flex cursor-pointer justify-between px-2 py-[2px] hover:bg-white/5" onClick={() => onPick?.(Number(l.px))}>
      <div className="absolute inset-y-0 right-0 opacity-15" style={{ width: `${(total / max) * 100}%`, background: color }} />
      <span className="relative" style={{ color }}>{fmtPrice(Number(l.px))}</span>
      <span className="relative text-zinc-300">{Number(l.sz).toFixed(4)}</span>
      <span className="relative text-zinc-500">{total.toFixed(3)}</span>
    </div>
  );
}
