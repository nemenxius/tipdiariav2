import { describe, expect, it } from "vitest";
import { buildCombinedBetOfTheDay } from "@/lib/models/combined-bet";
import { marketLabelFromKey } from "@/lib/utils/markets-labels";

describe("combined bet builder", () => {
  const basePicks = [
    {
      id: "1",
      eventId: "a",
      sport: "football" as const,
      marketKey: "home_win" as const,
      marketLabel: "Home Win",
      estimatedProbability: 0.58,
      fairOdds: 1.72,
      offeredOdds: 2.05,
      edge: 0.189,
      confidence: "strong" as const,
      rationale: "A",
      sourceQuality: 0.86,
      oddsFreshnessMinutes: 10,
      modelInputs: {},
      status: "pending" as const,
      league: "League A",
      home_team: "A1",
      away_team: "A2",
      start_time_utc: "2026-04-21T12:00:00.000Z"
    },
    {
      id: "2",
      eventId: "b",
      sport: "football" as const,
      marketKey: "under_2_5" as const,
      marketLabel: "Under 2.5 Goals",
      estimatedProbability: 0.57,
      fairOdds: 1.75,
      offeredOdds: 2.0,
      edge: 0.14,
      confidence: "strong" as const,
      rationale: "B",
      sourceQuality: 0.84,
      oddsFreshnessMinutes: 8,
      modelInputs: {},
      status: "pending" as const,
      league: "League B",
      home_team: "B1",
      away_team: "B2",
      start_time_utc: "2026-04-21T14:00:00.000Z"
    },
    {
      id: "3",
      eventId: "c",
      sport: "football" as const,
      marketKey: "double_chance_1x" as const,
      marketLabel: "Double Chance 1X",
      estimatedProbability: 0.69,
      fairOdds: 1.45,
      offeredOdds: 1.61,
      edge: 0.1109,
      confidence: "strong" as const,
      rationale: "C",
      sourceQuality: 0.88,
      oddsFreshnessMinutes: 5,
      modelInputs: {},
      status: "pending" as const,
      league: "League C",
      home_team: "C1",
      away_team: "C2",
      start_time_utc: "2026-04-21T16:00:00.000Z"
    }
  ];

  it("builds a 2-leg parlay by default", () => {
    const combined = buildCombinedBetOfTheDay("2026-04-21", basePicks, {
      maxLegs: 2,
      minLegConfidence: 0.66
    });

    expect(combined).not.toBeNull();
    expect(combined?.legSnapshots).toHaveLength(2);
    expect(combined?.combinedOdds).toBeGreaterThan(3);
  });

  it("rejects candidates from the same event", () => {
    const combined = buildCombinedBetOfTheDay("2026-04-21", [
      ...basePicks,
      { ...basePicks[0], id: "4", marketKey: "draw", marketLabel: "Draw", eventId: "a" as const }
    ], {
      maxLegs: 3,
      minLegConfidence: 0.66
    });

    expect(combined?.legSnapshots.some((leg) => leg.candidatePickId === "4")).toBe(false);
  });
});

describe("market labels", () => {
  it("humanizes double chance keys", () => {
    expect(marketLabelFromKey("double_chance_1x")).toBe("Double Chance 1X");
    expect(marketLabelFromKey("under_2_5")).toBe("Under 2.5 Goals");
  });
});
