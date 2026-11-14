import { useState } from "react";
import type { CEvent, FeedItem, Trader } from "@/lib/types";
import { dirColor, fmtPrice, timeAgo } from "@/lib/format";
import { PlatformBadge, TraderAvatar } from "./TraderAvatar";

interface Props {
  feed: FeedItem[];
  traders: Record<number, Trader>;
  selectedId?: number | null;
  onSelect: (e: CEvent) => void;
  symbol: string;
}

const ACT: Record<string, string> = { open: "opened", close: "closed", increase: "added", decrease: "trimmed" };

export function Feed({ feed, traders, selectedId, onSelect, symbol }: Props) {
  const [f, setF] = useState<"all" | "long" | "short">("all");
  const items = feed
    .filter((i) => f === "all" || i.events.some((e) => e.symbol === symbol && e.direction === f))
    .sort((a, b) => +new Date(b.time) - +new Date(a.time));

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-white/10 p-2 text-[11px]">
        {(["all", "long", "short"] as const).map((k) => (
          <button key={k} onClick={() => setF(k)} className={`rounded-full px-2.5 py-0.5 capitalize ${f === k ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>{k}</button>
        ))}
        <span className="ml-auto self-center text-zinc-600">{items.length} posts · {symbol}</span>
      </div>
      <div className="min-h-0 flex-1 divide-y divide-white/5 overflow-auto">
        {items.length === 0 && <div className="p-4 text-center text-xs text-zinc-500">No posts for {symbol} in this window.</div>}
        {items.map((it) => {
          const tr = traders[it.traderId];
          const e = it.events.find((x) => x.symbol === symbol) || it.events[0];
          const sel = it.events.some((x) => x.id === selectedId);
          return (
            <div key={it.id} onClick={() => e && onSelect(e)} className={`cursor-pointer p-2.5 hover:bg-white/[0.04] ${sel ? "bg-emerald-500/10" : ""}`}>
              <div className="flex items-center gap-2">
                <TraderAvatar trader={tr} id={it.traderId} size={26} ring={e ? dirColor(e.direction) : undefined} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-zinc-100">{tr?.name || `Trader #${it.traderId}`}</span>
                    <PlatformBadge p={it.platform || tr?.platform} />
                  </div>
                  <div className="text-[10px] text-zinc-500">{tr?.audience ? tr.audience.toLocaleString() + " followers · " : ""}{timeAgo(it.time)} ago</div>
                </div>
                {it.url && (
                  <a href={it.url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="text-[11px] text-zinc-500 hover:text-emerald-400" title="Open source post">↗</a>
                )}
              </div>
              <p className="mt-1.5 line-clamp-4 whitespace-pre-line break-words text-xs leading-snug text-zinc-300">{it.text}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {it.events.map((ev) => (
                  <span key={ev.id} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${ev.symbol === symbol ? "" : "opacity-50"}`} style={{ background: dirColor(ev.direction) + "22", color: dirColor(ev.direction) }}>
                    {ev.symbol} {ev.direction} {ACT[ev.type]} @ {fmtPrice(ev.price)}{ev.assumed ? " ~" : ""}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
