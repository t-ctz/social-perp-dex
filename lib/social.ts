/** Map a Hyperliquid market name to the symbol Centaur uses (e.g. "xyz:NVDA" -> "NVDA", "kPEPE" -> "PEPE"). */
export function socialRef(name: string): string {
  let n = name.includes(":") ? name.split(":")[1] : name;
  if (/^k[A-Z]{2,}/.test(n)) n = n.slice(1);
  return n.toUpperCase();
}

export function dexOf(name: string): string {
  return name.includes(":") ? name.split(":")[0] : "";
}
