import { request } from "undici";
import type { OddsSourceAdapter, SourceFetchOptions } from "@/lib/adapters/types";
import { fetchSoccerVistaDailyTournaments, SOCCERVISTA_FIXTURE_SOURCE_KEY, type SoccerVistaTournament } from "@/lib/adapters/soccervista-fixture-adapter";
import type { MarketOdds } from "@/lib/types";
import { clamp } from "@/lib/utils/math";

const SOCCERVISTA_ODDS_SOURCE_KEY = "soccervista-football-odds";
const SOCCERVISTA_BASE_URL = "https://www.soccervista.com";
const SOCCERVISTA_GEO = "XX";

type SoccerVistaBook1x2 = {
  id: number;
  name: string;
  url: string;
  "1"?: { current?: string };
  "2"?: { current?: string };
  x?: { current?: string };
};

type SoccerVistaBookOu = {
  id: number;
  name: string;
  url: string;
  over?: { current?: string };
  under?: { current?: string };
};

type SoccerVistaOddsPayload = Record<
  string,
  {
    odds_1x2?: Record<string, SoccerVistaBook1x2>;
    odds_ou?: Record<string, Record<string, SoccerVistaBookOu>>;
    odds_dc?: Record<string, Record<string, SoccerVistaBookDc>>;
    odds_doublechance?: Record<string, Record<string, SoccerVistaBookDc>>;
    odds_double_chance?: Record<string, Record<string, SoccerVistaBookDc>>;
  }
>;

type SoccerVistaBookDc = {
  id: number;
  name: string;
  url: string;
  "1x"?: { current?: string };
  x1?: { current?: string };
  "x2"?: { current?: string };
  "12"?: { current?: string };
};

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function parseDecimal(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function chooseBestOdd<T extends { name: string }>(
  books: Record<string, T> | undefined,
  getter: (book: T) => string | undefined
) {
  if (!books) return null;

  let best: { odds: number; bookmaker: string; count: number } | null = null;
  const entries = Object.values(books);

  for (const book of entries) {
    const odds = parseDecimal(getter(book));
    if (odds === null) continue;
    if (!best || odds > best.odds) {
      best = { odds, bookmaker: book.name, count: entries.length };
    }
  }

  return best;
}

function sourceQuality(bookCount: number) {
  return Number(clamp(0.72 + Math.min(bookCount, 4) * 0.05, 0.72, 0.92).toFixed(2));
}

function buildEventRefs(tournaments: SoccerVistaTournament[]) {
  return tournaments.flatMap((tournament) =>
    tournament.events
      .filter((event) => !event.isFinished && !event.isCancelled && !event.isPostponed)
      .map((event) => `${event.id}_${event.homeEventParticipantId}_${event.awayEventParticipantId}`)
  );
}

export function parseSoccerVistaOddsPayload(payload: SoccerVistaOddsPayload | string): MarketOdds[] {
  const parsed = typeof payload === "string" ? JSON.parse(payload) as SoccerVistaOddsPayload : payload;
  const collectedAtUtc = new Date().toISOString();
  const rows: MarketOdds[] = [];

  for (const [eventId, eventOdds] of Object.entries(parsed)) {
    const eventLabel = `${SOCCERVISTA_FIXTURE_SOURCE_KEY}|${eventId}`;
    const bestHome = chooseBestOdd(eventOdds.odds_1x2, (book) => book["1"]?.current);
    const bestDraw = chooseBestOdd(eventOdds.odds_1x2, (book) => book.x?.current);
    const bestAway = chooseBestOdd(eventOdds.odds_1x2, (book) => book["2"]?.current);
    const totals = eventOdds.odds_ou?.["2.5"];
    const doubleChanceBooks = eventOdds.odds_dc?.["double chance"] ??
      eventOdds.odds_dc?.double_chance ??
      eventOdds.odds_dc?.dc ??
      eventOdds.odds_doublechance?.["double chance"] ??
      eventOdds.odds_doublechance?.double_chance ??
      eventOdds.odds_double_chance?.["double chance"] ??
      eventOdds.odds_double_chance?.double_chance;
    const bestOver = chooseBestOdd(totals, (book) => book.over?.current);
    const bestUnder = chooseBestOdd(totals, (book) => book.under?.current);
    const bestDoubleChance1x = chooseBestOdd(doubleChanceBooks, (book) => book["1x"]?.current ?? book.x1?.current);
    const bestDoubleChanceX2 = chooseBestOdd(doubleChanceBooks, (book) => book["x2"]?.current);
    const bestDoubleChance12 = chooseBestOdd(doubleChanceBooks, (book) => book["12"]?.current);

    const selections = [
      bestHome ? { marketKey: "home_win" as const, ...bestHome } : null,
      bestDraw ? { marketKey: "draw" as const, ...bestDraw } : null,
      bestAway ? { marketKey: "away_win" as const, ...bestAway } : null,
      bestDoubleChance1x ? { marketKey: "double_chance_1x" as const, ...bestDoubleChance1x } : null,
      bestDoubleChanceX2 ? { marketKey: "double_chance_x2" as const, ...bestDoubleChanceX2 } : null,
      bestDoubleChance12 ? { marketKey: "double_chance_12" as const, ...bestDoubleChance12 } : null,
      bestOver ? { marketKey: "over_2_5" as const, ...bestOver } : null,
      bestUnder ? { marketKey: "under_2_5" as const, ...bestUnder } : null
    ].filter(Boolean);

    for (const selection of selections) {
      if (!selection) continue;
      rows.push({
        marketKey: selection.marketKey,
        label: eventLabel,
        odds: selection.odds,
        bookmaker: selection.bookmaker,
        sourceKey: SOCCERVISTA_ODDS_SOURCE_KEY,
        sourceQuality: sourceQuality(selection.count),
        collectedAtUtc
      });
    }
  }

  return rows;
}

export class SoccerVistaOddsAdapter implements OddsSourceAdapter {
  sourceKey = SOCCERVISTA_ODDS_SOURCE_KEY;
  selectorVersion = "soccervista-odds-json-v1";

  async fetchDailyOdds(options: SourceFetchOptions) {
    if (!options.enabledSports.includes("football")) {
      return [];
    }

    const tournaments = await fetchSoccerVistaDailyTournaments(options.date);
    const eventRefs = buildEventRefs(tournaments);
    const batches = chunk(eventRefs, 30);
    const odds: MarketOdds[] = [];

    for (const batch of batches) {
      const url = new URL(`${SOCCERVISTA_BASE_URL}/events/${SOCCERVISTA_GEO}/pre-match-odds-batch`);
      url.searchParams.set("events", batch.join(","));

      const response = await request(url.toString());
      const body = await response.body.text();
      odds.push(...parseSoccerVistaOddsPayload(body));
    }

    return odds;
  }
}
