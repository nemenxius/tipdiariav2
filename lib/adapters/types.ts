import type { EventRecord, MarketOdds, SportKey } from "@/lib/types";

export interface SourceFetchOptions {
  date: string;
  enabledSports: SportKey[];
}

export interface FixtureSourceAdapter {
  sourceKey: string;
  selectorVersion: string;
  fetchDailyEvents(options: SourceFetchOptions): Promise<EventRecord[]>;
}

export interface OddsSourceAdapter {
  sourceKey: string;
  selectorVersion: string;
  fetchDailyOdds(options: SourceFetchOptions): Promise<MarketOdds[]>;
}
