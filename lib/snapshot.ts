import type { CEvent, CPosition, CentaurPayload, Dir, EvType, FeedItem, Trader } from "./types";

// Real data captured from the Centaur MCP on 2026-11-14 ~11:28 UTC.
// Used as the offline / no-API-key fallback so the app always renders real
// social-positioning data. A "SNAPSHOT" badge is shown in the UI when active.

const TG = "https://centaur-telegram-assets-prod.s3.eu-west-1.amazonaws.com/channels/";
const X = "https://pbs.twimg.com/profile_images/";

// [id, name, platform, handle, audience, avatar]
const T: [number, string, "X" | "TELEGRAM", string, number, string][] = [
  [578, "Ansem", "X", "blknoiz06", 1444752, X + "2120295476029194240/GxsF3s-A_400x400.jpg"],
  [401, "Ari Paul", "X", "AriDavidPaul", 229539, X + "1369235763871813633/qBDnxiLe_400x400.jpg"],
  [1756, "Astronomer", "TELEGRAM", "AstronomerZero", 9790, TG + "2034821368.jpg"],
  [369, "based16z", "X", "based16z", 128131, X + "1995052359068553216/hkPROmXA_400x400.jpg"],
  [2739, "Blockchain Backer", "X", "BCBacker", 355118, X + "1194978949887082500/jjtV5aqY_400x400.jpg"],
  [12, "ChartFuMonkey", "TELEGRAM", "ChartFuMonkeyTG", 968, TG + "2187509888.jpg"],
  [430, "Cheds Trading", "X", "BigCheds", 375489, X + "1392285045012959236/yviT9T7A_400x400.jpg"],
  [16, "Cheshire Capital", "TELEGRAM", "cheshcap", 813, TG + "2561725434.jpg"],
  [1856, "ClearEdge", "TELEGRAM", "", 66, TG + "2733236639.jpg"],
  [87, "Coin Signals", "TELEGRAM", "Coin_Signals", 71482, TG + "1432529525.jpg"],
  [80, "Crash", "TELEGRAM", "crashalerts", 18984, TG + "2029212536.jpg"],
  [74, "Crypto Bully", "TELEGRAM", "CryptoDBully", 6573, TG + "1922084134.jpg"],
  [2316, "Crypto Tony", "X", "CryptoTony__", 568706, X + "1612936440240898049/b8uRB78r_400x400.jpg"],
  [622, "CryptoCondom", "X", "crypto_condom", 156510, X + "2006410634066354176/-zXkIf58_400x400.jpg"],
  [84, "CryptoData", "TELEGRAM", "DatasInnerCircle", 4268, TG + "2195181561.jpg"],
  [82, "CryptoFreemium", "TELEGRAM", "crypto_freemium", 11586, TG + "1164790686.jpg"],
  [1750, "DaanCrypto", "TELEGRAM", "DaanCryptoTG", 6883, TG + "1903319347.jpg"],
  [45, "Dawn", "TELEGRAM", "dawncooks", 1121, TG + "3165122371.jpg"],
  [2914, "DFarmer", "X", "OGDfarmer", 128943, X + "1886253088354308096/JctNkINM_400x400.jpg"],
  [1532, "EliZ", "X", "eliz883", 607543, X + "1712027562258350080/nYVHZExf_400x400.jpg"],
  [1672, "Erik", "TELEGRAM", "erocryptotradingchannel", 2019, TG + "2448534602.jpg"],
  [305, "Gold_Cryptoz", "X", "Gold_Cryptoz", 36333, X + "2109149092979097600/9jPAI1PG_400x400.jpg"],
  [11, "HV", "TELEGRAM", "blizzardtrades", 934, TG + "2067762872.jpg"],
  [1336, "Killa", "X", "KillaXBT", 242871, X + "2121367277324972032/HUZ7UpKP_400x400.jpg"],
  [1315, "KoolKrypto", "X", "koolkrypto223", 17102, X + "2049861904634609664/43DxVolR_400x400.jpg"],
  [67, "Leftcurvemaxing", "TELEGRAM", "leftcurvemaxing", 4343, TG + "1936414807.jpg"],
  [1641, "masked thoughts", "TELEGRAM", "maskedthoughts", 685, TG + "3146325868.jpg"],
  [69, "Matter", "TELEGRAM", "", 11661, TG + "2154563599.jpg"],
  [283, "Mercury", "X", "TraderMercury", 91262, X + "1609578914371846144/fzeCeUMd_400x400.jpg"],
  [1882, "Mizer", "TELEGRAM", "", 27, TG + "3495554508.jpg"],
  [2134, "MomoCrypto", "TELEGRAM", "MomoDegen", 3695, TG + "3967193392.jpg"],
  [2894, "murtaza", "TELEGRAM", "murtazajournal", 3211, TG + "4449713004.jpg"],
  [1706, "PIFAGOR TRADE", "TELEGRAM", "pifagortrade", 84551, TG + "1403170292.jpg"],
  [47, "Poseidon", "TELEGRAM", "poseidonkitchen", 10853, TG + "1243559917.jpg"],
  [20, "Pump Truck", "TELEGRAM", "", 374, TG + "2382422401.jpg"],
  [2723, "rektober", "X", "rektober", 104010, X + "1931377232800366592/b7zQoT5R_400x400.jpg"],
  [57, "reuben", "TELEGRAM", "reubensjournal", 1644, TG + "2534879914.jpg"],
  [25, "SalsaTekila", "TELEGRAM", "salsatekila", 7865, TG + "1160243375.jpg"],
  [89, "SandalwoodXBT", "TELEGRAM", "SandalwoodXBT_Trades", 463, TG + "2157703441.jpg"],
  [90, "Sarazz", "TELEGRAM", "CryptoSarazz", 2535, TG + "2114522039.jpg"],
  [46, "Scient", "TELEGRAM", "scientclub", 7996, TG + "1951932328.jpg"],
  [1699, "Shark Crypto", "TELEGRAM", "shark_grp", 311238, TG + "2286311949.jpg"],
  [1684, "Snow | Crypto Quant", "TELEGRAM", "snowsignal", 4680, TG + "1324220561.jpg"],
  [2911, "that1618guy", "X", "that1618guy", 25945, X + "1756954782911307776/70H90-Gh_400x400.jpg"],
  [1186, "Tom Dante", "X", "Trader_Dante", 682546, X + "2046871632824680448/dj50gK2F_400x400.jpg"],
  [68, "Valkyrie Finance", "TELEGRAM", "valkyrie_finance_channel", 795, TG + "2311395565.jpg"],
  [2135, "Washed Trades", "TELEGRAM", "washedtrades", 726, TG + "3914844293.jpg"],
  [1752, "CryptoJack", "TELEGRAM", "CryptoJackXBT", 601, TG + "2022552016.jpg"],
  [608, "hedgedhog", "X", "hedgedhog7", 87067, X + "1966127896377827328/BhitYKBv_400x400.jpg"],
  [3020, "RealChickenBoy9", "X", "RealChickenBoy9", 68814, X + "2006328976084713473/uh9N-vps_400x400.jpg"],
  [6, "yh_0x", "TELEGRAM", "investingbeanstock", 5957, TG + "1423153458.jpg"],
  [316, "Zeke", "X", "Zeke_Gripto", 27071, X + "1801558882256621570/2QR97OsS_400x400.jpg"],
];

