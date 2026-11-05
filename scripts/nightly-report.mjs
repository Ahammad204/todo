// TASKFLOW nightly report — fallback integration for the Muse 11 PM automation.
// Reads the database directly via @prisma/client and prints the same JSON
// shape as GET /api/report. Usage: node scripts/nightly-report.mjs [YYYY-MM-DD]
// Run from the project root so .env resolves correctly (DATABASE_URL must
// point at the MongoDB Atlas cluster).
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.DATABASE_URL) {
  console.log(JSON.stringify({ error: "DATABASE_URL is not set — it must be the MongoDB Atlas connection string (see .env)" }));
  process.exit(1);
}
const prisma = new PrismaClient();

const TZ = "Asia/Dhaka";
function dhakaToday(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function addDays(s, n) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const today = process.argv[2] || dhakaToday();
const tomorrow = addDays(today, 1);

const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
if (!user) { console.log(JSON.stringify({ error: "no user — run prisma db seed first" })); process.exit(1); }

const shape = (t) => ({
  id: t.id, title: t.title, priority: t.priority, status: t.status,
  category: t.category?.name ?? null, dueDate: t.dueDate, dueTime: t.dueTime,
  estimatedDuration: t.estimatedDuration,
});
const include = { category: true };
const base = { userId: user.id, archivedAt: null, status: { not: "COMPLETED" } };

const [tomorrowTasks, pendingToday, overdue] = await Promise.all([
  prisma.task.findMany({ where: { ...base, dueDate: tomorrow }, include, orderBy: [{ dueTime: "asc" }, { sortOrder: "asc" }] }),
  prisma.task.findMany({ where: { ...base, dueDate: today }, include, orderBy: { sortOrder: "asc" } }),
  prisma.task.findMany({ where: { ...base, dueDate: { lt: today, not: null } }, include, orderBy: { dueDate: "asc" } }),
]);

const rank = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const candidates = [...overdue, ...tomorrowTasks, ...pendingToday]
  .sort((a, b) => (rank[a.priority] - rank[b.priority]) || String(a.dueDate).localeCompare(String(b.dueDate)));

console.log(JSON.stringify({
  date: today, tomorrowDate: tomorrow,
  tomorrow: tomorrowTasks.map(shape),
  pendingToday: pendingToday.map(shape),
  overdue: overdue.map(shape),
  topPriority: candidates.length ? shape(candidates[0]) : null,
}, null, 2));

await prisma.$disconnect();
