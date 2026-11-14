export type Dir = "long" | "short";
export type EvType = "open" | "close" | "increase" | "decrease";

export interface Trader {
  id: number;
  name: string;
  avatar?: string;
  platform?: "X" | "TELEGRAM";
  handle?: string;
  audience?: number;
}

export interface CEvent {
  id: number;
  type: EvType;
  direction: Dir;
  price: number;
  time: string; // ISO
  traderId: number;
  positionId?: number;
  assumed?: boolean;
  messageId?: string;
  symbol: string;
}

export interface FeedItem {
  id: string;
  time: string;
  text: string;
  url?: string;
  platform?: "X" | "TELEGRAM";
  traderId: number;
  events: CEvent[];
}

export interface CPosition {
  id: number;
  direction: Dir;
  openAt: string;
  openPrice: number;
  ret: number; // current return %
  traderId: number;
  symbol: string;
}

export interface AssetStats {
  longCount: number;
  shortCount: number;
  longPct: number;
  shortPct: number;
}

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface TrendingRow { symbol: string; direction: Dir; traders: number; netNow: number; netBefore: number; delta: number; openReturn: number }
export interface FadeRow { symbol: string; crowdDir: Dir; fadeDir: Dir; net: number; traders: number; openReturn: number }
export interface SmartRow { symbol: string; gap: number; smartDir: Dir; smartNetPct: number; smartRet: number; crowdDir: Dir; crowdNetPct: number; crowdRet: number }
export interface SpecialistRow { symbol: string; direction: Dir; count: number; avgWin: number; openReturn: number }

export interface CentaurPayload {
  source: "live" | "snapshot";
  note?: string;
  asOf: string;
  symbol: string;
  feed: FeedItem[];
  events: CEvent[];
  positions: CPosition[];
  stats: AssetStats | null;
  traders: Record<number, Trader>;
  trending: TrendingRow[];
  fade: FadeRow[];
  smart: SmartRow[];
  specialists: SpecialistRow[];
}
