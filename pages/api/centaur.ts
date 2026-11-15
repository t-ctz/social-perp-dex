import type { NextApiRequest, NextApiResponse } from "next";
import { snapshotPayload } from "@/lib/snapshot";
import type { CEvent, CPosition, CentaurPayload, FeedItem, Trader, TrendingRow, FadeRow, SmartRow, SpecialistRow } from "@/lib/types";

// Centaur social data for one Hyperliquid market. Never assumes a response shape: every
// response is coerced defensively, and any unexpected shape is reported in `note`.

const DEFAULT_BASE = "https://api.centaur.io/v2";
const KNOWN: Record<string, number> = {
  BTC: 1, ETH: 10, SOL: 98, HYPE: 319, NVDA: 822, SNDK: 838, AERO: 287, AMD: 781, MSFT: 746, QQQ: 848,
  TSLA: 749, MU: 818, PEPE: 248, SP500: 839, XLV: 1175, NUAI: 1862, ONE: 69, RUNE: 80, POPCAT: 278, NEAR: 118, GRAM: 927,
};
const idCache = new Map<string, { id: number | null; t: number }>();

async function get(base: string, path: string, key: string): Promise<any> {
  const r = await fetch(base + path, { headers: { "x-api-key": key, accept: "application/json" } });
  if (!r.ok) throw new Error(`${path.split("?")[0]} HTTP ${r.status}`);
  return r.json();
}

/** Returns the array inside a response, whatever the wrapper is called. Never throws. */
function rows(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (!x || typeof x !== "object") return [];
  for (const k of ["results", "data", "items", "assets", "traders", "events", "positions"]) {
    if (Array.isArray(x[k])) return x[k];
    if (x[k] && typeof x[k] === "object" && Array.isArray(x[k].results)) return x[k].results;
  }
  return [];
}
const sample = (x: any) => (x === null || x === undefined ? "null" : JSON.stringify(x).slice(0, 140));
const obj = (x: any) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
const num = (x: any) => (typeof x === "number" ? x : Number(x));

