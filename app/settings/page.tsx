"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Download, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { ICONS } from "@/lib/types";
import { Card, Spinner, inputCls, labelCls, btnPrimary, useToast, ConfirmDialog } from "@/components/ui";

export default function SettingsPage() {
  const toast = useToast();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultPriority, setDefaultPriority] = useState("MEDIUM");
  const [newCat, setNewCat] = useState({ name: "", color: "#FACC15", icon: "folder" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState({ name: "", color: "", icon: "folder" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([api("/api/profile"), api("/api/categories")]);
    setUser(p.user); setCategories(c.categories); setLoading(false);
  }, []);

  useEffect(() => {
    setDefaultPriority(localStorage.getItem("tf-default-priority") || "MEDIUM");
    load().catch(() => setLoading(false));
  }, [load]);

  if (loading || !user) return <Spinner />;

  async function saveProfile() {
    try {
      const d = await api("/api/profile", { method: "PATCH", body: JSON.stringify(user) });
      setUser(d.user); toast.push("Profile saved");
    } catch (e: any) { toast.push(e.message, "err"); }
  }

  async function addCategory() {
    if (!newCat.name.trim()) { toast.push("Category name required", "err"); return; }
    try {
      await api("/api/categories", { method: "POST", body: JSON.stringify(newCat) });
      setNewCat({ name: "", color: "#FACC15", icon: "folder" }); toast.push("Category created"); load();
    } catch (e: any) { toast.push(e.message, "err"); }
  }

  async function saveCategory(id: string) {
    try {
      await api(`/api/categories/${id}`, { method: "PATCH", body: JSON.stringify(editCat) });
      setEditId(null); toast.push("Category updated"); load();
    } catch (e: any) { toast.push(e.message, "err"); }
  }

  async function removeCategory(id: string) {
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      toast.push("Category deleted — its tasks kept, category cleared"); load();
    } catch (e: any) { toast.push(e.message, "err"); }
  }

  const catEditor = (v: { name: string; color: string; icon: string }, set: (v: any) => void) => (
    <div className="flex flex-wrap items-center gap-2">
      <input className={`${inputCls} w-40`} placeholder="Name" value={v.name} onChange={(e) => set({ ...v, name: e.target.value })} />
      <input type="color" className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-panel2 p-1" value={v.color} onChange={(e) => set({ ...v, color: e.target.value })} />
      <select className={`${inputCls} w-auto`} value={v.icon} onChange={(e) => set({ ...v, icon: e.target.value })}>
        {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card className="p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">Profile</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><label className={labelCls}>Name</label><input className={inputCls} value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} /></div>
          <div><label className={labelCls}>Email</label><input className={inputCls} value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} /></div>
        </div>
        <button onClick={saveProfile} className={`${btnPrimary} mt-4`}>Save profile</button>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">Preferences</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div><label className={labelCls}>Theme</label>
            <p className="rounded-lg border border-line bg-panel2 px-3 py-2 text-mute">Toggle from the sidebar (dark default). Stored on this device only.</p></div>
          <div><label className={labelCls}>Timezone</label>
            <p className="rounded-lg border border-line bg-panel2 px-3 py-2">Asia/Dhaka (UTC+6)</p></div>
          <div><label className={labelCls}>Default task priority</label>
            <select className={inputCls} value={defaultPriority} onChange={(e) => { setDefaultPriority(e.target.value); localStorage.setItem("tf-default-priority", e.target.value); toast.push("Default priority saved"); }}>
              <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option>
            </select></div>
          <div><label className={labelCls}>Daily planning reminder</label>
            <p className="rounded-lg border border-line bg-panel2 px-3 py-2">Every day at <strong className="text-accent">11:00 PM</strong> Asia/Dhaka — sent by Muse via the report API (see README).</p></div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">Categories</h3>
        <div className="mt-4 space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel2 px-3.5 py-2.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
              {editId === c.id ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {catEditor(editCat, setEditCat)}
                  <button onClick={() => saveCategory(c.id)} className="rounded-lg bg-accent p-2 text-black"><Check size={14} /></button>
                  <button onClick={() => setEditId(null)} className="rounded-lg border border-line p-2"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-mute">{c.icon} · {c._count?.tasks ?? 0} tasks</span>
                  <button onClick={() => { setEditId(c.id); setEditCat({ name: c.name, color: c.color, icon: c.icon }); }} className="rounded-lg p-1.5 text-mute hover:text-ink"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteId(c.id)} className="rounded-lg p-1.5 text-mute hover:text-red-400"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          {catEditor(newCat, setNewCat)}
          <button onClick={addCategory} className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-black hover:brightness-110"><Plus size={14} /> Add category</button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-mute">Data</h3>
        <p className="mt-2 text-sm text-mute">Export everything — all tasks, subtasks and categories — as one JSON backup file.</p>
        <a href="/api/export" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm hover:bg-panel2"><Download size={15} /> Export backup (JSON)</a>
      </Card>

      <ConfirmDialog open={!!deleteId} title="Delete category?" body="Tasks in this category are kept; their category is cleared."
        onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) removeCategory(deleteId); setDeleteId(null); }} />
    </div>
  );
}
