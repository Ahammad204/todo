"use client";
import React, { useState } from "react";
import { Check, Clock, Copy, Archive, Pencil, Trash2, Repeat } from "lucide-react";
import type { Task } from "@/lib/types";
import { PRIORITY_COLORS } from "@/lib/types";
import { api, patchTask, deleteTask } from "@/lib/api";
import { ConfirmDialog, useToast } from "./ui";

export default function TaskRow({ task, today, onEdit, onChanged, draggable, onDragStart, onDragOver, onDrop }: {
  task: Task; today?: string; onEdit?: (t: Task) => void; onChanged: () => void;
  draggable?: boolean; onDragStart?: () => void; onDragOver?: (e: React.DragEvent) => void; onDrop?: () => void;
}) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const done = task.status === "COMPLETED";
  const overdue = today && task.dueDate && task.dueDate < today && !done;

  async function toggle() {
    try {
      if (!done) setJustDone(true);
      await patchTask(task.id, { status: done ? "TODO" : "COMPLETED" });
      toast.push(done ? "Reopened" : "Completed 🎉");
      onChanged();
    } catch (e: any) { toast.push(e.message, "err"); }
  }
  async function act(kind: "duplicate" | "archive" | "delete") {
    try {
      if (kind === "duplicate") { await api(`/api/tasks/${task.id}/duplicate`, { method: "POST" }); toast.push("Duplicated"); }
      if (kind === "archive") { await api(`/api/tasks/${task.id}/archive`, { method: "POST" }); toast.push("Archived"); }
      if (kind === "delete") { await deleteTask(task.id); toast.push("Deleted"); }
      onChanged();
    } catch (e: any) { toast.push(e.message, "err"); }
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group flex items-center gap-3 rounded-xl border border-line bg-panel px-3.5 py-3 transition hover:border-mute/40 ${justDone ? "task-just-done" : ""} ${done ? "opacity-70" : ""}`}
    >
      <button onClick={toggle} aria-label={done ? "Reopen task" : "Complete task"}
        className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md border transition ${done ? "border-accent bg-accent text-black" : "border-mute/50 hover:border-accent"}`} style={{ width: 22, height: 22 }}>
        {done && <Check size={14} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${done ? "line-through" : ""}`}>{task.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-mute">
          {task.category && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: task.category.color }} />
              {task.category.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1 font-medium" style={{ color: PRIORITY_COLORS[task.priority] }}>
            {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
          </span>
          {task.status === "IN_PROGRESS" && <span className="text-accent">In progress</span>}
          {task.dueDate && (
            <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-red-400" : ""}`}>
              <Clock size={11} /> {task.dueDate}{task.dueTime ? ` · ${task.dueTime}` : ""}{overdue ? " · overdue" : ""}
            </span>
          )}
          {task.estimatedDuration ? <span>{task.estimatedDuration}m</span> : null}
          {task.recurrence !== "NONE" && <span className="inline-flex items-center gap-1"><Repeat size={11} />{task.recurrence.toLowerCase()}</span>}
          {task.subtasks && task.subtasks.length > 0 && (
            <span>{task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        {onEdit && <button onClick={() => onEdit(task)} title="Edit" className="rounded-lg p-1.5 text-mute hover:bg-panel2 hover:text-ink"><Pencil size={15} /></button>}
        <button onClick={() => act("duplicate")} title="Duplicate" className="rounded-lg p-1.5 text-mute hover:bg-panel2 hover:text-ink"><Copy size={15} /></button>
        <button onClick={() => act("archive")} title="Archive" className="rounded-lg p-1.5 text-mute hover:bg-panel2 hover:text-ink"><Archive size={15} /></button>
        <button onClick={() => setConfirm(true)} title="Delete" className="rounded-lg p-1.5 text-mute hover:bg-panel2 hover:text-red-400"><Trash2 size={15} /></button>
      </div>
      <ConfirmDialog open={confirm} title="Delete task?" body={`"${task.title}" will be permanently deleted.`}
        onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); act("delete"); }} />
    </div>
  );
}
