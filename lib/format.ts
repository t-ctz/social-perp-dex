export function fmtPrice(n: number | undefined | null) {
  if (n === undefined || n === null || !isFinite(n)) return "–";
  const a = Math.abs(n);
  const d = a >= 1000 ? 1 : a >= 100 ? 2 : a >= 10 ? 3 : a >= 1 ? 4 : a >= 0.1 ? 5 : a >= 0.01 ? 6 : 8;
  return n.toLocaleString("en-US", { minimumFractionDigits: d > 2 ? Math.min(d, 2) : d, maximumFractionDigits: d });
}

export function fmtNum(n: number, d = 2) {
  return n.toLocaleString("en-US", { maximumFractionDigits: d });
}

export function fmtCompact(n: number) {
  if (!isFinite(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}

export function fmtPct(n: number, d = 2) {
  if (!isFinite(n)) return "–";
  return (n > 0 ? "+" : "") + n.toFixed(d) + "%";
}

export function timeAgo(iso: string | number) {
  const t = typeof iso === "number" ? iso : new Date(iso).getTime();
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return Math.floor(s) + "s";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

export function fmtTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export const UP = "#22c55e";
export const DOWN = "#ef4444";
export const dirColor = (d: "long" | "short") => (d === "long" ? UP : DOWN);
