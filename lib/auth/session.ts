import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";
import { createSession, deleteSession, getSession } from "@/lib/db/index";

const SESSION_COOKIE = "tip_session";

export async function createSessionToken(username: string) {
  const token = randomUUID();
  await createSession(token, username, addDays(new Date(), 7).toISOString());
  return token;
}

export async function clearSessionCookie() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await deleteSession(token);
  }
  cookies().delete(SESSION_COOKIE);
}

export async function requireSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    redirect("/login");
  }

  const session = await getSession(token);
  if (!session || new Date(session.expires_at) < new Date()) {
    redirect("/login");
  }

  return session;
}
