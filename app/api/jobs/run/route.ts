import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { runDailyPipeline } from "@/lib/pipeline/run-daily-pipeline";
import { getSettings, getCandidatePicks, publishCandidate } from "@/lib/db/index";
import { startOfTodayLisbon } from "@/lib/utils/date";
import { confidenceToNumeric } from "@/lib/utils/math";

export async function POST(request: Request) {
  await requireSession();
  const date = startOfTodayLisbon();
  const result = await runDailyPipeline(date);

  const settings = await getSettings();
  if (settings.publishMode === "automatic") {
    const picks = await getCandidatePicks();
    for (const pick of picks) {
      if (pick.status === "pending" && confidenceToNumeric(pick.confidence) >= settings.minConfidenceScore) {
        await publishCandidate(pick.id, date);
      }
    }
  }

  console.log("pipeline result", result);
  return NextResponse.redirect(new URL("/admin/candidates", request.url), 303);
}
