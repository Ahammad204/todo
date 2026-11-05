"use client";
import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CalendarRange, CalendarDays, Gauge, AlertTriangle, Flame, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import type { Task } from "@/lib/types";
import { dhakaTodayClient } from "@/lib/clientDates";
import { Card, Spinner } from "@/components/ui";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [open, setOpen] = useState<Task[]>([]);
  const today = dhakaTodayClient();
  const isSunday = new Date(`${today}T12:00:00Z`).getUTCDay() === 0;

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([api("/api/stats"), api("/api/tasks")]);
    setStats(s.stats);
    setOpen(t.tasks.filter((x: Task) => x.status !== "COMPLETED"));
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);
  if (!stats) return <Spinner />;

  const maxDay = Math.max(1, ...stats.last7.map((d: any) => d.completed));
  const maxCat = Math.max(1, ...stats.distribution.map((d: any) => d.total));
  const topCat = [...stats.distribution].sort((a: any, b: any) => b.total - a.total)[0];
  const overdueOpen = open.filter((t) => t.dueDate && t.dueDate < today);

  const cards = [
    { label: "Completed today", value: stats.completedToday, icon: CheckCircle2 },
    { label: "Completed this week", value: stats.completedWeek, icon: CalendarRange },
    { label: "Completed this month", value: stats.completedMonth, icon: CalendarDays },
    { label: "Overall completion (today)", value: `${stats.dailyRate}%`, icon: Gauge },
    { label: "Overdue tasks", value: stats.overdue, icon: AlertTriangle },
    { label: "Current streak", value: `${stats.streak}d`, icon: Flame },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-mute">{label}</span>
              <Icon size={16} className="text-accent" />
            </div>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">Completions — last 7 days</h3>
          <div className="mt-5 flex h-40 items-end gap-2">
            {stats.last7.map((d: any) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-semibold">{d.completed}</span>
                <div className="w-full rounded-t-lg bg-accent/85 transition-all" style={{ height: `${Math.max(4, (d.completed / maxDay) * 110)}px` }} />
                <span className="text-[10px] text-mute">{new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "narrow", timeZone: "UTC" })}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">Category distribution</h3>
          <div className="mt-4 space-y-3">
            {stats.distribution.length === 0 && <p className="text-sm text-mute">No categories yet.</p>}
            {stats.distribution.map((d: any) => (
              <div key={d.id}>
                <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span><span className="text-mute">{d.completed}/{d.total} done</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full" style={{ width: `${(d.total / maxCat) * 100}%`, background: d.color }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-mute"><ClipboardList size={15} className="text-accent" /> Weekly review {isSunday && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-black">SUNDAY</span>}</h3>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <p><span className="text-mute">Completed this week:</span> <strong>{stats.completedWeek}</strong></p>
          <p><span className="text-mute">Still pending:</span> <strong>{open.length}</strong></p>
          <p><span className="text-mute">Overdue right now:</span> <strong>{overdueOpen.length}</strong></p>
          <p><span className="text-mute">Most attention:</span> <strong>{topCat ? `${topCat.name} (${topCat.total} tasks)` : "—"}</strong></p>
        </div>
        <p className="mt-3 rounded-xl bg-panel2 px-3.5 py-2.5 text-sm">
          Next week: {overdueOpen.length > 0
            ? `clear the ${overdueOpen.length} overdue task${overdueOpen.length === 1 ? "" : "s"} first, then protect the ${stats.streak}-day streak with one small completion a day.`
            : `no overdue backlog — keep the ${stats.streak}-day streak alive with one small completion a day and plan tomorrow each night.`}
        </p>
      </Card>
    </div>
  );
}
