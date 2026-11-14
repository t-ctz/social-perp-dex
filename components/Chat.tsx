import { useEffect, useRef, useState } from "react";

interface Msg { role: "user" | "assistant"; content: string; tools?: string[] }
interface Props { symbol: string; price?: number; llmKey: string; llmBase: string; llmModel: string; cKey: string; cBase: string; onNeedKey: () => void }

const SUGGEST = ["What are top traders doing on {s}?", "Which markets have the biggest crowd to fade?", "Where is smart money positioned vs the crowd?", "Summarise the latest posts about {s}"];

export function Chat({ symbol, price, llmKey, llmBase, llmModel, cKey, cBase, onNeedKey }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    if (!llmKey) return onNeedKey();
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json", "x-llm-key": llmKey, "x-llm-base": llmBase, "x-llm-model": llmModel, "x-centaur-key": cKey, "x-centaur-base": cBase },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), context: { symbol, price } }),
      });
      const d = await r.json();
      setMsgs([...next, { role: "assistant", content: r.ok ? d.reply : "⚠ " + d.error, tools: d.tools }]);
    } catch (e: any) {
      setMsgs([...next, { role: "assistant", content: "⚠ " + (e?.message || "request failed") }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex h-full flex-col text-xs">
      <div className="min-h-0 flex-1 space-y-2.5 overflow-auto p-3">
        {msgs.length === 0 && (
          <div className="space-y-2 text-zinc-500">
            <div>Ask about positioning, traders, signals or any Hyperliquid market. I query Centaur and Hyperliquid live. Read-only: I can't place orders.</div>
            {SUGGEST.map((s) => <button key={s} onClick={() => send(s.replace("{s}", symbol))} className="block w-full rounded-lg bg-white/[0.05] px-2.5 py-1.5 text-left text-zinc-300 hover:bg-white/10">{s.replace("{s}", symbol)}</button>)}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-8 rounded-lg bg-emerald-500/15 p-2 text-emerald-100" : "mr-4 rounded-lg bg-white/[0.05] p-2 text-zinc-200"}>
            <div className="whitespace-pre-wrap break-words leading-snug">{m.content}</div>
            {m.tools && m.tools.length > 0 && <details className="mt-1.5 text-[10px] text-zinc-500"><summary className="cursor-pointer">{m.tools.length} data call{m.tools.length > 1 ? "s" : ""}</summary>{m.tools.map((t, j) => <div key={j} className="truncate font-mono">{t}</div>)}</details>}
          </div>
        ))}
        {busy && <div className="text-zinc-500">Querying data…</div>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t border-white/10 p-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={llmKey ? `Ask about ${symbol}…` : "Add an LLM key to chat"} className="min-w-0 flex-1 rounded-md bg-white/5 px-2.5 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/60" />
        <button disabled={busy} className="rounded-md bg-emerald-500 px-3 font-bold text-black disabled:opacity-50">Send</button>
      </form>
    </div>
  );
}
