import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { parseSoccerVistaDailyEvents } from "@/lib/adapters/soccervista-fixture-adapter";
import { parseSoccerVistaOddsPayload } from "@/lib/adapters/soccervista-odds-adapter";

describe("live payload parsers", () => {
  it("parses SoccerVista daily events", () => {
    const payload = readFileSync(join(process.cwd(), "tests/fixtures/soccervista-events.json"), "utf8");
    const events = parseSoccerVistaDailyEvents(payload);
    expect(events).toHaveLength(2);
    expect(events[0]?.homeTeam).toBe("Brighton");
    expect(events[0]?.context.predictionOu).toBe("O");
  });

  it("parses SoccerVista odds payloads", () => {
    const payload = readFileSync(join(process.cwd(), "tests/fixtures/soccervista-odds.json"), "utf8");
    const odds = parseSoccerVistaOddsPayload(payload);
    expect(odds).toHaveLength(8);
    expect(odds[0]?.odds).toBe(2.55);
    expect(odds.some((row) => row.marketKey === "under_2_5")).toBe(true);
    expect(odds.some((row) => row.marketKey === "double_chance_1x")).toBe(true);
  });
});
