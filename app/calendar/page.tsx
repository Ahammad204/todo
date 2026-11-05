"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Task } from "@/lib/types";
import { dhakaTodayClient, addDaysClient } from "@/lib/clientDates";
import TaskRow from "@/components/TaskRow";
import TaskModal from "@/components/TaskModal";
import { Spinner } from "@/components/ui";

export default function CalendarPage() {
  const today = dhakaTodayClient();
  const [cursor, setCursor] = useState(today.slice(0, 7)); // YYYY-MM
  const [selected, setSelected] = useState(today);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [view, setView] = useState<"month" | "week">("month");

  const load = useCallback(async () => {
    const d = await api("/api/tasks?sort=deadline");
    setTasks(d.tasks);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
    const h = () => load();
    window.addEventListener("tf:refresh", h);
    return () => window.removeEventListener("tf:refresh", h);
  }, [load]);

  const byDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    tasks.forEach((t) => { if (t.dueDate) { const a = m.get(t.dueDate) || []; a.push(t); m.set(t.dueDate, a); } });
    return m;
  }, [tasks]);

  const [cy, cm] = cursor.split("-").map(Number);
  const first = `${cursor}-01`;
  const firstDow = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${cursor}-${String(i + 1).padStart(2, "0")}`),
  ];
  const monthLabel = new Date(`${first}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  function shiftMonth(n: number) {
    const d = new Date(Date.UTC(cy, cm - 1 + n, 1));
    setCursor(d.toISOString().slice(0, 7));
  }

  // Week strip: week (Mon-Sun) containing selected date
  const selDow = (new Date(`${selected}T12:00:00Z`).getUTCDay() + 6) % 7;
  const weekStart = addDaysClient(selected, -selDow);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysClient(weekStart, i));

  const dayTasks = byDate.get(selected) || [];

  if (loading) return <Spinner />;

  const renderCell = (date: string) => {
    const list = byDate.get(date) || [];
    const isSel = date === selected, isToday = date === today;
    return (
      <button key={date} onClick={() => setSelected(date)}
        className={`min-h-20 rounded-xl border p-1.5 text-left align-top transition sm:min-h-24 sm:p-2 ${isSel ? "border-accent" : "border-line hover:border-mute/40"} ${isToday ? "bg-panel2" : "bg-panel"}`}>
        <span className={`text-xs font-semibold ${isToday ? "text-accent" : ""}`}>{Number(date.slice(8))}</span>
        <div className="mt-1 space-y-1">
          {list.slice(0, 3).map((t) => (
            <span key={t.id} className={`block truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-black ${t.status === "COMPLETED" ? "opacity-50 line-through" : ""}`}
              style={{ background: t.category?.color || "#FACC15" }}>{t.title}</span>
          ))}
          {list.length > 3 && <span className="block text-[10px] text-mute">+{list.length - 3} more</span>}
          {list.length === 0 && <span className="mt-1 hidden gap-1 sm:flex">{/* dots placeholder */}</span>}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line p-0.5">
            {(["month", "week"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${view === v ? "bg-panel2 text-ink" : "text-mute"}`}>{v}</button>
            ))}
          </div>
          {view === "month" && (
            <>
              <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-line p-2 hover:bg-panel2"><ChevronLeft size={16} /></button>
              <span className="min-w-36 text-center text-sm font-semibold">{monthLabel}</span>
              <button onClick={() => shiftMonth(1)} className="rounded-lg border border-line p-2 hover:bg-panel2"><ChevronRight size={16} /></button>
            </>
          )}
        </div>
      </div>

      {view === "month" ? (
        <>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-mute">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((date, i) => date ? renderCell(date) : <span key={`x${i}`} />)}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((date) => (
            <div key={date}>
              <p className="mb-1.5 text-center text-[11px] font-medium uppercase text-mute">
                {new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}
              </p>
              {renderCell(date)}
            </div>
          ))}
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {new Date(`${selected}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
            {selected === today && <span className="ml-2 text-xs font-medium text-accent">today</span>}
          </h2>
          <button onClick={() => { setEditing(null); setCreateDate(selected); setModalOpen(true); }} className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:brightness-110"><Plus size={13} /> Add task</button>
        </div>
        {dayTasks.length === 0
          ? <p className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-sm text-mute">No tasks on this date.</p>
          : <div className="space-y-2">{dayTasks.map((t) => <TaskRow key={t.id} task={t} today={today} onEdit={(x) => { setEditing(x); setCreateDate(null); setModalOpen(true); }} onChanged={load} />)}</div>}
      </section>

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} task={editing} defaults={{ dueDate: createDate || selected }} onSaved={load} />
    </div>
  );
}
