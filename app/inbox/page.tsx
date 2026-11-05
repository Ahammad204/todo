"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Inbox as InboxIcon, Plus } from "lucide-react";
import { api, createTask, patchTask } from "@/lib/api";
import type { Category, Task } from "@/lib/types";
import { dhakaTodayClient } from "@/lib/clientDates";
import TaskRow from "@/components/TaskRow";
import TaskModal from "@/components/TaskModal";
import { EmptyState, Spinner, inputCls, useToast } from "@/components/ui";

export default function InboxPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [quick, setQuick] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const today = dhakaTodayClient();

  const load = useCallback(async () => {
    const [t, c] = await Promise.all([api("/api/tasks?due=inbox&sort=created"), api("/api/categories")]);
    setTasks(t.tasks); setCategories(c.categories); setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
    const h = () => load();
    window.addEventListener("tf:refresh", h);
    return () => window.removeEventListener("tf:refresh", h);
  }, [load]);

  async function capture() {
    if (!quick.trim()) return;
    try { await createTask({ title: quick.trim() }); setQuick(""); toast.push("Captured to Inbox"); load(); }
    catch (e: any) { toast.push(e.message, "err"); }
  }

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><InboxIcon className="text-accent" /> Inbox</h1>
      <p className="text-sm text-mute -mt-3">Capture first, organise later. These tasks have no date yet.</p>

      <div className="flex gap-2">
        <input autoFocus className={inputCls} placeholder="Quick capture — type and press Enter…" value={quick}
          onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === "Enter" && capture()} />
        <button onClick={capture} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-black hover:brightness-110"><Plus size={15} /> Add</button>
      </div>

      {loading ? <Spinner /> : tasks.length === 0
        ? <EmptyState title="Inbox zero" hint="Nothing waiting to be organised." />
        : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="space-y-1.5">
                <TaskRow task={t} today={today} onEdit={(x) => { setEditing(x); setModalOpen(true); }} onChanged={load} />
                <div className="flex flex-wrap gap-2 pl-1">
                  <input type="date" defaultValue="" aria-label="Assign date"
                    className="rounded-lg border border-line bg-panel2 px-2 py-1 text-xs"
                    onChange={async (e) => { if (e.target.value) { await patchTask(t.id, { dueDate: e.target.value }); toast.push("Date assigned"); load(); } }} />
                  <select aria-label="Assign category" defaultValue={t.categoryId || ""}
                    className="rounded-lg border border-line bg-panel2 px-2 py-1 text-xs"
                    onChange={async (e) => { await patchTask(t.id, { categoryId: e.target.value || null }); toast.push("Category assigned"); load(); }}>
                    <option value="">No category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={async () => { await patchTask(t.id, { dueDate: today }); toast.push("Moved to today"); load(); }} className="rounded-lg border border-line bg-panel2 px-2.5 py-1 text-xs hover:text-accent">Do today</button>
                </div>
              </div>
            ))}
          </div>
        )}

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} task={editing} onSaved={load} />
    </div>
  );
}
