// Hyperliquid market -> Centaur mapping.
//
// 1. CENTAUR_SYMBOL: Hyperliquid names that differ from Centaur's symbol.
// 2. VERIFIED: Centaur symbol -> asset id, checked against Centaur's asset catalog.
//    These skip the search step entirely.
// 3. UNMAPPED: Hyperliquid markets with no Centaur equivalent. They show a snapshot banner
//    instead of a failed lookup.
// Anything not listed here is looked up by symbol, and a miss is reported in the banner.

export const CENTAUR_SYMBOL: Record<string, string> = {
  SILVER: "XAG", // spot silver (Centaur asset 723)
  GOLD: "PAXG", // gold token (Centaur asset 86)
  XYZ100: "QQQ", // Nasdaq 100 proxy (Centaur asset 848)
};

export const VERIFIED: Record<string, number> = {
  // Commodities
  XAG: 723, PAXG: 86, SLV: 958, GLD: 955, CL: 732, BRENTOIL: 754, COPPER: 755, NATGAS: 739, PALLADIUM: 762, PLATINUM: 764,
  // Indices and index-like equities
  JP225: 810, KR200: 811, SP500: 839, QQQ: 848, XLE: 877, DRAM: 878, IGV: 1031, XBI: 1029, TLT: 1056, GDX: 1097,
  SMH: 919, SOXL: 894, LYTE: 1907, NCLD: 1906, MAGS: 1856, KSTR: 1897, KORU: 932,
  // Country ETFs
  EWJ: 731, EWT: 898, EWY: 797, EWZ: 883,
  // Stocks
  TSLA: 749, NVDA: 822, AAPL: 741, MSFT: 746, AMZN: 782, AMD: 781, AVGO: 748, MU: 818, SNDK: 838, BABA: 747,
  BB: 903, BE: 901, BMNR: 787, BOT: 943, AMAT: 913, AAOI: 917, ARM: 889, ASML: 905, BIRD: 786, BX: 881,
  SOFTBANK: 940, HYUNDAI: 806, KIOXIA: 937, SMSN: 837, CXMT: 1958,
  // FX
  EUR: 856, GBP: 893, JPY: 857,
  // Crypto
  BTC: 1, ETH: 10, SOL: 98, HYPE: 319, AERO: 287, PEPE: 248, RUNE: 80, POPCAT: 278, NEAR: 118, GRAM: 927,
  ATOM: 67, DYDX: 185, AVAX: 109, BNB: 31, APE: 215, ARB: 194, DOGE: 4, CRV: 120, CFX: 142, BCH: 30, APT: 232,
  AAVE: 139, COMP: 108, DOT: 121, BANANA: 263, BIGTIME: 267, BLUR: 242, BSV: 62, ADA: 38, FET: 460, BONK: 241,
  ACE: 275, CAKE: 135, ENS: 203, ETC: 13, ALT: 284, DYM: 282, AR: 104, BOME: 297, ETHFI: 295, ENA: 302,
  EIGEN: 306, BRETT: 294, CELO: 101, ALGO: 74, FARTCOIN: 345, AIXBT: 353, BIO: 361, ANIME: 373, BERA: 250,
  BABY: 321, ASTER: 619, AVNT: 458, "0G": 628, "2Z": 625, CC: 667, AXS: 124, DASH: 5, AZTEC: 711, CHIP: 745,
  CASHCAT: 951, ANSEM: 1945, DRV: 1993, BTCD: 774,
};

// Searched in Centaur's catalog and not found. Shown as "no Centaur equivalent" rather than failing.
export const UNMAPPED = new Set<string>(["NIFTY", "SHEIN"]);
