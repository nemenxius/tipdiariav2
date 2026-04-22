import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { MongoClient, type Db } from "mongodb";
import type { AppSettings, CandidatePick, CombinedBet, CombinedBetLeg, CombinedBetStatus, EventRecord, MarketOdds, PickStatus, ScoredPick } from "@/lib/types";
import { APP_TIMEZONE } from "@/lib/utils/date";

const DEFAULT_SETTINGS: AppSettings = {
  enabledSports: ["football"],
  enabledSources: ["soccervista-football-fixtures", "soccervista-football-odds"],
  minEdgePercent: 5,
  maxEdgePercent: 9,
  minConfidenceScore: 0.58,
  scrapeCadenceMinutes: 60,
  rawDataRetentionDays: 2,
  scrapeRunRetentionDays: 7,
  publishMode: "manual",
  combinedBetEnabled: true,
  combinedBetMaxLegs: 2,
  combinedBetMinLegConfidence: 0.66,
  timezone: APP_TIMEZONE
};

const MONGO_URI_TEMPLATE =
  "mongodb+srv://mg023361_db_user:<db_password>@cluster0.x3s6ffm.mongodb.net/?appName=Cluster0";

type SessionRow = {
  id: string;
  token: string;
  username: string;
  expires_at: string;
};

type SettingsDocument = {
  _id: string;
  enabledSports: AppSettings["enabledSports"];
  enabledSources: string[];
  minEdgePercent: number;
  maxEdgePercent: number;
  minConfidenceScore: number;
  scrapeCadenceMinutes: number;
  rawDataRetentionDays: number;
  scrapeRunRetentionDays: number;
  publishMode: AppSettings["publishMode"];
  combinedBetEnabled: boolean;
  combinedBetMaxLegs: 2 | 3;
  combinedBetMinLegConfidence: number;
  timezone: string;
  updatedAt: string;
};

type EventDocument = {
  _id: string;
  source_event_id: string;
  source_key: string;
  sport: "football";
  league: string;
  home_team: string;
  away_team: string;
  start_time_utc: string;
  status: EventRecord["status"];
  context: Record<string, unknown>;
  home_stats: EventRecord["homeStats"];
  away_stats: EventRecord["awayStats"];
  created_at: string;
  updated_at: string;
};

type CandidateDocument = {
  _id: string;
  event_id: string;
  sport: "football";
  market_key: ScoredPick["marketKey"];
  market_label: string;
  estimated_probability: number;
  fair_odds: number;
  offered_odds: number;
  edge: number;
  confidence: ScoredPick["confidence"];
  rationale: string;
  source_quality: number;
  odds_freshness_minutes: number;
  model_inputs: Record<string, number | string>;
  status: PickStatus;
  created_at: string;
  updated_at: string;
};

type PublishedPickDocument = {
  candidate_pick_id: string;
  published_date: string;
  created_at: string;
};

type CombinedBetDocument = {
  _id: string;
  date: string;
  legs: string[];
  leg_snapshots: CombinedBetLeg[];
  combined_odds: number;
  combined_estimated_probability: number;
  combined_edge: number;
  confidence: CombinedBet["confidence"];
  rationale: string;
  status: CombinedBetStatus;
  created_at: string;
  updated_at: string;
};

type ScrapeRunDocument = {
  source_key: string;
  source_kind: "fixture" | "odds";
  status: "success" | "error";
  message: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type SourceHealthDocument = {
  _id: string;
  source_key: string;
  source_kind: "fixture" | "odds";
  last_success_at: string | null;
  last_error_at: string | null;
  last_message: string;
  selector_version: string;
  updated_at: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __tipMongoClientPromise__: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __tipMongoInitPromise__: Promise<void> | undefined;
}

function getMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const password = process.env.MONGODB_PASSWORD;
  if (password) {
    return MONGO_URI_TEMPLATE.replace("<db_password>", encodeURIComponent(password));
  }

  throw new Error("Missing MongoDB configuration. Set MONGODB_URI or MONGODB_PASSWORD.");
}

function getMongoDbName() {
  return process.env.MONGODB_DB_NAME ?? "tipdiaria";
}

async function getMongoClient() {
  if (!global.__tipMongoClientPromise__) {
    global.__tipMongoClientPromise__ = new MongoClient(getMongoUri()).connect();
  }

  return global.__tipMongoClientPromise__;
}

