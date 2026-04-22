import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { publishCombinedBet } from "@/lib/db/index";

export async function POST(request: Request, { params }: { params: { date: string } }) {
  await requireSession();
  await publishCombinedBet(params.date);
  return NextResponse.redirect(new URL("/admin/candidates", request.url), 303);
}
