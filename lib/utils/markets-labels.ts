import type { MarketKey } from "@/lib/types";

const MARKET_LABELS: Record<MarketKey, string> = {
  home_win: "Home Win",
  draw: "Draw",
  away_win: "Away Win",
  double_chance_1x: "Double Chance 1X",
  double_chance_x2: "Double Chance X2",
  double_chance_12: "Double Chance 12",
  under_2_5: "Under 2.5 Goals",
  over_2_5: "Over 2.5 Goals"
};

export function marketLabelFromKey(marketKey: MarketKey) {
  return MARKET_LABELS[marketKey];
}

export function marketFamily(marketKey: MarketKey) {
  if (marketKey.startsWith("double_chance")) return "double_chance";
  if (marketKey === "home_win" || marketKey === "draw" || marketKey === "away_win") return "1x2";
  if (marketKey === "under_2_5" || marketKey === "over_2_5") return "totals";
  return marketKey;
}