export const SNAP_TRADERS: Record<number, Trader> = Object.fromEntries(
  T.map(([id, name, platform, handle, audience, avatar]) => [id, { id, name, platform, handle: handle || undefined, audience, avatar }])
);

const D = "2026-11-";
function ev(id: number, type: EvType, direction: Dir, price: number, symbol: string, time: string, traderId: number, positionId: number, assumed = false): CEvent {
  return { id, type, direction, price, symbol, time: D + time + "Z", traderId, positionId, assumed };
}

function item(id: string, time: string, traderId: number, platform: "X" | "TELEGRAM", url: string, text: string, events: CEvent[]): FeedItem {
  return { id, time: D + time + "Z", traderId, platform, url, text, events };
}

export const SNAP_FEED: FeedItem[] = [
  item("a1", "14T09:22:02", 1699, "TELEGRAM", "https://t.me/shark_grp/27394", "#ONE/USDT Take-Profit target 1 ✅\nProfit: 113.0199% 📈\nPeriod: 6 hr 36 min ⏰", [ev(1373678, "decrease", "short", 0.00132129, "ONE", "14T09:22:02", 1699, 506215)]),
  item("a2", "14T08:03:29", 1882, "TELEGRAM", "", "#RUNE $RUNE LONG TRADE\n\nENTRY: 0.543\nTARGET: 0.612\nSTOPLOSS: 0.5322", [ev(1373664, "open", "long", 0.54376, "RUNE", "14T08:03:29", 1882, 506258)]),
  item("a3", "14T07:09:46", 3020, "X", "https://x.com/RealChickenBoy9/status/2121500821473177910", "@neosisly 저는 주식 비중이 더 커서 비트는 그냥 쭉 DCA합니다.", [ev(1373650, "open", "long", 67378.15, "BTC", "14T07:09:46", 3020, 506251, true)]),
  item("a4", "14T06:22:42", 1752, "TELEGRAM", "https://t.me/CryptoJackXBT/4351", "Buying more $ETH + $SOL and few others 🤝", [
    ev(1373627, "increase", "long", 75.893, "SOL", "14T06:22:42", 1752, 488322),
    ev(1373626, "increase", "long", 1909.894, "ETH", "14T06:22:42", 1752, 503758),
  ]),
  item("a5", "14T06:21:49", 1752, "TELEGRAM", "https://t.me/CryptoJackXBT/4350", "x.com/CryptoJackXBT/status/2121488651041607926", [
    ev(1373625, "increase", "long", 75.872, "SOL", "14T06:21:49", 1752, 488322),
    ev(1373624, "increase", "long", 1907.804, "ETH", "14T06:21:49", 1752, 503758),
  ]),
  item("a6", "14T05:15:43", 6, "TELEGRAM", "https://t.me/investingbeanstock/13699", "Added some $BTC and $HYPE", [
    ev(1373586, "open", "long", 69.128, "HYPE", "14T05:15:43", 6, 506224),
    ev(1373585, "open", "long", 67182.01, "BTC", "14T05:15:43", 6, 506223),
  ]),
  item("a7", "14T04:34:39", 1752, "TELEGRAM", "https://t.me/CryptoJackXBT/4349", "x.com/CryptoJackXBT/status/2121461164932558917", [
    ev(1373584, "increase", "long", 75.174, "SOL", "14T04:34:39", 1752, 488322),
    ev(1373583, "increase", "long", 1887.763, "ETH", "14T04:34:39", 1752, 503758),
    ev(1373582, "open", "long", 66673.16, "BTC", "14T04:34:39", 1752, 506222),
  ]),
  item("a8", "14T04:23:53", 608, "X", "https://x.com/hedgedhog7/status/2121459078694342843", "tping $btc and $near shorts here\n\nholding majority spx nq amd aapl msft shorts into the weekend", [
    ev(1373577, "close", "short", 66931.58, "BTC", "14T04:23:53", 608, 506216),
  ]),
  item("a9", "14T04:16:48", 316, "X", "https://x.com/Zeke_Gripto/status/2121457294982668355", "@HeiroCapital pls make it work, my spot bids are getting filled\n\nthis is scary", [
    ev(1373575, "increase", "long", 66668.24, "BTC", "14T04:16:48", 316, 488370),
  ]),
  item("a10", "14T03:01:57", 68, "TELEGRAM", "https://t.me/valkyrie_finance_channel/4591", "Tped", [ev(1373573, "close", "short", 1.0801, "GRAM", "14T03:01:57", 68, 499489)]),
  item("a11", "14T02:54:01", 2723, "X", "https://x.com/rektober/status/2121436462562283644", "@pm_me_your_knee got stopped out 2 times already, PA is just not normal", [
    ev(1373572, "close", "long", 67650.46, "BTC", "14T02:54:01", 2723, 504943),
  ]),
  item("a12", "14T02:49:59", 16, "TELEGRAM", "https://t.me/cheshcap/1179", "picked up a touch more 67.3 but saving bulk of size for a big liq candle", [
    ev(1373571, "increase", "long", 67654.91, "BTC", "14T02:49:59", 16, 504697),
  ]),
  item("a13", "14T02:49:58", 608, "X", "https://x.com/hedgedhog7/status/2121435442935734602", "@0xKongy @buyerofponzi on this short, I would be stopping out above 70k", [
    ev(1373570, "open", "short", 67654.91, "BTC", "14T02:49:58", 608, 506216, true),
  ]),
  item("a14", "13T22:01:19", 57, "TELEGRAM", "https://t.me/reubensjournal/432", "Been a while since I've posted, since then Bitcoin is unfortunately down 16,000 dollars. Move is to exercise patience and preserve capital IMO. Cut all my TAO spot and perp positions for a loss.", [
    ev(1373548, "decrease", "long", 1.43675, "PRL", "13T22:01:19", 57, 506205),
  ]),
];

