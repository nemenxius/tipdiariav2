import type { MarketOdds } from "@/lib/types";

export function mapOddsByEventLabel(odds: MarketOdds[]) {
  const grouped = new Map<string, MarketOdds[]>();
  for (const market of odds) {
    const key = market.label;
    const existing = grouped.get(key) ?? [];
    existing.push(market);
    grouped.set(key, existing);
  }
  return grouped;
}
