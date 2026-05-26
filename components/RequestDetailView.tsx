"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Truck, MapPin, FileText, Star, Paperclip, ChevronDown, ChevronRight, ClipboardList } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/use-realtime";
import { LiveIndicator } from "./LiveIndicator";
import { CompleteRequestModal } from "./CompleteRequestModal";
import {
  cn,
  formatPrice,
  formatDateTime,
  outreachStatusBadge,
  transportIcon,
} from "@/lib/utils";

function fixEncoding(text: string): string {
  if (!text) return "";
  if (/Ð|Ñ/.test(text)) {
    try {
      const bytes = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
      const decoded = new TextDecoder("utf-8").decode(bytes);
      if (!/Ð{2,}|Ñ{2,}/.test(decoded)) return decoded;
    } catch {}
  }
  return text;
}

// ─── 1С request text parser ──────────────────────────────────────────────────
function OneСRequestBlock({ raw }: { raw: string }) {
  const text = fixEncoding(raw);
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const pairs: { label: string; value: string }[] = [];
  const extras: string[] = [];

  for (const line of lines) {
    const m = line.match(/^([^:=]{2,50})[:=](.+)$/);
    if (m) {
      pairs.push({ label: m[1].trim(), value: m[2].trim() });
    } else if (line.length > 0) {
      extras.push(line);
    }
  }

  if (pairs.length >= 2) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Запрос из 1С</span>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {pairs.map((p, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-4 py-2 text-xs font-medium text-slate-500 whitespace-nowrap w-40 border-r border-slate-100">
                    {p.label}
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-800">{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {extras.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500 whitespace-pre-wrap">
              {extras.join("\n")}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <details className="mt-4 pt-4 border-t border-slate-100">
      <summary className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer hover:text-inlogik-600 select-none">
        <ClipboardList className="h-4 w-4" />
        Запрос из 1С
      </summary>
      <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-72 overflow-y-auto leading-relaxed">
        {text}
      </div>
    </details>
  );
}

// ─── Expandable clarification card ───────────────────────────────────────────
const CLAMP_LINES = 4;
const APPROX_LINE_HEIGHT_PX = 22; // ~1.5rem

function ClarificationCard({ cl }: { cl: any }) {
  const [expanded, setExpanded] = useState(false);
  const text = fixEncoding(cl.body_text || "");

  // Estimate if text is long enough to need a toggle
  const lineCount = text.split("\n").length + Math.floor(text.length / 80);
  const needsToggle = lineCount > CLAMP_LINES;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <span className="font-medium text-slate-900 text-sm">
          {cl.contractor?.name || "—"}
        </span>
        <span className="text-xs text-slate-400">
          {formatDateTime(cl.received_at)}
        </span>
      </div>

      <div
        className={cn(
          "text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg leading-relaxed transition-all",
          !expanded && needsToggle && "overflow-hidden",
        )}
        style={!expanded && needsToggle
          ? { maxHeight: `${CLAMP_LINES * APPROX_LINE_HEIGHT_PX}px` }
          : undefined
        }
      >
        {text}
      </div>

      {needsToggle && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-inlogik-600 hover:text-inlogik-800 py-1.5 rounded-md hover:bg-inlogik-50 transition"
        >
          {expanded ? (
            <><ChevronDown className="h-3.5 w-3.5" /> Свернуть</>
          ) : (
            <><ChevronRight className="h-3.5 w-3.5" /> Показать полностью</>
          )}
        </button>
      )}
    </div>
  );
}