// [id, dir, openAt, openPrice, ret%, traderId]
type P = [number, Dir, string, number, number, number];
const L: Dir = "long";
const S: Dir = "short";

const BTC_P: P[] = [
  [506251, L, "14T07:09:46", 67378.15, -0.21, 3020], [506223, L, "14T05:15:43", 67182.01, 0.08, 6], [506222, L, "14T04:34:39", 66673.16, 0.85, 1752],
  [504941, L, "13T14:44:34", 69182.7, -2.81, 45], [504697, L, "13T14:29:15", 69163.26, -2.78, 16], [504620, S, "13T09:40:20", 69051.22, 2.63, 1186],
  [504415, L, "13T08:57:04", 68765.4, -2.22, 1750], [506240, L, "13T06:10:03", 68213.59, -1.43, 90], [503753, L, "13T03:52:42", 68800.52, -2.27, 305],
  [503752, S, "13T03:52:02", 68800.52, 2.27, 87], [506237, S, "13T03:27:00", 69236.7, 2.89, 67], [503742, L, "13T00:20:49", 71348.31, -5.76, 80],
  [504627, L, "12T20:24:32", 71538.98, -6.01, 47], [503720, S, "12T19:21:36", 71650.33, 6.16, 2135], [502883, L, "12T14:28:55", 71830.68, -6.39, 2894],
  [502572, L, "12T14:26:40", 71943.41, -6.54, 11], [497426, L, "11T17:56:37", 74512.18, -9.76, 46], [496114, L, "11T01:31:48", 73783.36, -8.87, 25],
  [496106, L, "10T23:21:09", 73709.59, -8.78, 84], [496102, L, "10T21:07:57", 73925.61, -9.05, 1856], [496684, L, "10T18:24:41", 73192.29, -8.13, 69],
  [496084, L, "10T17:52:23", 73061.65, -7.97, 1684], [496067, S, "10T15:54:17", 73229.06, 8.18, 1672], [495395, L, "10T15:15:00", 74438.96, -9.67, 2316],
  [491247, L, "09T13:25:25", 74613.96, -9.89, 1532], [488853, L, "09T12:48:29", 74825.18, -10.14, 2739], [488797, L, "09T04:36:10", 75031.47, -10.39, 20],
  [488667, L, "09T03:40:36", 74983.58, -10.33, 89], [488666, L, "09T03:31:11", 75047.55, -10.41, 82], [488648, L, "08T22:29:03", 74471.7, -9.71, 1706],
  [488550, S, "06T19:23:05", 75691.16, 11.17, 1756], [488458, L, "06T12:08:59", 76182.39, -11.74, 401], [488433, L, "06T05:19:31", 75730.05, -11.21, 2134],
  [488370, L, "05T16:47:55", 76496.92, -12.1, 316], [487380, L, "04T22:40:42", 80818.22, -16.8, 369], [487364, L, "04T18:41:44", 80404.29, -16.37, 74],
  [487360, L, "04T18:05:42", 80613.2, -16.59, 430], [486843, L, "04T15:20:58", 80687.7, -16.67, 2911], [486841, L, "04T15:09:15", 80466.24, -16.44, 1336],
  [487397, S, "04T12:54:11", 78125.6, 13.94, 578],
];
const ETH_P: P[] = [
  [503758, L, "13T06:22:23", 1929.61, -1.11, 1752], [503748, L, "13T02:51:39", 1988.08, -4.01, 45], [502573, L, "12T14:26:40", 1993.03, -4.25, 11],
  [501729, L, "12T13:14:31", 2003.52, -4.75, 1641], [497425, L, "11T17:56:37", 2091.68, -8.77, 46], [496989, L, "11T17:16:32", 2084.63, -8.46, 82],
  [496098, L, "10T20:33:03", 2048.36, -6.84, 301], [496681, L, "10T18:24:41", 2027.39, -5.88, 69], [488965, S, "09T16:49:26", 2131.54, 10.47, 556],
  [488959, L, "09T15:48:18", 2148.15, -11.17, 8], [488828, L, "09T08:03:01", 2090.93, -8.74, 2823], [488826, L, "09T07:17:22", 2088.68, -8.64, 90],
  [488941, S, "09T00:43:58", 2137.01, 10.7, 106], [488834, L, "07T21:19:42", 2225.41, -14.25, 47],
];
const SOL_P: P[] = [
  [502580, L, "12T14:31:39", 80.81, -6.2, 1706], [497427, L, "11T17:56:37", 85.37, -11.21, 46], [496117, L, "11T03:20:22", 83.52, -9.25, 830],
  [496682, L, "10T18:24:41", 82.59, -8.21, 69], [488785, S, "08T00:55:29", 89.36, 15.17, 1315], [488437, S, "05T15:40:52", 90.98, 16.69, 578],
  [488322, L, "05T12:52:35", 95.24, -20.41, 1752], [483697, S, "04T00:38:05", 91.72, 17.36, 1162], [480074, L, "02T17:08:00", 93.38, -18.82, 1336],
  [476981, L, "2026-10-19T10:48:51", 104.86, -27.71, 1042], [465567, L, "2026-10-16T07:58:04", 106.32, -28.7, 813],
  [464919, L, "2026-10-13T14:21:00", 108.0, -29.81, 3000], [471671, L, "2026-10-12T12:02:00", 110.94, -31.68, 2316], [464843, S, "2026-09-04T13:11:26", 101.47, 25.3, 1214],
];

