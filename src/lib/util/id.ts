import { randomBytes } from "node:crypto";

export function newId(prefix = ""): string {
  return `${prefix}${randomBytes(12).toString("hex")}`;
}

export function nowMs(): number {
  return Date.now();
}
