"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, TrendingUp, Star, AlertTriangle, FileText, Ban, BookOpen, Activity, MessageSquarePlus, X, Check, Loader2, ArrowUpDown, ChevronUp, ChevronDown, UserPlus, Trophy, Moon, Send, CheckCircle2, Coins } from "lucide-react";
import type { ContractorStats } from "@/lib/queries";
import { useRealtimeRefresh } from "@/lib/use-realtime";
import { StatCard } from "./StatCard";
import { SearchBar } from "./SearchBar";
import { LiveIndicator } from "./LiveIndicator";
import { cn, timeAgo } from "@/lib/utils";

type Tab = "active" | "all";
type ActiveView = "top" | "silent" | "all_active";
type SortCol = "name" | "sent" | "replied" | "quoted" | "wins" | "rr" | "score" | "last_reply";
type SortDir = "asc" | "desc";

function QuickNotePopup({
  contractorId,
  contractorName,
  onClose,
  onSaved,
}: {
  contractorId: string;
  contractorName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const t = text.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contractors/${contractorId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, author: "team" }),
      });
      if (res.ok) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">📝 Быстрая заметка</h3>
            <p className="text-xs text-slate-500 mt-0.5">{contractorName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Напишите заметку — маршрут, особенности работы, что обсуждали…"
          rows={4}
          className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-inlogik-200 focus:border-inlogik-400 resize-none"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Ctrl+Enter чтобы сохранить</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
              Отмена
            </button>
            <button
              onClick={save}
              disabled={!text.trim() || saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-inlogik-500 text-white text-sm font-medium rounded-lg hover:bg-inlogik-600 disabled:bg-slate-200 disabled:text-slate-400 transition"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContractorsView({
  initialStats,
}: {
  initialStats: ContractorStats[];
}) {
  const [stats, setStats] = useState<ContractorStats[]>(initialStats);
  const [tab, setTab] = useState<Tab>("active");
  const [activeView, setActiveView] = useState<ActiveView>("top");
  const [query, setQuery] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [quickNote, setQuickNote] = useState<{ id: string; name: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/contractors", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats || []);
      setLastUpdated(new Date());
    } catch (e) {
      console.warn("refresh failed", e);
    }
  }, []);

  useRealtimeRefresh(["outreach_messages", "quotes", "inbound_messages", "contractor_notes"], refresh, true);

  useEffect(() => {
    const t = setTimeout(() => setIsLive(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const i = setInterval(refresh, 60_000);
    return () => clearInterval(i);
  }, [refresh]);

  const active = stats.filter((c) => c.total_sent > 0 && !c.blacklisted && !c.opted_out);
  const responders = active.filter((c) => c.response_rate_pct > 0);
  const topResponders = [...active]
    .filter((c) => c.total_sent >= 2)
    .sort((a, b) => Number(b.response_rate_pct) - Number(a.response_rate_pct));
  const silent = active.filter((c) => c.total_sent >= 3 && c.total_replied === 0);

  const avgRR = active.length > 0
    ? Math.round(active.reduce((s, c) => s + Number(c.response_rate_pct), 0) / active.length)
    : 0;

  const sortFn = (a: ContractorStats, b: ContractorStats) => {
    let va: number | string, vb: number | string;
    switch (sortCol) {
      case "name": va = a.name?.toLowerCase() ?? ""; vb = b.name?.toLowerCase() ?? ""; break;
      case "sent": va = a.total_sent; vb = b.total_sent; break;
      case "replied": va = a.total_replied; vb = b.total_replied; break;
      case "quoted": va = a.total_quoted; vb = b.total_quoted; break;
      case "wins": va = a.total_wins; vb = b.total_wins; break;
      case "score": va = Number(a.priority_score ?? 0); vb = Number(b.priority_score ?? 0); break;
      case "rr": va = Number(a.response_rate_pct); vb = Number(b.response_rate_pct); break;
      case "last_reply": va = a.last_reply_at ?? ""; vb = b.last_reply_at ?? ""; break;
      default: return 0;
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  };

  const filtered = useMemo(() => {
    let list: ContractorStats[];

    if (tab === "active") {
      if (activeView === "top") list = topResponders;
      else if (activeView === "silent") list = silent;
      else list = active;
    } else {
      list = stats;
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter((c) => {
        const hay = [c.name, c.email, c.phone, c.contact_language].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    return [...list].sort(sortFn);
  }, [tab, activeView, query, topResponders, silent, active, stats, sortCol, sortDir]);

  return (
    <div className="space-y-6">
      {quickNote && (
        <QuickNotePopup
          contractorId={quickNote.id}
          contractorName={quickNote.name}
          onClose={() => setQuickNote(null)}
          onSaved={refresh}
        />
      )}

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Подрядчики</h1>
          <p className="text-sm text-slate-500 mt-1">
            {stats.length} всего в базе · {active.length} активных
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-inlogik-500 text-white rounded-xl text-sm font-medium hover:bg-inlogik-600 transition"
          >
            <UserPlus className="h-4 w-4" />
            Добавить подрядчика
          </button>
          <LiveIndicator isLive={isLive} lastUpdated={lastUpdated} />
        </div>
      </header>

      {showAddForm && (
        <AddContractorModal onClose={() => setShowAddForm(false)} onAdded={() => { setShowAddForm(false); refresh(); }} />
      )}

      <div className="flex gap-2 border-b border-slate-200">
        <TabButton
          icon={Activity}
          label="Активные с рейтингом"
          count={active.length}
          active={tab === "active"}
          onClick={() => { setTab("active"); setQuery(""); }}
        />
        <TabButton
          icon={BookOpen}
          label="Вся база"
          count={stats.length}
          active={tab === "all"}
          onClick={() => { setTab("all"); setQuery(""); }}
        />
      </div>

      {tab === "active" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Активных подрядчиков" value={active.length} icon={Users} meta={`Из ${stats.length} в базе`} accent />
          <StatCard label="Отвечают" value={responders.length} icon={Star} trend="good" meta={`из ${active.length}`} />
          <StatCard label="Средний response rate" value={`${avgRR}%`} icon={TrendingUp} trend={avgRR >= 40 ? "good" : avgRR >= 20 ? "warn" : "bad"} />
          <StatCard label="Молчуны (3+ писем)" value={silent.length} icon={AlertTriangle} trend={silent.length > 10 ? "bad" : "warn"} />
        </div>
      )}

      <div className="card p-3 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex-1 min-w-0">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={tab === "active"
              ? "Поиск активных по имени, email или телефону…"
              : `Поиск в полной базе из ${stats.length} подрядчиков…`
            }
          />
        </div>
        {tab === "active" && (
          <div className="flex gap-1.5 shrink-0 overflow-x-auto pb-0.5">
            <Chip active={activeView === "top"} onClick={() => setActiveView("top")} icon={Trophy} label="Лидеры" count={topResponders.length} />
            <Chip active={activeView === "silent"} onClick={() => setActiveView("silent")} icon={Moon} label="Молчуны" count={silent.length} />
            <Chip active={activeView === "all_active"} onClick={() => setActiveView("all_active")} label="Все активные" count={active.length} />
          </div>
        )}
      </div>

      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Найдено: {filtered.length}
        </h2>

        {/* Empty state for silent with zero results */}
        {filtered.length === 0 && tab === "active" && activeView === "silent" && (
          <div className="card p-12 text-center">
            <div className="text-3xl mb-3">🎉</div>
            <p className="text-slate-700 font-medium text-sm">Молчунов нет!</p>
            <p className="text-slate-400 text-xs mt-1">Все активные подрядчики хотя бы раз отвечали</p>
          </div>
        )}

        {/* Desktop table */}
        {filtered.length > 0 && (
          <div className="card table-scroll -mx-4 sm:mx-0" style={{ WebkitOverflowScrolling: "touch" }}>
            <ContractorTable
              rows={filtered}
              showStats={tab === "active"}
              onQuickNote={(id, name) => setQuickNote({ id, name })}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          </div>
        )}

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filtered.length === 0 && activeView !== "silent" ? (
            <div className="card p-10 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-slate-400 text-sm">Ничего не найдено</p>
            </div>
          ) : (
            filtered.map((c) => <ContractorMobileCard key={c.id} c={c} showStats={tab === "active"} onQuickNote={() => setQuickNote({ id: c.id, name: c.name })} />)
          )}
        </div>
      </section>
    </div>
  );
}

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-slate-300 ml-1 inline" />;
  return dir === "asc"
    ? <ChevronUp className="h-3 w-3 text-inlogik-500 ml-1 inline" />
    : <ChevronDown className="h-3 w-3 text-inlogik-500 ml-1 inline" />;
}

function SortTh({ col, label, sortCol, sortDir, onSort, className }: {
  col: SortCol; label: string; sortCol: SortCol; sortDir: SortDir;
  onSort: (c: SortCol) => void; className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 cursor-pointer select-none hover:text-slate-700 transition whitespace-nowrap",
        sortCol === col ? "text-inlogik-700" : "",
        className,
      )}
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon col={col} active={sortCol === col} dir={sortDir} />
    </th>
  );
}

