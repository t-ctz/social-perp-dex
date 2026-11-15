// Hyperliquid market -> Centaur mapping.
//
// 1. CENTAUR_SYMBOL: Hyperliquid names that differ from Centaur's symbol.
// 2. VERIFIED: Centaur symbol -> asset id. Every ID here appeared in a Centaur catalog result.
//    Anything not listed is looked up by symbol, and a miss is reported in the banner.
// 3. ID_OVERRIDE: Hyperliquid market -> Centaur asset id, when the symbol alone would be ambiguous.
// 4. UNMAPPED: Hyperliquid markets with no Centaur equivalent, or where Centaur's symbol means a different asset.

export const CENTAUR_SYMBOL: Record<string, string> = {
  SILVER: "XAG",
  GOLD: "PAXG",
  XYZ100: "QQQ",
  CAMBRICON: "688256",
};

export const VERIFIED: Record<string, number> = {
  // Commodities
  XAG: 723, PAXG: 86, SLV: 958, GLD: 955, CL: 732, BRENTOIL: 754, COPPER: 755, NATGAS: 739,
  PALLADIUM: 762, PLATINUM: 764, DBA: 1541, DBC: 1334, URNM: 846,
  // Indices and index-like ETFs
  JP225: 810, KR200: 811, SP500: 839, QQQ: 848, DRAM: 878, IGV: 1031, TLT: 1056, GDX: 1097,
  LYTE: 1907, NCLD: 1906, MAGS: 1856, KSTR: 1897, KORU: 932, XLV: 1175, XLE: 877, XBI: 1029, SMH: 919, SOXL: 894,
  // Country ETFs
  EWJ: 731, EWT: 898, EWY: 797, EWZ: 883,
  // Stocks
  TSLA: 749, NVDA: 822, AAPL: 741, MSFT: 746, AMD: 781, MU: 818, SNDK: 838, AAOI: 917,
  SOFTBANK: 940, HYUNDAI: 806, KIOXIA: 937, SMSN: 837, CXMT: 1958,
  SPCX: 840, MINIMAX: 924, ZHIPU: 926, XIAOMI: 854, STRC: 928, SHAZ: 1896, "688256": 1996,
  HOOD: 751, INTC: 750, PLTR: 828, COIN: 788, META: 815, ORCL: 827, GOOGL: 800, AMZN: 782, MSTR: 817,
  CRCL: 791, NFLX: 820, COST: 790, LLY: 813, TSM: 743, RIVN: 830, BABA: 747, USAR: 851, CRWV: 793,
  GME: 865, HIMS: 803, DKNG: 795, LITE: 876, BX: 881, MRVL: 880, RKLB: 882, BIRD: 786, CBRS: 864,
  ZM: 885, EBAY: 884, ARM: 889, ASML: 905, DELL: 908, IBM: 907, AVGO: 748, NOW: 910, NBIS: 899,
  WDC: 900, NOK: 914, BE: 901, QCOM: 887, BOT: 943, AMAT: 913, GEV: 1011, ICE: 1315, TTWO: 1045,
  TER: 962, CIEN: 946, MELI: 1039, SMCI: 935, SOFI: 956, CIFR: 964, IONQ: 971, GPRO: 1957, TWST: 1988,
  GLW: 936, COHR: 921, CRDO: 931, VST: 1080, UMC: 1208, LRCX: 933, MRNA: 1036, BMNR: 787, NET: 1058,
  CRWD: 984, RDDT: 990, IREN: 916,
  // FX
  EUR: 856, GBP: 893, JPY: 857,
  // Crypto
  BTC: 1, ETH: 10, SOL: 98, HYPE: 319, AERO: 287, PEPE: 248, RUNE: 80, POPCAT: 278, NEAR: 118,
  GRAM: 927, ADA: 38, AAVE: 139, ALT: 284, ANIME: 373, APE: 215, APT: 232, ARB: 194, ASTER: 619,
  ATOM: 67, AVAX: 109, AVNT: 458, "0G": 628, "2Z": 625, AXS: 124, AR: 104, BCH: 30, BSV: 62,
  BIGTIME: 267, BOME: 297, BONK: 241, BRETT: 294, BANANA: 263, BERA: 250, BABY: 321, BLUR: 242,
  BNB: 31, BIO: 361, AIXBT: 353, AZTEC: 711, ANSEM: 1945, BTCD: 774, ACE: 275, ALGO: 74,
};

// Hyperliquid market -> Centaur asset id, where the symbol alone would point at the wrong asset.
export const ID_OVERRIDE: Record<string, number> = {
  PURRDAT: 892, // Hyperliquid Strategies (equity). Not the PURR spot token.
};

// No Centaur equivalent, or ambiguous: shown as a clear message instead of a failed or wrong lookup.
export const UNMAPPED = new Set<string>([
  "NIFTY", "SHEIN",
  "10Y", "2Y", "30Y", // rates
  "TOTAL2", "OTHERS", // crypto market indices
  "HO", // heating oil
  "UNITREE", "RELIANCE", "OURA", "ANT", "ANTH", "OAI", "GIGADEV", // searched in Centaur: no match
  "MUU", "JIO", "TCNT", // searched in Centaur: no match
  "CVX", // Centaur's CVX is Convex Finance (crypto), not Chevron. Chevron not in catalog.
  "BB", "QNT", // each matches two Centaur assets (crypto and equity). Needs a decision.
]);
