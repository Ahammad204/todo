import { prisma } from "./prisma";
import { addDays, dhakaDayStartUtc, dhakaToday } from "./dates";

export async function computeStats(userId: string, dateStr?: string) {
  const today = dateStr || dhakaToday();
  const weekStart = addDays(today, -6); // last 7 days incl. today, for weekly rate/chart window start
  // ISO week-ish: use Monday of this week based on the date
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 Sun
  const monday = addDays(today, -((dow + 6) % 7));
  const monthStart = today.slice(0, 7) + "-01";

  const [todayTasks, allOpen, overdueTasks, completed] = await Promise.all([
    prisma.task.findMany({ where: { userId, dueDate: today, archivedAt: null } }),
    prisma.task.findMany({ where: { userId, archivedAt: null, status: { not: "COMPLETED" } } }),
    prisma.task.findMany({ where: { userId, archivedAt: null, status: { not: "COMPLETED" }, dueDate: { lt: today, not: null } } }),
    prisma.task.findMany({ where: { userId, status: "COMPLETED", completedAt: { not: null } }, select: { completedAt: true, categoryId: true } }),
  ]);

  const inRange = (iso: Date, from: string, toExclusive: string) =>
    iso >= dhakaDayStartUtc(from) && iso < dhakaDayStartUtc(toExclusive);

  const completedToday = completed.filter((t) => t.completedAt && inRange(t.completedAt, today, addDays(today, 1))).length;
  const completedWeek = completed.filter((t) => t.completedAt && inRange(t.completedAt, monday, addDays(today, 1))).length;
  const completedMonth = completed.filter((t) => t.completedAt && inRange(t.completedAt, monthStart, addDays(today, 1))).length;

  const todayTotal = todayTasks.length;
  const todayCompleted = todayTasks.filter((t) => t.status === "COMPLETED").length;
  const dailyRate = todayTotal ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const weekTasks = await prisma.task.findMany({
    where: { userId, archivedAt: null, dueDate: { gte: monday, lte: today } },
  });
  const weekDone = weekTasks.filter((t) => t.status === "COMPLETED").length;
  const weeklyRate = weekTasks.length ? Math.round((weekDone / weekTasks.length) * 100) : 0;

  // Streak: consecutive days ending today (or yesterday if today has none yet) with >=1 completion.
  const daysWithCompletion = new Set(
    completed.filter((t) => t.completedAt).map((t) => dhakaToday(t.completedAt as Date))
  );
  let streak = 0;
  let cursor = today;
  if (!daysWithCompletion.has(cursor)) cursor = addDays(cursor, -1);
  while (daysWithCompletion.has(cursor)) { streak++; cursor = addDays(cursor, -1); }

  // Last 7 days chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return { date: d, completed: completed.filter((t) => t.completedAt && dhakaToday(t.completedAt) === d).length };
  });

  // Category distribution (open + completed, non-archived)
  const cats = await prisma.category.findMany({ where: { userId } });
  const allTasks = await prisma.task.findMany({ where: { userId, archivedAt: null }, select: { categoryId: true, status: true } });
  const distribution = cats.map((c) => ({
    id: c.id, name: c.name, color: c.color, icon: c.icon,
    total: allTasks.filter((t) => t.categoryId === c.id).length,
    completed: allTasks.filter((t) => t.categoryId === c.id && t.status === "COMPLETED").length,
  }));
  const uncategorized = allTasks.filter((t) => !t.categoryId).length;
  if (uncategorized) distribution.push({ id: "none", name: "No category", color: "#71717A", icon: "folder", total: uncategorized, completed: allTasks.filter((t) => !t.categoryId && t.status === "COMPLETED").length });

  return {
    date: today,
    todayTotal, todayCompleted,
    todayPending: todayTotal - todayCompleted,
    overdue: overdueTasks.length,
    dailyRate, weeklyRate,
    completedToday, completedWeek, completedMonth,
    streak, last7, distribution,
    openCount: allOpen.length,
  };
}

export async function buildReport(userId: string, dateStr?: string) {
  const today = dateStr || dhakaToday();
  const tomorrow = addDays(today, 1);
  const include = { category: true };
  const shape = (t: any) => ({
    id: t.id, title: t.title, priority: t.priority, status: t.status,
    category: t.category?.name ?? null, dueDate: t.dueDate, dueTime: t.dueTime,
    estimatedDuration: t.estimatedDuration,
  });
  const [tomorrowTasks, pendingToday, overdue] = await Promise.all([
    prisma.task.findMany({ where: { userId, dueDate: tomorrow, archivedAt: null, status: { not: "COMPLETED" } }, include, orderBy: [{ dueTime: "asc" }, { sortOrder: "asc" }] }),
    prisma.task.findMany({ where: { userId, dueDate: today, archivedAt: null, status: { not: "COMPLETED" } }, include, orderBy: { sortOrder: "asc" } }),
    prisma.task.findMany({ where: { userId, archivedAt: null, status: { not: "COMPLETED" }, dueDate: { lt: today, not: null } }, include, orderBy: { dueDate: "asc" } }),
  ]);
  const rank: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const candidates = [...overdue, ...tomorrowTasks, ...pendingToday].sort((a, b) => (rank[a.priority] - rank[b.priority]) || String(a.dueDate).localeCompare(String(b.dueDate)));
  return {
    date: today, tomorrowDate: tomorrow,
    tomorrow: tomorrowTasks.map(shape),
    pendingToday: pendingToday.map(shape),
    overdue: overdue.map(shape),
    topPriority: candidates.length ? shape(candidates[0]) : null,
  };
}
