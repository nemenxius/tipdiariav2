import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { publishCandidate, updateCandidateStatus } from "@/lib/db/index";
import { startOfTodayLisbon } from "@/lib/utils/date";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  await requireSession();
  await updateCandidateStatus(params.id, "approved");
  await publishCandidate(params.id, startOfTodayLisbon());
  return NextResponse.redirect(new URL("/admin/candidates", request.url), 303);
}
