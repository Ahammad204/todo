"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Plus, Sunrise, AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { api, patchTask } from "@/lib/api";
import type { Task } from "@/lib/types";
import { dhakaTodayClient, dhakaTomorrowClient, addDaysClient } from "@/lib/clientDates";
import TaskRow from "@/components/TaskRow";
import TaskModal from "@/components/TaskModal";
import { Card, EmptyState, Spinner, useToast } from "@/components/ui";

export default function TomorrowPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pending, setPending] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrepare, setShowPrepare] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const today = dhakaTodayClient();
  const tomorrow = dhakaTomorrowClient();
  const tomorrowLabel = new Date(`${tomorrow}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  const load = useCallback(async () => {
    const [t, all] = await Promise.all([api(`/api/tasks?date=${tomorrow}&sort=order`), api("/api/tasks?sort=deadline")]);
    setTasks(t.tasks);
    setPending(all.tasks.filter((x: Task) => x.status !== "COMPLETED" && (x.dueDate === null || (x.dueDate && x.dueDate <= today))));
    setLoading(false);
  }, [tomorrow, today]);

  useEffect(() => {
    load().catch(() => setLoading(false));
    const h = () => load();
    window.addEventListener("tf:refresh", h);
    return () => window.removeEventListener("tf:refresh", h);
  }, [load]);

  if (loading) return <Spinner />;

  const totalMinutes = tasks.reduce((s, t) => s + (t.estimatedDuration || 0), 0);
  const timed = tasks.filter((t) => t.dueTime);
  const timeCounts = new Map<string, number>();
  timed.forEach((t) => timeCounts.set(t.dueTime!, (timeCounts.get(t.dueTime!) || 0) + 1));
  const overlaps = [...timeCounts.entries()].filter(([, n]) => n > 1).map(([time]) => time);
  const timeline = [...tasks].sort((a, b) => String(a.dueTime || "99:99").localeCompare(String(b.dueTime || "99:99")));

  async function moveToTomorrow(t: Task) {
    try {
      await patchTask(t.id, { dueDate: tomorrow });
      toast.push(`Moved "${t.title}" to tomorrow`);
      load();
    } catch (e: any) { toast.push(e.message, "err"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Sunrise className="text-accent" /> Tomorrow</h1>
          <p className="mt-1 text-sm text-mute">{tomorrowLabel} · {tomorrow} · {tasks.length} task{tasks.length === 1 ? "" : "s"} · estimated workload {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPrepare((v) => !v)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-panel2">Prepare Tomorrow</button>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110"><Plus size={16} /> Add to tomorrow</button>
        </div>
      </div>

      {overlaps.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Schedule overlap: {overlaps.map((t) => `${t} has ${timeCounts.get(t)} tasks`).join("; ")}. Consider moving one to a different time slot.</span>
        </div>
      )}

      {showPrepare && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">Prepare Tomorrow — review &amp; move</h3>
          <p className="mt-1 text-xs text-mute">Unfinished tasks from today, overdue tasks, and Inbox items. Nothing moves unless you click.</p>
          <div className="mt-3 space-y-2">
            {pending.length === 0 && <p className="text-sm text-mute">Nothing pending. Clean slate.</p>}
            {pending.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel2 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-mute">{t.dueDate ? (t.dueDate < today ? `Overdue · was due ${t.dueDate}` : `Due today ${t.dueDate}`) : "Inbox · no date"} · {t.priority.toLowerCase()}</p>
                </div>
                <button onClick={() => moveToTomorrow(t)} className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:brightness-110">Move to tomorrow <ArrowRight size={13} /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold">Tomorrow&apos;s tasks</h2>
          {tasks.length === 0
            ? <EmptyState title="Tomorrow is empty" hint="Add tasks directly, or use Prepare Tomorrow to pull pending work in." />
            : <div className="space-y-2">{tasks.map((t) => <TaskRow key={t.id} task={t} today={today} onEdit={(x) => { setEditing(x); setModalOpen(true); }} onChanged={load} />)}</div>}
        </section>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Clock size={16} className="text-accent" /> Timeline</h2>
          <Card className="p-4">
            {timeline.length === 0 ? <p className="text-sm text-mute">No tasks to place yet.</p> : (
              <div className="space-y-3">
                {timeline.map((t) => (
                  <div key={t.id} className="flex gap-3">
                    <span className="w-12 shrink-0 text-xs font-semibold text-accent">{t.dueTime || "—"}</span>
                    <div className="min-w-0 border-l border-line pl-3">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-mute">{t.dueTime ? "Timed" : "Any time"} · {t.priority.toLowerCase()}{t.estimatedDuration ? ` · ${t.estimatedDuration}m` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <p className="mt-3 text-xs text-mute">Day after tomorrow: {addDaysClient(tomorrow, 1)}</p>
        </section>
      </div>

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} task={editing} defaults={{ dueDate: tomorrow }} onSaved={load} />
    </div>
  );
}
