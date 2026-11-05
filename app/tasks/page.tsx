"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { api, patchTask } from "@/lib/api";
import type { Category, Task } from "@/lib/types";
import { dhakaTodayClient } from "@/lib/clientDates";
import TaskRow from "@/components/TaskRow";
import TaskModal from "@/components/TaskModal";
import { EmptyState, Spinner, inputCls, useToast } from "@/components/ui";

export default function TasksPage() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [sort, setSort] = useState("deadline");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const dragId = useRef<string | null>(null);
  const today = dhakaTodayClient();

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (fStatus) params.set("status", fStatus);
    if (fPriority) params.set("priority", fPriority);
    if (fCategory) params.set("categoryId", fCategory);
    params.set("sort", sort === "deadline" ? "deadline" : sort);
    if (showArchived) params.set("includeArchived", "1");
    const [t, c] = await Promise.all([api(`/api/tasks?${params}`), api("/api/categories")]);
    setTasks(showArchived ? t.tasks : t.tasks);
    setCategories(c.categories);
    setLoading(false);
  }, [search, fStatus, fPriority, fCategory, sort, showArchived]);

  useEffect(() => {
    const id = setTimeout(() => load().catch(() => setLoading(false)), search ? 250 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  useEffect(() => {
    const h = () => load();
    window.addEventListener("tf:refresh", h);
    return () => window.removeEventListener("tf:refresh", h);
  }, [load]);

  async function handleDrop(target: Task) {
    if (!dragId.current || dragId.current === target.id) return;
    const from = tasks.findIndex((t) => t.id === dragId.current);
    const to = tasks.findIndex((t) => t.id === target.id);
    if (from < 0 || to < 0) return;
    const reordered = [...tasks];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setTasks(reordered);
    try {
      await Promise.all(reordered.map((t, i) => (t.sortOrder !== i + 1 ? patchTask(t.id, { sortOrder: i + 1 }) : Promise.resolve())));
      toast.push("Order saved");
      load();
    } catch (e: any) { toast.push(e.message, "err"); load(); }
    dragId.current = null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110"><Plus size={16} /> New task</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input className={`${inputCls} pl-9`} placeholder="Search title or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={`${inputCls} w-auto`} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All statuses</option><option value="TODO">Todo</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option>
        </select>
        <select className={`${inputCls} w-auto`} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
          <option value="">All priorities</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option>
        </select>
        <select className={`${inputCls} w-auto`} value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="deadline">Sort: deadline</option><option value="priority">Sort: priority</option><option value="created">Sort: newest</option><option value="order">Sort: manual (drag)</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3 text-sm">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-yellow-400" /> Archived
        </label>
      </div>

      {sort === "order" && <p className="text-xs text-mute">Drag rows to reorder — order is saved to the database.</p>}

      {loading ? <Spinner /> : tasks.length === 0
        ? <EmptyState title="No tasks match" hint="Try clearing filters, or create a new task." />
        : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} today={today}
                onEdit={(x) => { setEditing(x); setModalOpen(true); }} onChanged={load}
                draggable={sort === "order"}
                onDragStart={() => { dragId.current = t.id; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(t)} />
            ))}
          </div>
        )}

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} task={editing} onSaved={load} />
    </div>
  );
}