function toPos(rows: P[], symbol: string): CPosition[] {
  return rows.map(([id, direction, openAt, openPrice, ret, traderId]) => ({
    id, direction, symbol, openPrice, ret, traderId,
    openAt: openAt.startsWith("2026-") ? openAt + "Z" : D + openAt + "Z",
  }));
}

export const SNAP_POSITIONS: Record<string, CPosition[]> = {
  BTC: toPos(BTC_P, "BTC"),
  ETH: toPos(ETH_P, "ETH"),
  SOL: toPos(SOL_P, "SOL"),
  HYPE: [],
};

export const SNAP_STATS: Record<string, { longCount: number; shortCount: number }> = {
  BTC: { longCount: 3279, shortCount: 1909 },
  ETH: { longCount: 1676, shortCount: 989 },
  SOL: { longCount: 996, shortCount: 548 },
  HYPE: { longCount: 712, shortCount: 244 },
};

export const SNAP_TRENDING = [
  { symbol: "NVDA", direction: L, traders: 51, netNow: 44, netBefore: 24, delta: 20, openReturn: -13.94 },
  { symbol: "BTC", direction: L, traders: 88, netNow: 72, netBefore: 57, delta: 15, openReturn: -10.85 },
  { symbol: "SP500", direction: S, traders: 17, netNow: -4, netBefore: -16, delta: 12, openReturn: 0.75 },
  { symbol: "ETH", direction: L, traders: 37, netNow: 33, netBefore: 25, delta: 8, openReturn: -12.46 },
  { symbol: "HYPE", direction: L, traders: 32, netNow: 31, netBefore: 26, delta: 5, openReturn: 4.4 },
  { symbol: "MU", direction: S, traders: 4, netNow: -15, netBefore: -20, delta: 5, openReturn: 11.06 },
] as CentaurPayload["trending"];

