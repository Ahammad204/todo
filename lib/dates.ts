// All date logic is anchored to Asia/Dhaka. Dates are stored as "YYYY-MM-DD" strings.
export const TZ = "Asia/Dhaka";

export function dhakaToday(from = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(from);
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function dhakaTomorrow(from = new Date()): string {
  return addDays(dhakaToday(from), 1);
}

// Start (UTC instant) of a Dhaka calendar day, for comparing against completedAt timestamps.
export function dhakaDayStartUtc(dateStr: string): Date {
  // Dhaka is UTC+6 year-round (no DST).
  return new Date(`${dateStr}T00:00:00+06:00`);
}

export function dhakaHour(from = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(from));
}

export function advanceRecurrence(dateStr: string, recurrence: string): string {
  if (recurrence === "DAILY") return addDays(dateStr, 1);
  if (recurrence === "WEEKLY") return addDays(dateStr, 7);
  if (recurrence === "MONTHLY") {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m, d)); // m is 1-based here -> next month
    // clamp day
    const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
    dt.setUTCDate(Math.min(d, last));
    return dt.toISOString().slice(0, 10);
  }
  return dateStr;
}

export function prettyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}
