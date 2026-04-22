import type { CandidatePick, CombinedBet } from "@/lib/types";
import { calculateEdge, clamp, confidenceFromScore, confidenceToNumeric } from "@/lib/utils/math";
import { marketFamily } from "@/lib/utils/markets-labels";

function uniqueEventCombo(combo: CandidatePick[]) {
  return new Set(combo.map((pick) => pick.eventId)).size === combo.length;
}

function marketDiversityBonus(combo: CandidatePick[]) {
  return new Set(combo.map((pick) => marketFamily(pick.marketKey))).size / combo.length;
}

function comboProbability(combo: CandidatePick[]) {
  return combo.reduce((total, pick) => total * pick.estimatedProbability, 1);
}

function comboOdds(combo: CandidatePick[]) {
  return Number(combo.reduce((total, pick) => total * pick.offeredOdds, 1).toFixed(2));
}

function comboScore(combo: CandidatePick[]) {
  const combinedEstimatedProbability = comboProbability(combo);
  const combinedOdds = comboOdds(combo);
  const combinedEdge = calculateEdge(combinedEstimatedProbability, combinedOdds);
  const minConfidence = Math.min(...combo.map((pick) => confidenceToNumeric(pick.confidence)));
  const avgQuality = combo.reduce((total, pick) => total + pick.sourceQuality, 0) / combo.length;
  const diversity = marketDiversityBonus(combo);

  return {
    combinedEstimatedProbability,
    combinedOdds,
    combinedEdge,
    totalScore: (combinedEdge * 1000) + (minConfidence * 140) + (avgQuality * 90) + (diversity * 40)
  };
}

function buildCombos(candidates: CandidatePick[], size: number) {
  const output: CandidatePick[][] = [];

  function backtrack(start: number, current: CandidatePick[]) {
    if (current.length === size) {
      if (uniqueEventCombo(current)) {
        output.push([...current]);
      }
      return;
    }

    for (let index = start; index < candidates.length; index += 1) {
      current.push(candidates[index]);
      backtrack(index + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return output;
}

export function buildCombinedBetOfTheDay(
  date: string,
  candidates: CandidatePick[],
  options: { maxLegs: 2 | 3; minLegConfidence: number }
): Omit<CombinedBet, "id" | "status" | "createdAt" | "updatedAt"> | null {
  const eligible = candidates
    .filter((pick) => pick.status === "pending" && confidenceToNumeric(pick.confidence) >= options.minLegConfidence)
    .sort((left, right) => right.edge - left.edge)
    .slice(0, 8);

  if (eligible.length < 2) return null;

  const bestTwo = buildCombos(eligible, 2)
    .map((combo) => ({ combo, ...comboScore(combo) }))
    .sort((left, right) => right.totalScore - left.totalScore)[0];

  const bestThree =
    options.maxLegs === 3 && eligible.length >= 3
      ? buildCombos(eligible, 3)
          .map((combo) => ({ combo, ...comboScore(combo) }))
          .filter((entry) => entry.combo.every((pick) => confidenceToNumeric(pick.confidence) >= Math.max(options.minLegConfidence, 0.78)))
          .sort((left, right) => right.totalScore - left.totalScore)[0]
      : null;

  const chosen =
    bestThree && bestTwo && bestThree.combinedEdge >= bestTwo.combinedEdge + 0.015
      ? bestThree
      : bestTwo;

  if (!chosen || chosen.combinedEdge <= 0) return null;

  const confidence = confidenceFromScore(
    clamp(
      (chosen.combinedEstimatedProbability * 0.4) +
        (chosen.combo.reduce((total, pick) => total + confidenceToNumeric(pick.confidence), 0) / chosen.combo.length * 0.4) +
        (chosen.combinedEdge + 0.18),
      0.35,
      0.94
    )
  );

  return {
    date,
    legs: chosen.combo.map((pick) => pick.id),
    legSnapshots: chosen.combo.map((pick) => ({
      candidatePickId: pick.id,
      eventId: pick.eventId,
      marketKey: pick.marketKey,
      marketLabel: pick.marketLabel,
      homeTeam: pick.home_team,
      awayTeam: pick.away_team,
      league: pick.league,
      startTimeUtc: pick.start_time_utc,
      offeredOdds: pick.offeredOdds,
      estimatedProbability: pick.estimatedProbability,
      edge: pick.edge,
      confidence: pick.confidence
    })),
    combinedOdds: chosen.combinedOdds,
    combinedEstimatedProbability: Number(chosen.combinedEstimatedProbability.toFixed(4)),
    combinedEdge: chosen.combinedEdge,
    confidence,
    rationale: `Built from ${chosen.combo.length} independent same-day legs with the strongest combined value profile after excluding same-match overlap.`
  };
}