export const SNAP_FADE = [
  { symbol: "AMD", crowdDir: L, fadeDir: S, net: 12, traders: 18, openReturn: 13.98 },
  { symbol: "XLV", crowdDir: L, fadeDir: S, net: 8, traders: 8, openReturn: 6.88 },
  { symbol: "TSLA", crowdDir: L, fadeDir: S, net: 13, traders: 16, openReturn: 5.03 },
  { symbol: "MSFT", crowdDir: L, fadeDir: S, net: 7, traders: 8, openReturn: 7.94 },
  { symbol: "HYPE", crowdDir: L, fadeDir: S, net: 31, traders: 32, openReturn: 4.4 },
] as CentaurPayload["fade"];

export const SNAP_SMART = [
  { symbol: "AERO", gap: 5.42, smartDir: L, smartNetPct: 5.17, smartRet: -39.39, crowdDir: S, crowdNetPct: -0.25, crowdRet: 31.63 },
  { symbol: "QQQ", gap: 3.95, smartDir: S, smartNetPct: -3.45, smartRet: 1.02, crowdDir: L, crowdNetPct: 0.5, crowdRet: -3.17 },
  { symbol: "SOL", gap: 3.9, smartDir: S, smartNetPct: -1.61, smartRet: 15.93, crowdDir: L, crowdNetPct: 2.29, crowdRet: -19.66 },
  { symbol: "PEPE", gap: 2.63, smartDir: S, smartNetPct: -1.61, smartRet: 10.36, crowdDir: L, crowdNetPct: 1.02, crowdRet: -5.21 },
] as CentaurPayload["smart"];

