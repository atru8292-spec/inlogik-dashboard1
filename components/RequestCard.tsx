"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock, Flame, Mail, MessageCircle, Package, Users, Archive } from "lucide-react";
import type { RequestRow } from "@/lib/queries";
import { cn, formatHours, transportIcon, requestStatusBadge } from "@/lib/utils";

function urgencyBadge(hoursElapsed: number | null, quotesCount: number) {
  if (hoursElapsed === null) return null;
  const h = Number(hoursElapsed);
  const q = Number(quotesCount);
  if (h > 24 && q < 3) return { label: "🚨 Просрочено", klass: "badge badge-bad" };
  if (h > 8 && q < 3) return { label: "⚠️ Мало ответов", klass: "badge badge-warn" };
  if (h <= 2) return { label: "🆕 Только что", klass: "badge badge-good" };
  return null;
}

function Status1CBadge({ status }: { status: string | null | undefined }) {
  if (!status || status.trim() === "") return null;
  const s = status.trim().toLowerCase();
  let klass = "badge-muted";
  if (s.includes("завершен") || s.includes("закрыт")) klass = "bg-slate-200 text-slate-600";
  else if (s.includes("готов")) klass = "badge-good";
  else if (s.includes("расчет") || s.includes("работ")) klass = "badge-inlogik";
  return <span className={`badge ${klass} text-[10px]`}>1С: {status}</span>;
}

export function RequestCard({ r, onArchived }: { r: RequestRow; onArchived?: (id: string) => void }) {
  const [archiving, setArchiving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const total = r.outreach_sent + r.outreach_pending;
  const sentPct = total > 0 ? (r.outreach_sent / total) * 100 : 0;
  const repliedPct = total > 0 ? (r.outreach_replied / total) * 100 : 0;
  const quotedPct = total > 0 ? (Number(r.quotes_count) / total) * 100 : 0;

  const statusBadge = requestStatusBadge(r.status);
  const isHot = r.quotes_count >= 5;
  const hasSelected = (r as any).has_selected_quote || (r as any).selected_quote_id;

  const isOverdue = r.hours_elapsed !== null && Number(r.hours_elapsed) > 24 && Number(r.quotes_count) < 3;
  const isStale = !isOverdue && r.hours_elapsed !== null && Number(r.hours_elapsed) > 8 && Number(r.quotes_count) < 3;

  const receivedAt: string | null = (r as any).received_at || null;
  const receivedLabel = (() => {
    if (!receivedAt) return null;
    const d = new Date(receivedAt);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${hh}:${mm} ${day}.${month}`;
  })();

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setArchiving(true);
    try {
      const res = await fetch("/api/requests/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id }),
      });
      if (res.ok && onArchived) onArchived(r.id);
    } catch (err) {
      console.warn("archive failed", err);
    } finally {
      setArchiving(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="relative group/card">
      <Link
        href={`/requests/${encodeURIComponent(r.request_code)}`}
        className="block"
      >
        <div className={cn(
          "card p-5 hover:shadow-md transition",
          isOverdue && "border-rose-300 ring-1 ring-rose-200 hover:border-rose-400",
          isStale && !isOverdue && "border-amber-200 hover:border-amber-300",
          isHot && !isOverdue && !isStale && "ring-1 ring-inlogik-300 hover:border-inlogik-200",
          !isOverdue && !isStale && !isHot && "hover:border-inlogik-200",
        )}>
          {/* Urgency strip */}
          {isOverdue && (
            <div className="-mx-5 -mt-5 mb-3 px-5 py-1.5 bg-rose-50 border-b border-rose-200 flex items-center gap-2 rounded-t-xl">
              <Flame className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-xs font-medium text-rose-700">Просрочено — {formatHours(r.hours_elapsed)} без достаточного отклика</span>
            </div>
          )}
          {isStale && (
            <div className="-mx-5 -mt-5 mb-3 px-5 py-1.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 rounded-t-xl">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-700">Требует внимания — {formatHours(r.hours_elapsed)}, только {r.quotes_count} ставок</span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg">{transportIcon(r.ai_transport_mode)}</span>
                <h3 className="font-semibold text-slate-900 text-base">REQ-{r.request_code}</h3>
                <span className={`badge ${statusBadge.klass}`}>{statusBadge.label}</span>
                <Status1CBadge status={r.status_1c} />
                {isHot && <span className="badge badge-good">🔥 Хорошая выборка</span>}
                {hasSelected && (
                  <span className="badge inline-flex items-center gap-1" style={{ background: "#d1fae5", color: "#065f46" }}>
                    <CheckCircle2 className="h-3 w-3" /> Ставка выбрана
                  </span>
                )}
              </div>

              <div className="text-sm text-slate-700 mt-1.5 font-medium">
                {r.ai_origin_city || "?"} → {r.ai_dest_city || "?"}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-0.5 text-xs text-slate-500">
                {r.customer && <span>{r.customer}</span>}
                {r.ai_incoterms && <span className="badge badge-muted">{r.ai_incoterms}</span>}
                {r.ai_container_type && <span className="badge badge-muted">{r.ai_container_type}</span>}
              </div>
              {r.ai_cargo_name && (
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  <Package className="inline h-3 w-3 mr-1" />
                  {r.ai_cargo_name}
                </div>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover/card:text-inlogik-500 transition shrink-0" />
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-3 text-slate-600">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {r.outreach_sent}/{total}
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <MessageCircle className="h-3 w-3" /> {r.outreach_replied} ответили
                </span>
                <span className="flex items-center gap-1 text-inlogik-600 font-medium">
                  💰 {r.quotes_count} ставок
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                {receivedLabel && <span className="text-slate-400">{receivedLabel}</span>}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatHours(r.hours_elapsed)}
                </span>
              </div>
            </div>

            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div className="bg-inlogik-500" style={{ width: `${quotedPct}%` }} />
              <div className="bg-emerald-300" style={{ width: `${Math.max(0, repliedPct - quotedPct)}%` }} />
              <div className="bg-inlogik-100" style={{ width: `${Math.max(0, sentPct - repliedPct)}%` }} />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
            <span>
              <Users className="inline h-3 w-3 mr-1" />
              Логист: <span className="text-slate-700">{r.logist || "—"}</span>
            </span>
            <span>
              Автор: <span className="text-slate-700">{r.author || "—"}</span>
            </span>
          </div>
        </div>
      </Link>

      {/* Archive button — appears on hover */}
      <div className="absolute top-3 right-12 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
        {!showConfirm ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-300 shadow-sm transition"
            title="Убрать из дашборда"
          >
            <Archive className="h-3 w-3" />
          </button>
        ) : (
          <div
            className="bg-white rounded-lg shadow-lg border border-slate-200 p-3 w-56"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-slate-600 mb-2">Убрать запрос из дашборда? Данные сохранятся.</p>
            <div className="flex gap-1.5 justify-end">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(false); }}
                className="px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 rounded transition"
              >
                Нет
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="px-2 py-1 text-[11px] bg-rose-500 text-white rounded hover:bg-rose-600 disabled:opacity-50 transition font-medium"
              >
                {archiving ? "…" : "Убрать"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
