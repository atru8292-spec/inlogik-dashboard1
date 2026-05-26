"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Clock, Inbox, Mail, MessageSquare, TrendingUp, ChevronRight, Phone, MessageCircle, Coins, CheckCircle2 } from "lucide-react";
import type { RequestRow, SystemMetrics } from "@/lib/queries";
import { useRealtimeRefresh } from "@/lib/use-realtime";
import { RequestCard } from "./RequestCard";
import { SearchBar } from "./SearchBar";
import { LiveIndicator } from "./LiveIndicator";
import { cn, formatHours, transportIcon } from "@/lib/utils";

type Filter = "all" | "active" | "has_quotes" | "attention";
type SortKey = "time_desc" | "time_asc" | "quotes_desc" | "status";
type PeriodHours = 24 | 48 | 168;

const ACTIVE_STATUSES = ["sent", "parsed", "processing", "queued", "sending", "needs_review", "new"];

const PERIOD_OPTIONS: { value: PeriodHours; label: string }[] = [
  { value: 24, label: "24ч" },
  { value: 48, label: "48ч" },
  { value: 168, label: "7 дней" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "time_desc", label: "Новые сначала" },
  { value: "time_asc", label: "Старые сначала" },
  { value: "quotes_desc", label: "Больше ставок" },
  { value: "status", label: "По статусу" },
];

// ── Action item types ──
type ActionType = "select_quote" | "answer_question" | "needs_call";

function getActions(requests: RequestRow[]): { type: ActionType; r: RequestRow; label: string; sub: string }[] {
  const actions: { type: ActionType; r: RequestRow; label: string; sub: string }[] = [];

  for (const r of requests) {
    if (r.status === "archived" || r.status === "failed") continue;

    const route = `${r.ai_origin_city || "?"} → ${r.ai_dest_city || "?"}`;

    // Has quotes → select best
    if (Number(r.quotes_count) >= 3) {
      actions.push({
        type: "select_quote",
        r,
        label: `REQ-${r.request_code} — ${r.quotes_count} ставок, выберите лучшую`,
        sub: route,
      });
    }

    // Has replies but no quotes → contractors asking questions
    if (Number(r.outreach_replied) > 0 && Number(r.quotes_count) === 0 && ACTIVE_STATUSES.includes(r.status)) {
      actions.push({
        type: "answer_question",
        r,
        label: `REQ-${r.request_code} — ${r.outreach_replied} ответов, подрядчики задают вопросы`,
        sub: route,
      });
    }

    // Overdue, no quotes
    if (r.hours_elapsed && Number(r.hours_elapsed) > 48 && Number(r.quotes_count) === 0) {
      actions.push({
        type: "needs_call",
        r,
        label: `REQ-${r.request_code} — 0 ставок за ${formatHours(r.hours_elapsed)}, нужен звонок`,
        sub: route,
      });
    }
  }

  // Sort: select_quote first (money!), then answer_question, then needs_call
  const order: Record<ActionType, number> = { select_quote: 0, answer_question: 1, needs_call: 2 };
  actions.sort((a, b) => order[a.type] - order[b.type]);

  return actions.slice(0, 6);
}

const ACTION_ICONS: Record<ActionType, React.FC<{ className?: string }>> = {
  select_quote:    Coins,
  answer_question: MessageCircle,
  needs_call:      Phone,
};
const ACTION_STYLES: Record<ActionType, { bg: string; text: string; accent: string }> = {
  select_quote:    { bg: "bg-emerald-50", text: "text-emerald-800", accent: "text-emerald-600" },
  answer_question: { bg: "bg-amber-50",   text: "text-amber-800",   accent: "text-amber-600" },
  needs_call:      { bg: "bg-rose-50",    text: "text-rose-800",    accent: "text-rose-600" },
};

