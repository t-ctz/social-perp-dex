// Server-side loader for EVERY Hyperliquid perp market: the native dex plus all HIP-3 dexes
// (tokenized stocks, commodities, FX, indices, pre-IPO...). Cached to stay inside HL rate limits.

const HL = "https://api.hyperliquid.xyz/info";
const CATS = "https://api.openfinance.tech/agent/trading/market/perp-categories";

export interface Market {
  name: string; // HL coin name, e.g. "BTC" or "xyz:NVDA"
  dex: string; // "" for native
  dexIndex: number;
  idx: number; // index inside that dex's universe
  assetId: number; // numeric asset id used when placing orders
  szDecimals: number;
  maxLeverage: number;
  markPx: number;
  midPx?: number;
  oraclePx: number;
  prevDayPx: number;
  dayNtlVlm: number;
  openInterest: number;
  funding: number;
  collateral: string;
  category: string;
}

async function info(body: any) {
  const r = await fetch(HL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("hl " + r.status);
  return r.json();
}

let dexCache: { t: number; v: string[] } | null = null;
async function getDexes(): Promise<string[]> {
  if (dexCache && Date.now() - dexCache.t < 600_000) return dexCache.v;
  try {
    const d: any[] = await info({ type: "perpDexs" });
    const v = d.map((x) => (x && x.name) || "");
    dexCache = { t: Date.now(), v };
    return v;
  } catch {
    return dexCache?.v || [""];
  }
}

let spotCache: { t: number; v: string[] } | null = null;
async function getSpotTokens(): Promise<string[]> {
  if (spotCache && Date.now() - spotCache.t < 600_000) return spotCache.v;
  try {
    const m = await info({ type: "spotMeta" });
    const v: string[] = [];
    for (const t of m.tokens) v[t.index] = t.name;
    spotCache = { t: Date.now(), v };
    return v;
  } catch {
    return spotCache?.v || [];
  }
}

let catCache: { t: number; v: Record<string, string> } | null = null;
async function getCats(): Promise<Record<string, string>> {
  if (catCache && Date.now() - catCache.t < 600_000) return catCache.v;
  try {
    const r = await fetch(CATS);
    const a: [string, string][] = await r.json();
    const v = Object.fromEntries(a);
    catCache = { t: Date.now(), v };
    return v;
  } catch {
    return catCache?.v || {};
  }
}

async function loadDex(dex: string, dexIndex: number): Promise<Market[]> {
  const [res, spot, cats] = await Promise.all([
    info(dex ? { type: "metaAndAssetCtxs", dex } : { type: "metaAndAssetCtxs" }),
    getSpotTokens(),
    getCats(),
  ]);
  const [meta, ctxs] = res as [any, any[]];
  const collateral = spot[meta.collateralToken ?? 0] || "USDC";
  const out: Market[] = [];
  meta.universe.forEach((u: any, idx: number) => {
    const c = ctxs[idx];
    if (!c || u.isDelisted) return;
    out.push({
      name: u.name, dex, dexIndex, idx,
      assetId: dex ? 100000 + dexIndex * 10000 + idx : idx,
      szDecimals: u.szDecimals, maxLeverage: u.maxLeverage,
      markPx: +c.markPx, midPx: c.midPx ? +c.midPx : undefined, oraclePx: +c.oraclePx, prevDayPx: +c.prevDayPx,
      dayNtlVlm: +c.dayNtlVlm, openInterest: +c.openInterest, funding: +c.funding,
      collateral, category: cats[u.name] || (dex ? "other" : "crypto"),
    });
  });
  return out;
}

const perDex = new Map<string, { t: number; v: Market[] }>();
const inflight = new Map<string, Promise<Market[]>>();

/** Native dex + the focused dex refresh every ~4s; the other dexes every ~40s. */
export async function getMarkets(focusDex = ""): Promise<Market[]> {
  const dexes = await getDexes();
  const parts = await Promise.all(
    dexes.map(async (name, i) => {
      const ttl = name === "" || name === focusDex ? 4000 : 40000;
      const c = perDex.get(name);
      if (c && Date.now() - c.t < ttl) return c.v;
      let p = inflight.get(name);
      if (!p) {
        p = loadDex(name, i)
          .then((v) => { perDex.set(name, { t: Date.now(), v }); return v; })
          .finally(() => inflight.delete(name));
        inflight.set(name, p);
      }
      try { return await p; } catch { return c?.v || []; }
    })
  );
  return parts.flat();
}
