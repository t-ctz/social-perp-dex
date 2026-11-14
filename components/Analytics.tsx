import { useState } from "react";
import type { CentaurPayload } from "@/lib/types";
import { DOWN, UP, dirColor, fmtPct } from "@/lib/format";

interface Props {
  data: CentaurPayload;
  symbol: string;
  tradable: Set<string>;
  onPick: (s: string) => void;
}

const TABS = ["Overview", "Trending", "Crowd fade", "Smart $"] as const;

export function Analytics({ data, symbol, tradable, onPick }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const st = data.stats;
  const spec = data.specialists.find((s) => s.symbol === symbol);
  const lp = st?.longPct ?? 50;
  const label = lp >= 70 ? "Heavily long" : lp >= 58 ? "Leaning long" : lp <= 30 ? "Heavily short" : lp <= 42 ? "Leaning short" : "Balanced";
  const R = 42, C = 2 * Math.PI * R;

  const Sym = ({ s }: { s: string }) => (
    <button disabled={!tradable.has(s)} onClick={() => onPick(s)} className={`font-semibold ${tradable.has(s) ? "text-zinc-100 underline decoration-dotted underline-offset-2 hover:text-emerald-300" : "cursor-default text-zinc-300"}`} title={tradable.has(s) ? "Open this market" : "Not a native Hyperliquid perp"}>
      {s}
    </button>
  );

  return (
    <div className="flex h-full flex-col text-xs">
      <div className="flex border-b border-white/10">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 text-[11px] ${tab === t ? "border-b-2 border-emerald-400 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{t}</button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {tab === "Overview" && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <svg width={104} height={104} viewBox="0 0 104 104">
                <circle cx={52} cy={52} r={R} fill="none" stroke={DOWN} strokeWidth={11} />
                <circle cx={52} cy={52} r={R} fill="none" stroke={UP} strokeWidth={11} strokeDasharray={`${(lp / 100) * C} ${C}`} transform="rotate(-90 52 52)" />
                <text x={52} y={50} textAnchor="middle" fontSize={17} fontWeight={800} fill="#fff">{st ? lp.toFixed(0) + "%" : "–"}</text>
                <text x={52} y={65} textAnchor="middle" fontSize={9} fill="#a1a1aa">LONG</text>
              </svg>
              <div className="space-y-1">
                <div className="text-sm font-bold text-zinc-100">{symbol}: {st ? label : "no data"}</div>
                {st && <div className="text-zinc-400">{st.longCount.toLocaleString()} long vs {st.shortCount.toLocaleString()} short</div>}
                {st && <div className="text-zinc-500">Long/short ratio {(st.longCount / Math.max(1, st.shortCount)).toFixed(2)}</div>}
              </div>
            </div>
            <div className="rounded-lg bg-white/[0.04] p-2.5">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Specialist consensus</div>
              {spec ? (
                <div><b style={{ color: dirColor(spec.direction) }}>{spec.count} specialists {spec.direction}</b> · avg win-rate {spec.avgWin.toFixed(0)}% · they are at <b style={{ color: spec.openReturn >= 0 ? UP : DOWN }}>{fmtPct(spec.openReturn, 1)}</b></div>
              ) : <div className="text-zinc-500">No specialist cluster for {symbol} right now.</div>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/[0.04] p-2.5"><div className="text-[10px] uppercase text-zinc-500">Posts in window</div><div className="text-lg font-bold text-zinc-100">{data.feed.length}</div></div>
              <div className="rounded-lg bg-white/[0.04] p-2.5"><div className="text-[10px] uppercase text-zinc-500">Trades on chart</div><div className="text-lg font-bold text-zinc-100">{data.events.length}</div></div>
            </div>
          </div>
        )}

        {tab === "Trending" && (
          <div>
            <div className="mb-2 text-[11px] text-zinc-500">Biggest 7-day change in net trader count (market-wide)</div>
            {data.trending.map((r) => (
              <div key={r.symbol} className="flex items-center gap-2 border-t border-white/5 py-1.5">
                <Sym s={r.symbol} />
                <span className="rounded px-1 text-[10px] font-bold uppercase" style={{ background: dirColor(r.direction) + "22", color: dirColor(r.direction) }}>{r.direction}</span>
                <span className="text-zinc-500">net {r.netBefore} → <b className="text-zinc-200">{r.netNow}</b></span>
                <span className="ml-auto font-mono font-bold" style={{ color: r.delta >= 0 ? UP : DOWN }}>{r.delta > 0 ? "+" : ""}{r.delta}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "Crowd fade" && (
          <div>
            <div className="mb-2 text-[11px] text-zinc-500">Crowded one-way positioning, and the opposite side to fade</div>
            {data.fade.map((r) => (
              <div key={r.symbol} className="flex items-center gap-2 border-t border-white/5 py-1.5">
                <Sym s={r.symbol} />
                <span className="text-zinc-500">crowd net <b style={{ color: dirColor(r.crowdDir) }}>{r.net} {r.crowdDir}</b></span>
                <span className="text-zinc-500">({fmtPct(r.openReturn, 1)})</span>
                <span className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: dirColor(r.fadeDir) + "22", color: dirColor(r.fadeDir) }}>fade {r.fadeDir}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "Smart $" && (
          <div>
            <div className="mb-2 text-[11px] text-zinc-500">Top leaders + specialists vs. everyone else (net % of eligible traders)</div>
            {data.smart.map((r) => (
              <div key={r.symbol} className="border-t border-white/5 py-1.5">
                <div className="flex items-center gap-2">
                  <Sym s={r.symbol} />
                  <span className="ml-auto text-zinc-500">gap <b className="text-zinc-200">{r.gap.toFixed(2)}pp</b></span>
                </div>
                <div className="mt-0.5 flex justify-between text-[11px]">
                  <span>Smart: <b style={{ color: dirColor(r.smartDir) }}>{r.smartDir} {Math.abs(r.smartNetPct).toFixed(1)}%</b> <span className="text-zinc-500">({fmtPct(r.smartRet, 1)})</span></span>
                  <span>Crowd: <b style={{ color: dirColor(r.crowdDir) }}>{r.crowdDir} {Math.abs(r.crowdNetPct).toFixed(1)}%</b> <span className="text-zinc-500">({fmtPct(r.crowdRet, 1)})</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
