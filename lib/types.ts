export type SportKey = "football";

export type MarketKey =
  | "home_win"
  | "draw"
  | "away_win"
  | "double_chance_1x"
  | "double_chance_x2"
  | "double_chance_12"
  | "under_2_5"
  | "over_2_5";

export type PickStatus = "pending" | "approved" | "rejected" | "published" | "hidden";
export type CombinedBetStatus = "pending" | "published" | "hidden";

export type SourceKind = "fixture" | "odds";

export type ConfidenceTier = "watch" | "lean" | "strong" | "elite";

export interface TeamStats {
  recentWinRate: number;
  recentDrawRate?: number;
  homeAwayWinRate: number;
  scoringRate: number;
  concedingRate: number;
  strengthIndex: number;
  rating: number;
}

export interface EventRecord {
  id: string;
  sourceEventId: string;
  sourceKey: string;
  sport: SportKey;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTimeUtc: string;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  context: Record<string, unknown>;
  homeStats: TeamStats;
  awayStats: TeamStats;
}

export interface MarketOdds {
  marketKey: MarketKey;
  label: string;
  odds: number;
  bookmaker: string;
  sourceKey: string;
  sourceQuality: number;
  collectedAtUtc: string;
}

export interface ScoredPick {
  eventId: string;
  sport: SportKey;
  marketKey: MarketKey;
  marketLabel: string;
  estimatedProbability: number;
  fairOdds: number;
  offeredOdds: number;
  edge: number;
  confidence: ConfidenceTier;
  rationale: string;
  sourceQuality: number;
  oddsFreshnessMinutes: number;
  modelInputs: Record<string, number | string>;
}

export interface CandidatePick extends ScoredPick {
  id: string;
  status: PickStatus;
  league: string;
  home_team: string;
  away_team: string;
  start_time_utc: string;
}

export interface CombinedBetLeg {
  candidatePickId: string;
  eventId: string;
  marketKey: MarketKey;
  marketLabel: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTimeUtc: string;
  offeredOdds: number;
  estimatedProbability: number;
  edge: number;
  confidence: ConfidenceTier;
}

export interface CombinedBet {
  id: string;
  date: string;
  legs: string[];
  legSnapshots: CombinedBetLeg[];
  combinedOdds: number;
  combinedEstimatedProbability: number;
  combinedEdge: number;
  confidence: ConfidenceTier;
  rationale: string;
  status: CombinedBetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  enabledSports: SportKey[];
  enabledSources: string[];
  minEdgePercent: number;
  maxEdgePercent: number;
  minConfidenceScore: number;
  scrapeCadenceMinutes: number;
  rawDataRetentionDays: number;
  scrapeRunRetentionDays: number;
  publishMode: "manual" | "automatic";
  combinedBetEnabled: boolean;
  combinedBetMaxLegs: 2 | 3;
  combinedBetMinLegConfidence: number;
  timezone: string;
}
