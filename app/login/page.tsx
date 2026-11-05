"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Lock } from "lucide-react";
import { inputCls } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) { router.push("/"); router.refresh(); }
    else { setErr("Wrong password. Check APP_PASSWORD in .env."); setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-black"><Zap size={19} strokeWidth={2.5} /></span>
          <span className="text-xl font-bold">TASK<span className="text-accent">FLOW</span></span>
        </div>
        <p className="mt-2 text-sm text-mute">Personal workspace. Enter your password to continue.</p>
        <div className="relative mt-5">
          <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input type="password" autoFocus className={`${inputCls} pl-9`} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        <button disabled={busy} className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50">
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