async function ensureInitialized(db: Db) {
  if (!global.__tipMongoInitPromise__) {
    global.__tipMongoInitPromise__ = (async () => {
      await Promise.all([
        db.collection("users").createIndex({ username: 1 }, { unique: true }),
        db.collection("sessions").createIndex({ token: 1 }, { unique: true }),
        db.collection("sessions").createIndex({ expires_at: 1 }),
        db.collection("published_picks").createIndex({ published_date: 1 }),
        db.collection("candidate_picks").createIndex({ status: 1, created_at: -1 }),
        db.collection("combined_bets").createIndex({ date: 1 }, { unique: true }),
        db.collection("events").createIndex({ start_time_utc: 1 }),
        db.collection("scrape_runs").createIndex({ created_at: -1 }),
        db.collection("odds_snapshots").createIndex({ collected_at_utc: -1 })
      ]);

      const now = new Date().toISOString();

      await db.collection<SettingsDocument>("app_settings").updateOne(
        { _id: "singleton" },
        {
          $setOnInsert: {
            _id: "singleton",
            ...DEFAULT_SETTINGS,
            updatedAt: now
          }
        },
        { upsert: true }
      );

      const existingSettings = await db.collection<SettingsDocument>("app_settings").findOne({ _id: "singleton" });
      if (existingSettings) {
        const needsReset =
          existingSettings.enabledSports.some((sport) => sport !== "football") ||
          existingSettings.enabledSources.some((source) => source.startsWith("sample-"));

        if (needsReset) {
          await db.collection<SettingsDocument>("app_settings").updateOne(
            { _id: "singleton" },
            {
              $set: {
                ...DEFAULT_SETTINGS,
                updatedAt: now
              }
            }
          );
        }
      }

      const defaultPassword = process.env.TIP_ADMIN_PASSWORD;
      if (!defaultPassword) {
        throw new Error("Missing TIP_ADMIN_PASSWORD. Set it in your local env and in Vercel before first run.");
      }

      const adminUser = await db.collection("users").findOne({ username: "admin" });
      const nextPasswordHash = bcrypt.hashSync(defaultPassword, 10);

      if (!adminUser) {
        await db.collection("users").insertOne({
          username: "admin",
          password_hash: nextPasswordHash,
          created_at: now
        });
      } else if (!bcrypt.compareSync(defaultPassword, String(adminUser.password_hash))) {
        await db.collection("users").updateOne(
          { username: "admin" },
          {
            $set: {
              password_hash: nextPasswordHash
            }
          }
        );
      }
    })();
  }

  await global.__tipMongoInitPromise__;
}

export async function getDb() {
  const client = await getMongoClient();
  const db = client.db(getMongoDbName());
  await ensureInitialized(db);
  return db;
}

function toSettings(document: SettingsDocument): AppSettings {
  return {
    enabledSports: ["football"],
    enabledSources: document.enabledSources,
    minEdgePercent: document.minEdgePercent,
    maxEdgePercent: document.maxEdgePercent,
    minConfidenceScore: document.minConfidenceScore,
    scrapeCadenceMinutes: document.scrapeCadenceMinutes,
    rawDataRetentionDays: document.rawDataRetentionDays,
    scrapeRunRetentionDays: document.scrapeRunRetentionDays,
    publishMode: document.publishMode,
    combinedBetEnabled: document.combinedBetEnabled ?? DEFAULT_SETTINGS.combinedBetEnabled,
    combinedBetMaxLegs: document.combinedBetMaxLegs ?? DEFAULT_SETTINGS.combinedBetMaxLegs,
    combinedBetMinLegConfidence: document.combinedBetMinLegConfidence ?? DEFAULT_SETTINGS.combinedBetMinLegConfidence,
    timezone: document.timezone
  };
}

function toEventDocument(event: EventRecord, timestamp: string): EventDocument {
  return {
    _id: event.id,
    source_event_id: event.sourceEventId,
    source_key: event.sourceKey,
    sport: "football",
    league: event.league,
    home_team: event.homeTeam,
    away_team: event.awayTeam,
    start_time_utc: event.startTimeUtc,
    status: event.status,
    context: event.context,
    home_stats: event.homeStats,
    away_stats: event.awayStats,
    created_at: timestamp,
    updated_at: timestamp
  };
}

