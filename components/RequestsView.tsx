"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Inbox, TrendingUp, Mail, MessageSquare } from "lucide-react";
import type { RequestRow, SystemMetrics } from "@/lib/queries";
import { useRealtimeRefresh } from "@/lib/use-realtime";
import { StatCard } from "./StatCard";
import { RequestCard } from "./RequestCard";
import { SearchBar } from "./SearchBar";
import { LiveIndicator } from "./LiveIndicator";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "attention" | "hot" | "needs_data";
type SortKey = "time_desc" | "time_asc" | "quotes_desc" | "status";
type PeriodHours = 24 | 48 | 168;

const ACTIVE_STATUSES = ["sent", "parsed", "processing", "queued", "sending", "needs_review", "new"];

const PERIOD_OPTIONS: { value: PeriodHours; label: string }[] = [
  { value: 24, label: "24ч" },
  { value: 48, label: "48ч" },
  { value: 168, label: "7 дней" },
];

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

  const filtered = useMemo(() => {
    let list = requests.filter(
      (r) => r.status !== "archived" && r.status !== "failed",
    );

    if (filter === "active") {
      list = list.filter((r) => ACTIVE_STATUSES.includes(r.status));
    } else if (filter === "attention") {
      list = list.filter(
        (r) =>
          r.hours_elapsed !== null &&
          Number(r.hours_elapsed) > 8 &&
          Number(r.quotes_count) < 3,
      );
    } else if (filter === "hot") {
      list = list.filter((r) => Number(r.quotes_count) >= 5);
    } else if (filter === "needs_data") {
      list = list.filter((r) => r.status === "new" && r.outreach_sent === 0 && (r.last_error?.includes("incomplete") || !r.ai_transport_mode || !r.ai_origin_country));
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
      if (sort === "time_asc") return Number(a.hours_elapsed ?? 0) - Number(b.hours_elapsed ?? 0);
      if (sort === "time_desc") return Number(b.hours_elapsed ?? 0) - Number(a.hours_elapsed ?? 0);
      if (sort === "quotes_desc") return Number(b.quotes_count) - Number(a.quotes_count);
      if (sort === "status") return (a.status ?? "").localeCompare(b.status ?? "");
      return 0;
    });

    return list;
  }, [requests, filter, query, sort]);

  const needsAttention = requests.filter(
    (r) =>
      r.status !== "archived" && r.status !== "failed" &&
      r.hours_elapsed !== null &&
      Number(r.hours_elapsed) > 8 && Number(r.quotes_count) < 3,
  ).length;

  const hotCount = requests.filter((r) => Number(r.quotes_count) >= 5).length;
  const needsDataCount = requests.filter((r) => r.status === "new" && r.outreach_sent === 0 && (r.last_error?.includes("incomplete") || !r.ai_transport_mode || !r.ai_origin_country)).length;

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "time_desc", label: "Новые сначала" },
    { value: "time_asc", label: "Старые сначала" },
    { value: "quotes_desc", label: "Больше ставок" },
    { value: "status", label: "По статусу" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Активные запросы</h1>
          <p className="text-sm text-slate-500 mt-1">
            Запросы на расчёт ставок — обновляются в реальном времени
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector */}
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Запросов" value={metrics.requests_24h} icon={Inbox} accent />
        <StatCard label="Писем отправлено" value={metrics.outreach_sent_24h} icon={Mail} />
        <StatCard
          label="Ставок получено"
          value={metrics.quotes_received_24h}
          icon={MessageSquare}
          meta={`Ответов: ${metrics.inbound_received_24h}`}
        />
        <StatCard
          label="Требуют внимания"
          value={needsAttention}
          icon={TrendingUp}
          trend={needsAttention > 0 ? "warn" : "good"}
          meta={needsAttention > 0 ? "Мало ставок > 8ч" : "Всё в работе"}
        />
      </div>

      <div className="card p-3 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex-1 min-w-0">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Поиск по REQ, клиенту, маршруту, грузу, логисту…"
          />
        </div>
        <div className="flex gap-1.5 shrink-0 overflow-x-auto pb-0.5">
          <FilterChip label="Все" count={requests.length} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip
            label="Активные"
            count={requests.filter((r) => ACTIVE_STATUSES.includes(r.status)).length}
            active={filter === "active"}
            onClick={() => setFilter("active")}
          />
          <FilterChip label="🔥 Хорошая выборка" count={hotCount} active={filter === "hot"} onClick={() => setFilter("hot")} />
          <FilterChip label="⚠️ Требуют внимания" count={needsAttention} active={filter === "attention"} onClick={() => setFilter("attention")} />
          <FilterChip label="📋 Нужны данные" count={needsDataCount} active={filter === "needs_data"} onClick={() => setFilter("needs_data")} warn={needsDataCount > 0} />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-semibold text-slate-800">Найдено: {filtered.length}</h2>
          <div className="flex items-center gap-2">
            {query && (
              <button onClick={() => setQuery("")} className="text-xs text-inlogik-600 hover:text-inlogik-800">
                Сбросить поиск
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
              {query ? `Ничего не найдено по запросу «${query}»` : "Нет запросов в этой категории"}
            </p>
            {query && (
              <button onClick={() => setQuery("")} className="mt-3 text-xs text-inlogik-600 hover:text-inlogik-800">
                Сбросить поиск
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((r) => (
              <RequestCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  label, count, active, onClick, warn,
}: {
  label: string; count: number; active: boolean; onClick: () => void; warn?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition whitespace-nowrap",
        active && !warn ? "bg-inlogik-500 text-white border-inlogik-500" : "",
        active && warn ? "bg-violet-500 text-white border-violet-500" : "",
        !active && warn && count > 0 ? "bg-violet-50 text-violet-700 border-violet-300 hover:border-violet-400" : "",
        !active && (!warn || count === 0) ? "bg-white text-slate-600 border-slate-200 hover:border-inlogik-300 hover:text-inlogik-700" : ""
      )}
    >
      {label} <span className="opacity-70">· {count}</span>
    </button>
  );
}
