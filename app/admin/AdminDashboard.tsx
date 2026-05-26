"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Pencil,
  Settings,
  ShieldAlert,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import type { SystemMetrics, AuditEvent, FunnelStep } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

type ConfigItem = {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
};

// ── Config label mapping ──────────────────────────────────────────────────
const CONFIG_LABELS: Record<string, { label: string; hint: string; type: "text" | "number" | "toggle" }> = {
  test_mode: { label: "Тест-режим", hint: "Все письма на test_email", type: "toggle" },
  test_email: { label: "Тестовый email", hint: "Куда шлём в тест-режиме", type: "text" },
  cooldown_after_send_hours: { label: "Cooldown (часы)", hint: "Пауза после отправки подрядчику", type: "number" },
  antispam_batch_size: { label: "Антиспам: батч", hint: "Писем в одном батче", type: "number" },
  antispam_batch_delay_sec: { label: "Антиспам: пауза батч", hint: "Секунды между батчами", type: "number" },
  antispam_message_delay_sec: { label: "Антиспам: пауза письмо", hint: "Секунды между письмами", type: "number" },
  no_response_after_hours: { label: "Без ответа (часы)", hint: "Когда считать no_response", type: "number" },
  fallback_escalate_hours: { label: "Эскалация (часы)", hint: "Через сколько эскалация логисту", type: "number" },
  fallback_remind_hours: { label: "Напоминание (часы)", hint: "Повторное напоминание", type: "number" },
  wave2_after_hours: { label: "Wave 2 (часы)", hint: "Запуск второй волны", type: "number" },
  wave3_after_hours: { label: "Wave 3 (часы)", hint: "Запуск третьей волны", type: "number" },
  notify_telegram_chat_id: { label: "TG Chat ID", hint: "ID канала уведомлений", type: "text" },
};

// ── Config editor section ─────────────────────────────────────────────────
function ConfigEditor() {
  const [config, setConfig] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((d) => setConfig(d.config || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: editValue }),
      });
      if (res.ok) {
        setConfig((prev) =>
          prev.map((c) => (c.key === key ? { ...c, value: editValue, updated_at: new Date().toISOString() } : c))
        );
        setSaved(key);
        setEditingKey(null);
        setTimeout(() => setSaved(null), 2000);
      }
    } catch (e) {
      console.error("save config failed", e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (key: string, currentValue: string) => {
    const newValue = currentValue === "true" ? "false" : "true";
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newValue }),
      });
      if (res.ok) {
        setConfig((prev) =>
          prev.map((c) => (c.key === key ? { ...c, value: newValue, updated_at: new Date().toISOString() } : c))
        );
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
      }
    } catch (e) {
      console.error("toggle config failed", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-8 text-center text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
        Загрузка настроек…
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="text-left px-4 py-3">Параметр</th>
            <th className="text-left px-4 py-3">Значение</th>
            <th className="text-left px-4 py-3 hidden lg:table-cell">Описание</th>
            <th className="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {config.map((c) => {
            const meta = CONFIG_LABELS[c.key];
            const isEditing = editingKey === c.key;
            const isSaved = saved === c.key;
            const isToggle = meta?.type === "toggle";

            return (
              <tr key={c.key} className={cn("hover:bg-slate-50/50", isSaved && "bg-emerald-50/50")}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800 text-xs">{meta?.label || c.key}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{c.key}</div>
                </td>
                <td className="px-4 py-3">
                  {isToggle ? (
                    <button
                      onClick={() => handleToggle(c.key, c.value)}
                      disabled={saving}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        c.value === "true" ? "bg-inlogik-500" : "bg-slate-300",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                          c.value === "true" ? "translate-x-6" : "translate-x-1",
                        )}
                      />
                    </button>
                  ) : isEditing ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(c.key);
                        if (e.key === "Escape") setEditingKey(null);
                      }}
                      type={meta?.type === "number" ? "number" : "text"}
                      className="w-full px-2 py-1 text-sm border border-inlogik-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-inlogik-200"
                    />
                  ) : (
                    <span
                      className={cn(
                        "text-sm tabular-nums",
                        c.value === "true" ? "text-emerald-600 font-medium" : c.value === "false" ? "text-slate-400" : "text-slate-700",
                      )}
                    >
                      {c.value}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                  {meta?.hint || c.description || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {isToggle ? (
                    isSaved && <Check className="h-4 w-4 text-emerald-500 inline-block" />
                  ) : isEditing ? (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => handleSave(c.key)}
                        disabled={saving}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => setEditingKey(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    isSaved ? (
                      <Check className="h-4 w-4 text-emerald-500 inline-block" />
                    ) : (
                      <button
                        onClick={() => { setEditingKey(c.key); setEditValue(c.value); }}
                        className="p-1.5 text-slate-300 hover:text-inlogik-600 hover:bg-inlogik-50 rounded transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Feedback viewer ───────────────────────────────────────────────────────
function FeedbackSection() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => setItems(d.feedback || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const RATING_EMOJI = ["", "😞", "😐", "🙂", "😊", "🤩"];
  const CAT_LABEL: Record<string, string> = { ui: "Интерфейс", speed: "Скорость", accuracy: "Точность", coverage: "Охват", other: "Другое" };

  if (loading) return <div className="card p-6 text-center text-sm text-slate-400">Загрузка…</div>;
  if (items.length === 0) return <div className="card p-6 text-center text-sm text-slate-400">Отзывов пока нет</div>;

  return (
    <div className="space-y-2">
      {items.map((f: any) => (
        <div key={f.id} className="card p-4">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {f.rating && <span className="text-lg">{RATING_EMOJI[f.rating]}</span>}
              <span className="text-sm font-medium text-slate-800">{f.logist_name || "Аноним"}</span>
              {f.category && <span className="badge badge-muted text-[10px]">{CAT_LABEL[f.category] || f.category}</span>}
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">{formatDateTime(f.created_at)}</span>
          </div>
          <p className="text-sm text-slate-700">{f.message}</p>
          {f.page_url && <p className="text-[11px] text-slate-400 mt-1">Страница: {f.page_url}</p>}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function AdminDashboard({
  initialData,
}: {
  initialData: DashboardData;
}) {
  const [hours, setHours] = useState<PeriodHours>(24);
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Partial<Record<PeriodHours, DashboardData>>>({ 24: initialData });

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
          audit: data.audit,
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
              Pipeline, настройки, ошибки, обратная связь
            </p>
          </div>
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

      {/* ── System Config ── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-400" />
          Настройки системы
        </h2>
        <ConfigEditor />
      </section>

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
          <StatCard label="Контракторов всего" value={metrics.contractors_total} icon={Users} meta={`Чёрный список: ${metrics.contractors_blacklisted}, Opt-out: ${metrics.contractors_opted_out}`} />
          <StatCard label="Запросов всего" value={metrics.requests_total} icon={Inbox} />
          <StatCard label="Ставок всего" value={metrics.quotes_total} icon={Package} />
          <StatCard label="Активность" value="LIVE" icon={Activity} trend="good" accent meta="WF-1..6 онлайн" />
        </div>
      </section>

      {/* ── Feedback ── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          Обратная связь логистов
        </h2>
        <FeedbackSection />
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
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">Событий пока нет</td>
                </tr>
              ) : (
                audit.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                    <td className="px-4 py-3"><span className="badge badge-muted">{a.entity_type}</span></td>
                    <td className="px-4 py-3 font-medium text-slate-700">{a.event}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-md truncate">{a.details ? JSON.stringify(a.details) : "—"}</td>
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