function toEventUpdateFields(event: EventRecord, timestamp: string) {
  return {
    source_event_id: event.sourceEventId,
    source_key: event.sourceKey,
    sport: "football" as const,
    league: event.league,
    home_team: event.homeTeam,
    away_team: event.awayTeam,
    start_time_utc: event.startTimeUtc,
    status: event.status,
    context: event.context,
    home_stats: event.homeStats,
    away_stats: event.awayStats,
    updated_at: timestamp
  };
}

function toEventRecord(document: EventDocument): EventRecord {
  return {
    id: document._id,
    sourceEventId: document.source_event_id,
    sourceKey: document.source_key,
    sport: "football",
    league: document.league,
    homeTeam: document.home_team,
    awayTeam: document.away_team,
    startTimeUtc: document.start_time_utc,
    status: document.status,
    context: document.context,
    homeStats: document.home_stats,
    awayStats: document.away_stats
  };
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const document = await db.collection<SettingsDocument>("app_settings").findOne({ _id: "singleton" });

  if (!document) {
    return DEFAULT_SETTINGS;
  }

  return toSettings(document);
}

export async function updateSettings(nextSettings: AppSettings) {
  const db = await getDb();
  await db.collection<SettingsDocument>("app_settings").updateOne(
    { _id: "singleton" },
    {
      $set: {
        enabledSports: ["football"],
        enabledSources: nextSettings.enabledSources,
        minEdgePercent: nextSettings.minEdgePercent,
        maxEdgePercent: nextSettings.maxEdgePercent,
        minConfidenceScore: nextSettings.minConfidenceScore,
        scrapeCadenceMinutes: nextSettings.scrapeCadenceMinutes,
        rawDataRetentionDays: nextSettings.rawDataRetentionDays,
        scrapeRunRetentionDays: nextSettings.scrapeRunRetentionDays,
        publishMode: nextSettings.publishMode,
        combinedBetEnabled: nextSettings.combinedBetEnabled,
        combinedBetMaxLegs: nextSettings.combinedBetMaxLegs,
        combinedBetMinLegConfidence: nextSettings.combinedBetMinLegConfidence,
        timezone: nextSettings.timezone,
        updatedAt: new Date().toISOString()
      }
    },
    { upsert: true }
  );
}

export async function verifyUser(username: string, password: string) {
  const db = await getDb();
  const row = await db.collection("users").findOne({ username });

  if (!row) return false;
  return bcrypt.compareSync(password, String(row.password_hash));
}

export async function createSession(token: string, username: string, expiresAt: string) {
  const db = await getDb();
  await db.collection("sessions").insertOne({
    username,
    token,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  });
}

export async function getSession(token: string): Promise<SessionRow | undefined> {
  const db = await getDb();
  const row = await db.collection("sessions").findOne({ token });

  if (!row) return undefined;

  return {
    id: String(row._id),
    token: String(row.token),
    username: String(row.username),
    expires_at: String(row.expires_at)
  };
}

export async function deleteSession(token: string) {
  const db = await getDb();
  await db.collection("sessions").deleteOne({ token });
}

export async function upsertEvents(events: EventRecord[]) {
  if (!events.length) return;

  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection<EventDocument>("events").bulkWrite(
    events.map((event) => ({
      updateOne: {
        filter: { _id: event.id },
        update: {
          $set: {
            ...toEventUpdateFields(event, now)
          },
          $setOnInsert: {
            created_at: now
          }
        },
        upsert: true
      }
    }))
  );
}

export async function replaceOddsSnapshots(odds: MarketOdds[], eventIdBySourceEventId: Map<string, string>) {
  const db = await getDb();
  await db.collection("odds_snapshots").deleteMany({});

  const documents = odds.flatMap((market) => {
    const eventId = eventIdBySourceEventId.get(market.label);
    if (!eventId) {
      return [];
    }

    return [{
      event_id: eventId,
      market_key: market.marketKey,
      market_label: market.label,
      odds: market.odds,
      bookmaker: market.bookmaker,
      source_key: market.sourceKey,
      source_quality: market.sourceQuality,
      collected_at_utc: market.collectedAtUtc
    }];
  });

  if (documents.length) {
    await db.collection("odds_snapshots").insertMany(documents);
  }
}

export async function resetCandidateData() {
  const db = await getDb();
  await db.collection("model_scores").deleteMany({});
  await db.collection<CandidateDocument>("candidate_picks").deleteMany({ status: { $ne: "published" } });
}

