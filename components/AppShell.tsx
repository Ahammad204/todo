"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CheckSquare, Sunrise, CalendarDays, BarChart3, Inbox,
  Crosshair, Settings, Sun, Moon, Plus, Zap, LogOut,
} from "lucide-react";
import { ToastProvider } from "./ui";
import TaskModal from "./TaskModal";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/tomorrow", label: "Tomorrow", icon: Sunrise },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/focus", label: "Focus", icon: Crosshair },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [light, setLight] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setQuickAdd(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleTheme() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("tf-theme", next ? "light" : "dark");
  }

  async function logout() {
    document.cookie = "tf_auth=; path=/; max-age=0";
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login") {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-black"><Zap size={18} strokeWidth={2.5} /></span>
            <span className="text-lg font-bold tracking-tight">TASK<span className="text-accent">FLOW</span></span>
          </div>
          <button onClick={() => setQuickAdd(true)} className="mt-6 flex items-center justify-between rounded-xl bg-accent px-3.5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
            <span className="flex items-center gap-2"><Plus size={16} /> Quick Add</span>
            <kbd className="rounded bg-black/15 px-1.5 py-0.5 text-[11px]">⌘K</kbd>
          </button>
          <nav className="mt-6 flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-panel2 font-semibold text-ink" : "text-mute hover:bg-panel2 hover:text-ink"}`}>
                  <Icon size={17} className={active ? "text-accent" : ""} /> {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex items-center gap-1 px-1">
            <button onClick={toggleTheme} className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm text-mute hover:bg-panel2 hover:text-ink">
              {light ? <Moon size={16} /> : <Sun size={16} />} {light ? "Dark theme" : "Light theme"}
            </button>
            <button onClick={logout} title="Log out" className="rounded-xl p-2 text-mute hover:bg-panel2 hover:text-ink"><LogOut size={16} /></button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
            <span className="flex items-center gap-2 font-bold"><Zap size={17} className="text-accent" /> TASK<span className="-ml-2 text-accent">FLOW</span></span>
            <div className="flex items-center gap-1">
              <button onClick={() => setQuickAdd(true)} className="rounded-lg bg-accent p-2 text-black"><Plus size={16} /></button>
              <button onClick={toggleTheme} className="rounded-lg p-2 text-mute">{light ? <Moon size={17} /> : <Sun size={17} />}</button>
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-5 pb-24 sm:px-6 md:pb-8 lg:px-8">{children}</main>
          {/* Mobile bottom nav */}
          <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-panel px-1 py-2 md:hidden">
            {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] ${pathname === href ? "text-accent" : "text-mute"}`}>
                <Icon size={19} /> {label}
              </Link>
            ))}
            <Link href="/settings" className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] ${pathname === "/settings" ? "text-accent" : "text-mute"}`}>
              <Settings size={19} /> Settings
            </Link>
          </nav>
        </div>
      </div>
      <TaskModal open={quickAdd} onClose={() => setQuickAdd(false)} onSaved={() => { window.dispatchEvent(new Event("tf:refresh")); }} />
    </ToastProvider>
  );
}