// ══════════════════════════════════════════════════════════════════════════
export function RequestsView({
  initialRequests,
  initialMetrics,
}: {
  initialRequests: RequestRow[];
  initialMetrics: SystemMetrics;
}) {
  const [requests, setRequests] = useState<RequestRow[]>(initialRequests);
  const [metrics, setMetrics] = useState<SystemMetrics>(initialMetrics);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [sort, setSort] = useState<SortKey>("time_desc");
  const [period, setPeriod] = useState<PeriodHours>(24);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refresh = useCallback(async (h?: PeriodHours) => {
    try {
      const hours = h ?? period;
      const res = await fetch(`/api/requests?hours=${hours}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests || []);
      setMetrics(data.metrics || initialMetrics);
      setLastUpdated(new Date());
    } catch (e) {
      console.warn("refresh failed", e);
    }
  }, [initialMetrics, period]);

  const handlePeriodChange = useCallback((h: PeriodHours) => {
    setPeriod(h);
    refresh(h);
  }, [refresh]);

  useRealtimeRefresh(
    ["requests", "quotes", "outreach_messages", "inbound_messages"],
    refresh,
    true,
  );

  useEffect(() => {
    const t = setTimeout(() => setIsLive(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => refresh(), 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const activeCount = requests.filter((r) => ACTIVE_STATUSES.includes(r.status)).length;
  const hasQuotesCount = requests.filter((r) => Number(r.quotes_count) >= 3).length;
  const needsAttention = requests.filter(
    (r) => r.status !== "archived" && r.status !== "failed" &&
      r.hours_elapsed !== null && Number(r.hours_elapsed) > 8 && Number(r.quotes_count) < 3,
  ).length;

  const actions = useMemo(() => getActions(requests), [requests]);

  const filtered = useMemo(() => {
    let list = requests.filter((r) => r.status !== "archived" && r.status !== "failed");

    if (filter === "active") {
      list = list.filter((r) => ACTIVE_STATUSES.includes(r.status));
    } else if (filter === "has_quotes") {
      list = list.filter((r) => Number(r.quotes_count) >= 3);
    } else if (filter === "attention") {
      list = list.filter(
        (r) => r.hours_elapsed !== null && Number(r.hours_elapsed) > 8 && Number(r.quotes_count) < 3,
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter((r) => {
        const hay = [
          r.request_code, r.customer, r.author, r.logist,
          r.ai_origin_city, r.ai_origin_country, r.ai_dest_city,
          r.ai_dest_country, r.ai_cargo_name, r.ai_incoterms,
          r.ai_container_type, r.ai_transport_mode,
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    list = [...list].sort((a, b) => {
      if (sort === "time_desc") return Number(a.hours_elapsed ?? 0) - Number(b.hours_elapsed ?? 0);
      if (sort === "time_asc") return Number(b.hours_elapsed ?? 0) - Number(a.hours_elapsed ?? 0);
      if (sort === "quotes_desc") return Number(b.quotes_count) - Number(a.quotes_count);
      if (sort === "status") return (a.status ?? "").localeCompare(b.status ?? "");
      return 0;
    });

    return list;
  }, [requests, filter, query, sort]);

  const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "24ч";

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Активные запросы</h1>
          <p className="text-sm text-slate-500 mt-0.5">{activeCount} в работе</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => handlePeriodChange(o.value)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition",
                  period === o.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <LiveIndicator isLive={isLive} lastUpdated={lastUpdated} />
        </div>
      </header>

      {/* ── Compact metrics ── */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: `Новых за ${periodLabel}`, value: metrics.requests_24h },
          { label: "Писем", value: metrics.outreach_sent_24h },
          { label: "Ставок", value: metrics.quotes_received_24h },
          { label: "Ответов", value: metrics.inbound_received_24h },
          { label: "Ждут внимания", value: needsAttention, warn: needsAttention > 0 },
        ].map(({ label, value, warn }) => (
          <div key={label} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
            <span className="text-xs text-slate-500">{label}</span>
            <span className={cn("text-base font-semibold tabular-nums", warn ? "text-amber-600" : "text-slate-800")}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Action items ── */}
      {actions.length > 0 && (
        <div className="card-padded">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-slate-800">Что сделать сейчас</span>
            <span className="text-xs text-slate-400">{actions.length}</span>
          </div>
          <div className="space-y-2">
            {actions.map(({ type, r, label, sub }) => {
              const style = ACTION_STYLES[type];
              const Icon = ACTION_ICONS[type];
              const href = type === "answer_question"
                ? "/inbox"
                : `/requests/${encodeURIComponent(r.request_code)}`;
              return (
                <Link
                  key={r.id + type}
                  href={href}
                  className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition hover:scale-[1.01]", style.bg)}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", style.accent)} />
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm font-medium", style.text)}>{label}</span>
                    <span className={cn("text-xs ml-2", style.accent)}>{sub}</span>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 shrink-0", style.accent)} />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Search + filters ── */}
      <div className="card p-3 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex-1 min-w-0">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Поиск по REQ, клиенту, маршруту, грузу, логисту…"
          />
        </div>
        <div className="flex gap-1.5 shrink-0 overflow-x-auto pb-0.5">
          <FilterChip label="Все" count={requests.filter((r) => r.status !== "archived" && r.status !== "failed").length} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip label="Активные" count={activeCount} active={filter === "active"} onClick={() => setFilter("active")} />
          <FilterChip label="Есть ставки" count={hasQuotesCount} active={filter === "has_quotes"} onClick={() => setFilter("has_quotes")} />
          <FilterChip label="Ждут внимания" count={needsAttention} active={filter === "attention"} onClick={() => setFilter("attention")} />
        </div>
      </div>

      {/* ── Request cards ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm text-slate-500">Запросы: {filtered.length}</h2>
          <div className="flex items-center gap-2">
            {query && (
              <button onClick={() => setQuery("")} className="text-xs text-inlogik-600 hover:text-inlogik-800">
                Сбросить
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-inlogik-400 cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-slate-500 text-sm">
              {query ? `Ничего не найдено по «${query}»` : "Нет запросов в этой категории"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((r) => (
              <RequestCard
                key={r.id}
                r={r}
                onArchived={(id) => setRequests((prev) => prev.filter((req) => req.id !== id))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition whitespace-nowrap",
        active
          ? "bg-inlogik-500 text-white border-inlogik-500"
          : "bg-white text-slate-600 border-slate-200 hover:border-inlogik-300 hover:text-inlogik-700"
      )}
    >
      {label} <span className="opacity-70">· {count}</span>
    </button>
  );
}
