import type { NextApiRequest, NextApiResponse } from "next";
import { snapshotPayload } from "@/lib/snapshot";
import type { CEvent, CPosition, CentaurPayload, FeedItem, Trader, TrendingRow, FadeRow, SmartRow, SpecialistRow } from "@/lib/types";

// Centaur social data for one Hyperliquid market.
// 1. Resolve the market's symbol to a Centaur asset ID (e.g. NVDA -> 822) via /assets, cached.
// 2. Query every endpoint by that numeric ID (assetIds=), not by symbol text.
// 3. Each endpoint succeeds or fails on its own; errors are reported in `note`.

const DEFAULT_BASE = "https://api.centaur.io/v2";
const idCache = new Map<string, { id: number | null; t: number }>();

async function get(base: string, path: string, key: string) {
  const r = await fetch(base + path, { headers: { "x-api-key": key, accept: "application/json" } });
  if (!r.ok) throw new Error(`${path.split("?")[0]} HTTP ${r.status}`);
  return r.json();
}

async function resolveAssetId(base: string, key: string, sym: string): Promise<number | null> {
  const hit = idCache.get(sym);
  if (hit && Date.now() - hit.t < 3600_000) return hit.id;
  const a = await get(base, `/assets?search=${encodeURIComponent(sym)}&limit=20`, key);
  const exact = (a.results || []).find((x: any) => String(x.symbol).toUpperCase() === sym);
  const id = exact ? exact.id : null;
  idCache.set(sym, { id, t: Date.now() });
  return id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const symbol = String(req.query.symbol || "BTC").toUpperCase();
  const key = String(req.headers["x-centaur-key"] || "");
  const base = String(req.headers["x-centaur-base"] || DEFAULT_BASE).replace(/\/$/, "");
  res.setHeader("cache-control", "no-store");

  if (!key) return res.json(snapshotPayload(symbol, "No Centaur API key set — showing captured snapshot (BTC/ETH/SOL/HYPE only)."));

  try {
    const id = await resolveAssetId(base, key, symbol);
    if (!id) return res.json(snapshotPayload(symbol, `Centaur has no asset named ${symbol}. Showing snapshot if available.`));

    const ai = `assetIds=${id}`;
    const errs: string[] = [];
    const ok = <T,>(p: Promise<T>, label: string): Promise<T | null> => p.catch((e) => { errs.push(`${label}: ${e.message}`); return null; });

    const [feedR, evR, posR, statR, trendR, fadeR, smartR, specR] = await Promise.all([
      ok(get(base, `/feed?${ai}&limit=60`, key), "feed"),
      ok(get(base, `/events?${ai}&limit=200`, key), "events"),
      ok(get(base, `/positions/open?${ai}&limit=200`, key), "positions"),
      ok(get(base, `/assets/stats?${ai}`, key), "stats"),
      ok(get(base, `/signals/trending?limit=8`, key), "trending"),
      ok(get(base, `/signals/crowd-fade?limit=8`, key), "fade"),
      ok(get(base, `/signals/smart-money?limit=8`, key), "smart"),
      ok(get(base, `/signals/specialist-ideas?limit=20`, key), "specialists"),
    ]);

    const traders: Record<number, Trader> = {};
    const feed: FeedItem[] = [];
    for (const r of feedR?.results || []) {
      const t = r.trader;
      if (t) traders[t.id] = { id: t.id, name: t.name, avatar: t.avatarUrl, platform: r.source?.platform, handle: r.source?.identity?.handle || undefined, audience: r.source?.identity?.audienceCount };
      const evs: CEvent[] = (r.events || [])
        .filter((e: any) => !e.assetId || e.assetId === id)
        .map((e: any) => ({ id: e.id, type: e.type, direction: e.direction, price: e.price, time: e.timeOfEvent, traderId: e.traderId, positionId: e.positionId, assumed: e.assumed, messageId: r.id, symbol }));
      if (!evs.length) continue;
      feed.push({ id: r.id, time: r.writtenAt, text: r.source?.text || "", url: r.source?.url, platform: r.source?.platform, traderId: t?.id ?? evs[0].traderId, events: evs });
    }
    const events: CEvent[] = (evR?.results || []).map((e: any) => ({ id: e.id, type: e.type, direction: e.direction, price: e.price, time: e.timeOfEvent, traderId: e.traderId, positionId: e.positionId, assumed: e.assumed, messageId: e.messageId, symbol }));
    const positions: CPosition[] = (posR?.results || []).map((p: any) => ({ id: p.id, direction: p.direction, openAt: p.openAt, openPrice: p.openPrice, ret: p.currentReturnPercentage, traderId: p.traderId, symbol }));

    // Names and avatars for traders that only appear in events/positions.
    const missing = Array.from(new Set([...events.map((e) => e.traderId), ...positions.map((p) => p.traderId)])).filter((t) => !traders[t]).slice(0, 100);
    if (missing.length) {
      const dir = await ok(get(base, `/traders?traderIds=${missing.join(",")}&limit=200`, key), "traders");
      for (const t of dir?.results || []) traders[t.id] = { id: t.id, name: t.name, avatar: t.avatarUrl, platform: t.source?.platform, handle: t.source?.handle || undefined, audience: t.source?.audienceCount };
    }

    // Market-wide signals: map their assetIds back to symbols.
    const ids = new Set<number>();
    [trendR, fadeR, smartR, specR].forEach((s) => (s?.results || []).forEach((r: any) => ids.add(r.assetId)));
    const sym: Record<number, string> = {};
    if (ids.size) {
      const a = await ok(get(base, `/assets?assetIds=${Array.from(ids).join(",")}&limit=200`, key), "asset names");
      for (const x of a?.results || []) sym[x.id] = x.symbol;
    }
    const S = (i: number) => sym[i] || `#${i}`;
    const trending: TrendingRow[] = (trendR?.results || []).map((r: any) => ({ symbol: S(r.assetId), direction: r.direction, traders: r.traderCount, netNow: r.netNow, netBefore: r.netBefore, delta: r.delta, openReturn: r.openReturnPercent }));
    const fade: FadeRow[] = (fadeR?.results || []).map((r: any) => ({ symbol: S(r.assetId), crowdDir: r.direction, fadeDir: r.fadeDirection, net: r.net, traders: r.traderCount, openReturn: r.openReturnPercent }));
    const smart: SmartRow[] = (smartR?.results || []).map((r: any) => ({ symbol: S(r.assetId), gap: r.gap, smartDir: r.smart.direction, smartNetPct: r.smart.netPercent, smartRet: r.smart.openReturnPercent, crowdDir: r.crowd.direction, crowdNetPct: r.crowd.netPercent, crowdRet: r.crowd.openReturnPercent }));
    const specialists: SpecialistRow[] = (specR?.results || []).map((r: any) => ({ symbol: S(r.assetId), direction: r.direction, count: r.specialists?.length ?? r.traderCount, avgWin: r.specialists?.length ? r.specialists.reduce((s: number, x: any) => s + x.winRatePercent, 0) / r.specialists.length : 0, openReturn: r.openReturnPercent }));

    const mp = statR?.results?.[0]?.summary?.marketPositioning;
    const total = mp ? mp.longCount + mp.shortCount : 0;
    const payload: CentaurPayload = {
      source: "live",
      note: errs.length ? `Partial live data (Centaur asset ${id}). Failed: ${errs.join("; ")}` : `Live Centaur data (asset ${id}).`,
      asOf: feedR?.meta?.serverTime || new Date().toISOString(),
      symbol, feed, events, positions, traders, trending, fade, smart, specialists,
      stats: mp ? { longCount: mp.longCount, shortCount: mp.shortCount, longPct: mp.longPercentage ?? +((mp.longCount / total) * 100).toFixed(1), shortPct: mp.shortPercentage ?? +((mp.shortCount / total) * 100).toFixed(1) } : null,
    };
    res.json(payload);
  } catch (e: any) {
    res.json(snapshotPayload(symbol, `Live Centaur call failed (${e?.message}) — showing snapshot instead.`));
  }
}
