import type { NextApiRequest, NextApiResponse } from "next";
import { snapshotPayload } from "@/lib/snapshot";
import type { CEvent, CPosition, CentaurPayload, FeedItem, Trader, TrendingRow, FadeRow, SmartRow, SpecialistRow } from "@/lib/types";

// Centaur social-positioning data for one asset, via Centaur's REST API v2 (https://api.centaur.io/v2,
// `x-api-key` header). Endpoint paths come from Centaur's published OpenAPI spec. Response shapes are
// assumed to match the Centaur MCP (results[] + meta) and have NOT been exercised with a real key —
// on any failure we fall back to a captured real-data snapshot and say so in `note`.

const DEFAULT_BASE = "https://api.centaur.io/v2";

async function get(base: string, path: string, key: string) {
  const r = await fetch(base + path, { headers: { "x-api-key": key, accept: "application/json" } });
  if (!r.ok) throw new Error(`${path.split("?")[0]} → HTTP ${r.status}`);
  return r.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const symbol = String(req.query.symbol || "BTC").toUpperCase();
  const key = String(req.headers["x-centaur-key"] || "");
  const base = String(req.headers["x-centaur-base"] || DEFAULT_BASE).replace(/\/$/, "");
  res.setHeader("cache-control", "no-store");

  if (!key) return res.json(snapshotPayload(symbol, "No Centaur API key set — showing captured real-data snapshot (BTC/ETH/SOL only). Add a key via Connect."));

  const q = encodeURIComponent(symbol);
  try {
    const [feedR, evR, posR, statR, trendR, fadeR, smartR, specR] = await Promise.all([
      get(base, `/feed?assetRefs=${q}&limit=60`, key),
      get(base, `/events?assetRefs=${q}&limit=200`, key),
      get(base, `/positions/open?assetRefs=${q}&limit=200`, key),
      get(base, `/assets/stats?assetRefs=${q}`, key).catch(() => null),
      get(base, `/signals/trending?limit=8`, key).catch(() => null),
      get(base, `/signals/crowd-fade?limit=8`, key).catch(() => null),
      get(base, `/signals/smart-money?limit=8`, key).catch(() => null),
      get(base, `/signals/specialist-ideas?limit=20`, key).catch(() => null),
    ]);

    const traders: Record<number, Trader> = {};
    const feed: FeedItem[] = [];
    for (const r of feedR.results || []) {
      const t = r.trader;
      if (t) traders[t.id] = { id: t.id, name: t.name, avatar: t.avatarUrl, platform: r.source?.platform, handle: r.source?.identity?.handle || undefined, audience: r.source?.identity?.audienceCount };
      const evs: CEvent[] = (r.events || [])
        .filter((e: any) => !e.asset || String(e.asset.symbol).toUpperCase() === symbol)
        .map((e: any) => ({ id: e.id, type: e.type, direction: e.direction, price: e.price, time: e.timeOfEvent, traderId: e.traderId, positionId: e.positionId, assumed: e.assumed, messageId: r.id, symbol }));
      if (!evs.length) continue;
      feed.push({ id: r.id, time: r.writtenAt, text: r.source?.text || "", url: r.source?.url, platform: r.source?.platform, traderId: t?.id ?? evs[0].traderId, events: evs });
    }
    const events: CEvent[] = (evR.results || []).map((e: any) => ({ id: e.id, type: e.type, direction: e.direction, price: e.price, time: e.timeOfEvent, traderId: e.traderId, positionId: e.positionId, assumed: e.assumed, messageId: e.messageId, symbol }));
    const positions: CPosition[] = (posR.results || []).map((p: any) => ({ id: p.id, direction: p.direction, openAt: p.openAt, openPrice: p.openPrice, ret: p.currentReturnPercentage, traderId: p.traderId, symbol }));

    // names + avatars for traders that only appear in events/positions
    const missing = Array.from(new Set([...events.map((e) => e.traderId), ...positions.map((p) => p.traderId)])).filter((id) => !traders[id]).slice(0, 200);
    if (missing.length) {
      const dir = await get(base, `/traders?traderIds=${missing.join(",")}&limit=200`, key).catch(() => null);
      for (const t of dir?.results || []) traders[t.id] = { id: t.id, name: t.name, avatar: t.avatarUrl, platform: t.source?.platform, handle: t.source?.handle || undefined, audience: t.source?.audienceCount };
    }

    // market-wide signals: resolve assetId -> symbol
    const ids = new Set<number>();
    [trendR, fadeR, smartR, specR].forEach((s) => (s?.results || []).forEach((r: any) => ids.add(r.assetId)));
    const sym: Record<number, string> = {};
    if (ids.size) {
      const a = await get(base, `/assets?assetIds=${Array.from(ids).join(",")}&limit=200`, key).catch(() => null);
      for (const x of a?.results || []) sym[x.id] = x.symbol;
    }
    const S = (id: number) => sym[id] || `#${id}`;
    const trending: TrendingRow[] = (trendR?.results || []).map((r: any) => ({ symbol: S(r.assetId), direction: r.direction, traders: r.traderCount, netNow: r.netNow, netBefore: r.netBefore, delta: r.delta, openReturn: r.openReturnPercent }));
    const fade: FadeRow[] = (fadeR?.results || []).map((r: any) => ({ symbol: S(r.assetId), crowdDir: r.direction, fadeDir: r.fadeDirection, net: r.net, traders: r.traderCount, openReturn: r.openReturnPercent }));
    const smart: SmartRow[] = (smartR?.results || []).map((r: any) => ({ symbol: S(r.assetId), gap: r.gap, smartDir: r.smart.direction, smartNetPct: r.smart.netPercent, smartRet: r.smart.openReturnPercent, crowdDir: r.crowd.direction, crowdNetPct: r.crowd.netPercent, crowdRet: r.crowd.openReturnPercent }));
    const specialists: SpecialistRow[] = (specR?.results || []).map((r: any) => ({ symbol: S(r.assetId), direction: r.direction, count: r.specialists?.length ?? r.traderCount, avgWin: r.specialists?.length ? r.specialists.reduce((s: number, x: any) => s + x.winRatePercent, 0) / r.specialists.length : 0, openReturn: r.openReturnPercent }));

    const mp = statR?.results?.[0]?.summary?.marketPositioning;
    const total = mp ? mp.longCount + mp.shortCount : 0;
    const payload: CentaurPayload = {
      source: "live",
      asOf: feedR.meta?.serverTime || new Date().toISOString(),
      symbol, feed, events, positions, traders, trending, fade, smart, specialists,
      stats: mp ? { longCount: mp.longCount, shortCount: mp.shortCount, longPct: mp.longPercentage ?? +((mp.longCount / total) * 100).toFixed(1), shortPct: mp.shortPercentage ?? +((mp.shortCount / total) * 100).toFixed(1) } : null,
    };
    res.json(payload);
  } catch (e: any) {
    res.json(snapshotPayload(symbol, `Live Centaur call failed (${e?.message}) — showing snapshot instead.`));
  }
}
