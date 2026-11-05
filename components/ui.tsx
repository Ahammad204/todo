"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

// ---------- Toasts ----------
type Toast = { id: number; msg: string; kind: "ok" | "err" };
const ToastCtx = createContext<{ push: (msg: string, kind?: "ok" | "err") => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="toast-in flex items-center gap-2 rounded-xl border border-line bg-panel2 px-4 py-2.5 text-sm shadow-xl">
            {t.kind === "ok" ? <CheckCircle2 size={16} className="text-accent" /> : <AlertTriangle size={16} className="text-red-400" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Confirm dialog ----------
export function ConfirmDialog({ open, title, body, onCancel, onConfirm }: {
  open: boolean; title: string; body: string; onCancel: () => void; onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div className="modal-in w-full max-w-sm rounded-2xl border border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-mute">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-line px-3.5 py-2 text-sm hover:bg-panel2">Cancel</button>
          <button onClick={onConfirm} className="rounded-lg bg-red-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-400">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Primitives ----------
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-panel ${className}`}>{children}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-mute">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" /></div>;
}

export const inputCls = "w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink placeholder:text-mute";
export const labelCls = "mb-1 block text-xs font-medium uppercase tracking-wide text-mute";
export const btnPrimary = "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50";
export const btnGhost = "rounded-lg border border-line px-3.5 py-2 text-sm transition hover:bg-panel2";

export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className={`modal-in max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 sm:rounded-2xl ${wide ? "max-w-2xl" : "max-w-lg"}`} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="float-right rounded-lg p-1 text-mute hover:bg-panel2 hover:text-ink"><X size={18} /></button>
        {children}
      </div>
    </div>
  );
}