function TabButton({ icon: Icon, label, count, active, onClick }: { icon: any; label: string; count: number; active: boolean; onClick: () => void; }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2.5 flex items-center gap-2 text-sm font-medium border-b-2 -mb-px transition",
        active ? "border-inlogik-500 text-inlogik-700" : "border-transparent text-slate-500 hover:text-slate-700",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span className={cn("px-2 py-0.5 rounded-full text-xs", active ? "bg-inlogik-100 text-inlogik-700" : "bg-slate-100 text-slate-500")}>
        {count}
      </span>
    </button>
  );
}

function Chip({ active, onClick, label, count, icon: Icon }: { active: boolean; onClick: () => void; label: string; count: number; icon?: React.FC<{ className?: string }> }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition whitespace-nowrap flex items-center gap-1.5",
        active ? "bg-inlogik-500 text-white border-inlogik-500" : "bg-white text-slate-600 border-slate-200 hover:border-inlogik-300",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label} <span className="opacity-70">· {count}</span>
    </button>
  );
}

function ContractorMobileCard({ c, showStats, onQuickNote }: { c: ContractorStats; showStats: boolean; onQuickNote: () => void }) {
  const rr = Number(c.response_rate_pct);
  return (
    <div className="card hover:shadow-md hover:border-inlogik-200 transition">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/contractors/${c.id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-slate-900">{c.name}</span>
              {c.has_notes && <FileText className="h-3.5 w-3.5 text-inlogik-500" />}
              {c.blacklisted && <Ban className="h-3.5 w-3.5 text-rose-500" />}
            </div>
            {c.contact_language && (
              <div className="text-xs text-slate-400 mt-0.5">{c.contact_language}</div>
            )}
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            {showStats && rr > 0 && (
              <span className={cn(
                "text-sm font-semibold tabular-nums",
                rr >= 60 ? "text-emerald-600" : rr >= 30 ? "text-amber-600" : "text-slate-600"
              )}>
                {rr}%
              </span>
            )}
            <button
              onClick={(e) => { e.preventDefault(); onQuickNote(); }}
              className="p-1.5 text-slate-400 hover:text-inlogik-600 hover:bg-inlogik-50 rounded transition"
              title="Добавить заметку"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-500 space-y-0.5">
          {c.email && <div>{c.email}</div>}
          {c.phone && <div>{c.phone}</div>}
        </div>
        {showStats && (
          <div className="mt-3 flex gap-3 text-xs text-slate-600 border-t border-slate-100 pt-2">
            <span className="flex items-center gap-1"><Send className="h-3 w-3" /> {c.total_sent} отправлено</span>
            <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {c.total_replied} ответили</span>
            <span className="text-inlogik-600 flex items-center gap-1"><Coins className="h-3 w-3" /> {c.total_quoted} ставок</span>
          </div>
        )}
        {!showStats && (
          <div className="mt-2 text-xs">
            {c.blacklisted ? <span className="badge badge-bad">🚫 Заблокирован</span>
              : c.opted_out ? <span className="badge badge-warn">Opt-out</span>
              : c.total_sent > 0 ? <span className="badge badge-good">Активный</span>
              : <span className="badge badge-muted">Без активности</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ContractorTable({
  rows, showStats, onQuickNote, sortCol, sortDir, onSort,
}: {
  rows: ContractorStats[];
  showStats: boolean;
  onQuickNote: (id: string, name: string) => void;
  sortCol: SortCol;
  sortDir: SortDir;
  onSort: (c: SortCol) => void;
}) {
  const sp = { sortCol, sortDir, onSort };
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <SortTh col="name" label="Подрядчик" className="text-left" {...sp} />
              <SortTh col="score" label="Рейтинг" className="text-center" {...sp} />
          <th className="text-left px-4 py-3">Email</th>
          <th className="text-left px-4 py-3">Телефон</th>
          {showStats ? (
            <>
              <SortTh col="sent" label="Отправлено" className="text-right" {...sp} />
              <SortTh col="replied" label="Ответили" className="text-right" {...sp} />
              <SortTh col="quoted" label="Ставок" className="text-right" {...sp} />
              <SortTh col="wins" label="Выбрано" className="text-right" {...sp} />
              <SortTh col="rr" label="Response rate" className="text-right" {...sp} />
              <SortTh col="last_reply" label="Последний ответ" className="text-left" {...sp} />
            </>
          ) : (
            <th className="text-left px-4 py-3">Статус</th>
          )}
          <th className="px-4 py-3 w-10"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((c) => {
          const rr = Number(c.response_rate_pct);
          return (
            <tr key={c.id} className="hover:bg-inlogik-50/30 group">
              <td className="px-4 py-3">
                <Link href={`/contractors/${c.id}`} className="block">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 group-hover:text-inlogik-700">{c.name}</span>
                    {c.has_notes && <span title="Есть заметки команды"><FileText className="h-3.5 w-3.5 text-inlogik-500" /></span>}
                    {c.blacklisted && <span title="Чёрный список"><Ban className="h-3.5 w-3.5 text-rose-500" /></span>}
                  </div>
                  <div className="text-xs text-slate-400">{c.contact_language || "—"}</div>
                </Link>
              </td>
              <td className="px-4 py-3 text-center">
                {(() => {
                  const s = Number(c.priority_score ?? 0);
                  const color = s >= 70 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : s >= 40 ? "text-amber-600 bg-amber-50 border-amber-200" : s > 0 ? "text-slate-500 bg-slate-50 border-slate-200" : "text-slate-300";
                  return s > 0 ? (
                    <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border", color)}>
                      {s}
                    </span>
                  ) : <span className="text-slate-300 text-xs">—</span>;
                })()}
              </td>
              <td className="px-4 py-3 text-slate-600 text-xs">{c.email || "—"}</td>
              <td className="px-4 py-3 text-slate-600 text-xs">{c.phone || "—"}</td>
              {showStats ? (
                <>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{c.total_sent}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-medium">{c.total_replied}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-inlogik-700 font-medium">{c.total_quoted}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {c.total_wins > 0 ? <span className="badge badge-good">★ {c.total_wins}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className={cn(
                      "inline-flex items-center gap-2 text-sm font-semibold tabular-nums",
                      rr >= 60 ? "text-emerald-600" : rr >= 30 ? "text-amber-600" : rr > 0 ? "text-slate-700" : "text-slate-400",
                    )}>
                      {rr > 0 ? `${rr}%` : "—"}
                      {rr > 0 && (
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full", rr >= 60 ? "bg-emerald-500" : rr >= 30 ? "bg-amber-500" : "bg-slate-300")} style={{ width: `${Math.min(100, rr)}%` }} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(c.last_reply_at)}</td>
                </>
              ) : (
                <td className="px-4 py-3">
                  {c.blacklisted ? <span className="badge badge-bad">🚫 Заблокирован</span>
                    : c.opted_out ? <span className="badge badge-warn">Opt-out</span>
                    : c.total_sent > 0 ? <span className="badge badge-good">Активный</span>
                    : <span className="badge badge-muted">Без активности</span>}
                </td>
              )}
              <td className="px-2 py-3">
                <button
                  onClick={() => onQuickNote(c.id, c.name)}
                  className="p-1.5 text-slate-300 hover:text-inlogik-600 hover:bg-inlogik-50 rounded transition group-hover:text-slate-400"
                  title="Добавить заметку"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </button>
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={showStats ? 10 : 5} className="px-4 py-12 text-center text-slate-400 text-sm">
              Ничего не найдено
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// ─── Add Contractor Modal ────────────────────────────────────────────────
function AddContractorModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    contact_name: "", contact_language: "ru", has_contract: false, notes: "",
    transport_modes: [] as string[],
    origin_countries: "", dest_countries: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));
  const toggleMode = (mode: string) => setForm((f) => ({
    ...f,
    transport_modes: f.transport_modes.includes(mode)
      ? f.transport_modes.filter((m) => m !== mode)
      : [...f.transport_modes, mode],
  }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Название и email обязательны");
      return;
    }
    if (form.transport_modes.length === 0) {
      setError("Выберите хотя бы один вид транспорта");
      return;
    }
    setSaving(true);
    setError("");
    setDuplicate(null);
    try {
      const res = await fetch("/api/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 409 && data.existing_id) {
        setDuplicate({ id: data.existing_id, name: data.existing_name });
        return;
      }
      if (!res.ok) {
        setError(data.error || "Ошибка при сохранении");
        return;
      }
      onAdded();
    } catch (e: any) {
      setError(e.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Добавить подрядчика</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Name + Email */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Название компании *</label>
              <input
                value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="ООО Логистика"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-inlogik-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Email *</label>
              <input
                type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                placeholder="sales@company.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-inlogik-400"
              />
            </div>
          </div>

          {/* Contact name + Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Контактное лицо</label>
              <input
                value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)}
                placeholder="Иван Петров"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-inlogik-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Язык</label>
              <select
                value={form.contact_language} onChange={(e) => set("contact_language", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-inlogik-400"
              >
                <option value="ru">🇷🇺 Русский</option>
                <option value="en">🇬🇧 English</option>
                <option value="cn">🇨🇳 中文</option>
              </select>
            </div>
          </div>

          {/* Phone + Contract */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Телефон <span className="text-slate-400 font-normal">(опц.)</span></label>
              <input
                value={form.phone} onChange={(e) => set("phone", e.target.value)}
                placeholder="+7 999 123-45-67"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-inlogik-400"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={form.has_contract}
                  onChange={(e) => set("has_contract", e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-inlogik-500 focus:ring-inlogik-400"
                />
                <span className="text-sm text-slate-700">Есть договор</span>
              </label>
            </div>
          </div>

          {/* Transport modes */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Виды транспорта *</label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "auto", label: "🚛 Авто" },
                { key: "rail", label: "🚂 ЖД" },
                { key: "sea", label: "🚢 Море" },
                { key: "air", label: "✈️ Авиа" },
                { key: "assembly", label: "📦 Сборка" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMode(key)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                    form.transport_modes.includes(key)
                      ? "bg-inlogik-500 text-white border-inlogik-500"
                      : "bg-white text-slate-600 border-slate-200 hover:border-inlogik-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Routes */}
          {form.transport_modes.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Откуда <span className="text-slate-400 font-normal">(опц.)</span></label>
                <input
                  value={form.origin_countries} onChange={(e) => set("origin_countries", e.target.value)}
                  placeholder="CN, TR, EU..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-inlogik-400"
                />
                <div className="text-[11px] text-slate-400 mt-1">Через запятую: CN, TR, DE</div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Куда <span className="text-slate-400 font-normal">(опц.)</span></label>
                <input
                  value={form.dest_countries} onChange={(e) => set("dest_countries", e.target.value)}
                  placeholder="RU, KZ..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-inlogik-400"
                />
                <div className="text-[11px] text-slate-400 mt-1">Через запятую: RU, KZ</div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Заметка <span className="text-slate-400 font-normal">(опц.)</span></label>
            <textarea
              value={form.notes} onChange={(e) => set("notes", e.target.value)}
              placeholder="Специализация, маршруты, особенности…"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-inlogik-400 resize-none"
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-rose-50 text-rose-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          {duplicate && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="text-sm text-amber-800">
                Подрядчик с таким email уже есть: <span className="font-semibold">{duplicate.name}</span>
              </div>
              <div className="text-sm text-amber-700">
                Посмотрите его карточку — если нужно, добавьте больше информации.
              </div>
              <Link
                href={`/contractors/${duplicate.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-200 transition"
              >
                Открыть карточку →
              </Link>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-inlogik-500 text-white rounded-xl text-sm font-medium hover:bg-inlogik-600 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Сохраняю…" : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}

