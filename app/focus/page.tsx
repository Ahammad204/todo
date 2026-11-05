"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Check } from "lucide-react";
import { api, patchTask } from "@/lib/api";
import type { Task } from "@/lib/types";
import { dhakaTodayClient } from "@/lib/clientDates";
import { Card, EmptyState, Spinner, useToast } from "@/components/ui";

const MODES = [
  { key: "focus", label: "Focus", minutes: 25 },
  { key: "short", label: "Short break", minutes: 5 },
  { key: "long", label: "Long break", minutes: 15 },
] as const;

export default function FocusPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<(typeof MODES)[number]>(MODES[0]);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const today = dhakaTodayClient();

  const load = useCallback(async () => {
    const d = await api("/api/tasks?sort=deadline");
    const open = d.tasks.filter((t: Task) => t.status !== "COMPLETED");
    setTasks(open);
    setSelected((prev) => prev ? open.find((t: Task) => t.id === prev.id) || open[0] || null : open[0] || null);
    setLoading(false);
  }, []);

  useEffect(() => { load().catch(() => setLoading(false)); }, [load]);

  useEffect(() => {
    if (running) {
      timer.current = setInterval(() => setSeconds((s) => {
        if (s <= 1) { setRunning(false); toast.push(mode.key === "focus" ? "Focus session done — take a break." : "Break over — back to it."); return 0; }
        return s - 1;
      }), 1000);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running, mode, toast]);

  function switchMode(m: (typeof MODES)[number]) {
    setMode(m); setSeconds(m.minutes * 60); setRunning(false);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const pct = 100 - (seconds / (mode.minutes * 60)) * 100;

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-center text-2xl font-bold tracking-tight">Focus Mode</h1>

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-mute">Task</label>
        {tasks.length === 0 ? <EmptyState title="No open tasks" hint="Everything is done. Enjoy it." /> : (
          <select className="w-full rounded-lg border border-line bg-panel2 px-3 py-2.5 text-sm" value={selected?.id || ""}
            onChange={(e) => setSelected(tasks.find((t) => t.id === e.target.value) || null)}>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}{t.dueDate ? ` — due ${t.dueDate}` : ""}</option>)}
          </select>
        )}
      </div>

      {selected && (
        <Card className="p-6 text-center">
          <p className="text-lg font-semibold">{selected.title}</p>
          <p className="mt-1 text-sm text-mute">
            {selected.category?.name || "No category"} · {selected.priority.toLowerCase()} priority
            {selected.dueDate ? ` · due ${selected.dueDate}` : ""}{selected.estimatedDuration ? ` · est. ${selected.estimatedDuration}m` : ""}
          </p>
          {selected.description && <p className="mx-auto mt-3 max-w-md text-sm text-mute">{selected.description}</p>}
          <button onClick={async () => { await patchTask(selected.id, { status: "COMPLETED" }); toast.push("Task completed 🎉"); load(); }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black hover:brightness-110">
            <Check size={15} /> Mark complete
          </button>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex justify-center gap-2">
          {MODES.map((m) => (
            <button key={m.key} onClick={() => switchMode(m)} className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${mode.key === m.key ? "bg-accent text-black" : "border border-line text-mute hover:text-ink"}`}>{m.label} · {m.minutes}m</button>
          ))}
        </div>
        <p className="mt-5 text-center text-6xl font-bold tabular-nums tracking-tight">{mm}:{ss}</p>
        <div className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full bg-panel2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:brightness-110">
            {running ? <Pause size={15} /> : <Play size={15} />} {running ? "Pause" : "Start"}
          </button>
          <button onClick={() => { setRunning(false); setSeconds(mode.minutes * 60); }} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-panel2"><RotateCcw size={15} /> Reset</button>
        </div>
      </Card>
      <p className="text-center text-xs text-mute">Today: {today} (Asia/Dhaka)</p>
    </div>
  );
}