export function RequestDetailView({
  code,
  initialData,
}: {
  code: string;
  initialData: any;
}) {
  const [data, setData] = useState<any>(initialData);
  const [isLive, setIsLive] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${encodeURIComponent(code)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const fresh = await res.json();
      setData(fresh);
      setLastUpdated(new Date());
    } catch (e) {
      console.warn("refresh failed", e);
    }
  }, [code]);

  useRealtimeRefresh(
    ["quotes", "outreach_messages", "inbound_messages", "requests"],
    refresh,
    true,
  );

  useEffect(() => {
    const t = setTimeout(() => setIsLive(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const i = setInterval(refresh, 60_000);
    return () => clearInterval(i);
  }, [refresh]);

  const { request: r, outreach, quotes, clarifications } = data;
  const bestQuote = quotes.find((q: any) => q.is_best || q.is_selected) || quotes[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-inlogik-700"
        >
          <ArrowLeft className="h-4 w-4" /> Назад к списку
        </Link>
        <LiveIndicator isLive={isLive} lastUpdated={lastUpdated} />
      </div>


      {/* Needs data banner */}
      {r.status === "new" && !r.sent_at && (r.last_error?.includes("incomplete") || !r.ai_transport_mode || !r.ai_origin_country) && (
        <div className="mb-4 flex items-center justify-between gap-4 px-5 py-3 bg-violet-50 border border-violet-200 rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="h-4 w-4 text-violet-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-violet-800">Рассылка не запущена — нужны данные</p>
              {r.last_error && (
                <p className="text-xs text-violet-600 mt-0.5">{r.last_error.replace("incomplete_data:", "Не хватает:")}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowCompleteModal(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-xl transition"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Дополнить
          </button>
        </div>
      )}
      <header className="card-padded">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl">{transportIcon(r.ai_transport_mode)}</span>
              <h1 className="text-2xl font-semibold text-slate-900">
                REQ-{r.request_code}
              </h1>
              <span className="badge badge-inlogik">{r.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <Field icon={MapPin} label="Маршрут">
                {r.ai_origin_city || "?"}
                {r.ai_origin_country && ` (${r.ai_origin_country})`}
                {" → "}
                {r.ai_dest_city || "?"}
                {r.ai_dest_country && ` (${r.ai_dest_country})`}
              </Field>
              <Field icon={Package} label="Груз">{r.ai_cargo_name || "—"}</Field>
              <Field icon={Truck} label="Условия">
                {r.ai_incoterms || "—"}
                {r.ai_container_type && ` · ${r.ai_container_type}`}
              </Field>
              <Field icon={FileText} label="Клиент">
                {r.customer || "—"}
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <Field label="Вес">
                {r.ai_weight_kg ? `${r.ai_weight_kg} кг` : "—"}
              </Field>
              <Field label="Объём">
                {r.ai_volume_cbm ? `${r.ai_volume_cbm} м³` : "—"}
              </Field>
              <Field label="Мест">{r.ai_pieces || "—"}</Field>
              <Field label="Получен">{formatDateTime(r.received_at)}</Field>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span>👤 Логист: <b className="text-slate-700">{r.logist || "—"}</b></span>
              <span>✍️ Автор: <b className="text-slate-700">{r.author || "—"}</b></span>
            </div>
          </div>
        </div>

        {r.request_text && <OneСRequestBlock raw={r.request_text} />}
      </header>

      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Ставки ({quotes.length})
        </h2>
        {quotes.length === 0 ? (
          <div className="card p-8 text-center text-slate-500 text-sm">
            Пока ставок нет — ждём ответы
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map((q: any) => {
              const isBest =
                q.is_best ||
                q.is_selected ||
                (q.id === bestQuote?.id && quotes.length > 1);
              const isExpanded = expandedQuoteId === q.id;
              const attachments = Array.isArray(q.attachment_urls) ? q.attachment_urls : [];

              return (
                <div
                  key={q.id}
                  className={cn(
                    "card overflow-hidden",
                    isBest && "ring-1 ring-inlogik-300 bg-inlogik-50/30",
                  )}
                >
                  <div className="p-4 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      {isBest && (
                        <Star className="h-5 w-5 fill-inlogik-500 text-inlogik-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium text-slate-900">
                          {q.contractor?.name || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {q.contractor?.email || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 flex-wrap">
                      <div>
                        <div className="text-xs text-slate-500">Цена</div>
                        <div className="font-semibold text-slate-900 tabular-nums">
                          {formatPrice(q.price, q.currency)}
                          {q.price_unit && q.price_unit !== "total" && (
                            <span className="text-xs text-slate-500 ml-1">
                              /{q.price_unit.replace("per_", "")}
                            </span>
                          )}
                        </div>
                        {q.estimated_total && (
                          <div className="text-xs text-inlogik-700 font-medium">
                            ~{formatPrice(q.estimated_total, q.currency)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Условия</div>
                        <div className="text-sm text-slate-700">
                          {q.incoterms || "—"}
                          {q.container_type && (
                            <div className="text-xs text-slate-500">{q.container_type}</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Срок</div>
                        <div className="text-sm text-slate-700">
                          {q.transit_days_min && q.transit_days_max
                            ? `${q.transit_days_min}–${q.transit_days_max} дн`
                            : q.transit_days
                            ? `${q.transit_days} дн`
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Получено</div>
                        <div className="text-xs text-slate-700">
                          {formatDateTime(q.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {q.hidden_cost_warnings && q.hidden_cost_warnings.length > 0 && (
                    <div className="px-4 pb-3">
                      <ul className="text-xs text-amber-700 space-y-1 bg-amber-50 p-2 rounded border-l-2 border-amber-300">
                        {q.hidden_cost_warnings.map((w: string, i: number) => (
                          <li key={i}>⚠️ {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {q.notes && (
                    <div className="px-4 pb-3">
                      <div className="text-xs text-slate-500 mb-1">Заметка от парсера:</div>
                      <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                        {fixEncoding(q.notes)}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setExpandedQuoteId(isExpanded ? null : q.id)}
                    className="w-full px-4 py-2 text-xs text-inlogik-600 hover:bg-inlogik-50 border-t border-slate-100 flex items-center justify-center gap-1 transition"
                  >
                    {isExpanded ? (
                      <><ChevronDown className="h-3 w-3" /> Скрыть письмо подрядчика</>
                    ) : (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        Показать полный текст письма
                        {attachments.length > 0 && ` + вложения (${attachments.length})`}
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                      <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                          Текст письма
                        </div>
                        <div className="text-sm text-slate-800 whitespace-pre-wrap bg-white p-3 rounded border border-slate-200 max-h-96 overflow-y-auto leading-relaxed">
                          {fixEncoding(q.email_body || q.notes || "Текст письма не сохранён")}
                        </div>
                      </div>

                      {attachments.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                            Вложения ({attachments.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {attachments.map((a: any, i: number) => {
                              const url = typeof a === "string" ? a : a.url || a.public_url || "";
                              const name = typeof a === "object" ? (a.filename || a.name || `Файл ${i + 1}`) : `Файл ${i + 1}`;
                              if (!url) return null;
                              return (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-inlogik-300 hover:text-inlogik-700 transition"
                                >
                                  <Paperclip className="h-3.5 w-3.5" />
                                  {name}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {clarifications && clarifications.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            💬 Уточняющие вопросы от подрядчиков ({clarifications.length})
          </h2>
          <div className="space-y-2">
            {clarifications.map((cl: any) => (
              <ClarificationCard key={cl.id} cl={cl} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Рассылка ({outreach.length})
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 w-12">#</th>
                <th className="text-left px-4 py-3">Подрядчик</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Волна</th>
                <th className="text-left px-4 py-3">Статус</th>
                <th className="text-left px-4 py-3">Отправлено</th>
                <th className="text-left px-4 py-3">Ответил</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {outreach.map((o: any) => {
                const badge = outreachStatusBadge(o.status);
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3 text-slate-400 tabular-nums">
                      {o.rank || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {o.contractor?.id ? (
                        <Link
                          href={`/contractors/${o.contractor.id}`}
                          className="hover:text-inlogik-700"
                        >
                          {o.contractor?.name || "—"}
                        </Link>
                      ) : (
                        o.contractor?.name || "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {o.contractor?.email || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-muted">W{o.wave}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${badge.klass}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(o.sent_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(o.replied_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
  icon: Icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: any;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="text-slate-900 mt-1">{children}</div>

      {showCompleteModal && (
        <CompleteRequestModal
          request={r as any}
          onClose={() => setShowCompleteModal(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}