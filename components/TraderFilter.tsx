import { useState } from "react";
import { TraderAvatar } from "./TraderAvatar";

export interface Candidate { id: number; name: string; avatar?: string; platform?: "X" | "TELEGRAM"; count: number }

interface Props {
  candidates: Candidate[];
  excluded: number[];
  defaults: number[];
  onChange: (ids: number[]) => void;
}

/** Choose which traders appear on the chart, feed and positioning. Excluded = hidden. */
export function TraderFilter({ candidates, excluded, defaults, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ex = new Set(excluded);
  const shown = candidates
    .filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.count - a.count);
  const visible = candidates.filter((c) => !ex.has(c.id)).length;

  const toggle = (id: number) => {
    const n = excluded.includes(id) ? excluded.filter((x) => x !== id) : [...excluded, id];
    onChange(n);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="rounded-full bg-white/5 px-2.5 py-1 font-medium text-zinc-300 hover:bg-white/10">
        Traders {visible}/{candidates.length} ▾
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-80 rounded-lg border border-white/15 bg-[#12161c] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 p-2">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search traders…" className="min-w-0 flex-1 rounded bg-white/5 px-2 py-1 text-xs text-white outline-none" />
          </div>
          <div className="flex gap-1 border-b border-white/10 p-2 text-[10px]">
            <button onClick={() => onChange([])} className="rounded bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10">Include all</button>
            <button onClick={() => onChange(candidates.map((c) => c.id))} className="rounded bg-white/5 px-2 py-1 text-zinc-300 hover:bg-white/10">Exclude all</button>
            <button onClick={() => onChange(defaults)} className="ml-auto rounded bg-emerald-500/15 px-2 py-1 text-emerald-300 hover:bg-emerald-500/25">Defaults</button>
          </div>
          <div className="max-h-80 overflow-auto">
            {shown.length === 0 && <div className="p-3 text-center text-xs text-zinc-500">No traders in this market.</div>}
            {shown.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5">
                <input type="checkbox" checked={!ex.has(c.id)} onChange={() => toggle(c.id)} />
                <TraderAvatar trader={{ id: c.id, name: c.name, avatar: c.avatar }} id={c.id} size={20} />
                <span className={`min-w-0 flex-1 truncate ${ex.has(c.id) ? "text-zinc-600 line-through" : "text-zinc-200"}`}>{c.name}</span>
                <span className="text-[10px] text-zinc-500">{c.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