async function resolveAssetId(base: string, key: string, sym: string): Promise<number | null> {
  const hit = idCache.get(sym);
  if (hit && Date.now() - hit.t < 3600_000) return hit.id;
  let id: number | null = null;
  try {
    const a = await get(base, `/assets?search=${encodeURIComponent(sym)}&limit=50`, key);
    const hitRow = rows(a).find((x: any) => [x.symbol, x.ticker].some((v) => typeof v === "string" && v.toUpperCase() === sym));
    if (hitRow && Number.isFinite(num(hitRow.id))) id = num(hitRow.id);
  } catch {}
  if (id === null && KNOWN[sym] !== undefined) id = KNOWN[sym];
  idCache.set(sym, { id, t: Date.now() });
  return id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const symbol = String(req.query.symbol || "BTC").toUpperCase();
  const key = String(req.headers["x-centaur-key"] || "");
  const base = String(req.headers["x-centaur-base"] || DEFAULT_BASE).replace(/\/$/, "");
  res.setHeader("cache-control", "no-store");
  if (!key) return res.json(snapshotPayload(symbol, "No Centaur API key set — showing captured snapshot (BTC/ETH/SOL/HYPE only)."));

  const id = await resolveAssetId(base, key, symbol);
  if (!id) return res.json(snapshotPayload(symbol, `Centaur has no asset named ${symbol}.`));

  const notes: string[] = [];
  const call = async (label: string, p: string) => {
    try {
      const j = await get(base, p, key);
      return j;
    } catch (e: any) {
      notes.push(`${label}: ${e.message}`);
      return null;
    }
  };

  try {
    const ai = `assetIds=${id}`;
    const [feedJ, evJ, posJ, statJ, trendJ, fadeJ, smartJ, specJ] = await Promise.all([
      call("feed", `/feed?${ai}&limit=60`),
      call("events", `/events?${ai}&limit=200`),
      call("positions", `/positions/open?${ai}&limit=200`),
      call("stats", `/assets/stats?${ai}`),
      call("trending", `/signals/trending?limit=8`),
      call("fade", `/signals/crowd-fade?limit=8`),
      call("smart", `/signals/smart-money?limit=8`),
      call("specialists", `/signals/specialist-ideas?limit=20`),
    ]);

    const traders: Record<number, Trader> = {};
    const feed: FeedItem[] = [];
    for (const r of rows(feedJ)) {
      const t = obj(r.trader);
      if (t.id !== undefined) traders[num(t.id)] = { id: num(t.id), name: String(t.name ?? `#${t.id}`), avatar: t.avatarUrl, platform: obj(r.source).platform, handle: obj(r.source).identity?.handle, audience: obj(r.source).identity?.audienceCount };
      const evs: CEvent[] = rows(r.events)
        .filter((e: any) => !e.assetId || num(e.assetId) === id)
        .map((e: any) => ({ id: num(e.id), type: e.type, direction: e.direction, price: num(e.price), time: e.timeOfEvent, traderId: num(e.traderId), positionId: e.positionId, assumed: e.assumed, messageId: r.id, symbol }));
      if (!evs.length) continue;
      feed.push({ id: String(r.id), time: r.writtenAt, text: String(obj(r.source).text ?? ""), url: obj(r.source).url, platform: obj(r.source).platform, traderId: num(t.id ?? evs[0].traderId), events: evs });
    }
    const events: CEvent[] = rows(evJ).map((e: any) => ({ id: num(e.id), type: e.type, direction: e.direction, price: num(e.price), time: e.timeOfEvent, traderId: num(e.traderId), positionId: e.positionId, assumed: e.assumed, messageId: e.messageId, symbol }));
    const positions: CPosition[] = rows(posJ).map((p: any) => ({ id: num(p.id), direction: p.direction, openAt: p.openAt, openPrice: num(p.openPrice), ret: num(p.currentReturnPercentage), traderId: num(p.traderId), symbol }));

    const need = Array.from(new Set([...events.map((e) => e.traderId), ...positions.map((p) => p.traderId)])).filter((t) => !traders[t]).slice(0, 100);
    if (need.length) {
      const dir = await call("traders", `/traders?traderIds=${need.join(",")}&limit=200`);
      for (const t of rows(dir)) traders[num(t.id)] = { id: num(t.id), name: String(t.name ?? `#${t.id}`), avatar: t.avatarUrl, platform: obj(t.source).platform, handle: obj(t.source).handle, audience: obj(t.source).audienceCount };
    }

    const ids = new Set<number>();
    [trendJ, fadeJ, smartJ, specJ].forEach((s) => rows(s).forEach((r: any) => ids.add(num(r.assetId))));
    const names: Record<number, string> = {};
    if (ids.size) {
      const a = await call("asset names", `/assets?assetIds=${Array.from(ids).join(",")}&limit=200`);
      for (const x of rows(a)) names[num(x.id)] = String(x.symbol);
    }
    const S = (i: number) => names[i] || `#${i}`;
    const trending: TrendingRow[] = rows(trendJ).map((r: any) => ({ symbol: S(num(r.assetId)), direction: r.direction, traders: num(r.traderCount), netNow: num(r.netNow), netBefore: num(r.netBefore), delta: num(r.delta), openReturn: num(r.openReturnPercent) }));
    const fade: FadeRow[] = rows(fadeJ).map((r: any) => ({ symbol: S(num(r.assetId)), crowdDir: r.direction, fadeDir: r.fadeDirection, net: num(r.net), traders: num(r.traderCount), openReturn: num(r.openReturnPercent) }));
    const smart: SmartRow[] = rows(smartJ).map((r: any) => ({ symbol: S(num(r.assetId)), gap: num(r.gap), smartDir: obj(r.smart).direction, smartNetPct: num(obj(r.smart).netPercent), smartRet: num(obj(r.smart).openReturnPercent), crowdDir: obj(r.crowd).direction, crowdNetPct: num(obj(r.crowd).netPercent), crowdRet: num(obj(r.crowd).openReturnPercent) }));
    const specialists: SpecialistRow[] = rows(specJ).map((r: any) => {
      const sp = rows({ results: r.specialists });
      return { symbol: S(num(r.assetId)), direction: r.direction, count: sp.length || num(r.traderCount), avgWin: sp.length ? sp.reduce((s, x) => s + num(x.winRatePercent), 0) / sp.length : 0, openReturn: num(r.openReturnPercent) };
    });

    const mp = obj(rows(statJ)[0]?.summary).marketPositioning ?? obj(obj(statJ).results?.[0]?.summary).marketPositioning;
    const total = mp ? num(mp.longCount) + num(mp.shortCount) : 0;

    // If a response arrived but had no recognisable rows, say what it looked like.
    const shapes = [["feed", feedJ], ["positions", posJ], ["events", evJ], ["stats", statJ]]
      .filter(([, j]) => j && rows(j).length === 0)
      .map(([l, j]) => `${l} empty; raw ${sample(j)}`);

    res.json({
      source: "live",
      note: `Live Centaur data (asset ${id}).${notes.length ? " Failed: " + notes.join("; ") : ""}${shapes.length ? " Shape: " + shapes.join(" | ") : ""}`,
      asOf: obj(feedJ).meta?.serverTime || new Date().toISOString(),
      symbol, feed, events, positions, traders, trending, fade, smart, specialists,
      stats: mp ? { longCount: num(mp.longCount), shortCount: num(mp.shortCount), longPct: num(mp.longPercentage ?? (total ? (num(mp.longCount) / total) * 100 : 50)), shortPct: num(mp.shortPercentage ?? (total ? (num(mp.shortCount) / total) * 100 : 50)) } : null,
    } as CentaurPayload);
  } catch (e: any) {
    res.json(snapshotPayload(symbol, `Live Centaur mapping failed (${String(e?.message || e).slice(0, 160)}) — showing snapshot.`));
  }
}
