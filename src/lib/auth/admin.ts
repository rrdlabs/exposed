import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const ADMIN_COOKIE = "exposed_admin";
const NONCE = "admin";

function sign(value: string): string {
  return createHmac("sha256", env.adminToken).update(value).digest("base64url");
}

function isValid(token: string | undefined): boolean {
  if (!token) return false;
  const [value, signature] = token.split(".");
  if (!value || value !== NONCE || !signature) return false;

  const provided = Buffer.from(signature);
  const expected = Buffer.from(sign(NONCE));
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export function adminTokenMatches(candidate: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(env.adminToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function setAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, `${NONCE}.${sign(NONCE)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86_400,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isValid(store.get(ADMIN_COOKIE)?.value);
}
