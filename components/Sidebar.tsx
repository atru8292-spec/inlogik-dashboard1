"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Users, Lightbulb, MailQuestion, Settings, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState<number | null>(null);

  // Подгружаем счётчик инбокса и обновляем каждые 60 сек
  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/inbox/count", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setInboxCount(data.count ?? null);
      } catch (_) { /* ignore */ }
    }
    fetchCount();
    const t = setInterval(fetchCount, 60_000);
    return () => clearInterval(t);
  }, []);

  const NAV = [
    { href: "/",            label: "Активные запросы",  icon: Inbox,       badge: null },
    { href: "/contractors", label: "Подрядчики",         icon: Users,       badge: null },
    { href: "/insights",   label: "Памятка и инсайты",  icon: Lightbulb,   badge: null },
    { href: "/inbox",      label: "Почта · Ответы",      icon: MailQuestion, badge: inboxCount },
  ];

  const navLinks = (
    <>
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn("nav-link", active && "nav-link-active")}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge !== null && badge > 0 && (
                <span className={cn(
                  "ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold leading-none",
                  active
                    ? "bg-inlogik-200 text-inlogik-800"
                    : "bg-amber-100 text-amber-700 border border-amber-200",
                )}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-100">
        <Link
          href="/admin"
          onClick={() => setOpen(false)}
          className={cn(
            "nav-link text-xs opacity-60 hover:opacity-100",
            pathname.startsWith("/admin") && "nav-link-active opacity-100",
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          Админ
        </Link>
        <div className="mt-2 px-3 text-xs text-slate-400">
          v0.2 · {new Date().getFullYear()}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-200 bg-white flex-col">
        <div className="px-5 py-6 border-b border-slate-100">
          <Logo />
          <div className="text-xs text-slate-500 mt-1 tracking-wide">Дашборд логистики</div>
        </div>
        {navLinks}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between px-4 py-3">
        <Logo />
        <div className="flex items-center gap-2">
          {inboxCount !== null && inboxCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
              {inboxCount > 99 ? "99+" : inboxCount}
            </span>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            aria-label="Меню"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-40 h-full w-72 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-5 py-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <Logo />
            <div className="text-xs text-slate-500 mt-1 tracking-wide">Дашборд логистики</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {navLinks}
      </aside>
    </>
  );
}