export const SNAP_SPECIALISTS = [
  { symbol: "BTC", direction: L, count: 11, avgWin: 70.3, openReturn: -11.24 },
  { symbol: "HYPE", direction: L, count: 4, avgWin: 71.7, openReturn: -12.08 },
] as CentaurPayload["specialists"];

export function snapshotPayload(symbol: string, note?: string): CentaurPayload {
  const sym = symbol.toUpperCase();
  const st = SNAP_STATS[sym];
  const feed = SNAP_FEED.filter((f) => f.events.some((e) => e.symbol === sym));
  const events = SNAP_FEED.flatMap((f) => f.events).filter((e) => e.symbol === sym);
  const total = st ? st.longCount + st.shortCount : 0;
  return {
    source: "snapshot",
    note,
    asOf: "2026-11-14T11:28:00Z",
    symbol: sym,
    feed,
    events,
    positions: SNAP_POSITIONS[sym] || [],
    stats: st
      ? {
          longCount: st.longCount,
          shortCount: st.shortCount,
          longPct: +((st.longCount / total) * 100).toFixed(1),
          shortPct: +((st.shortCount / total) * 100).toFixed(1),
        }
      : null,
    traders: SNAP_TRADERS,
    trending: SNAP_TRENDING,
    fade: SNAP_FADE,
    smart: SNAP_SMART,
    specialists: SNAP_SPECIALISTS,
  };
}
