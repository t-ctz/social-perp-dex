import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { Chart } from "@/components/Chart";
import { OrderBook } from "@/components/OrderBook";
import { OrderForm } from "@/components/OrderForm";
import { Feed } from "@/components/Feed";
import { Positioning } from "@/components/Positioning";
import { Analytics } from "@/components/Analytics";
import { Chat } from "@/components/Chat";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { FloatingPanel } from "@/components/FloatingPanel";
import { Conn, Settings } from "@/components/Settings";
import { DOWN, UP, fmtCompact, fmtNum, fmtPct, fmtPrice } from "@/lib/format";
import { hl, loadLS, saveLS, usePoll } from "@/lib/hooks";
import { socialRef } from "@/lib/social";
import type { Market } from "@/lib/hlmarkets";
import type { CEvent, Candle, CentaurPayload } from "@/lib/types";

const INTERVALS: Record<string, number> = { "5m": 5 * 60e3, "15m": 15 * 60e3, "1h": 3600e3, "4h": 4 * 3600e3, "1d": 86400e3 };
const DEFAULT_CONN: Conn = { ofKey: "", centaurKey: "", centaurBase: "https://api.centaur.io/v2", llmKey: "", llmBase: "https://openrouter.ai/api/v1", llmModel: "openai/gpt-4o-mini" };
const CATS = ["all", "crypto", "stocks", "commodities", "indices", "fx", "preipo", "other"];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [symbol, setSymbol] = useState("BTC");
  const [interval, setIntervalKey] = useState("1h");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [data, setData] = useState<CentaurPayload | null>(null);
  const [diag, setDiag] = useState<string>("starting…");
  const [selected, setSelected] = useState<CEvent | null>(null);
  const [showTrades, setShowTrades] = useState(true);
  const [showLevels, setShowLevels] = useState(true);
  const [showFeed, setShowFeed] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [bottomTab, setBottomTab] = useState<"social" | "mine">("social");
  const [picked, setPicked] = useState<number | null>(null);
  const [conn, setConn] = useState<Conn>(DEFAULT_CONN);
  const [settings, setSettings] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [accErr, setAccErr] = useState("");
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [win, setWin] = useState({ w: 1440, h: 900 });

  useEffect(() => {
    setConn({ ...DEFAULT_CONN, ...loadLS<Partial<Conn>>("conn", {}) });
    setSymbol(loadLS("symbol", "BTC"));
    setWin({ w: window.innerWidth, h: window.innerHeight });
    setMounted(true);
  }, []);

  const focusDex = symbol.includes(":") ? symbol.split(":")[0] : "";
  usePoll(async () => {
    const r = await fetch(`/api/markets?dex=${encodeURIComponent(focusDex)}`);
    if (r.ok) setMarkets(await r.json());
  }, 4000, [focusDex]);

  usePoll(async () => {
    const ms = INTERVALS[interval];
    const raw = await hl<any[]>({ type: "candleSnapshot", req: { coin: symbol, interval, startTime: Date.now() - ms * 320, endTime: Date.now() } });
    setCandles(raw.map((c) => ({ t: c.t, o: +c.o, h: +c.h, l: +c.l, c: +c.c, v: +c.v })));
  }, 4000, [symbol, interval]);

  const sref = socialRef(symbol);
  usePoll(async () => {
    const at = new Date().toLocaleTimeString();
    try {
      const r = await fetch(`/api/centaur?symbol=${encodeURIComponent(sref)}`, { headers: { "x-centaur-key": conn.centaurKey, "x-centaur-base": conn.centaurBase } });
      const text = await r.text();
      let d: any = null;
      try { d = JSON.parse(text); } catch { setDiag(`${at} HTTP ${r.status} non-JSON: ${text.slice(0, 80)}`); return; }
      setDiag(`${at} HTTP ${r.status} · source=${d?.source} · feed=${d?.feed?.length} · events=${d?.events?.length} · pos=${d?.positions?.length} · key=${conn.centaurKey ? "set" : "none"}`);
      // Never let a bad or empty response wipe data already on screen, or replace live data with the snapshot.
      if (!r.ok || !d || !Array.isArray(d.feed) || !Array.isArray(d.events)) return;
      setData((prev) => (d.source === "snapshot" && prev?.source === "live" && prev.symbol === d.symbol ? prev : d));
    } catch (e: any) {
      setDiag(`${at} fetch failed: ${String(e?.message || e).slice(0, 80)}`);
    }
  }, 30000, [sref, conn.centaurKey, conn.centaurBase]);

  const loadAccount = async () => {
    if (!conn.ofKey) { setAccount(null); setAccErr(""); return; }
    const r = await fetch("/api/account", { headers: { "x-openfinance-key": conn.ofKey } });
    const d = await r.json();
    if (!r.ok) { setAccErr(d.error || "account error"); setAccount(null); } else { setAccount(d); setAccErr(""); }
  };
  usePoll(loadAccount, 10000, [conn.ofKey]);

  const mkt = useMemo(() => markets.find((c) => c.name === symbol), [markets, symbol]);
  const tradable = useMemo(() => new Set(markets.map((c) => socialRef(c.name))), [markets]);
  const byRef = useMemo(() => { const m: Record<string, string> = {}; markets.forEach((x) => { const r = socialRef(x.name); if (!m[r] || !x.dex) m[r] = x.name; }); return m; }, [markets]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return markets.filter((c) => (cat === "all" || c.category === cat) && (!s || c.name.toLowerCase().includes(s))).sort((a, b) => b.dayNtlVlm - a.dayNtlVlm).slice(0, 150);
  }, [markets, q, cat]);
  const last = mkt?.markPx;
  const chg = mkt ? ((mkt.markPx - mkt.prevDayPx) / mkt.prevDayPx) * 100 : 0;

  // OpenFinance returns clearinghouseState either flat or grouped per dex ({native:{...}, xyz:{...}}).
  const dexStates: Record<string, any> = useMemo(() => {
    const cs = account?.clearinghouseState;
    if (!cs) return {};
    return cs.withdrawable !== undefined || cs.assetPositions !== undefined ? { native: cs } : cs;
  }, [account]);
  const freeUsdc = useMemo(() => {
    if (!account) return null;
    const perp = Number(dexStates.native?.withdrawable ?? 0);
    const spot = Number(account.spotClearinghouseState?.balances?.find((b: any) => b.coin === "USDC")?.total ?? 0);
    return perp + spot;
  }, [account, dexStates]);
  const myPositions: any[] = useMemo(
    () => Object.entries(dexStates).flatMap(([dex, st]: [string, any]) => (st?.assetPositions || []).map((p: any) => ({ dex, ...(p.position ?? p) }))),
    [dexStates]
  );

  const pick = (s: string) => { setSymbol(s); saveLS("symbol", s); setSelected(null); setMenu(false); setQ(""); };
  const pickRef = (r: string) => { const n = byRef[r]; if (n) pick(n); };
  const hasKey = !!conn.ofKey;
  const noSocial = data && data.source === "snapshot" && !data.stats && data.positions.length === 0 && data.feed.length === 0;

  return (
    <>
      <Head><title>{last ? `${fmtPrice(last)} ${symbol}-PERP` : "Perp"} · The Monitor</title></Head>
      <div className="flex h-screen flex-col bg-[#0b0e11]">
        <header className="flex shrink-0 items-center gap-4 border-b border-white/10 px-4 py-2">
          <div className="text-sm font-black tracking-tight text-white">◆ THE <span className="text-emerald-400">MONITOR</span></div>
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/10">
              {symbol}-PERP <span className="text-[10px] text-zinc-500">{mkt ? mkt.maxLeverage + "x" : ""}</span> <span className="text-zinc-500">▾</span>
            </button>
            {menu && (
              <div className="absolute left-0 top-10 z-50 w-96 rounded-lg border border-white/15 bg-[#12161c] shadow-2xl">
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${markets.length} markets…`} className="w-full rounded-t-lg bg-white/5 px-3 py-2 text-xs text-white outline-none" />
                <div className="flex flex-wrap gap-1 border-b border-white/10 p-2 text-[10px]">
                  {CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={`rounded-full px-2 py-0.5 capitalize ${cat === c ? "bg-emerald-500/25 text-emerald-300" : "bg-white/5 text-zinc-400"}`}>{c}</button>)}
                </div>
                <div className="max-h-[380px] overflow-auto">
                  <div className="sticky top-0 grid grid-cols-[1fr_auto_auto] gap-3 bg-[#12161c] px-3 py-1.5 text-[10px] uppercase text-zinc-500"><span>Market</span><span>Price</span><span>24h</span></div>
                  {list.map((c) => {
                    const ch = ((c.markPx - c.prevDayPx) / c.prevDayPx) * 100;
                    return (
                      <button key={c.name} onClick={() => pick(c.name)} className="grid w-full grid-cols-[1fr_auto_auto] gap-3 px-3 py-1.5 text-left text-xs hover:bg-white/5">
                        <span className="font-semibold text-zinc-100">{c.name} <span className="font-normal text-zinc-600">{c.category}</span></span>
                        <span className="font-mono text-zinc-300">{fmtPrice(c.markPx)}</span>
                        <span className="font-mono" style={{ color: ch >= 0 ? UP : DOWN }}>{fmtPct(ch, 1)}</span>
                      </button>
                    );
                  })}
                  {list.length === 0 && <div className="p-4 text-center text-xs text-zinc-500">No markets match.</div>}
                </div>
              </div>
            )}
          </div>
          <div className="text-xl font-bold" style={{ color: chg >= 0 ? UP : DOWN }}>{fmtPrice(last)}</div>
          {mkt && mkt.collateral !== "USDC" && <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300" title="This HIP-3 market is margined in a non-USDC token">{mkt.collateral} margin</span>}
          <div className="hidden gap-5 text-[11px] 2xl:flex">
            <Stat k="24h change" v={fmtPct(chg)} c={chg >= 0 ? UP : DOWN} />
            <Stat k="24h volume" v={mkt ? "$" + fmtCompact(mkt.dayNtlVlm) : "–"} />
            <Stat k="Open interest" v={mkt ? "$" + fmtCompact(mkt.openInterest * mkt.markPx) : "–"} />
            <Stat k="Funding / 1h" v={mkt ? (mkt.funding * 100).toFixed(4) + "%" : "–"} c={mkt && mkt.funding < 0 ? DOWN : UP} />
            <Stat k="Oracle" v={fmtPrice(mkt?.oraclePx)} />
            {data?.stats && <Stat k="Social long" v={data.stats.longPct + "%"} c={data.stats.longPct >= 50 ? UP : DOWN} />}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 text-[11px]">
            <Toggle on={showTrades} set={setShowTrades} label="Trades" />
            <Toggle on={showLevels} set={setShowLevels} label="Avg entry" />
            <Toggle on={showFeed} set={setShowFeed} label="Feed" />
            <Toggle on={showAnalytics} set={setShowAnalytics} label="Analytics" />
            <Toggle on={showChat} set={setShowChat} label="Agent" />
            {data && <span title={data.note} className={`rounded px-2 py-1 font-bold ${data.source === "live" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{data.source === "live" ? "● LIVE" : "SNAPSHOT"}</span>}
            <button onClick={() => setSettings(true)} className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 font-bold ${hasKey || conn.centaurKey ? "bg-white/10 text-zinc-200 hover:bg-white/15" : "bg-emerald-500 text-black hover:bg-emerald-400"}`}>{hasKey || conn.centaurKey ? "⚙ Keys" : "🔑 Add keys"}</button>
          </div>
        </header>

        {noSocial && <div className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-4 py-1 text-[11px] text-amber-200">{conn.centaurKey ? <>No live Centaur data for {sref} yet. {data?.note ? <span className="font-mono">Reason: {data.note}</span> : null} If this persists, the market may not be in Centaur, or the key may lack access.</> : <>No social data for {sref} in the offline snapshot (it covers BTC / ETH / SOL / HYPE only). Add your Centaur key via “Add keys” for live data.</>}</div>}

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_272px_300px] grid-rows-[minmax(0,1fr)_270px]">
          <section className="flex min-h-0 flex-col border-r border-white/10">
            <div className="flex items-center gap-1 border-b border-white/10 px-3 py-1.5 text-xs">
              {Object.keys(INTERVALS).map((k) => <button key={k} onClick={() => setIntervalKey(k)} className={`rounded px-2 py-0.5 ${interval === k ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{k}</button>)}
              <span className="ml-3 text-zinc-600">Avatars = tracked traders (X &amp; Telegram) · ring = direction · dashed = exit</span>
            </div>
            <div className="min-h-0 flex-1">
              <ErrorBoundary name="Chart"><Chart candles={candles} intervalMs={INTERVALS[interval]} events={data?.events || []} positions={data?.positions || []} traders={data?.traders || {}} lastPrice={last} showTrades={showTrades} showLevels={showLevels} selectedId={selected?.id} onSelect={setSelected} /></ErrorBoundary>
            </div>
          </section>
          <section className="row-span-2 min-h-0 border-r border-white/10"><OrderBook symbol={symbol} onPick={setPicked} /></section>
          <section className="row-span-2 min-h-0 overflow-auto">
            <OrderForm symbol={symbol} mid={last} apiKey={conn.ofKey} pickedPrice={picked} freeUsdc={freeUsdc} onNeedKey={() => setSettings(true)} onPlaced={loadAccount} />
          </section>
          <section className="flex min-h-0 flex-col border-r border-t border-white/10">
            <div className="flex border-b border-white/10 text-xs">
              {([["social", `Social positioning · ${sref}`], ["mine", `My positions${myPositions.length ? ` (${myPositions.length})` : ""}`]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setBottomTab(k)} className={`px-4 py-2 font-medium ${bottomTab === k ? "border-b-2 border-emerald-400 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{l}</button>
              ))}
              {freeUsdc != null && <span className="ml-auto self-center px-4 text-zinc-400">Balance <b className="text-white">${fmtNum(freeUsdc)}</b> USDC</span>}
            </div>
            <div className="min-h-0 flex-1">
              {bottomTab === "social" ? (
                data ? <ErrorBoundary name="Positioning"><Positioning symbol={sref} stats={data.stats} positions={data.positions} traders={data.traders} lastPrice={last} /></ErrorBoundary> : <div className="p-4 text-xs text-zinc-500">Loading…</div>
              ) : <MyPositions rows={myPositions} hasKey={hasKey} err={accErr} onConnect={() => setSettings(true)} />}
            </div>
          </section>
        </div>
      </div>

      {mounted && <div className="pointer-events-none fixed bottom-1 right-2 z-[200] max-w-[60vw] rounded bg-black/80 px-2 py-1 font-mono text-[10px] text-zinc-300">Centaur: {diag}</div>}
      {mounted && data && showFeed && (
        <FloatingPanel id="feed" title={<>📡 Social feed · {sref}</>} defaultPos={{ x: 16, y: Math.max(120, win.h - 270 - 360 - 10) }} width={330} height={340} onClose={() => setShowFeed(false)}>
          <ErrorBoundary name="Feed"><Feed feed={data.feed} traders={data.traders} selectedId={selected?.id} symbol={sref} onSelect={(e) => setSelected(e)} /></ErrorBoundary>
        </FloatingPanel>
      )}
      {mounted && data && showAnalytics && (
        <FloatingPanel id="analytics" title={<>📊 Positioning analytics</>} defaultPos={{ x: 16, y: 112 }} width={310} height={330} defaultCollapsed onClose={() => setShowAnalytics(false)}>
          <ErrorBoundary name="Analytics"><Analytics data={data} symbol={sref} tradable={tradable} onPick={pickRef} /></ErrorBoundary>
        </FloatingPanel>
      )}
      {mounted && showChat && (
        <FloatingPanel id="chat" title={<>🤖 Agent · {sref}</>} defaultPos={{ x: Math.max(16, win.w - 300 - 272 - 380 - 12), y: 112 }} width={370} height={460} z={45} onClose={() => setShowChat(false)}>
          <Chat symbol={symbol} price={last} llmKey={conn.llmKey} llmBase={conn.llmBase} llmModel={conn.llmModel} cKey={conn.centaurKey} cBase={conn.centaurBase} onNeedKey={() => setSettings(true)} />
        </FloatingPanel>
      )}

      <Settings key={String(settings)} open={settings} onClose={() => setSettings(false)} conn={conn} onSave={(v) => { setConn(v); saveLS("conn", v); }} />
    </>
  );
}

function Stat({ k, v, c }: { k: string; v: string; c?: string }) {
  return <div><div className="text-[10px] text-zinc-500">{k}</div><div className="font-semibold" style={{ color: c || "#e4e4e7" }}>{v}</div></div>;
}
function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return <button onClick={() => set(!on)} className={`rounded-full px-2.5 py-1 font-medium ${on ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-zinc-500"}`}>{label}</button>;
}
function MyPositions({ rows, hasKey, err, onConnect }: { rows: any[]; hasKey: boolean; err: string; onConnect: () => void }) {
  if (!hasKey) return <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-zinc-500">Add your OpenFinance key to see your account.<button onClick={onConnect} className="rounded-lg bg-emerald-500 px-4 py-1.5 font-bold text-black">Add keys</button></div>;
  if (err) return <div className="p-4 text-xs text-red-300">{err}</div>;
  if (!rows.length) return <div className="p-4 text-center text-xs text-zinc-500">No open perp positions.</div>;
  return (
    <table className="w-full text-xs">
      <thead className="text-[10px] uppercase text-zinc-500"><tr><th className="px-3 py-1.5 text-left">Market</th><th className="text-right">Size</th><th className="text-right">Entry</th><th className="text-right">Liq.</th><th className="text-right">uPnL</th><th className="px-3 text-right">ROE</th></tr></thead>
      <tbody>
        {rows.map((p, i) => {
          const sz = Number(p.size ?? p.szi ?? 0), pnl = Number(p.unrealizedPnl ?? 0), roe = Number(p.returnOnEquity ?? 0) * 100;
          return (
            <tr key={i} className="border-t border-white/5">
              <td className="px-3 py-1.5 font-semibold text-zinc-100">{p.coin}</td>
              <td className="text-right font-mono" style={{ color: sz >= 0 ? UP : DOWN }}>{sz}</td>
              <td className="text-right font-mono text-zinc-300">{fmtPrice(Number(p.entryPx))}</td>
              <td className="text-right font-mono text-zinc-400">{p.liquidationPx ? fmtPrice(Number(p.liquidationPx)) : "–"}</td>
              <td className="text-right font-mono" style={{ color: pnl >= 0 ? UP : DOWN }}>{fmtNum(pnl)}</td>
              <td className="px-3 text-right font-mono" style={{ color: roe >= 0 ? UP : DOWN }}>{fmtPct(roe, 1)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
