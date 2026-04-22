import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getSettings, updateSettings } from "@/lib/db/index";

export async function POST(request: Request) {
  await requireSession();
  const current = await getSettings();
  const formData = await request.formData();

  await updateSettings({
    enabledSports: ["football"],
    enabledSources: String(formData.get("enabledSources") ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    minEdgePercent: Number(formData.get("minEdgePercent") ?? current.minEdgePercent),
    maxEdgePercent: Number(formData.get("maxEdgePercent") ?? current.maxEdgePercent),
    minConfidenceScore: Number(formData.get("minConfidenceScore") ?? current.minConfidenceScore),
    scrapeCadenceMinutes: Number(formData.get("scrapeCadenceMinutes") ?? current.scrapeCadenceMinutes),
    rawDataRetentionDays: Number(formData.get("rawDataRetentionDays") ?? current.rawDataRetentionDays),
    scrapeRunRetentionDays: Number(formData.get("scrapeRunRetentionDays") ?? current.scrapeRunRetentionDays),
    publishMode: String(formData.get("publishMode") ?? current.publishMode) as "manual" | "automatic",
    combinedBetEnabled: String(formData.get("combinedBetEnabled") ?? current.combinedBetEnabled) === "true",
    combinedBetMaxLegs: Number(formData.get("combinedBetMaxLegs") ?? current.combinedBetMaxLegs) === 3 ? 3 : 2,
    combinedBetMinLegConfidence: Number(formData.get("combinedBetMinLegConfidence") ?? current.combinedBetMinLegConfidence),
    timezone: current.timezone
  });

  return NextResponse.redirect(new URL("/admin/settings", request.url), 303);
}
