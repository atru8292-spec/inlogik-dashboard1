"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Package, Truck, MapPin, FileText, Star, Paperclip,
  ChevronDown, ChevronRight, ClipboardList, Archive, Mail,
  MessageCircle, Clock, CheckCircle2, XCircle, AlertTriangle,
  ArrowUpDown, Globe,
  Sparkles,
  Loader2} from "lucide-react";
import { useRealtimeRefresh } from "@/lib/use-realtime";
import { LiveIndicator } from "./LiveIndicator";
import {
  cn,
  formatPrice,
  formatDateTime,
  outreachStatusBadge,
  transportIcon,
  requestStatusBadge,
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

// ─── Pick the "best" quote ────────────────────────────────────────────────────
// Priority: 1) explicitly marked is_best/is_selected in DB
//           2) cheapest by estimated_total (skip per_kg quotes without estimated_total)
//           3) cheapest by raw price as last resort
function pickBestQuote(quotes: any[]): any | null {
  if (!quotes || quotes.length === 0) return null;

  // 1. Explicit DB flag
  const explicit = quotes.find((q: any) => q.is_best || q.is_selected);
  if (explicit) return explicit;

  // 2. Sort by estimated_total — exclude per_kg without estimated_total (unusable for comparison)
  const comparable = quotes.filter(
    (q: any) =>
      !(q.price_unit === "per_kg" && !q.estimated_total) &&
      Number(q.estimated_total || q.price || 0) > 0
  );

  if (comparable.length > 0) {
    return [...comparable].sort((a, b) => {
      const pa = Number(a.estimated_total || a.price || Infinity);
      const pb = Number(b.estimated_total || b.price || Infinity);
      return pa - pb;
    })[0];
  }

  // 3. Last resort — first quote as before
  return quotes[0];
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
const APPROX_LINE_HEIGHT_PX = 22;

function ClarificationCard({ cl }: { cl: any }) {
  const [expanded, setExpanded] = useState(false);
  const text = fixEncoding(cl.body_text || "");
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
        style={!expanded && needsToggle ? { maxHeight: `${CLAMP_LINES * APPROX_LINE_HEIGHT_PX}px` } : undefined}
      >
        {text}
      </div>
      {needsToggle && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-inlogik-600 hover:text-inlogik-800 py-1.5 rounded-md hover:bg-inlogik-50 transition"
        >
          {expanded ? <><ChevronDown className="h-3.5 w-3.5" /> Свернуть</> : <><ChevronRight className="h-3.5 w-3.5" /> Показать полностью</>}
        </button>
      )}
    </div>
  );
}

