import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth/session";
import { verifyUser } from "@/lib/db/index";

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/tips");

  if (!(await verifyUser(username, password))) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  const token = await createSessionToken(username);
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set("tip_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/"
  });
  return response;
}
