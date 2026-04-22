import type { ConfidenceTier } from "@/lib/types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function probabilityToFairOdds(probability: number) {
  return Number((1 / clamp(probability, 0.01, 0.99)).toFixed(2));
}

export function calculateEdge(probability: number, offeredOdds: number) {
  return Number(((probability * offeredOdds) - 1).toFixed(4));
}

export function confidenceFromScore(score: number): ConfidenceTier {
  if (score >= 0.84) return "elite";
  if (score >= 0.73) return "strong";
  if (score >= 0.62) return "lean";
  return "watch";
}

export function confidenceToNumeric(confidence: ConfidenceTier) {
  if (confidence === "elite") return 0.9;
  if (confidence === "strong") return 0.78;
  if (confidence === "lean") return 0.66;
  return 0.5;
}

export function percent(value: number) {
  return Number((value * 100).toFixed(1));
}
