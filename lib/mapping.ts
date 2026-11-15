// Hyperliquid market -> Centaur mapping.
//
// 1. CENTAUR_SYMBOL: Hyperliquid names that differ from Centaur's symbol.
// 2. VERIFIED: Centaur symbol -> asset id. Every ID here appeared in a Centaur catalog result.
//    Anything not listed is looked up by symbol, and a miss is reported in the banner.
// 3. UNMAPPED: Hyperliquid markets with no Centaur equivalent (chosen by the user or not found in Centaur).

export const CENTAUR_SYMBOL: Record<string, string> = {
  SILVER: "XAG",
  GOLD: "PAXG",
  XYZ100: "QQQ",
};

export const VERIFIED: Record<string, number> = {
  // Commodities
  XAG: 723, PAXG: 86, SLV: 958, GLD: 955, CL: 732, BRENTOIL: 754, COPPER: 755, NATGAS: 739,
  PALLADIUM: 762, PLATINUM: 764, DBA: 1541, DBC: 1334,
  // Indices and index-like ETFs
  JP225: 810, KR200: 811, SP500: 839, QQQ: 848, DRAM: 878, IGV: 1031, TLT: 1056, GDX: 1097,
  LYTE: 1907, NCLD: 1906, MAGS: 1856, KSTR: 1897, KORU: 932, XLV: 1175,
  // Country ETFs
  EWJ: 731, EWT: 898, EWY: 797, EWZ: 883,
  // Stocks
  TSLA: 749, NVDA: 822, AAPL: 741, MSFT: 746, AMD: 781, MU: 818, SNDK: 838, AAOI: 917,
  SOFTBANK: 940, HYUNDAI: 806, KIOXIA: 937, SMSN: 837, CXMT: 1958,
  // FX
  EUR: 856, GBP: 893, JPY: 857,
  // Crypto
  BTC: 1, ETH: 10, SOL: 98, HYPE: 319, AERO: 287, PEPE: 248, RUNE: 80, POPCAT: 278, NEAR: 118,
  GRAM: 927, ADA: 38, AAVE: 139, ALT: 284, ANIME: 373, APE: 215, APT: 232, ARB: 194, ASTER: 619,
  ATOM: 67, AVAX: 109, AVNT: 458, "0G": 628, "2Z": 625, AXS: 124, AR: 104, BCH: 30, BSV: 62,
  BIGTIME: 267, BOME: 297, BONK: 241, BRETT: 294, BANANA: 263, BERA: 250, BABY: 321, BLUR: 242,
  BNB: 31, BIO: 361, AIXBT: 353, AZTEC: 711, ANSEM: 1945, BTCD: 774, ACE: 275, ALGO: 74,
};

// No Centaur equivalent: shown as a clear message instead of a failed lookup.
export const UNMAPPED = new Set<string>([
  "NIFTY", "SHEIN",
  "10Y", "2Y", "30Y", // rates
  "TOTAL2", "OTHERS", // crypto market indices
  "HO", // heating oil
]);
