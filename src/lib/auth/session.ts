import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { newId } from "@/lib/util/id";
import { SESSION_COOKIE } from "./constants";

const COOKIE_NAME = SESSION_COOKIE;
const SESSION_TTL_MS = 30 * 86_400_000;

function sign(value: string): string {
  return createHmac("sha256", env.sessionSecret).update(value).digest("base64url");
}

function serialize(sessionId: string): string {
  return `${sessionId}.${sign(sessionId)}`;
}

function parse(token: string | undefined): string | null {
  if (!token) return null;
  const index = token.lastIndexOf(".");
  if (index <= 0) return null;

  const sessionId = token.slice(0, index);
  const provided = Buffer.from(token.slice(index + 1));
  const expected = Buffer.from(sign(sessionId));

  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? sessionId : null;
}

export async function createSession(userId: string): Promise<string> {
  const id = newId("ses_");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({ id, userId, expiresAt });

  const store = await cookies();
  store.set(COOKIE_NAME, serialize(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return id;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const sessionId = parse(store.get(COOKIE_NAME)?.value);

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const sessionId = parse(store.get(COOKIE_NAME)?.value);
  if (!sessionId) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0]?.user ?? null;
}

export function sessionCookieName(): string {
  return COOKIE_NAME;
}

export function newCsrfToken(): string {
  return randomBytes(16).toString("base64url");
}
