import { createHash } from "crypto";

export function authToken(): string {
  const pw = process.env.APP_PASSWORD || "taskflow-change-me";
  return createHash("sha256").update(pw).digest("hex");
}

export function checkPassword(pw: string): boolean {
  return createHash("sha256").update(pw).digest("hex") === authToken();
}
