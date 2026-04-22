import { differenceInMinutes } from "date-fns";
import { SoccerVistaFixtureAdapter } from "@/lib/adapters/soccervista-fixture-adapter";
import { SoccerVistaOddsAdapter } from "@/lib/adapters/soccervista-odds-adapter";
import type { FixtureSourceAdapter, OddsSourceAdapter } from "@/lib/adapters/types";
import { cleanupOperationalData, getSettings, insertScoredPicks, recordScrapeRun, replaceOddsSnapshots, resetCandidateData, upsertEvents, upsertGeneratedCombinedBet } from "@/lib/db/index";
import { buildCombinedBetOfTheDay } from "@/lib/models/combined-bet";
import { scoreEventMarkets } from "@/lib/models/heuristic-model";
import { mapOddsByEventLabel } from "@/lib/pipeline/query";
import type { EventRecord, MarketOdds } from "@/lib/types";
import { confidenceToNumeric } from "@/lib/utils/math";
import { marketLabelFromKey } from "@/lib/utils/markets-labels";

const fixtureAdapters: FixtureSourceAdapter[] = [new SoccerVistaFixtureAdapter()];
const oddsAdapters: OddsSourceAdapter[] = [new SoccerVistaOddsAdapter()];

function enabledFixtureAdapters(enabledSources: string[]) {
  return fixtureAdapters.filter((adapter) => enabledSources.includes(adapter.sourceKey));
}

function enabledOddsAdapters(enabledSources: string[]) {
  return oddsAdapters.filter((adapter) => enabledSources.includes(adapter.sourceKey));
}

function buildEventReferenceMap(events: EventRecord[]) {
  const map = new Map<string, string>();
  for (const event of events) {
    map.set(`${event.sourceKey}|${event.sourceEventId}`, event.id);
  }
  return map;
}

function rankPick(
  pick: { edge: number; confidence: string; sourceQuality: number; estimatedProbability: number },
  minEdgePercent: number,
  maxEdgePercent: number
) {
  const edgePercent = pick.edge * 100;
  const targetEdge = (minEdgePercent + maxEdgePercent) / 2;
  const edgeDistancePenalty = Math.abs(edgePercent - targetEdge);

  return (
    (confidenceToNumeric(pick.confidence as any) * 1000) +
    (pick.sourceQuality * 100) +
    (pick.estimatedProbability * 10) -
    edgeDistancePenalty
  );
}

function dedupePicksByEvent<T extends {
  eventId: string;
  edge: number;
  confidence: string;
  sourceQuality: number;
  estimatedProbability: number;
}>(picks: T[], minEdgePercent: number, maxEdgePercent: number) {
  const bestByEvent = new Map<string, T>();

  for (const pick of picks) {
    const current = bestByEvent.get(pick.eventId);
    if (!current || rankPick(pick, minEdgePercent, maxEdgePercent) > rankPick(current, minEdgePercent, maxEdgePercent)) {
      bestByEvent.set(pick.eventId, pick);
    }
  }

  return Array.from(bestByEvent.values()).sort((left, right) => right.edge - left.edge);
}

export async function runDailyPipeline(date: string) {
  const settings = await getSettings();
  const events: EventRecord[] = [];
  const odds: MarketOdds[] = [];

  for (const adapter of enabledFixtureAdapters(settings.enabledSources)) {
    try {
      const fetched = await adapter.fetchDailyEvents({ date, enabledSports: settings.enabledSports });
      events.push(...fetched);
      await recordScrapeRun(
        adapter.sourceKey,
        "fixture",
        "success",
        `Fetched ${fetched.length} events`,
        { count: fetched.length },
        adapter.selectorVersion
      );
    } catch (error) {
      await recordScrapeRun(
        adapter.sourceKey,
        "fixture",
        "error",
        error instanceof Error ? error.message : "Unknown fixture error",
        {},
        adapter.selectorVersion
      );
    }
  }

  await upsertEvents(events);
  const eventRef = buildEventReferenceMap(events);

  for (const adapter of enabledOddsAdapters(settings.enabledSources)) {
    try {
      const fetched = await adapter.fetchDailyOdds({ date, enabledSports: settings.enabledSports });
      odds.push(...fetched);
      await recordScrapeRun(
        adapter.sourceKey,
        "odds",
        "success",
        `Fetched ${fetched.length} odds rows`,
        { count: fetched.length },
        adapter.selectorVersion
      );
    } catch (error) {
      await recordScrapeRun(
        adapter.sourceKey,
        "odds",
        "error",
        error instanceof Error ? error.message : "Unknown odds error",
        {},
        adapter.selectorVersion
      );
    }
  }

  await replaceOddsSnapshots(odds, eventRef);
  await resetCandidateData();

  const groupedOdds = mapOddsByEventLabel(odds);
  const scored = dedupePicksByEvent(events.flatMap((event) => {
    if (event.status !== "scheduled" && event.status !== "live") {
      return [];
    }

    const markets = groupedOdds.get(`${event.sourceKey}|${event.sourceEventId}`) ?? [];
    return scoreEventMarkets(
      event,
      markets.map((market) => ({
        marketKey: market.marketKey,
        marketLabel: marketLabelFromKey(market.marketKey),
        offeredOdds: market.odds,
        sourceQuality: market.sourceQuality,
        oddsFreshnessMinutes: differenceInMinutes(new Date(), new Date(market.collectedAtUtc))
      }))
    );
  }).filter((pick) => {
    const edgePercent = pick.edge * 100;
    return (
      edgePercent >= settings.minEdgePercent &&
      edgePercent <= settings.maxEdgePercent &&
      confidenceToNumeric(pick.confidence) >= settings.minConfidenceScore &&
      pick.sourceQuality >= 0.7 &&
      pick.oddsFreshnessMinutes <= settings.scrapeCadenceMinutes * 2
    );
  }), settings.minEdgePercent, settings.maxEdgePercent);

  const insertedCandidates = await insertScoredPicks(scored);
  const combinedBet = settings.combinedBetEnabled
    ? buildCombinedBetOfTheDay(date, insertedCandidates, {
        maxLegs: settings.combinedBetMaxLegs,
        minLegConfidence: settings.combinedBetMinLegConfidence
      })
    : null;
  const persistedCombinedBet = await upsertGeneratedCombinedBet(date, combinedBet);
  const cleanup = await cleanupOperationalData(date);

  return {
    events: events.length,
    odds: odds.length,
    candidates: scored.length,
    combinedBet: persistedCombinedBet ? persistedCombinedBet.legs.length : 0,
    cleanup
  };
}
