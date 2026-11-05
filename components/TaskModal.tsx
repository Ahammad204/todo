"use client";
import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal, inputCls, labelCls, btnPrimary, btnGhost, useToast } from "./ui";
import { api, createTask, patchTask } from "@/lib/api";
import type { Category, Task } from "@/lib/types";

export interface TaskFormDefaults {
  dueDate?: string | null;
}

export default function TaskModal({ open, onClose, task, defaults, onSaved }: {
  open: boolean; onClose: () => void; task?: Task | null; defaults?: TaskFormDefaults; onSaved: () => void;
}) {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    title: "", description: "", dueDate: "", dueTime: "", priority: "MEDIUM", status: "TODO",
    categoryId: "", estimatedDuration: "", notes: "", recurrence: "NONE",
  });
  const [subtasks, setSubtasks] = useState<{ id?: string; title: string; completed: boolean }[]>([]);
  const [newSub, setNewSub] = useState("");

  useEffect(() => {
    if (!open) return;
    api("/api/categories").then((d) => setCategories(d.categories)).catch(() => {});
    if (task) {
      setF({
        title: task.title, description: task.description || "", dueDate: task.dueDate || "",
        dueTime: task.dueTime || "", priority: task.priority, status: task.status,
        categoryId: task.categoryId || "", estimatedDuration: task.estimatedDuration?.toString() || "",
        notes: task.notes || "", recurrence: task.recurrence,
      });
      setSubtasks((task.subtasks || []).map((s) => ({ id: s.id, title: s.title, completed: s.completed })));
    } else {
      setF({ title: "", description: "", dueDate: defaults?.dueDate || "", dueTime: "", priority: localStorage.getItem("tf-default-priority") || "MEDIUM", status: "TODO", categoryId: "", estimatedDuration: "", notes: "", recurrence: "NONE" });
      setSubtasks([]);
    }
    setNewSub("");
  }, [open, task, defaults]);

  if (!open) return null;
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.title.trim()) { toast.push("Title is required", "err"); return; }
    setSaving(true);
    try {
      const body: any = {
        title: f.title.trim(), description: f.description || null,
        dueDate: f.dueDate || null, dueTime: f.dueTime || null,
        priority: f.priority, status: f.status, categoryId: f.categoryId || null,
        estimatedDuration: f.estimatedDuration ? Number(f.estimatedDuration) : null,
        notes: f.notes || null, recurrence: f.recurrence,
      };
      if (task) {
        await patchTask(task.id, body);
        // Sync subtasks: delete removed, update kept, add new
        const orig = task.subtasks || [];
        for (const o of orig) if (!subtasks.find((s) => s.id === o.id)) await api(`/api/subtasks/${o.id}`, { method: "DELETE" });
        for (const s of subtasks) {
          if (s.id) {
            const o = orig.find((x) => x.id === s.id);
            if (o && (o.title !== s.title || o.completed !== s.completed)) await api(`/api/subtasks/${s.id}`, { method: "PATCH", body: JSON.stringify({ title: s.title, completed: s.completed }) });
          } else if (s.title.trim()) {
            await api(`/api/tasks/${task.id}/subtasks`, { method: "POST", body: JSON.stringify({ title: s.title }) });
          }
        }
        toast.push("Task updated");
      } else {
        body.subtasks = subtasks.filter((s) => s.title.trim());
        await createTask(body);
        toast.push("Task created");
      }
      onSaved(); onClose();
    } catch (e: any) { toast.push(e.message, "err"); }
    setSaving(false);
  }

  return (
    <Modal open={open} onClose={onClose} wide>
      <h3 className="text-lg font-semibold">{task ? "Edit task" : "New task"}</h3>
      <div className="mt-4 space-y-4">
        <div>
          <label className={labelCls}>Title *</label>
          <input autoFocus className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="What needs doing?" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); }} />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea className={inputCls} rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><label className={labelCls}>Due date</label><input type="date" className={inputCls} value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
          <div><label className={labelCls}>Due time</label><input type="time" className={inputCls} value={f.dueTime} onChange={(e) => set("dueTime", e.target.value)} /></div>
          <div><label className={labelCls}>Est. minutes</label><input type="number" min={0} className={inputCls} value={f.estimatedDuration} onChange={(e) => set("estimatedDuration", e.target.value)} placeholder="30" /></div>
          <div><label className={labelCls}>Repeat</label>
            <select className={inputCls} value={f.recurrence} onChange={(e) => set("recurrence", e.target.value)}>
              <option value="NONE">No repeat</option><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
            </select></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Priority</label>
            <select className={inputCls} value={f.priority} onChange={(e) => set("priority", e.target.value)}>
              <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option>
            </select></div>
          <div><label className={labelCls}>Status</label>
            <select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}>
              <option value="TODO">Todo</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option>
            </select></div>
          <div><label className={labelCls}>Category</label>
            <select className={inputCls} value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
        </div>
        <div>
          <label className={labelCls}>Subtasks</label>
          <div className="space-y-1.5">
            {subtasks.map((s, i) => (
              <div key={s.id || `n${i}`} className="flex items-center gap-2">
                <input type="checkbox" checked={s.completed} onChange={(e) => setSubtasks((p) => p.map((x, j) => j === i ? { ...x, completed: e.target.checked } : x))} className="h-4 w-4 accent-yellow-400" />
                <input className={`${inputCls} flex-1`} value={s.title} onChange={(e) => setSubtasks((p) => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                <button onClick={() => setSubtasks((p) => p.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-mute hover:bg-panel2 hover:text-red-400"><Trash2 size={15} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add a subtask…" onKeyDown={(e) => { if (e.key === "Enter" && newSub.trim()) { setSubtasks((p) => [...p, { title: newSub.trim(), completed: false }]); setNewSub(""); } }} />
              <button onClick={() => { if (newSub.trim()) { setSubtasks((p) => [...p, { title: newSub.trim(), completed: false }]); setNewSub(""); } }} className={btnGhost}><Plus size={15} /></button>
            </div>
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? "Saving…" : task ? "Save changes" : "Create task"}</button>
        </div>
      </div>
    </Modal>
  );
}
