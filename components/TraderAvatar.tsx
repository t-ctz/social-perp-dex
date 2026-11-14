import { useState } from "react";
import type { Trader } from "@/lib/types";

export function TraderAvatar({ trader, id, size = 24, ring }: { trader?: Trader; id?: number; size?: number; ring?: string }) {
  const [bad, setBad] = useState(false);
  const name = trader?.name || (id ? `#${id}` : "?");
  const style = { width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined } as React.CSSProperties;
  if (!trader?.avatar || bad) {
    return (
      <div style={{ ...style, fontSize: size * 0.42 }} className="flex shrink-0 items-center justify-center rounded-full bg-zinc-700 font-semibold text-zinc-200">
        {name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?"}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={trader.avatar} alt={name} style={style} className="shrink-0 rounded-full object-cover" onError={() => setBad(true)} referrerPolicy="no-referrer" />;
}

export function PlatformBadge({ p }: { p?: "X" | "TELEGRAM" }) {
  if (!p) return null;
  return (
    <span className={`rounded px-1 text-[9px] font-bold ${p === "X" ? "bg-zinc-200 text-black" : "bg-sky-500/20 text-sky-300"}`}>
      {p === "X" ? "X" : "TG"}
    </span>
  );
}
