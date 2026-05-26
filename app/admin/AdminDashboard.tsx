"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Inbox,
  Mail,
  MessageSquare,
  Package,
  ShieldAlert,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import type { SystemMetrics, AuditEvent, FunnelStep } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";

const PRESETS = [
  { label: "24 ч", hours: 24 },
  { label: "48 ч", hours: 48 },
  { label: "7 дней", hours: 168 },
] as const;

type PeriodHours = 24 | 48 | 168;

type DashboardData = {
  metrics: SystemMetrics;
  funnel: FunnelStep[];
  audit: AuditEvent[];
};

export default function AdminDashboard({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const [hours, setHours] = useState<PeriodHours>(24);
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  // Cache per period so switching back doesn't re-fetch unnecessarily
  const cache = useRef<Partial<Record<PeriodHours, DashboardData>>>({
    24: initialData,
  });

  useEffect(() => {
    if (cache.current[hours]) {
      setData(cache.current[hours]!);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/requests?hours=${hours}`).then((r) => r.json()),
      fetch(`/api/admin/funnel`).then((r) => r.json()),
    ])
      .then(([reqJson, funnelJson]) => {
        const merged: DashboardData = {
          metrics: reqJson.metrics ?? data.metrics,
          funnel: funnelJson.funnel ?? data.funnel,
          audit: data.audit, // audit is not time-windowed, keep as-is
        };
        cache.current[hours] = merged;
        setData(merged);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours]);

  const { metrics, funnel, audit } = data;
  const funnelMax = Math.max(...funnel.map((f) => Number(f.count)), 1);
  const label = PRESETS.find((p) => p.hours === hours)?.label ?? "24 ч";

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">Админ</h1>
              <span className="badge badge-muted">служебное</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Pipeline, ошибки, метрики автоматизации. Не для логистов.
            </p>
          </div>

          {/* Переключатель окна */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {PRESETS.map((p) => (
              <button
                key={p.hours}
                onClick={() => setHours(p.hours as PeriodHours)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  p.hours === hours
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          За последние {label}{" "}
          {loading && <span className="text-xs font-normal text-slate-400 ml-1">обновляется...</span>}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Запросов" value={metrics.requests_24h} icon={Inbox} accent />
          <StatCard label="Писем отправлено" value={metrics.outreach_sent_24h} icon={Mail} />
          <StatCard label="Ответов" value={metrics.inbound_received_24h} icon={MessageSquare} />
          <StatCard label="Ставок получено" value={metrics.quotes_received_24h} icon={Package} trend="good" />
          <StatCard label="Выбрано лучших" value={metrics.selected_24h} icon={Star} trend={Number(metrics.selected_24h) > 0 ? "good" : "warn"} />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Ошибки ({label})</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Не доставлены" value={metrics.outreach_failed_24h} icon={XCircle} trend={Number(metrics.outreach_failed_24h) > 0 ? "bad" : "good"} />
          <StatCard label="Bounces" value={metrics.bounced_24h} icon={AlertTriangle} trend={Number(metrics.bounced_24h) > 0 ? "warn" : "good"} />
          <StatCard label="AI отказался писать" value={metrics.ai_refusals_24h} icon={ShieldAlert} trend={Number(metrics.ai_refusals_24h) > 0 ? "warn" : "good"} meta="OpenAI policy blocks" />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Воронка за 7 дней</h2>
        <div className="card-padded">
          <div className="space-y-3">
            {funnel.map((step) => {
              const pct = (Number(step.count) / funnelMax) * 100;
              return (
                <div key={step.step} className="flex items-center gap-4">
                  <div className="w-56 shrink-0 text-sm text-slate-700">{step.step}</div>
                  <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
                    <div className="h-full bg-inlogik-500 transition-all" style={{ width: `${pct}%` }} />
                    <div className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-white mix-blend-difference">
                      {step.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">База данных</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Контракторов всего"
            value={metrics.contractors_total}
            icon={Users}
            meta={`Чёрный список: ${metrics.contractors_blacklisted}, Opt-out: ${metrics.contractors_opted_out}`}
          />
          <StatCard label="Запросов всего" value={metrics.requests_total} icon={Inbox} />
          <StatCard label="Ставок всего" value={metrics.quotes_total} icon={Package} />
          <StatCard label="Активность" value="LIVE" icon={Activity} trend="good" accent meta="WF-1..6 онлайн" />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Последние события системы</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Время</th>
                <th className="text-left px-4 py-3">Тип</th>
                <th className="text-left px-4 py-3">Событие</th>
                <th className="text-left px-4 py-3">Детали</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audit.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                    Событий пока нет
                  </td>
                </tr>
              ) : (
                audit.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(a.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-muted">{a.entity_type}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{a.event}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-md truncate">
                      {a.details ? JSON.stringify(a.details) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
