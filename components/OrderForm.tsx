import { useEffect, useState } from "react";
import { fmtNum, fmtPrice, DOWN, UP } from "@/lib/format";

export interface Prefill { id: number; isBuy: boolean; price: number; reduceOnly: boolean; note: string; deviationPct: number | null }

interface Props {
  symbol: string;
  mid?: number;
  apiKey: string;
  pickedPrice?: number | null;
  prefill?: Prefill | null;
  freeUsdc?: number | null;
  onNeedKey: () => void;
  onPlaced: () => void;
}

export function OrderForm({ symbol, mid, apiKey, pickedPrice, prefill, freeUsdc, onNeedKey, onPlaced }: Props) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"market" | "limit">("market");
  const [price, setPrice] = useState("");
  const [usd, setUsd] = useState("");
  const [reduce, setReduce] = useState(false);
  const [tif, setTif] = useState("Gtc");
  const [lev, setLev] = useState(5);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copyNote, setCopyNote] = useState<Prefill | null>(null);

  useEffect(() => { if (pickedPrice) { setType("limit"); setPrice(String(pickedPrice)); } }, [pickedPrice]);

  // Trade button on a feed post or chart marker: fill the form, never send it.
  useEffect(() => {
    if (!prefill) return;
    setSide(prefill.isBuy ? "buy" : "sell");
    setReduce(prefill.reduceOnly);
    setType("limit");
    setTif("Gtc");
    setPrice(String(Number(prefill.price.toPrecision(6))));
    setUsd((u) => u || "50");
    setCopyNote(prefill);
    setMsg(null);
  }, [prefill?.id]);

  const px = type === "limit" ? Number(price) : mid || 0;
  const size = px > 0 && Number(usd) > 0 ? Number(usd) / px : 0;
  const margin = Number(usd) / lev;
  const liq = px > 0 ? (side === "buy" ? px * (1 - 1 / lev + 0.005) : px * (1 + 1 / lev - 0.005)) : 0;
  const drift = mid && prefill ? ((mid - prefill.price) / prefill.price) * 100 : null;

  const body = () => ({ symbol, isBuy: side === "buy", size, price: type === "limit" ? Number(price) : undefined, type, reduceOnly: reduce, tif });

  async function review() {
    setMsg(null);
    if (!(size > 0)) return setMsg({ ok: false, text: "Enter a size in USD." });
    setBusy(true);
    try {
      const r = await fetch("/api/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body(), dryRun: true }) });
      const d = await r.json();
      if (!r.ok) setMsg({ ok: false, text: d.error || "Could not build order" });
      else setPreview(d);
    } finally { setBusy(false); }
  }

  async function confirm() {
    if (!apiKey) { setPreview(null); return onNeedKey(); }
    setBusy(true);
    try {
      const r = await fetch("/api/order", { method: "POST", headers: { "content-type": "application/json", "x-openfinance-key": apiKey }, body: JSON.stringify(body()) });
      const d = await r.json();
      setPreview(null);
      if (!r.ok) setMsg({ ok: false, text: typeof d.error === "string" ? d.error : JSON.stringify(d.result || d) });
      else { setMsg({ ok: true, text: "Order submitted: " + JSON.stringify(d.result).slice(0, 220) }); setCopyNote(null); onPlaced(); }
    } finally { setBusy(false); }
  }

  const buy = side === "buy";
  return (
    <div className="flex h-full flex-col gap-2.5 p-3 text-xs">
      {copyNote && (
        <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-2 text-[11px] text-sky-200">
          <div className="font-semibold">Copy of: {copyNote.note}</div>
          <div className="mt-0.5 text-sky-300/80">Limit at the trader&apos;s price{copyNote.reduceOnly ? " · reduce-only" : ""}. Nothing is sent until you confirm.</div>
          {drift !== null && Math.abs(drift) >= 2 && (
            <div className="mt-1 font-semibold text-amber-300">Price has moved {drift >= 0 ? "+" : ""}{drift.toFixed(2)}% since that entry. Check before copying.</div>
          )}
          <button onClick={() => setCopyNote(null)} className="mt-1 text-[10px] text-sky-300 underline">dismiss</button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1">
        <button onClick={() => setSide("buy")} className={`rounded-md py-1.5 font-semibold ${buy ? "bg-emerald-500 text-black" : "text-zinc-400"}`}>Buy / Long</button>
        <button onClick={() => setSide("sell")} className={`rounded-md py-1.5 font-semibold ${!buy ? "bg-red-500 text-white" : "text-zinc-400"}`}>Sell / Short</button>
      </div>
      <div className="flex gap-3 border-b border-white/10 text-zinc-400">
        {(["market", "limit"] as const).map((t) => (
          <button key={t} onClick={() => setType(t)} className={`pb-1.5 capitalize ${type === t ? "border-b-2 border-emerald-400 text-white" : ""}`}>{t}</button>
        ))}
        <div className="ml-auto flex items-center gap-1 pb-1">
          <span>Lev</span>
          <input type="number" min={1} max={50} value={lev} onChange={(e) => setLev(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="w-12 rounded bg-white/5 px-1 py-0.5 text-center text-white outline-none" />
          <span>x</span>
        </div>
      </div>

      {type === "limit" && (
        <label className="block">
          <div className="mb-1 flex justify-between text-zinc-500"><span>Limit price</span><button className="text-emerald-400" onClick={() => mid && setPrice(String(mid))}>mid</button></div>
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder={fmtPrice(mid)} className="w-full rounded-md bg-white/5 px-2 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/60" />
        </label>
      )}
      <label className="block">
        <div className="mb-1 flex justify-between text-zinc-500"><span>Size (USD notional)</span><span>≈ {size ? fmtNum(size, 5) : "0"} {symbol}</span></div>
        <input value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="0.00" className="w-full rounded-md bg-white/5 px-2 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/60" />
      </label>
      <div className="grid grid-cols-4 gap-1">
        {[25, 50, 75, 100].map((p) => (
          <button key={p} disabled={!freeUsdc} onClick={() => freeUsdc && setUsd(((freeUsdc * lev * p) / 100 * 0.98).toFixed(2))} className="rounded bg-white/5 py-1 text-zinc-300 hover:bg-white/10 disabled:opacity-40">{p}%</button>
        ))}
      </div>
      {type === "limit" && (
        <select value={tif} onChange={(e) => setTif(e.target.value)} className="rounded-md bg-white/5 px-2 py-1.5 text-zinc-200 outline-none">
          <option value="Gtc">Good till cancel</option><option value="Ioc">Immediate or cancel</option><option value="Alo">Post only (ALO)</option>
        </select>
      )}
      <label className="flex items-center gap-2 text-zinc-400"><input type="checkbox" checked={reduce} onChange={(e) => setReduce(e.target.checked)} /> Reduce only</label>

      <div className="space-y-0.5 rounded-md bg-white/[0.03] p-2 text-zinc-400">
        <div className="flex justify-between"><span>Margin req.</span><span className="text-zinc-200">{usd ? "$" + fmtNum(margin) : "–"}</span></div>
        <div className="flex justify-between"><span>Est. liq. price</span><span className="text-zinc-200">{usd && px ? fmtPrice(liq) : "–"}</span></div>
        <div className="flex justify-between"><span>Available</span><span className="text-zinc-200">{freeUsdc != null ? "$" + fmtNum(freeUsdc) : apiKey ? "…" : "connect key"}</span></div>
      </div>

      <button disabled={busy} onClick={review} className="mt-auto rounded-lg py-2.5 text-sm font-bold disabled:opacity-50" style={{ background: buy ? UP : DOWN, color: buy ? "#000" : "#fff" }}>
        {busy ? "…" : `${buy ? "Buy / Long" : "Sell / Short"} ${symbol}`}
      </button>
      {msg && <div className={`rounded-md p-2 text-[11px] ${msg.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>{msg.text}</div>}
      <div className="text-[10px] leading-snug text-zinc-600">Leverage here sizes the margin estimate only — your exchange account leverage setting applies at execution.</div>

      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70" onClick={() => setPreview(null)}>
          <div className="w-[360px] rounded-xl border border-white/15 bg-[#12161c] p-5 text-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-base font-bold text-white">Confirm order</div>
            <dl className="space-y-1.5 text-zinc-300">
              {[
                ["Market", preview.summary.symbol],
                ["Side", preview.summary.side],
                ["Size", preview.summary.size + " " + preview.summary.symbol],
                ["Notional", "≈ $" + fmtNum(preview.summary.notionalUsd)],
                ["Type", preview.summary.type],
                ["Limit price", preview.summary.limitPx],
                ["Reduce only", preview.summary.reduceOnly ? "yes" : "no"],
                ["Margin (@" + lev + "x)", "≈ $" + fmtNum(preview.summary.notionalUsd / lev)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-zinc-500">{k}</dt><dd className="font-medium text-white">{v}</dd></div>
              ))}
            </dl>
            {!apiKey && <div className="mt-3 rounded bg-amber-500/10 p-2 text-xs text-amber-300">No OpenFinance API key set — you&apos;ll be asked to add one.</div>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setPreview(null)} className="rounded-lg bg-white/10 py-2 font-semibold text-zinc-200">Cancel</button>
              <button onClick={confirm} disabled={busy} className="rounded-lg py-2 font-bold disabled:opacity-50" style={{ background: buy ? UP : DOWN, color: buy ? "#000" : "#fff" }}>{busy ? "Sending…" : "Place order"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
