import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock, Flame, Mail, MessageCircle, Package, Users, ClipboardList } from "lucide-react";
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

export function RequestCard({ r }: { r: RequestRow }) {
  const total = r.outreach_sent + r.outreach_pending;
  const sentPct = total > 0 ? (r.outreach_sent / total) * 100 : 0;
  const repliedPct = total > 0 ? (r.outreach_replied / total) * 100 : 0;
  const quotedPct = total > 0 ? (Number(r.quotes_count) / total) * 100 : 0;

  const statusBadge = requestStatusBadge(r.status);
  const isHot = r.quotes_count >= 5;
  const hasSelected = (r as any).has_selected_quote || (r as any).selected_quote_id;
  const urgency = urgencyBadge(r.hours_elapsed, r.quotes_count);

  const isOverdue = r.hours_elapsed !== null && Number(r.hours_elapsed) > 24 && Number(r.quotes_count) < 3;
  const isStale = !isOverdue && r.hours_elapsed !== null && Number(r.hours_elapsed) > 8 && Number(r.quotes_count) < 3;
  const needsData = r.status === "new" && r.outreach_sent === 0 && (r.last_error?.includes("incomplete") || !r.ai_transport_mode || !r.ai_origin_country || !r.ai_dest_country);
  const missingFields = r.ai_missing_fields?.length ? r.ai_missing_fields : 
    r.last_error?.replace("incomplete_data:", "").trim().split(",").map(s => s.trim()).filter(Boolean) || [];

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

  return (
    <Link
      href={`/requests/${encodeURIComponent(r.request_code)}`}
      className="block group"
    >
      <div className={cn(
        "card p-5 hover:shadow-md transition",
        needsData && "border-violet-300 ring-1 ring-violet-100 hover:border-violet-400",
        isOverdue && !needsData && "border-rose-300 ring-1 ring-rose-200 hover:border-rose-400",
        isStale && !isOverdue && !needsData && "border-amber-200 hover:border-amber-300",
        isHot && !isOverdue && !isStale && "ring-1 ring-inlogik-300 hover:border-inlogik-200",
        !isOverdue && !isStale && !isHot && "hover:border-inlogik-200",
      )}>
        {/* Needs data strip */}
        {needsData && (
          <div className="-mx-5 -mt-5 mb-3 px-5 py-1.5 bg-violet-50 border-b border-violet-200 flex items-center justify-between gap-2 rounded-t-xl">
            <div className="flex items-center gap-2 min-w-0">
              <ClipboardList className="h-3.5 w-3.5 text-violet-500 shrink-0" />
              <span className="text-xs font-medium text-violet-700 truncate">
                Нужны данные для рассылки
                {missingFields.length > 0 && `: ${missingFields.slice(0,2).join(", ")}${missingFields.length > 2 ? ` +${missingFields.length-2}` : ""}`}
              </span>
            </div>
            <span className="text-xs text-violet-500 shrink-0 font-medium">Дополнить →</span>
          </div>
        )}
        {/* Urgency strip */}
        {isOverdue && !needsData && (
          <div className="-mx-5 -mt-5 mb-3 px-5 py-1.5 bg-rose-50 border-b border-rose-200 flex items-center gap-2 rounded-t-xl">
            <Flame className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-xs font-medium text-rose-700">Просрочено — {formatHours(r.hours_elapsed)} без достаточного отклика</span>
          </div>
        )}
        {isStale && !needsData && (
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
              <h3 className="font-semibold text-slate-900 text-base">
                REQ-{r.request_code}
              </h3>
              <span className={`badge ${statusBadge.klass}`}>{statusBadge.label}</span>
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
          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-inlogik-500 transition shrink-0" />
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
              {receivedLabel && (
                <span className="text-slate-400">{receivedLabel}</span>
              )}
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
  );
}
