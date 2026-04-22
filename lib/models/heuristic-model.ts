import type { EventRecord, MarketKey, ScoredPick } from "@/lib/types";
import { calculateEdge, clamp, confidenceFromScore, confidenceToNumeric, probabilityToFairOdds } from "@/lib/utils/math";
import { isMarketSupported } from "@/lib/utils/markets";

function pickRationale(event: EventRecord, marketKey: MarketKey, inputs: Record<string, number>) {
  const teamTilt = inputs.powerGap > 0 ? event.homeTeam : event.awayTeam;
  if (marketKey === "under_2_5") {
    return `${event.homeTeam} and ${event.awayTeam} project below the usual scoring baseline, with tighter defensive numbers than the market price suggests.`;
  }
  if (marketKey.startsWith("double_chance")) {
    return `${teamTilt} carry the more reliable recent profile, and the double-chance angle protects the most likely non-loss path.`;
  }
  return `${teamTilt} rate better in recent form, split strength, and overall power score, which creates a price gap versus the offered odds.`;
}

function scoreMoneyline(event: EventRecord) {
  const powerGap =
    ((event.homeStats.recentWinRate - event.awayStats.recentWinRate) * 0.25) +
    ((event.homeStats.homeAwayWinRate - event.awayStats.homeAwayWinRate) * 0.25) +
    ((event.homeStats.strengthIndex - event.awayStats.strengthIndex) * 0.25) +
    (((event.homeStats.rating - event.awayStats.rating) / 100) * 0.25);

  const probability = clamp(0.5 + powerGap, 0.2, 0.86);
  return { probability, powerGap };
}

function scoreFootball(event: EventRecord, marketKey: MarketKey) {
  const sourcePrediction = String(event.context.prediction1x2 ?? "");
  const totalsLean = String(event.context.predictionOu ?? "");
  const predictionStrength = clamp(Number(event.context.predictionPoints ?? 0) / 10, 0, 1);
  const homePower =
    (event.homeStats.recentWinRate * 0.26) +
    ((event.homeStats.homeAwayWinRate ?? 0.5) * 0.24) +
    (event.homeStats.scoringRate / 4 * 0.2) +
    ((1 - event.homeStats.concedingRate / 4) * 0.15) +
    (event.homeStats.strengthIndex * 0.15);
  const awayPower =
    (event.awayStats.recentWinRate * 0.26) +
    ((event.awayStats.homeAwayWinRate ?? 0.5) * 0.24) +
    (event.awayStats.scoringRate / 4 * 0.2) +
    ((1 - event.awayStats.concedingRate / 4) * 0.15) +
    (event.awayStats.strengthIndex * 0.15);
  const powerGap = homePower - awayPower;
  const totalGoals = event.homeStats.scoringRate + event.awayStats.scoringRate;
  const sourceGap =
    sourcePrediction === "1"
      ? predictionStrength * 0.16
      : sourcePrediction === "2"
        ? -predictionStrength * 0.16
        : 0;
  const drawLean = sourcePrediction === "X" ? predictionStrength * 0.08 : 0;
  const drawProbability = clamp(0.23 + Math.max(0, 0.1 - Math.abs(powerGap)) + drawLean, 0.18, 0.36);
  const homeProbability = clamp(0.44 + powerGap * 0.55 + sourceGap, 0.18, 0.8);
  const awayProbability = clamp(1 - drawProbability - homeProbability, 0.1, 0.62);

  if (marketKey === "home_win") return { probability: homeProbability, powerGap, totalGoals };
  if (marketKey === "draw") return { probability: drawProbability, powerGap, totalGoals };
  if (marketKey === "away_win") return { probability: awayProbability, powerGap, totalGoals };
  if (marketKey === "double_chance_1x") return { probability: clamp(homeProbability + drawProbability, 0.4, 0.94), powerGap, totalGoals };
  if (marketKey === "double_chance_x2") return { probability: clamp(awayProbability + drawProbability, 0.25, 0.9), powerGap, totalGoals };
  if (marketKey === "double_chance_12") return { probability: clamp(homeProbability + awayProbability, 0.6, 0.95), powerGap, totalGoals };
  if (marketKey === "under_2_5") {
    const defensiveTilt = ((event.homeStats.concedingRate + event.awayStats.concedingRate) / 2);
    const marketBias = totalsLean === "U" ? predictionStrength * 0.14 : totalsLean === "O" ? -predictionStrength * 0.14 : 0;
    return {
      probability: clamp(0.53 + ((2.7 - totalGoals) * 0.12) + ((1.4 - defensiveTilt) * 0.08) + marketBias, 0.18, 0.84),
      powerGap,
      totalGoals
    };
  }
  const marketBias = totalsLean === "O" ? predictionStrength * 0.14 : totalsLean === "U" ? -predictionStrength * 0.14 : 0;
  return { probability: clamp(0.47 + ((totalGoals - 2.5) * 0.12) + marketBias, 0.18, 0.84), powerGap, totalGoals };
}

export function scoreEventMarkets(event: EventRecord, offeredMarkets: Array<{ marketKey: MarketKey; marketLabel: string; offeredOdds: number; sourceQuality: number; oddsFreshnessMinutes: number }>) {
  const picks: ScoredPick[] = [];

  for (const market of offeredMarkets) {
    if (!isMarketSupported(event.sport, market.marketKey)) continue;

    const result =
      event.sport === "football"
        ? scoreFootball(event, market.marketKey)
        : scoreMoneyline(event);

    const estimatedProbability = result.probability;
    const fairOdds = probabilityToFairOdds(estimatedProbability);
    const edge = calculateEdge(estimatedProbability, market.offeredOdds);
    const confidence = confidenceFromScore(
      clamp(
        (estimatedProbability * 0.5) +
          (market.sourceQuality * 0.2) +
          ((edge + 0.15) * 0.8) -
          (market.oddsFreshnessMinutes / 1000),
        0.2,
        0.96
      )
    );

    picks.push({
      eventId: event.id,
      sport: event.sport,
      marketKey: market.marketKey,
      marketLabel: market.marketLabel,
      estimatedProbability,
      fairOdds,
      offeredOdds: market.offeredOdds,
      edge,
      confidence,
      rationale: pickRationale(event, market.marketKey, {
        powerGap: Number(result.powerGap.toFixed(3)),
        confidenceScore: confidenceToNumeric(confidence)
      }),
      sourceQuality: market.sourceQuality,
      oddsFreshnessMinutes: market.oddsFreshnessMinutes,
      modelInputs: {
        powerGap: Number(result.powerGap.toFixed(3)),
        offeredOdds: market.offeredOdds,
        sourceQuality: market.sourceQuality,
        freshMinutes: market.oddsFreshnessMinutes
      }
    });
  }

  return picks;
}
