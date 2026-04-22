import { request } from "undici";
import type { FixtureSourceAdapter, SourceFetchOptions } from "@/lib/adapters/types";
import type { EventRecord, TeamStats } from "@/lib/types";
import { clamp } from "@/lib/utils/math";

const SOCCERVISTA_BASE_URL = "https://www.soccervista.com";
export const SOCCERVISTA_FIXTURE_SOURCE_KEY = "soccervista-football-fixtures";

type SoccerVistaEvent = {
  id: string;
  timeStart: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamForm?: string[];
  awayTeamForm?: string[];
  homeEventParticipantId: string;
  awayEventParticipantId: string;
  score: string | null;
  isLive: boolean;
  isFinished: boolean;
  isScheduled: boolean;
  isPaused: boolean;
  isPostponed: boolean;
  isCancelled: boolean;
  prediction1x2: number | "X";
  predictionOu: "O" | "U";
  predictionScore: string;
  predictionPoints: number;
  predictionMatchWinner: string;
};

export type SoccerVistaTournament = {
  id: string;
  name: string;
  countryName: string;
  countryCode: string | null;
  countryUrl: string;
  url: string;
  tournamentTemplateId: string;
  events: SoccerVistaEvent[];
};

function toSoccerVistaDatePath(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
}

function parsePredictedScore(score: string) {
  const [homeGoalsRaw, awayGoalsRaw] = score.split(":");
  const homeGoals = Number(homeGoalsRaw);
  const awayGoals = Number(awayGoalsRaw);

  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) {
    return { homeGoals: 1.2, awayGoals: 1.0 };
  }

  return { homeGoals, awayGoals };
}

function countForm(form: string[] | undefined) {
  const entries = form ?? [];
  const total = Math.max(entries.length, 1);
  const wins = entries.filter((entry) => entry === "win").length;
  const draws = entries.filter((entry) => entry === "draw").length;
  const losses = entries.filter((entry) => entry === "lost").length;
  const formPoints = wins * 3 + draws;

  return {
    total,
    wins,
    draws,
    losses,
    winRate: wins / total,
    drawRate: draws / total,
    pointsRate: formPoints / (total * 3)
  };
}

function normalizePrediction(prediction: SoccerVistaEvent["prediction1x2"]) {
  if (prediction === "X") return "X";
  return String(prediction) === "2" ? "2" : "1";
}

function buildTeamStats(event: SoccerVistaEvent, isHome: boolean): TeamStats {
  const form = countForm(isHome ? event.homeTeamForm : event.awayTeamForm);
  const predicted = parsePredictedScore(event.predictionScore);
  const goalsFor = isHome ? predicted.homeGoals : predicted.awayGoals;
  const goalsAgainst = isHome ? predicted.awayGoals : predicted.homeGoals;
  const prediction = normalizePrediction(event.prediction1x2);
  const pointsFactor = clamp((event.predictionPoints || 0) / 10, 0.1, 1);
  const outcomeBonus =
    prediction === "X"
      ? 0.04
      : prediction === "1"
        ? (isHome ? 0.1 : -0.03)
        : (isHome ? -0.03 : 0.1);

  const strengthIndex = clamp(
    form.pointsRate * 0.55 +
      form.winRate * 0.2 +
      pointsFactor * 0.2 +
      outcomeBonus +
      (goalsFor - goalsAgainst) * 0.04,
    0.18,
    0.94
  );

  return {
    recentWinRate: Number(form.winRate.toFixed(3)),
    recentDrawRate: Number(form.drawRate.toFixed(3)),
    homeAwayWinRate: Number(clamp(form.pointsRate + outcomeBonus, 0.12, 0.92).toFixed(3)),
    scoringRate: Number(clamp(goalsFor, 0.2, 4.5).toFixed(2)),
    concedingRate: Number(clamp(goalsAgainst, 0.2, 4.5).toFixed(2)),
    strengthIndex: Number(strengthIndex.toFixed(3)),
    rating: Math.round(50 + strengthIndex * 45)
  };
}

function buildStatus(event: SoccerVistaEvent): EventRecord["status"] {
  if (event.isCancelled) return "cancelled";
  if (event.isPostponed) return "postponed";
  if (event.isFinished) return "finished";
  if (event.isLive || event.isPaused) return "live";
  return "scheduled";
}

export function parseSoccerVistaDailyEvents(payload: SoccerVistaTournament[] | string): EventRecord[] {
  const tournaments = typeof payload === "string" ? JSON.parse(payload) as SoccerVistaTournament[] : payload;

  return tournaments.flatMap((tournament) =>
    tournament.events.map((event) => ({
      id: `soccervista:football:${event.id}`,
      sourceEventId: event.id,
      sourceKey: SOCCERVISTA_FIXTURE_SOURCE_KEY,
      sport: "football" as const,
      league: tournament.name,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      startTimeUtc: new Date(event.timeStart * 1000).toISOString(),
      status: buildStatus(event),
      context: {
        source: "soccervista",
        countryName: tournament.countryName,
        countryCode: tournament.countryCode,
        tournamentUrl: tournament.url,
        tournamentTemplateId: tournament.tournamentTemplateId,
        prediction1x2: normalizePrediction(event.prediction1x2),
        predictionOu: event.predictionOu,
        predictionScore: event.predictionScore,
        predictionPoints: event.predictionPoints,
        predictionMatchWinner: event.predictionMatchWinner,
        homeForm: event.homeTeamForm ?? [],
        awayForm: event.awayTeamForm ?? [],
        homeEventParticipantId: event.homeEventParticipantId,
        awayEventParticipantId: event.awayEventParticipantId
      },
      homeStats: buildTeamStats(event, true),
      awayStats: buildTeamStats(event, false)
    }))
  );
}

export async function fetchSoccerVistaDailyTournaments(date: string) {
  const response = await request(`${SOCCERVISTA_BASE_URL}/events/by/date/${toSoccerVistaDatePath(date)}/`);
  const body = await response.body.text();
  return JSON.parse(body) as SoccerVistaTournament[];
}

export class SoccerVistaFixtureAdapter implements FixtureSourceAdapter {
  sourceKey = SOCCERVISTA_FIXTURE_SOURCE_KEY;
  selectorVersion = "soccervista-events-json-v1";

  async fetchDailyEvents(options: SourceFetchOptions) {
    if (!options.enabledSports.includes("football")) {
      return [];
    }

    const tournaments = await fetchSoccerVistaDailyTournaments(options.date);
    return parseSoccerVistaDailyEvents(tournaments).filter((event) => {
      return event.status === "scheduled" || event.status === "live";
    });
  }
}