export async function insertScoredPicks(scoredPicks: ScoredPick[]): Promise<CandidatePick[]> {
  if (!scoredPicks.length) return [];

  const db = await getDb();
  const now = new Date().toISOString();

  await db.collection("model_scores").insertMany(
    scoredPicks.map((pick) => ({
      event_id: pick.eventId,
      market_key: pick.marketKey,
      estimated_probability: pick.estimatedProbability,
      fair_odds: pick.fairOdds,
      confidence: pick.confidence,
      rationale: pick.rationale,
      model_inputs: pick.modelInputs,
      computed_at: now
    }))
  );

  const candidateDocuments: CandidateDocument[] = scoredPicks.map((pick) => ({
      _id: randomUUID(),
      event_id: pick.eventId,
      sport: "football" as const,
      market_key: pick.marketKey,
      market_label: pick.marketLabel,
      estimated_probability: pick.estimatedProbability,
      fair_odds: pick.fairOdds,
      offered_odds: pick.offeredOdds,
      edge: pick.edge,
      confidence: pick.confidence,
      rationale: pick.rationale,
      source_quality: pick.sourceQuality,
      odds_freshness_minutes: pick.oddsFreshnessMinutes,
      model_inputs: pick.modelInputs,
      status: "pending",
      created_at: now,
      updated_at: now
    }));

  await db.collection<CandidateDocument>("candidate_picks").insertMany(candidateDocuments);
  const eventLookup = await getEventLookup(candidateDocuments.map((candidate) => candidate.event_id));
  return candidateDocuments.map((candidate) => hydrateCandidatePick(candidate, eventLookup.get(candidate.event_id)));
}

export async function updateCandidateStatus(id: string, status: PickStatus) {
  const db = await getDb();
  await db.collection<CandidateDocument>("candidate_picks").updateOne(
    { _id: id },
    {
      $set: {
        status,
        updated_at: new Date().toISOString()
      }
    }
  );
}

export async function hideCandidate(id: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection<PublishedPickDocument>("published_picks").deleteMany({ candidate_pick_id: id });
  await db.collection<CandidateDocument>("candidate_picks").updateOne(
    { _id: id },
    {
      $set: {
        status: "hidden",
        updated_at: now
      }
    }
  );
}

export async function restoreCandidateToPending(id: string) {
  const db = await getDb();
  await db.collection<CandidateDocument>("candidate_picks").updateOne(
    { _id: id },
    {
      $set: {
        status: "pending",
        updated_at: new Date().toISOString()
      }
    }
  );
}

export async function publishCandidate(id: string, publishedDate: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection<PublishedPickDocument>("published_picks").deleteMany({ candidate_pick_id: id });
  await db.collection<CandidateDocument>("candidate_picks").updateOne(
    { _id: id },
    {
      $set: {
        status: "published",
        updated_at: now
      }
    }
  );
  await db.collection<PublishedPickDocument>("published_picks").insertOne({
    candidate_pick_id: id,
    published_date: publishedDate,
    created_at: now
  });
}

export async function recordScrapeRun(
  sourceKey: string,
  sourceKind: "fixture" | "odds",
  status: "success" | "error",
  message: string,
  payload: Record<string, unknown>,
  selectorVersion: string
) {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.collection<ScrapeRunDocument>("scrape_runs").insertOne({
    source_key: sourceKey,
    source_kind: sourceKind,
    status,
    message,
    payload,
    created_at: now
  });

  const current = await db.collection<SourceHealthDocument>("source_health").findOne({ _id: sourceKey });

  await db.collection<SourceHealthDocument>("source_health").updateOne(
    { _id: sourceKey },
    {
      $set: {
        source_key: sourceKey,
        source_kind: sourceKind,
        last_success_at: status === "success" ? now : current?.last_success_at ?? null,
        last_error_at: status === "error" ? now : current?.last_error_at ?? null,
        last_message: message,
        selector_version: selectorVersion,
        updated_at: now
      }
    },
    { upsert: true }
  );
}

function candidateStatusRank(status: PickStatus) {
  switch (status) {
    case "pending":
      return 1;
    case "published":
      return 2;
    case "approved":
      return 3;
    case "rejected":
      return 4;
    case "hidden":
      return 5;
    default:
      return 6;
  }
}

async function getEventLookup(ids: string[]) {
  if (!ids.length) {
    return new Map<string, EventDocument>();
  }

  const db = await getDb();
  const events = await db
    .collection<EventDocument>("events")
    .find({ _id: { $in: ids } })
    .toArray();

  return new Map(events.map((event) => [event._id, event]));
}

