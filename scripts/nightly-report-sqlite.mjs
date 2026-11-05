// TASKFLOW nightly report — SQLite fallback (no Prisma, no network).
// Reads prisma/taskflow.db directly via node:sqlite and prints the same JSON
// shape as scripts/nightly-report.mjs / GET /api/report.
// Usage: node scripts/nightly-report-sqlite.mjs [YYYY-MM-DD]
// Run from the project root. Read-only: never writes, completes, or moves tasks.
import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const db = new DatabaseSync(path.join(root, "prisma", "taskflow.db"), { readOnly: true });

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

const user = db.prepare("SELECT id FROM User ORDER BY createdAt ASC LIMIT 1").get();
if (!user) { console.log(JSON.stringify({ error: "no user — run prisma db seed first" })); process.exit(1); }

const shape = (t) => ({
  id: t.id, title: t.title, priority: t.priority, status: t.status,
  category: t.categoryName ?? null, dueDate: t.dueDate, dueTime: t.dueTime,
  estimatedDuration: t.estimatedDuration,
});
const q = `
  SELECT Task.*, Category.name AS categoryName FROM Task
  LEFT JOIN Category ON Category.id = Task.categoryId
  WHERE Task.userId = ? AND Task.archivedAt IS NULL AND Task.status != 'COMPLETED'
`;
const byDate = (date) => db.prepare(q + " AND Task.dueDate = ? ORDER BY Task.dueTime ASC, Task.sortOrder ASC").all(user.id, date);
const overdue = db.prepare(q + " AND Task.dueDate IS NOT NULL AND Task.dueDate < ? ORDER BY Task.dueDate ASC").all(user.id, today);

const tomorrowTasks = byDate(tomorrow);
const pendingToday = byDate(today);
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
db.close();
