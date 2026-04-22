import type { MarketKey, SportKey } from "@/lib/types";

export function isMarketSupported(sport: SportKey, marketKey: MarketKey) {
  const bySport: Record<SportKey, MarketKey[]> = {
    football: ["home_win", "draw", "away_win", "double_chance_1x", "double_chance_x2", "double_chance_12", "under_2_5", "over_2_5"]
  };

  return bySport[sport].includes(marketKey);
}
