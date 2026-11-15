import { useState } from "react";

export interface Conn { ofKey: string; centaurKey: string; centaurBase: string; llmKey: string; llmBase: string; llmModel: string }
interface Props { open: boolean; onClose: () => void; conn: Conn; onSave: (v: Conn) => void }

export function Settings({ open, onClose, conn, onSave }: Props) {
  const [v, setV] = useState(conn);
  const [check, setCheck] = useState<{ ok: boolean; message: string; ethereum?: string | null; solana?: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const set = (k: keyof Conn) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const input = "mt-1 w-full rounded-md bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/60";

  async function runCheck() {
    setBusy(true); setCheck(null);
    try {
      const r = await fetch("/api/wallets", { headers: { "x-openfinance-key": v.ofKey.trim() } });
      setCheck(await r.json());
    } catch (e: any) {
      setCheck({ ok: false, message: "Check failed: " + (e?.message || "network error") });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="max-h-[92vh] w-[460px] overflow-auto rounded-xl border border-white/15 bg-[#12161c] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 text-base font-bold text-white">Connections</div>
        <p className="mb-4 text-xs text-zinc-500">Keys are stored only in this browser (localStorage) and sent to this app&apos;s own API routes, which forward them to the provider.</p>

        <label className="mb-1 block text-xs text-zinc-400">OpenFinance API key <span className="text-zinc-600">— trading &amp; balance (open_…)</span>
          <input type="password" value={v.ofKey} onChange={set("ofKey")} placeholder="open_…" className={input} /></label>
        <div className="mb-3 flex items-center gap-2">
          <button onClick={runCheck} disabled={busy || !v.ofKey.trim()} className="rounded-md bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/15 disabled:opacity-40">{busy ? "Checking…" : "Check key"}</button>
          {check && <span className={`text-xs ${check.ok ? "text-emerald-300" : "text-red-300"}`}>{check.message}</span>}
        </div>
        {check?.ok && check.ethereum && <div className="mb-3 break-all rounded bg-white/[0.04] p-2 font-mono text-[10px] text-zinc-400">EVM wallet: {check.ethereum}</div>}

        <label className="mb-3 block text-xs text-zinc-400">Centaur API key <span className="text-zinc-600">— live social data (x-api-key)</span>
          <input type="password" value={v.centaurKey} onChange={set("centaurKey")} placeholder="Empty = captured snapshot (BTC/ETH/SOL only)" className={input} /></label>
        <label className="mb-4 block text-xs text-zinc-400">Centaur API base URL
          <input value={v.centaurBase} onChange={set("centaurBase")} className={input} /></label>

        <div className="mb-2 border-t border-white/10 pt-3 text-xs font-semibold text-zinc-300">Assistant (LLM)</div>
        <label className="mb-3 block text-xs text-zinc-400">LLM API key <span className="text-zinc-600">— any OpenAI-compatible provider; OpenRouter by default</span>
          <input type="password" value={v.llmKey} onChange={set("llmKey")} placeholder="sk-or-…" className={input} /></label>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <label className="block text-xs text-zinc-400">Base URL<input value={v.llmBase} onChange={set("llmBase")} className={input} /></label>
          <label className="block text-xs text-zinc-400">Model<input value={v.llmModel} onChange={set("llmModel")} className={input} /></label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className="rounded-lg bg-white/10 py-2 text-sm font-semibold text-zinc-200">Cancel</button>
          <button onClick={() => { onSave({ ...v, ofKey: v.ofKey.trim(), centaurKey: v.centaurKey.trim(), llmKey: v.llmKey.trim() }); onClose(); }} className="rounded-lg bg-emerald-500 py-2 text-sm font-bold text-black">Save</button>
        </div>
      </div>
    </div>
  );
}
