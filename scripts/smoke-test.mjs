// TASKFLOW end-to-end smoke test. Requires the prod server running (default http://localhost:3100)
// and REPORT_TOKEN in the environment or ../.env. Usage: node scripts/smoke-test.mjs
import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const env = {};
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) env[m[1]] = m[2];
  }
}
const BASE = process.env.SMOKE_BASE || "http://localhost:3100";
const token = createHash("sha256").update(env.APP_PASSWORD || "taskflow-change-me").digest("hex");
const cookie = `tf_auth=${token}`;
const reportToken = process.env.REPORT_TOKEN || env.REPORT_TOKEN;

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} ${extra}`); }
}
async function req(method, url, body, headers = {}) {
  const res = await fetch(`${BASE}${url}`, {
    method, headers: { "Content-Type": "application/json", Cookie: cookie, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const TZ = "Asia/Dhaka";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const tomorrow = addDays(today, 1);
const yesterday = addDays(today, -1);

const cats = (await req("GET", "/api/categories")).data.categories || [];
check("seed: 8 default categories exist", cats.length === 8, `got ${cats.length}`);
const tectonic = cats.find((c) => c.name === "Tectonic");
const university = cats.find((c) => c.name === "University");

// 1. Create task due tomorrow, HIGH
let r = await req("POST", "/api/tasks", { title: "SMOKE tomorrow task", priority: "HIGH", dueDate: tomorrow, dueTime: "09:00", categoryId: tectonic?.id, estimatedDuration: 45 });
check("create task (due tomorrow, HIGH)", r.res.status === 201 && r.data.task?.dueDate === tomorrow, JSON.stringify(r.data));
const t1 = r.data.task;

// 2. Edit it
r = await req("PATCH", `/api/tasks/${t1.id}`, { title: "SMOKE tomorrow task edited", priority: "URGENT" });
check("edit task", r.data.task?.title === "SMOKE tomorrow task edited" && r.data.task?.priority === "URGENT");

// 3. Stats before completion
let stats = (await req("GET", "/api/stats")).data.stats;
const completedBefore = stats.completedToday;

// 4. Complete it -> completedAt set
r = await req("PATCH", `/api/tasks/${t1.id}`, { status: "COMPLETED" });
check("complete task sets completedAt", r.data.task?.status === "COMPLETED" && !!r.data.task?.completedAt);

// 5. Stats move
stats = (await req("GET", "/api/stats")).data.stats;
check("stats: completedToday increased", stats.completedToday === completedBefore + 1, `${completedBefore} -> ${stats.completedToday}`);

// 6. Reopen -> completedAt cleared
r = await req("PATCH", `/api/tasks/${t1.id}`, { status: "TODO" });
check("reopen task clears completedAt", r.data.task?.status === "TODO" && !r.data.task?.completedAt);

// 7. Second task in another category, due today + one overdue
r = await req("POST", "/api/tasks", { title: "SMOKE today uni task", priority: "MEDIUM", dueDate: today, categoryId: university?.id });
check("create second task (University, today)", r.res.status === 201);
const t2 = r.data.task;
r = await req("POST", "/api/tasks", { title: "SMOKE overdue task", priority: "LOW", dueDate: yesterday });
const t3 = r.data.task;
check("create overdue task (yesterday)", r.res.status === 201);

// 8. Filter by category
r = await req("GET", `/api/tasks?categoryId=${university?.id}`);
check("filter by category", r.data.tasks?.some((t) => t.id === t2.id) && r.data.tasks.every((t) => t.categoryId === university?.id));

// 9. Report (with token): tomorrow lists t1, pendingToday has t2, overdue has t3
r = await req("GET", "/api/report", undefined, { "x-report-token": reportToken });
check("report: date is Dhaka today", r.data.date === today, `got ${r.data.date}, want ${today}`);
check("report: tomorrow task under tomorrow", r.data.tomorrow?.some((t) => t.id === t1.id));
check("report: unfinished today task under pendingToday", r.data.pendingToday?.some((t) => t.id === t2.id));
check("report: overdue task listed", r.data.overdue?.some((t) => t.id === t3.id));
check("report: topPriority is the URGENT tomorrow task", r.data.topPriority?.id === t1.id, JSON.stringify(r.data.topPriority));

// 10. Report without token -> 401
{
  const res = await fetch(`${BASE}/api/report`);
  check("report: rejects missing token (401)", res.status === 401);
}

// 11. Complete t2, verify it leaves pendingToday
await req("PATCH", `/api/tasks/${t2.id}`, { status: "COMPLETED" });
r = await req("GET", "/api/report", undefined, { "x-report-token": reportToken });
check("report: completed today task NOT in pendingToday", !r.data.pendingToday?.some((t) => t.id === t2.id));

// 12. Recurrence: complete a daily task -> next occurrence tomorrow-ish
r = await req("POST", "/api/tasks", { title: "SMOKE daily", recurrence: "DAILY", dueDate: today });
const rd = r.data.task;
r = await req("PATCH", `/api/tasks/${rd.id}`, { status: "COMPLETED" });
check("recurrence: completing daily task spawns next occurrence", !!r.data.nextOccurrence && r.data.nextOccurrence.dueDate === tomorrow && r.data.nextOccurrence.status === "TODO", JSON.stringify(r.data.nextOccurrence));
if (r.data.nextOccurrence) await req("DELETE", `/api/tasks/${r.data.nextOccurrence.id}`);
await req("DELETE", `/api/tasks/${rd.id}`);

// 13. Duplicate (compare against the task's current, edited title)
const currentT1 = (await req("GET", "/api/tasks?search=SMOKE%20tomorrow")).data.tasks?.find((t) => t.id === t1.id);
r = await req("POST", `/api/tasks/${t1.id}/duplicate`);
check("duplicate task", r.res.status === 201 && r.data.task?.title === currentT1?.title && r.data.task.id !== t1.id);
const dup = r.data.task;

// 14. Archive (dup disappears from default list, appears with includeArchived)
r = await req("POST", `/api/tasks/${dup.id}/archive`);
check("archive task", !!r.data.task?.archivedAt);
r = await req("GET", "/api/tasks?search=SMOKE");
check("archived hidden by default", !r.data.tasks?.some((t) => t.id === dup.id));
r = await req("GET", "/api/tasks?search=SMOKE&includeArchived=1");
check("archived visible with includeArchived", r.data.tasks?.some((t) => t.id === dup.id));

// 15. Subtasks
r = await req("POST", `/api/tasks/${t1.id}/subtasks`, { title: "SMOKE subtask" });
check("create subtask", r.res.status === 201);
const sub = r.data.subtask;
r = await req("PATCH", `/api/subtasks/${sub.id}`, { completed: true });
check("complete subtask", r.data.subtask?.completed === true);

// 16. Delete cleanup
for (const id of [dup.id, t1.id, t2.id, t3.id]) await req("DELETE", `/api/tasks/${id}`);
r = await req("GET", "/api/tasks?search=SMOKE&includeArchived=1");
check("delete tasks (cleanup verified)", (r.data.tasks || []).length === 0, `left ${(r.data.tasks || []).length}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
