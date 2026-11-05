"use client";
import React, { useCallback, useEffect, useState } from "react";
import { CalendarCheck2, CheckCircle2, Hourglass, AlertTriangle, Flame, Lightbulb, Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Task } from "@/lib/types";
import { PRIORITY_ORDER } from "@/lib/types";
import { dhakaTodayClient, dhakaTomorrowClient, greetingForHour } from "@/lib/clientDates";
import TaskRow from "@/components/TaskRow";
import TaskModal from "@/components/TaskModal";
import { Card, EmptyState, Spinner } from "@/components/ui";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcoming, setUpcoming] = useState<Task[]>([]);
  const [allOpen, setAllOpen] = useState<Task[]>([]);
  const [editing, setEditing] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const today = dhakaTodayClient();

  const load = useCallback(async () => {
    const [s, t, u, o] = await Promise.all([
      api("/api/stats"), api("/api/tasks?due=today&sort=order"),
      api("/api/tasks?due=upcoming&sort=deadline"), api("/api/tasks"),
    ]);
    setStats(s.stats); setTodayTasks(t.tasks); setUpcoming(u.tasks.slice(0, 8));
    setAllOpen(o.tasks.filter((x: Task) => x.status !== "COMPLETED"));
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
    const h = () => load();
    window.addEventListener("tf:refresh", h);
    return () => window.removeEventListener("tf:refresh", h);
  }, [load]);

  if (loading) return <Spinner />;

  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", hour12: false }).format(new Date()));
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });

  const suggestions = [...allOpen].sort((a, b) => {
    const ao = a.dueDate && a.dueDate < today ? 0 : 1, bo = b.dueDate && b.dueDate < today ? 0 : 1;
    if (ao !== bo) return ao - bo;
    const pr = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pr) return pr;
    return String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999"));
  }).slice(0, 4);
  const reason = (t: Task) =>
    t.dueDate && t.dueDate < today ? "Overdue" : t.priority === "URGENT" || t.priority === "HIGH" ? `${t.priority.toLowerCase()} priority` : t.dueDate ? `Due ${t.dueDate}` : "No deadline — clear it from Inbox";

  const cards = [
    { label: "Today's Tasks", value: stats.todayTotal, icon: CalendarCheck2 },
    { label: "Completed", value: stats.todayCompleted, icon: CheckCircle2 },
    { label: "Pending", value: stats.todayPending, icon: Hourglass },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greetingForHour(hour)}, Boss</h1>
          <p className="mt-1 text-sm text-mute">{dateLabel} · {stats.dailyRate}% of today done. Small steps, every day.</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110">
          <Plus size={16} /> New task
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-mute">{label}</span>
              <Icon size={17} className={label === "Overdue" && value > 0 ? "text-red-400" : "text-accent"} />
            </div>
            <p className={`mt-2 text-3xl font-bold ${label === "Overdue" && value > 0 ? "text-red-400" : ""}`}>{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-base font-semibold">Today&apos;s Focus</h2>
            {todayTasks.length === 0
              ? <EmptyState title="Nothing scheduled for today" hint="Add a task, or plan ahead on the Tomorrow page." />
              : <div className="space-y-2">{todayTasks.map((t) => <TaskRow key={t.id} task={t} today={today} onEdit={(x) => { setEditing(x); setModalOpen(true); }} onChanged={load} />)}</div>}
          </section>
          <section>
            <h2 className="mb-3 text-base font-semibold">Upcoming</h2>
            {upcoming.length === 0
              ? <EmptyState title="No upcoming tasks" hint="Future-you says thanks." />
              : <div className="space-y-2">{upcoming.map((t) => <TaskRow key={t.id} task={t} today={today} onEdit={(x) => { setEditing(x); setModalOpen(true); }} onChanged={load} />)}</div>}
          </section>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">Productivity summary</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Today" value={`${stats.dailyRate}%`} bar={stats.dailyRate} />
              <Row label="This week" value={`${stats.weeklyRate}%`} bar={stats.weeklyRate} />
              <div className="flex justify-between pt-1"><span className="text-mute">Completed this week</span><span className="font-semibold">{stats.completedWeek}</span></div>
              <div className="flex justify-between"><span className="text-mute">Streak</span><span className="flex items-center gap-1 font-semibold"><Flame size={14} className="text-accent" /> {stats.streak} day{stats.streak === 1 ? "" : "s"}</span></div>
              <div className="flex justify-between"><span className="text-mute">Tomorrow</span><span className="font-semibold">{dhakaTomorrowClient()}</span></div>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-mute"><Lightbulb size={15} className="text-accent" /> Smart suggestions</h3>
            <p className="mt-1 text-xs text-mute">Ranked by overdue → priority → deadline. Suggestions only — nothing changes automatically.</p>
            <div className="mt-3 space-y-2.5">
              {suggestions.length === 0 && <p className="text-sm text-mute">All clear. Nothing pending.</p>}
              {suggestions.map((t) => (
                <div key={t.id} className="rounded-xl border border-line bg-panel2 px-3 py-2.5">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-accent">{reason(t)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} task={editing} defaults={{ dueDate: today }} onSaved={load} />
    </div>
  );
}

function Row({ label, value, bar }: { label: string; value: string; bar: number }) {
  return (
    <div>
      <div className="flex justify-between"><span className="text-mute">{label} completion</span><span className="font-semibold">{value}</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${bar}%` }} /></div>
    </div>
  );
}
