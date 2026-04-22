import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { hideCandidate } from "@/lib/db/index";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  await requireSession();
  await hideCandidate(params.id);
  return NextResponse.redirect(new URL("/admin/candidates", request.url), 303);
}