function hydrateCandidatePick(pick: CandidateDocument, event?: EventDocument): CandidatePick {
  return {
    id: pick._id,
    eventId: pick.event_id,
    sport: pick.sport,
    marketKey: pick.market_key,
    marketLabel: pick.market_label,
    estimatedProbability: pick.estimated_probability,
    fairOdds: pick.fair_odds,
    offeredOdds: pick.offered_odds,
    edge: pick.edge,
    confidence: pick.confidence,
    rationale: pick.rationale,
    sourceQuality: pick.source_quality,
    oddsFreshnessMinutes: pick.odds_freshness_minutes,
    modelInputs: pick.model_inputs,
    status: pick.status,
    league: event?.league ?? "",
    home_team: event?.home_team ?? "",
    away_team: event?.away_team ?? "",
    start_time_utc: event?.start_time_utc ?? ""
  };
}

function sortCandidatePicks(picks: CandidatePick[]) {
  return picks.sort((left, right) => {
    const statusCompare = candidateStatusRank(left.status) - candidateStatusRank(right.status);
    if (statusCompare !== 0) return statusCompare;
    if (right.edge !== left.edge) return right.edge - left.edge;
    return left.start_time_utc.localeCompare(right.start_time_utc);
  });
}

export async function getCandidatePicks(): Promise<CandidatePick[]> {
  const db = await getDb();
  const picks = await db.collection<CandidateDocument>("candidate_picks").find({}).toArray();
  const eventLookup = await getEventLookup(picks.map((pick) => pick.event_id));

  return sortCandidatePicks(picks.map((pick) => hydrateCandidatePick(pick, eventLookup.get(pick.event_id))));
}

export async function getPublishedPicksByDate(date: string) {
  const db = await getDb();
  const published = await db.collection<PublishedPickDocument>("published_picks").find({ published_date: date }).toArray();
  const candidateIds = published.map((entry) => String(entry.candidate_pick_id));
  const candidates = candidateIds.length
    ? await db.collection<CandidateDocument>("candidate_picks").find({ _id: { $in: candidateIds } }).toArray()
    : [];
  const eventLookup = await getEventLookup(candidates.map((candidate) => candidate.event_id));
  const publishedLookup = new Map(published.map((entry) => [String(entry.candidate_pick_id), String(entry.published_date)]));

  return candidates
    .map((candidate) => {
      const event = eventLookup.get(candidate.event_id);
      const hydrated = hydrateCandidatePick(candidate, event);
      return {
        ...hydrated,
        published_date: publishedLookup.get(candidate._id) ?? date
      };
    })
    .sort((left, right) => {
      const timeCompare = left.start_time_utc.localeCompare(right.start_time_utc);
      if (timeCompare !== 0) return timeCompare;
      return right.edge - left.edge;
    });
}

function toCombinedBet(document: CombinedBetDocument): CombinedBet {
  return {
    id: document._id,
    date: document.date,
    legs: document.legs,
    legSnapshots: document.leg_snapshots,
    combinedOdds: document.combined_odds,
    combinedEstimatedProbability: document.combined_estimated_probability,
    combinedEdge: document.combined_edge,
    confidence: document.confidence,
    rationale: document.rationale,
    status: document.status,
    createdAt: document.created_at,
    updatedAt: document.updated_at
  };
}

export async function upsertGeneratedCombinedBet(date: string, combinedBet: Omit<CombinedBet, "id" | "status" | "createdAt" | "updatedAt"> | null) {
  const db = await getDb();
  const existing = await db.collection<CombinedBetDocument>("combined_bets").findOne({ date });

  if (!combinedBet) {
    if (existing?.status !== "published") {
      await db.collection<CombinedBetDocument>("combined_bets").deleteOne({ date });
    }
    return existing ? toCombinedBet(existing) : null;
  }

  if (existing?.status === "published") {
    return toCombinedBet(existing);
  }

  const now = new Date().toISOString();
  const next: CombinedBetDocument = {
    _id: existing?._id ?? randomUUID(),
    date,
    legs: combinedBet.legs,
    leg_snapshots: combinedBet.legSnapshots,
    combined_odds: combinedBet.combinedOdds,
    combined_estimated_probability: combinedBet.combinedEstimatedProbability,
    combined_edge: combinedBet.combinedEdge,
    confidence: combinedBet.confidence,
    rationale: combinedBet.rationale,
    status: existing?.status === "hidden" ? "hidden" : "pending",
    created_at: existing?.created_at ?? now,
    updated_at: now
  };

  await db.collection<CombinedBetDocument>("combined_bets").updateOne(
    { date },
    { $set: next },
    { upsert: true }
  );

  return toCombinedBet(next);
}

