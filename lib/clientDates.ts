// Client-side mirrors of the Dhaka date helpers (display only; server is source of truth).
export function dhakaTodayClient(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function addDaysClient(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export function dhakaTomorrowClient(): string {
  return addDaysClient(dhakaTodayClient(), 1);
}
export function greetingForHour(h: number): string {
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Winding down";
}