// ─── Outreach progress summary ───────────────────────────────────────────────
function OutreachProgress({ outreach }: { outreach: any[] }) {
  const total = outreach.length;
  if (total === 0) return null;

  const sent = outreach.filter((o) => ["sent", "delivered", "read", "replied", "auto_replied", "refused"].includes(o.status)).length;
  const replied = outreach.filter((o) => ["replied", "auto_replied"].includes(o.status)).length;
  const refused = outreach.filter((o) => o.status === "refused").length;
  const bounced = outreach.filter((o) => o.status === "bounced").length;
  const queued = outreach.filter((o) => ["pending", "queued"].includes(o.status)).length;
  const failed = outreach.filter((o) => o.status === "failed").length;

  const sentPct = (sent / total) * 100;
  const repliedPct = (replied / total) * 100;

  const items = [
    { icon: Mail, label: "Отправлено", value: sent, color: "text-inlogik-600" },
    { icon: Clock, label: "В очереди", value: queued, color: "text-slate-500" },
    { icon: MessageCircle, label: "Ответили", value: replied, color: "text-emerald-600" },
    { icon: XCircle, label: "Отказ", value: refused, color: "text-amber-600" },
    { icon: AlertTriangle, label: "Bounced", value: bounced, color: "text-rose-500" },
    ...(failed > 0 ? [{ icon: XCircle, label: "Ошибка", value: failed, color: "text-rose-600" }] : []),
  ];

  return (
    <div className="card-padded">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">Рассылка</span>
        <span className="text-xs text-slate-400">({total} подрядчиков)</span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm mb-3">
        {items.filter((i) => i.value > 0).map(({ icon: Icon, label, value, color }) => (
          <span key={label} className={cn("flex items-center gap-1.5", color)}>
            <Icon className="h-3.5 w-3.5" />
            <span className="font-medium tabular-nums">{value}</span>
            <span className="text-slate-500 text-xs">{label}</span>
          </span>
        ))}
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
        <div className="bg-emerald-500 transition-all" style={{ width: `${repliedPct}%` }} title={`Ответили: ${replied}`} />
        <div className="bg-inlogik-400 transition-all" style={{ width: `${Math.max(0, sentPct - repliedPct)}%` }} title={`Отправлено: ${sent - replied}`} />
        {queued > 0 && <div className="bg-slate-300 transition-all" style={{ width: `${(queued / total) * 100}%` }} title={`В очереди: ${queued}`} />}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
        <span>0%</span>
        <span>{Math.round(repliedPct)}% ответили</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ─── Quotes AI Summary Card ──────────────────────────────────────────────
function QuotesSummaryCard({
  quotes, bestQuote, requestInfo, onBestPicked,
}: {
  quotes: any[];
  bestQuote: any;
  requestInfo?: { route?: string; cargo?: string; incoterms?: string };
  onBestPicked?: (quoteId: string) => void;
}) {
  if (!quotes || quotes.length === 0) return null;

  const [analysis, setAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const prices = quotes
    .map((q: any) => Number(q.estimated_total || q.price))
    .filter((p) => p > 0 && isFinite(p));

  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const currencies = [...new Set(quotes.map((q: any) => q.currency).filter(Boolean))];

  const noTransit = quotes.filter((q: any) => !q.transit_days && !q.transit_days_min).length;
  const warnings: string[] = [];
  if (noTransit > quotes.length / 2) warnings.push(`${noTransit} из ${quotes.length} ставок без срока доставки`);
  if (currencies.length > 1) warnings.push(`разные валюты: ${currencies.join(", ")} — цены приведены приблизительно`);

  // Mixed ports detection
  const terminalDests = quotes
    .map((q: any) => (q.notes || q.contractor?.name || "").match(/(Владивосток|Новороссийск|Санкт-Петербург|СПб|Восточный|Врангель|ВМТП)/i)?.[1] || null)
    .filter(Boolean);
  const uniquePorts = [...new Set(terminalDests)];
  const hasMixedPorts = uniquePorts.length > 1;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysis("");
    try {
      const res = await fetch("/api/analyze-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotes, requestInfo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка анализа");
      setAnalysis(data.analysis);
    } catch (e: any) {
      setAnalysisError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="card-padded mb-4 bg-gradient-to-r from-inlogik-50/50 to-white border-inlogik-200">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-inlogik-500" />
          <span className="text-sm font-semibold text-slate-800">
            Ставок получено: {quotes.length}
          </span>
          {prices.length >= 2 && (
            <span className="text-xs text-slate-400">
              · {formatPrice(minPrice, currencies[0] || "USD")} — {formatPrice(maxPrice, currencies[0] || "USD")}
              · средняя {formatPrice(avgPrice, currencies[0] || "USD")}
            </span>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-inlogik-500 text-white rounded-xl text-sm font-medium hover:bg-inlogik-600 transition disabled:opacity-60"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Анализирую…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {analysis ? "Обновить анализ" : "Провести анализ"}
            </>
          )}
        </button>
      </div>

      {/* Warnings */}
      {(warnings.length > 0 || hasMixedPorts) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {hasMixedPorts && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 flex items-center gap-1">
              ⚠️ Разные порты: {uniquePorts.join(", ")} — сравнение неточное
            </span>
          )}
          {warnings.map((w, i) => (
            <span key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" /> {w}
            </span>
          ))}
        </div>
      )}

      {/* Error */}
      {analysisError && (
        <div className="px-3 py-2 bg-rose-50 text-rose-700 text-sm rounded-xl mb-3">
          {analysisError}
        </div>
      )}

      {/* Analysis result */}
      {analysis && (
        <div className="mt-1 p-4 bg-white border border-inlogik-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-inlogik-500" />
            <span className="text-sm font-semibold text-slate-800">Анализ ставок</span>
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {analysis}
          </div>
        </div>
      )}

      {/* Empty state — before analysis */}
      {!analysis && !analyzing && (
        <div className="text-sm text-slate-400 italic">
          Нажмите «Провести анализ» — AI сравнит все ставки и объяснит какую выбрать и почему.
        </div>
      )}
    </div>
  );
}


// ─── Quotes comparison table ─────────────────────────────────────────────────
type QuoteSortKey = "price" | "transit" | "created";

function QuotesComparisonTable({ quotes, bestQuoteId }: { quotes: any[]; bestQuoteId: string | null }) {
  const [sortKey, setSortKey] = useState<QuoteSortKey>("price");
  const [sortAsc, setSortAsc] = useState(true);
  const [translated, setTranslated] = useState<Record<string, any>>({});
  const [translating, setTranslating] = useState(false);

  if (quotes.length === 0) return null;

  // Check if any text needs translation
  const hasEnglish = quotes.some((q: any) => {
    const texts = [...(q.included || []), ...(q.excluded || []), ...(q.hidden_cost_warnings || [])];
    return texts.some((t: string) => t && (t.match(/[а-яёА-ЯЁ]/g) || []).length / t.length < 0.3);
  });

  const handleTranslateAll = async () => {
    if (translating) return;
    setTranslating(true);
    try {
      const toTranslate: { id: string; included: string[]; excluded: string[]; warnings: string[] }[] = [];
      for (const q of quotes) {
        const inc = (q.included || []).filter((t: string) => t && (t.match(/[а-яёА-ЯЁ]/g) || []).length / t.length < 0.3);
        const exc = (q.excluded || []).filter((t: string) => t && (t.match(/[а-яёА-ЯЁ]/g) || []).length / t.length < 0.3);
        const wrn = (q.hidden_cost_warnings || []).filter((t: string) => t && (t.match(/[а-яёА-ЯЁ]/g) || []).length / t.length < 0.3);
        if (inc.length || exc.length || wrn.length) {
          toTranslate.push({ id: q.id, included: inc, excluded: exc, warnings: wrn });
        }
      }
      if (toTranslate.length === 0) return;

      const allTexts = toTranslate.flatMap(q => [...q.included, ...q.excluded, ...q.warnings]);
      const joined = allTexts.join("\n---\n");

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: joined }),
      });
      const data = await res.json();
      if (!data.translated) return;

      const parts = data.translated.split("\n---\n");
      const result: Record<string, any> = {};
      let idx = 0;

      for (const q of toTranslate) {
        result[q.id] = { included: [], excluded: [], warnings: [] };
        for (let i = 0; i < q.included.length; i++) {
          const origIdx = (quotes.find((qq: any) => qq.id === q.id)?.included || []).indexOf(q.included[i]);
          if (!result[q.id].included) result[q.id].included = [];
          result[q.id].included[origIdx] = parts[idx++] || q.included[i];
        }
        for (let i = 0; i < q.excluded.length; i++) {
          const origIdx = (quotes.find((qq: any) => qq.id === q.id)?.excluded || []).indexOf(q.excluded[i]);
          if (!result[q.id].excluded) result[q.id].excluded = [];
          result[q.id].excluded[origIdx] = parts[idx++] || q.excluded[i];
        }
        for (let i = 0; i < q.warnings.length; i++) {
          const origIdx = (quotes.find((qq: any) => qq.id === q.id)?.hidden_cost_warnings || []).indexOf(q.warnings[i]);
          if (!result[q.id].warnings) result[q.id].warnings = [];
          result[q.id].warnings[origIdx] = parts[idx++] || q.warnings[i];
        }
      }
      setTranslated(result);
    } catch (e) {
      console.warn("translate failed", e);
    } finally {
      setTranslating(false);
    }
  };

  const toggleSort = (key: QuoteSortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...quotes].sort((a, b) => {
    let va: number, vb: number;
    if (sortKey === "price") {
      va = Number(a.estimated_total || a.price || Infinity);
      vb = Number(b.estimated_total || b.price || Infinity);
    } else if (sortKey === "transit") {
      va = Number(a.transit_days || a.transit_days_min || Infinity);
      vb = Number(b.transit_days || b.transit_days_min || Infinity);
    } else {
      va = new Date(a.created_at).getTime();
      vb = new Date(b.created_at).getTime();
    }
    return sortAsc ? va - vb : vb - va;
  });

  const SortHeader = ({ label, col, className }: { label: string; col: QuoteSortKey; className?: string }) => (
    <th
      className={cn("px-3 py-2.5 cursor-pointer hover:text-inlogik-600 select-none transition group", className)}
      onClick={() => toggleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3 opacity-0 group-hover:opacity-100 transition", sortKey === col && "opacity-100 text-inlogik-600")} />
      </span>
    </th>
  );

  return (
    <div className="card table-scroll mb-4">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <Star className="h-4 w-4 text-inlogik-500" />
        <span className="text-sm font-semibold text-slate-800">Сравнение ставок</span>
        <span className="text-xs text-slate-400">({quotes.length})</span>
        {hasEnglish && Object.keys(translated).length === 0 && (
          <button
            onClick={handleTranslateAll}
            disabled={translating}
            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
          >
            <Globe className="h-3.5 w-3.5 inline mr-1" />{translating ? "Перевожу…" : "Перевести на русский"}
          </button>
        )}
        {Object.keys(translated).length > 0 && (
          <button
            onClick={() => setTranslated({})}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600"
          >
            Показать оригинал
          </button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
          <tr>
            <th className="text-left px-3 py-2.5 w-8"></th>
            <th className="text-left px-3 py-2.5">Подрядчик</th>
            <SortHeader label="Цена" col="price" className="text-right" />
            <th className="text-left px-3 py-2.5">Условия</th>
            <th className="text-left px-3 py-2.5">Порт / терминал</th>
            <SortHeader label="Транзит" col="transit" className="text-center" />
            <th className="text-left px-3 py-2.5">Включено / Не включено</th>
            <th className="text-left px-3 py-2.5">Предупреждения</th>
            <SortHeader label="Получено" col="created" className="text-left" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((q, idx) => {
            const isBest = q.is_best || q.is_selected || q.id === bestQuoteId;
            return (
              <tr key={q.id} className={cn(
                "transition",
                isBest && "bg-inlogik-50/40",
                !isBest && "hover:bg-slate-50/50",
              )}>
                <td className="px-3 py-2.5 text-center">
                  {isBest ? (
                    <Star className="h-4 w-4 fill-inlogik-500 text-inlogik-500 inline-block" />
                  ) : (
                    <span className="text-xs text-slate-400 tabular-nums">{idx + 1}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-slate-900 text-sm">{q.contractor?.name || "—"}</div>
                  <div className="text-[11px] text-slate-400">{q.contractor?.email || ""}</div>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className={cn("font-semibold tabular-nums", isBest ? "text-inlogik-700" : "text-slate-900")}>
                    {formatPrice(q.price, q.currency)}
                    {q.price_unit && q.price_unit !== "total" && (
                      <span className="text-[10px] text-slate-400 ml-0.5">/{q.price_unit.replace("per_", "")}</span>
                    )}
                  </div>
                  {q.estimated_total && (
                    <div className="text-[11px] text-inlogik-600 font-medium">~{formatPrice(q.estimated_total, q.currency)}</div>
                  )}
                  {q.local_charges_breakdown && (
                    <div className="text-[10px] text-slate-400 mt-0.5">{q.local_charges_breakdown}</div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="badge badge-muted">{q.incoterms || "—"}</span>
                  {q.container_type && <div className="text-[11px] text-slate-400 mt-0.5">{q.container_type}</div>}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600">
                  {(() => {
                    const portMatch = (q.notes || "").match(/(Владивосток|Новороссийск|Санкт-Петербург|СПб|Восточный|Врангель|ВМТП|Белый Раст|Ворсино|Электроугли)/i)
                      || (q.contractor?.name || "").match(/(Владивосток|Новороссийск|Санкт-Петербург|СПб)/i);
                    const port = portMatch?.[1] || null;
                    return port ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-medium">
                        🚢 {port}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    );
                  })()}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums text-sm">
                  {q.transit_days_min && q.transit_days_max
                    ? <span>{q.transit_days_min}–{q.transit_days_max} дн</span>
                    : q.transit_days
                    ? <span>{q.transit_days} дн</span>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-600 min-w-[180px]">
                  {q.included && q.included.length > 0 && (
                    <div className="text-emerald-600 space-y-0.5">
                      {q.included.map((item: string, i: number) => (
                        <div key={i}>✓ {translated[q.id]?.included?.[i] || item}</div>
                      ))}
                    </div>
                  )}
                  {q.excluded && q.excluded.length > 0 && (
                    <div className="text-rose-500 space-y-0.5 mt-1">
                      {q.excluded.map((item: string, i: number) => (
                        <div key={i}>✗ {translated[q.id]?.excluded?.[i] || item}</div>
                      ))}
                    </div>
                  )}
                  {(!q.included || q.included.length === 0) && (!q.excluded || q.excluded.length === 0) && (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 min-w-[180px]">
                  {q.hidden_cost_warnings && q.hidden_cost_warnings.length > 0 ? (
                    <div className="text-[11px] text-amber-700 space-y-0.5">
                      {q.hidden_cost_warnings.map((w: string, i: number) => (
                        <div key={i}>⚠️ {translated[q.id]?.warnings?.[i] || w}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                  {formatDateTime(q.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Status 1C badge ─────────────────────────────────────────────────────────
function Status1CBadge({ status }: { status: string | null }) {
  if (!status || status.trim() === "") return null;
  const s = status.trim().toLowerCase();
  let klass = "badge-muted";
  if (s.includes("завершен") || s.includes("закрыт")) klass = "bg-slate-200 text-slate-600";
  else if (s.includes("готов")) klass = "badge-good";
  else if (s.includes("расчет") || s.includes("работ")) klass = "badge-inlogik";
  return <span className={`badge ${klass}`}>1С: {status}</span>;
}

// ══════════════════════════════════════════════════════════════════════════════
export function RequestDetailView({
  code,
  initialData,
}: {
  code: string;
  initialData: any;
}) {
  const [data, setData] = useState<any>(initialData);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${encodeURIComponent(code)}`, { cache: "no-store" });
      if (!res.ok) return;
      const fresh = await res.json();
      setData(fresh);
      setLastUpdated(new Date());
    } catch (e) {
      console.warn("refresh failed", e);
    }
  }, [code]);

  useRealtimeRefresh(["quotes", "outreach_messages", "inbound_messages", "requests"], refresh, true);

  useEffect(() => {
    const t = setTimeout(() => setIsLive(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const i = setInterval(refresh, 60_000);
    return () => clearInterval(i);
  }, [refresh]);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const res = await fetch("/api/requests/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.request.id }),
      });
      if (res.ok) {
        router.push("/");
      }
    } catch (e) {
      console.warn("archive failed", e);
    } finally {
      setArchiving(false);
      setShowArchiveConfirm(false);
    }
  };

  const [selectingQuote, setSelectingQuote] = useState<string | null>(null);

  const handleSelectQuote = async (quoteId: string) => {
    setSelectingQuote(quoteId);
    try {
      const res = await fetch("/api/requests/select-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId, request_id: data.request.id }),
      });
      if (res.ok) {
        refresh();
      }
    } catch (e) {
      console.warn("select quote failed", e);
    } finally {
      setSelectingQuote(null);
    }
  };

  const { request: r, outreach, quotes, clarifications } = data;

  // ── Use smart best-quote selection ──
  const bestQuote = pickBestQuote(quotes);

  const statusBadge = requestStatusBadge(r.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-inlogik-700">
          <ArrowLeft className="h-4 w-4" /> Назад к списку
        </Link>
        <div className="flex items-center gap-3">
          <LiveIndicator isLive={isLive} lastUpdated={lastUpdated} />
          {/* Archive button */}
          {r.status !== "archived" && (
            <div className="relative">
              <button
                onClick={() => setShowArchiveConfirm(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-300 transition"
              >
                <Archive className="h-3.5 w-3.5" />
                Убрать
              </button>
              {showArchiveConfirm && (
                <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl shadow-lg border border-slate-200 p-4 w-72">
                  <p className="text-sm text-slate-700 mb-1 font-medium">Убрать запрос из дашборда?</p>
                  <p className="text-xs text-slate-500 mb-3">Запрос получит статус «В архиве» и исчезнет из активных. Данные в базе сохранятся.</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowArchiveConfirm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleArchive}
                      disabled={archiving}
                      className="px-3 py-1.5 text-xs bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 transition font-medium"
                    >
                      {archiving ? "Убираю…" : "Да, убрать"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <header className="card-padded">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl">{transportIcon(r.ai_transport_mode)}</span>
              <h1 className="text-2xl font-semibold text-slate-900">REQ-{r.request_code}</h1>
              <span className={`badge ${statusBadge.klass}`}>{statusBadge.label}</span>
              <Status1CBadge status={r.status_1c} />
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
              <Field icon={FileText} label="Клиент">{r.customer || "—"}</Field>
            </div>
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <Field label="Вес">{r.ai_weight_kg ? `${r.ai_weight_kg} кг` : "—"}</Field>
              <Field label="Объём">{r.ai_volume_cbm ? `${r.ai_volume_cbm} м³` : "—"}</Field>
              <Field label="Мест">{r.ai_pieces || "—"}</Field>
              <Field label="Получен">{formatDateTime(r.received_at)}</Field>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span>
                👤 Логист: <b className="text-slate-700">{r.logist || "—"}</b>
              </span>
              <span>
                ✍️ Автор: <b className="text-slate-700">{r.author || "—"}</b>
              </span>
            </div>
          </div>
        </div>
        {r.request_text && <OneСRequestBlock raw={r.request_text} />}
      </header>

      {/* ── Outreach progress bar ── */}
      <OutreachProgress outreach={outreach} />

      {/* ── Quotes comparison table ── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Ставки ({quotes.length})
        </h2>
        {quotes.length === 0 ? (
          <div className="card p-8 text-center text-slate-500 text-sm">
            Пока ставок нет — ждём ответы
          </div>
        ) : (
          <>
            {/* AI Summary Card */}
            <QuotesSummaryCard
              quotes={quotes}
              bestQuote={bestQuote}
              requestInfo={{
                route: [data?.request?.ai_origin_city, data?.request?.ai_dest_city].filter(Boolean).join(" → ") || data?.request?.raw_text?.slice(0, 80),
                cargo: data?.request?.cargo_description,
                incoterms: data?.request?.ai_incoterms,
              }}
            />

            <QuotesComparisonTable quotes={quotes} bestQuoteId={bestQuote?.id || null} />

            {/* Detailed quote cards */}
            <div className="space-y-3">
              {quotes.map((q: any) => {
                const isBest = q.is_best || q.is_selected || (q.id === bestQuote?.id && quotes.length > 1);
                const isExpanded = expandedQuoteId === q.id;
                const attachments = Array.isArray(q.attachment_urls) ? q.attachment_urls : [];

                return (
                  <div key={q.id} className={cn("card overflow-hidden", isBest && "ring-1 ring-inlogik-300 bg-inlogik-50/30")}>
                    <div className="p-4 flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        {isBest && <Star className="h-5 w-5 fill-inlogik-500 text-inlogik-500 shrink-0 mt-0.5" />}
                        <div>
                          <div className="font-medium text-slate-900">{q.contractor?.name || "—"}</div>
                          <div className="text-xs text-slate-500">{q.contractor?.email || "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        {/* Select quote button */}
                        {!isBest && (
                          <button
                            onClick={() => handleSelectQuote(q.id)}
                            disabled={selectingQuote === q.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-inlogik-300 text-inlogik-700 bg-inlogik-50 hover:bg-inlogik-100 transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {selectingQuote === q.id ? "..." : "Выбрать"}
                          </button>
                        )}
                        {isBest && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Выбрана
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 flex-wrap">
                        <div>
                          <div className="text-xs text-slate-500">Цена</div>
                          <div className="font-semibold text-slate-900 tabular-nums">
                            {formatPrice(q.price, q.currency)}
                            {q.price_unit && q.price_unit !== "total" && (
                              <span className="text-xs text-slate-500 ml-1">/{q.price_unit.replace("per_", "")}</span>
                            )}
                          </div>
                          {q.estimated_total && (
                            <div className="text-xs text-inlogik-700 font-medium">~{formatPrice(q.estimated_total, q.currency)}</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Условия</div>
                          <div className="text-sm text-slate-700">
                            {q.incoterms || "—"}
                            {q.container_type && <div className="text-xs text-slate-500">{q.container_type}</div>}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Срок</div>
                          <div className="text-sm text-slate-700">
                            {q.transit_days_min && q.transit_days_max
                              ? `${q.transit_days_min}–${q.transit_days_max} дн`
                              : q.transit_days ? `${q.transit_days} дн` : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">Получено</div>
                          <div className="text-xs text-slate-700">{formatDateTime(q.created_at)}</div>
                        </div>
                      </div>
                    </div>

                    {q.hidden_cost_warnings && q.hidden_cost_warnings.length > 0 && (
                      <div className="px-4 pb-3">
                        <ul className="text-xs text-amber-700 space-y-1 bg-amber-50 p-2 rounded border-l-2 border-amber-300">
                          {q.hidden_cost_warnings.map((w: string, i: number) => <li key={i}>⚠️ {w}</li>)}
                        </ul>
                      </div>
                    )}

                    {q.summary_human && (
                      <div className="px-4 pb-3">
                        <div className="text-xs text-inlogik-600 mb-1 flex items-center gap-1">
                          <Star className="h-3 w-3" /> Пересказ ставки
                        </div>
                        <div className="text-sm text-slate-700 bg-inlogik-50/50 p-2.5 rounded-lg border border-inlogik-100 leading-relaxed">
                          {q.summary_human}
                        </div>
                      </div>
                    )}

                    {q.notes && !q.summary_human && (
                      <div className="px-4 pb-3">
                        <div className="text-xs text-slate-500 mb-1">Заметка от парсера:</div>
                        <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{fixEncoding(q.notes)}</div>
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
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Текст письма</div>
                          <div className="text-sm text-slate-800 whitespace-pre-wrap bg-white p-3 rounded border border-slate-200 max-h-96 overflow-y-auto leading-relaxed">
                            {fixEncoding(q.email_body || q.notes || "Текст письма не сохранён")}
                          </div>
                        </div>
                        {attachments.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Вложения ({attachments.length})</div>
                            <div className="flex flex-wrap gap-2">
                              {attachments.map((a: any, i: number) => {
                                const url = typeof a === "string" ? a : a.url || a.public_url || "";
                                const name = typeof a === "object" ? (a.filename || a.name || `Файл ${i + 1}`) : `Файл ${i + 1}`;
                                if (!url) return null;
                                return (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-inlogik-300 hover:text-inlogik-700 transition">
                                    <Paperclip className="h-3.5 w-3.5" />{name}
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
          </>
        )}
      </section>

      {clarifications && clarifications.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            💬 Уточняющие вопросы от подрядчиков ({clarifications.length})
          </h2>
          <div className="space-y-2">
            {clarifications.map((cl: any) => <ClarificationCard key={cl.id} cl={cl} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          Детали рассылки ({outreach.length})
        </h2>
        <div className="card table-scroll">
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
                    <td className="px-4 py-3 text-slate-400 tabular-nums">{o.rank || "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {o.contractor?.id ? (
                        <Link href={`/contractors/${o.contractor.id}`} className="hover:text-inlogik-700">{o.contractor?.name || "—"}</Link>
                      ) : (o.contractor?.name || "—")}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{o.contractor?.email || "—"}</td>
                    <td className="px-4 py-3"><span className="badge badge-muted">W{o.wave}</span></td>
                    <td className="px-4 py-3"><span className={`badge ${badge.klass}`}>{badge.label}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(o.sent_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(o.replied_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Click-away for archive confirm */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-10" onClick={() => setShowArchiveConfirm(false)} />
      )}
    </div>
  );
}

function Field({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon?: any }) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </div>
      <div className="text-slate-900 mt-1">{children}</div>
    </div>
  );
}

