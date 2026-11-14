import { useEffect, useRef } from "react";

/** Runs `fn` immediately and then every `ms`. Re-runs when deps change. */
export function usePoll(fn: () => void | Promise<void>, ms: number, deps: any[]) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (stop) return;
      try { await ref.current(); } catch {}
    };
    tick();
    const id = setInterval(tick, ms);
    return () => { stop = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export async function hl<T = any>(body: any): Promise<T> {
  const r = await fetch("/api/hl", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("hl " + r.status);
  return r.json();
}

export function loadLS<T>(k: string, d: T): T {
  if (typeof window === "undefined") return d;
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
}
export function saveLS(k: string, v: any) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}
