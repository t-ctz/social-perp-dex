const fs = require("fs");
let s = fs.readFileSync("pages/index.tsx", "utf8");
function rep(a, b) {
  if (!s.includes(a)) throw new Error("anchor missing: " + a.slice(0, 80));
  s = s.replace(a, b);
}
rep('import { OrderForm } from "@/components/OrderForm";', 'import { OrderForm, Prefill } from "@/components/OrderForm";');
rep('import { DOWN, UP, fmtCompact, fmtNum, fmtPct, fmtPrice } from "@/lib/format";', 'import { DOWN, UP, dirColor, fmtCompact, fmtNum, fmtPct, fmtPrice, timeAgo } from "@/lib/format";');
rep('  const [win, setWin] = useState({ w: 1440, h: 900 });', '  const [win, setWin] = useState({ w: 1440, h: 900 });\n  const [prefill, setPrefill] = useState<Prefill | null>(null);');
rep('  const pickRef = (r: string) => { const n = byRef[r]; if (n) pick(n); };', `  const pickRef = (r: string) => { const n = byRef[r]; if (n) pick(n); };

  // Trade button (feed post, chart marker): pre-fill the order form. Never sends anything.
  const tradeFor = (e: CEvent) => {
    const cands = markets.filter((m) => socialRef(m.name) === e.symbol);
    if (!cands.length) { window.alert(\`No Hyperliquid market found for \${e.symbol}.\`); return; }
    const m = [...cands].sort((a, b) => Number(!!a.dex) - Number(!!b.dex))[0];
    const opening = e.type === "open" || e.type === "increase";
    const isBuy = e.direction === "long" ? opening : !opening;
    const reduceOnly = !opening;
    const who = data?.traders[e.traderId]?.name || \`Trader #\${e.traderId}\`;
    if (m.name !== symbol) pick(m.name);
    setPrefill({ id: Date.now(), isBuy, price: e.price, reduceOnly, note: \`\${who} \${e.type} \${e.direction} \${e.symbol} @ \${fmtPrice(e.price)}\`, deviationPct: null });
  };`);
rep('<OrderForm symbol={symbol} mid={last} apiKey={conn.ofKey} pickedPrice={picked} freeUsdc={freeUsdc} onNeedKey={() => setSettings(true)} onPlaced={loadAccount} />', '<OrderForm symbol={symbol} mid={last} apiKey={conn.ofKey} pickedPrice={picked} prefill={prefill} freeUsdc={freeUsdc} onNeedKey={() => setSettings(true)} onPlaced={loadAccount} />');
rep('<Feed feed={shownFeed} traders={data.traders} selectedId={selected?.id} symbol={sref} onSelect={(e) => setSelected(e)} />', '<Feed feed={shownFeed} traders={data.traders} selectedId={selected?.id} symbol={sref} onSelect={(e) => setSelected(e)} onTrade={tradeFor} />');
rep('        <div className="grid grid-cols-[minmax(0,1fr)_272px_300px] grid-rows-[540px_460px] border-b border-white/10">', `        {selected && (
          <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-1.5 text-[11px]">
            <span className="font-semibold text-zinc-200">{data?.traders[selected.traderId]?.name || \`Trader #\${selected.traderId}\`}</span>
            <span className="font-semibold" style={{ color: dirColor(selected.direction) }}>{selected.type} {selected.direction} @ {fmtPrice(selected.price)}</span>
            <span className="text-zinc-500">{timeAgo(selected.time)} ago</span>
            <button onClick={() => tradeFor(selected)} className="ml-auto rounded bg-sky-500/20 px-2.5 py-1 font-bold text-sky-200 hover:bg-sky-500/30" title="Fill the order form with this action. You still confirm before anything is sent.">Trade this signal ›</button>
            <button onClick={() => setSelected(null)} className="text-zinc-500 hover:text-zinc-200" title="Clear">✕</button>
          </div>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_272px_300px] grid-rows-[540px_460px] border-b border-white/10">`);
fs.writeFileSync("pages/index.tsx", s);
console.log("patched index.tsx");