export async function getCombinedBetByDate(date: string) {
  const db = await getDb();
  const document = await db.collection<CombinedBetDocument>("combined_bets").findOne({ date });
  return document ? toCombinedBet(document) : null;
}

export async function publishCombinedBet(date: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection<CombinedBetDocument>("combined_bets").updateOne(
    { date },
    { $set: { status: "published", updated_at: now } }
  );
}

export async function hideCombinedBet(date: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection<CombinedBetDocument>("combined_bets").updateOne(
    { date },
    { $set: { status: "hidden", updated_at: now } }
  );
}

export async function getSourceHealth() {
  const db = await getDb();
  return db.collection<SourceHealthDocument>("source_health").find({}).sort({ source_key: 1 }).toArray();
}

export async function getRecentScrapeRuns() {
  const db = await getDb();
  return db.collection<ScrapeRunDocument>("scrape_runs").find({}).sort({ created_at: -1 }).limit(20).toArray();
}

function isoCutoff(referenceDate: string, retentionDays: number, endOfDay = false) {
  const base = new Date(`${referenceDate}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  base.setUTCDate(base.getUTCDate() - Math.max(0, retentionDays));
  return base.toISOString();
}

export async function cleanupOperationalData(referenceDate: string) {
  const settings = await getSettings();
  const db = await getDb();
  const rawCutoff = isoCutoff(referenceDate, settings.rawDataRetentionDays);
  const eventCutoff = isoCutoff(referenceDate, settings.rawDataRetentionDays, true);
  const scrapeCutoff = isoCutoff(referenceDate, settings.scrapeRunRetentionDays);

  const [scrapeRunsResult, oddsResult, modelScoresResult, candidatesResult, combinedBetsResult] = await Promise.all([
    db.collection<ScrapeRunDocument>("scrape_runs").deleteMany({ created_at: { $lt: scrapeCutoff } }),
    db.collection("odds_snapshots").deleteMany({ collected_at_utc: { $lt: rawCutoff } }),
    db.collection("model_scores").deleteMany({ computed_at: { $lt: rawCutoff } }),
    db.collection<CandidateDocument>("candidate_picks").deleteMany({
      status: { $ne: "published" },
      created_at: { $lt: rawCutoff }
    }),
    db.collection<CombinedBetDocument>("combined_bets").deleteMany({
      status: { $ne: "published" },
      date: { $lt: referenceDate }
    })
  ]);

  const publishedCandidates = await db
    .collection<CandidateDocument>("candidate_picks")
    .find({ status: "published" }, { projection: { event_id: 1 } })
    .toArray();

  const keepEventIds = publishedCandidates.map((candidate) => candidate.event_id);
  const eventDeleteFilter = keepEventIds.length
    ? { start_time_utc: { $lt: eventCutoff }, _id: { $nin: keepEventIds } }
    : { start_time_utc: { $lt: eventCutoff } };

  const eventsResult = await db.collection<EventDocument>("events").deleteMany(eventDeleteFilter);

  return {
    removedScrapeRuns: scrapeRunsResult.deletedCount ?? 0,
    removedOddsSnapshots: oddsResult.deletedCount ?? 0,
    removedModelScores: modelScoresResult.deletedCount ?? 0,
    removedCandidates: candidatesResult.deletedCount ?? 0,
    removedCombinedBets: combinedBetsResult.deletedCount ?? 0,
    removedEvents: eventsResult.deletedCount ?? 0
  };
}

export async function getEventsForDate(date: string): Promise<EventRecord[]> {
  const db = await getDb();
  const documents = await db
    .collection<EventDocument>("events")
    .find({
      start_time_utc: {
        $gte: `${date}T00:00:00.000Z`,
        $lte: `${date}T23:59:59.999Z`
      }
    })
    .sort({ start_time_utc: 1 })
    .toArray();

  return documents.map(toEventRecord);
}

export async function getOddsForEvent(eventId: string) {
  const db = await getDb();
  return db
    .collection("odds_snapshots")
    .find({ event_id: eventId })
    .sort({ collected_at_utc: -1 })
    .toArray();
}
