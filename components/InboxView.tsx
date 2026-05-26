"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Languages,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Tag,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import type { InboxItem } from "@/lib/inbox-queries";
import { useRealtimeRefresh } from "@/lib/use-realtime";
import { useInboxToast } from "@/lib/use-inbox-toast";
import { LiveIndicator } from "./LiveIndicator";
import { cn } from "@/lib/utils";

// ── Типы ─────────────────────────────────────────────────────────────────
type TypeFilter = "all" | InboxItem["question_type"];
type SortKey    = "date_desc" | "date_asc" | "urgent_first" | "type";

interface Logist {
  id: string;
  full_name: string;
  email: string;
}

// ── Лейблы типов вопросов ──────────────────────────────────────────────────
const TYPE_LABELS: Record<InboxItem["question_type"], { label: string; color: string }> = {
  hs_code: { label: "ТН ВЭД",         color: "bg-purple-100 text-purple-700 border-purple-200" },
  weight:  { label: "Вес / габариты",  color: "bg-blue-100 text-blue-700 border-blue-200" },
  route:   { label: "Маршрут",         color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  repack:  { label: "Переупаковка",    color: "bg-orange-100 text-orange-700 border-orange-200" },
  price:   { label: "Стоимость груза", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  other:   { label: "Прочее",          color: "bg-slate-100 text-slate-600 border-slate-200" },
};

const ALL_TYPES: InboxItem["question_type"][] = ["hs_code", "weight", "route", "repack", "price", "other"];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "date_desc",    label: "Сначала новые" },
  { key: "date_asc",     label: "Сначала старые" },
  { key: "urgent_first", label: "Сначала просроченные" },
  { key: "type",         label: "По типу вопроса" },
];

// ── Шаблоны ответов (МЫ → ПОДРЯДЧИКУ, который нас спросил) ───────────────
const TEMPLATES: Record<
  InboxItem["question_type"],
  {
    subject: (ref: string | null) => string;
    body: (item: InboxItem, logistName: string, logistEmail: string) => string;
  }
> = {
  hs_code: {
    subject: (ref) => `Re: ${ref ?? "Ваш запрос"} — информация по коду ТН ВЭД`,
    body: (item, name, email) => {
      const c = item.contractor_name ?? "";
      const ref = item.request_code ? ` (${item.request_code})` : "";
      const route = item.route ? `\nМаршрут: ${item.route}` : "";
      return (
`Добрый день${c ? `, ${c}` : ""}!

По вашему запросу${ref}${route}.

Код ТН ВЭД на данный груз: __________
Наименование товара: __________

Если у вас есть дополнительные вопросы — пожалуйста, уточните, мы готовы помочь.

С уважением,
${name || "Отдел логистики"}${email ? "\n" + email : ""}
Inlogik`
      );
    },
  },
  weight: {
    subject: (ref) => `Re: ${ref ?? "Ваш запрос"} — информация о весогабаритных характеристиках`,
    body: (item, name, email) => {
      const c = item.contractor_name ?? "";
      const ref = item.request_code ? ` (${item.request_code})` : "";
      return (
`Добрый день${c ? `, ${c}` : ""}!

По вашему запросу${ref}.

Вес брутто: __________ кг
Вес нетто:  __________ кг
Габариты (Д × Ш × В): __________
Количество мест: __________

Если данные изменились или нужна дополнительная информация — сообщите нам.

С уважением,
${name || "Отдел логистики"}${email ? "\n" + email : ""}
Inlogik`
      );
    },
  },
  route: {
    subject: (ref) => `Re: ${ref ?? "Ваш запрос"} — уточнение маршрута`,
    body: (item, name, email) => {
      const c = item.contractor_name ?? "";
      const ref = item.request_code ? ` (${item.request_code})` : "";
      const route = item.route ? `\nТекущий маршрут в системе: ${item.route}` : "";
      return (
`Добрый день${c ? `, ${c}` : ""}!

По вашему запросу${ref}.${route}

Мы уточнили маршрут:
- Пункт отправления: __________
- Пункт назначения: __________
- Транзит через: __________
- Рекомендуемый вид транспорта: __________

Если хотите изменить параметры — напишите, пересчитаем.

С уважением,
${name || "Отдел логистики"}${email ? "\n" + email : ""}
Inlogik`
      );
    },
  },
  repack: {
    subject: (ref) => `Re: ${ref ?? "Ваш запрос"} — информация о переупаковке`,
    body: (item, name, email) => {
      const c = item.contractor_name ?? "";
      const ref = item.request_code ? ` (${item.request_code})` : "";
      return (
`Добрый день${c ? `, ${c}` : ""}!

По вашему запросу${ref}.

По переупаковке:
- Вид упаковки: __________
- Маркировка: __________
- Особые условия хранения: __________

Если нужны дополнительные уточнения — готовы ответить.

С уважением,
${name || "Отдел логистики"}${email ? "\n" + email : ""}
Inlogik`
      );
    },
  },
  price: {
    subject: (ref) => `Re: ${ref ?? "Ваш запрос"} — информация о стоимости груза`,
    body: (item, name, email) => {
      const c = item.contractor_name ?? "";
      const ref = item.request_code ? ` (${item.request_code})` : "";
      return (
`Добрый день${c ? `, ${c}` : ""}!

По вашему запросу${ref}.

Таможенная стоимость груза: __________ USD
Условия поставки (Incoterms): __________
Валюта инвойса: __________
Номер инвойса: __________

Если стоимость будет скорректирована — пришлите обновлённый инвойс.

С уважением,
${name || "Отдел логистики"}${email ? "\n" + email : ""}
Inlogik`
      );
    },
  },
  other: {
    subject: (ref) => `Re: ${ref ?? "Ваш запрос"} — ответ на ваш вопрос`,
    body: (item, name, email) => {
      const c = item.contractor_name ?? "";
      const ref = item.request_code ? ` (${item.request_code})` : "";
      return (
`Добрый день${c ? `, ${c}` : ""}!

По вашему запросу${ref}.

__________

Если потребуется дополнительная информация — готовы ответить.

С уважением,
${name || "Отдел логистики"}${email ? "\n" + email : ""}
Inlogik`
      );
    },
  },
};

// ── Возраст письма ────────────────────────────────────────────────────────
function ageLabel(received_at: string): { text: string; urgent: boolean } {
  const diffH = (Date.now() - new Date(received_at).getTime()) / 3_600_000;
  if (diffH < 1)  return { text: `${Math.round(diffH * 60)} мин`, urgent: false };
  if (diffH < 24) return { text: `${Math.round(diffH)} ч`,        urgent: diffH > 8 };
  return { text: `${Math.round(diffH / 24)} дн`,                   urgent: true };
}

// ── InboxCard ─────────────────────────────────────────────────────────────
function InboxCard({
  item,
  logists,
  onMarkedReplied,
}: {
  item: InboxItem;
  logists: Logist[];
  onMarkedReplied: (id: string) => void;
}) {
  const [expanded,     setExpanded]     = useState(false);
  const [showReply,    setShowReply]    = useState(false);
  const [logistId,     setLogistId]     = useState<string>("");
  const [customName,   setCustomName]   = useState("");
  const [editBody,     setEditBody]     = useState("");
  const [bodyReady,    setBodyReady]    = useState(false);
  const [sending,      setSending]      = useState(false);
  const [sendResult,   setSendResult]   = useState<{ ok: boolean; note: string } | null>(null);
  const [copied,       setCopied]       = useState(false);
  const [marked,       setMarked]       = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const age      = ageLabel(item.received_at);
  const typeInfo = TYPE_LABELS[item.question_type];
  const tpl      = TEMPLATES[item.question_type];
  const preview  = item.body_text.slice(0, 220).replace(/\n+/g, " ").trim();
  const hasMore  = item.body_text.length > 220;
  
  // Detect non-Russian text for translate button
  const cyrCount = (item.body_text.match(/[а-яёА-ЯЁ]/g) || []).length;
  const isNonRussian = cyrCount / Math.max(item.body_text.length, 1) < 0.3 && item.body_text.length > 30;

  const handleTranslate = async () => {
    if (translating || translatedText) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: item.body_text.slice(0, 3000) }),
      });
      const data = await res.json();
      if (data.translated) setTranslatedText(data.translated);
    } catch (e) {
      console.warn("translate failed", e);
    } finally {
      setTranslating(false);
    }
  };

  const selectedLogist = logists.find((l) => l.id === logistId);
  const logistName  = selectedLogist ? selectedLogist.full_name : customName;
  const logistEmail = selectedLogist ? selectedLogist.email     : "";

  const subject = tpl.subject(item.request_code);

  useEffect(() => {
    if (showReply) {
      setEditBody(tpl.body(item, logistName, logistEmail));
      setBodyReady(true);
    }
  }, [showReply, logistName, logistEmail]); // eslint-disable-line

  async function handleSend() {
    if (!item.contractor_email) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/inbox/send-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          to: item.contractor_email,
          subject,
          body: editBody,
          replied_by: logistName || "logist",
        }),
      });
      const data = await res.json();
      setSendResult({ ok: data.ok, note: data.note ?? data.error ?? "" });
      if (data.ok) {
        setTimeout(() => onMarkedReplied(item.id), 1800);
      }
    } catch (e: any) {
      setSendResult({ ok: false, note: e.message });
    } finally {
      setSending(false);
    }
  }

  function handleCopy() {
    const txt = `Кому: ${item.contractor_email ?? ""}\nТема: ${subject}\n\n${editBody}`;
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function handleMarkReplied() {
    try {
      await fetch("/api/inbox/mark-replied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, replied_by: logistName || "logist" }),
      });
    } catch (_) { /* optimistic */ }
    setMarked(true);
    setTimeout(() => onMarkedReplied(item.id), 700);
  }

  return (
    <div
      className={cn(
        "card overflow-hidden transition-all",
        age.urgent && "ring-1 ring-amber-200",
        marked && "opacity-40 scale-[0.99] pointer-events-none",
      )}
    >
      <div className="p-4 flex items-start gap-3">
        <div className="shrink-0 pt-0.5">
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            age.urgent ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500",
          )}>
            <Clock className="h-3 w-3" />
            {age.text}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", typeInfo.color)}>
              {typeInfo.label}
            </span>
            {item.request_code && (
              <Link
                href={`/requests/${encodeURIComponent(item.request_code)}`}
                className="text-xs font-mono font-semibold text-inlogik-600 hover:underline flex items-center gap-0.5"
              >
                {item.request_code}<ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {item.route && (
              <span className="text-xs text-slate-500 truncate max-w-[180px]">{item.route}</span>
            )}
            {/* ── Бейдж ответственного логиста ── */}
            {item.logist && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                <UserCheck className="h-3 w-3 shrink-0" />
                {item.logist}
              </span>
            )}
            {/* ── Бейдж автора запроса ── */}
            {item.author && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-inlogik-50 text-inlogik-700 border border-inlogik-200">
                ✍️
                {item.author}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {item.contractor_id ? (
              <Link href={`/contractors/${item.contractor_id}`}
                className="text-sm font-medium text-slate-700 hover:text-inlogik-700 hover:underline">
                {item.contractor_name ?? "Неизвестный подрядчик"}
              </Link>
            ) : (
              <span className="text-sm font-medium text-slate-700">
                {item.contractor_name ?? "Неизвестный подрядчик"}
              </span>
            )}
            {item.contractor_email && (
              <span className="text-xs text-slate-400 hidden sm:inline">{item.contractor_email}</span>
            )}
          </div>

          <div className="mt-2">
            <p className="text-sm text-slate-600 leading-relaxed">
              {expanded ? item.body_text : preview}
              {hasMore && !expanded && <span className="text-slate-400">…</span>}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {hasMore && (
                <button onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-inlogik-600 hover:text-inlogik-800 transition">
                  {expanded ? <><ChevronUp className="h-3 w-3" />Свернуть</> : <><ChevronDown className="h-3 w-3" />Показать полностью</>}
                </button>
              )}
              {isNonRussian && !translatedText && (
                <button
                  onClick={handleTranslate}
                  disabled={translating}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition disabled:opacity-50"
                >
                  <Languages className="h-3 w-3" />
                  {translating ? "Перевожу…" : "Перевести"}
                </button>
              )}
            </div>
            {translatedText && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Languages className="h-3 w-3 text-blue-500" />
                  <span className="text-[11px] font-medium text-blue-600">Перевод</span>
                  <button
                    onClick={() => setTranslatedText(null)}
                    className="ml-auto text-[11px] text-blue-400 hover:text-blue-600"
                  >
                    скрыть
                  </button>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{translatedText}</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowReply((v) => !v)}
          className={cn(
            "shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition font-medium",
            showReply
              ? "bg-inlogik-500 text-white border-inlogik-500"
              : "bg-white text-slate-600 border-slate-200 hover:bg-inlogik-50 hover:border-inlogik-300 hover:text-inlogik-700",
          )}
        >
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{showReply ? "Закрыть" : "Ответить"}</span>
        </button>
      </div>

      {showReply && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />Кто отвечает
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {logists.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Загрузка логистов…</span>
              ) : (
                logists.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => { setLogistId(l.id); setCustomName(""); }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition",
                      logistId === l.id
                        ? "bg-inlogik-500 text-white border-inlogik-500 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-inlogik-300 hover:text-inlogik-700",
                    )}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {l.full_name}
                    {logistId === l.id && (
                      <span className="text-xs opacity-75 hidden md:inline">· {l.email}</span>
                    )}
                  </button>
                ))
              )}
              <input
                value={customName}
                onChange={(e) => { setCustomName(e.target.value); setLogistId(""); }}
                placeholder="Другой логист…"
                className="w-36 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-inlogik-400 placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Кому</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                {item.contractor_email
                  ? <span className="truncate">{item.contractor_email}</span>
                  : <span className="text-slate-400 italic">email не указан</span>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Тема</label>
              <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 truncate">
                {subject}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Текст ответа
              <span className="ml-2 font-normal normal-case text-slate-400">(можно редактировать)</span>
            </label>
            {bodyReady && (
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 leading-relaxed font-mono focus:outline-none focus:border-inlogik-400 transition resize-y"
                spellCheck
              />
            )}
          </div>

          {sendResult && (
            <div className={cn(
              "flex items-start gap-2 px-4 py-3 rounded-lg text-sm",
              sendResult.ok
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200",
            )}>
              {sendResult.ok
                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              <div>
                <p className="font-medium">{sendResult.ok ? "Отправлено!" : "Статус обновлён"}</p>
                <p className="text-xs opacity-75 mt-0.5">{sendResult.note}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition",
                copied
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
              )}
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Скопировано ✓" : "Копировать"}
            </button>

            {item.contractor_email && (
              <a
                href={`mailto:${item.contractor_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(editBody)}`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                title="Открыть в почтовом клиенте"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Открыть в почте
              </a>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !item.contractor_email || !editBody.trim()}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition",
                sending || !item.contractor_email
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-inlogik-500 text-white hover:bg-inlogik-600 shadow-sm",
              )}
            >
              <Send className={cn("h-4 w-4", sending && "animate-pulse")} />
              {sending ? "Отправка…" : "Отправить"}
            </button>

            <button
              onClick={handleMarkReplied}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
              Уже ответили ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TypeChip ──────────────────────────────────────────────────────────────
function TypeChip({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={cn(
      "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition whitespace-nowrap",
      active
        ? "bg-inlogik-500 text-white border-inlogik-500"
        : "bg-white text-slate-600 border-slate-200 hover:border-inlogik-300 hover:text-inlogik-700",
    )}>
      {label}{count > 0 && <span className="opacity-70"> · {count}</span>}
    </button>
  );
}

// ── sortItems ─────────────────────────────────────────────────────────────
function sortItems(list: InboxItem[], key: SortKey): InboxItem[] {
  const TYPE_ORDER: Record<InboxItem["question_type"], number> = {
    hs_code: 0, weight: 1, route: 2, price: 3, repack: 4, other: 5,
  };
  return [...list].sort((a, b) => {
    if (key === "date_asc")  return +new Date(a.received_at) - +new Date(b.received_at);
    if (key === "date_desc") return +new Date(b.received_at) - +new Date(a.received_at);
    if (key === "type")      return TYPE_ORDER[a.question_type] - TYPE_ORDER[b.question_type];
    if (key === "urgent_first") {
      const ageA = (Date.now() - +new Date(a.received_at)) / 3_600_000;
      const ageB = (Date.now() - +new Date(b.received_at)) / 3_600_000;
      return ageB - ageA;
    }
    return 0;
  });
}

// ── InboxView ─────────────────────────────────────────────────────────────
export function InboxView({ initialItems }: { initialItems: InboxItem[] }) {
  const [items,        setItems]        = useState<InboxItem[]>(initialItems);
  const [logists,      setLogists]      = useState<Logist[]>([]);
  const [query,        setQuery]        = useState("");
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>("all");
  const [logistFilter, setLogistFilter] = useState<string>("all");
  const [sortKey,      setSortKey]      = useState<SortKey>("date_desc");
  const [isLive,       setIsLive]       = useState(false);
  const [lastUpdated,  setLastUpdated]  = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔔 Toast-уведомления о новых письмах
  useInboxToast(true);

  useEffect(() => {
    fetch("/api/inbox/logists")
      .then((r) => r.json())
      .then((d) => setLogists(d.logists ?? []))
      .catch(() => setLogists([]));
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/inbox", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
      setLastUpdated(new Date());
    } catch (e) {
      console.warn("inbox refresh failed", e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useRealtimeRefresh(["inbound_messages"], refresh, true);

  useEffect(() => {
    const t = setTimeout(() => setIsLive(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => refresh(), 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  function handleMarkedReplied(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // ── Уникальные логисты из текущих писем ──
  const logistOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of items) {
      if (item.logist && !seen.has(item.logist)) {
        seen.add(item.logist);
        result.push(item.logist);
      }
    }
    return result.sort((a, b) => a.localeCompare(b, "ru"));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter !== "all")   list = list.filter((i) => i.question_type === typeFilter);
    if (logistFilter !== "all") list = list.filter((i) => i.logist === logistFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((i) =>
        [i.contractor_name, i.contractor_email, i.request_code, i.route, i.body_text, i.logist, i.author]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return sortItems(list, sortKey);
  }, [items, typeFilter, logistFilter, query, sortKey]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) c[i.question_type] = (c[i.question_type] || 0) + 1;
    return c;
  }, [items]);

  const urgentCount = items.filter(
    (i) => (Date.now() - +new Date(i.received_at)) / 3_600_000 > 8
  ).length;

  const isAnyFilterActive = query || typeFilter !== "all" || logistFilter !== "all";

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Инбокс уточнений</h1>
            {items.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold border border-amber-200">
                {items.length}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Письма от подрядчиков, на которые нужен ответ логиста
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            Обновить
          </button>
          <LiveIndicator isLive={isLive} lastUpdated={lastUpdated} />
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: MessageSquare, color: "text-inlogik-500", label: "Всего", value: items.length, sub: "уточнений" },
          { icon: AlertCircle,   color: urgentCount > 0 ? "text-amber-500" : "text-slate-300", label: "Просрочено", value: urgentCount, sub: "старше 8 часов", urgent: urgentCount > 0 },
          { icon: Tag,           color: "text-purple-500", label: "ТН ВЭД", value: typeCounts.hs_code || 0, sub: "вопросов по коду" },
          { icon: Filter,        color: "text-blue-500",   label: "Вес / габариты", value: typeCounts.weight || 0, sub: "вопросов" },
        ].map(({ icon: Icon, color, label, value, sub, urgent }) => (
          <div key={label} className={cn("card p-4", urgent && "ring-1 ring-amber-200")}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn("h-4 w-4", color)} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
            <div className={cn("text-2xl font-bold", urgent ? "text-amber-600" : "text-slate-900")}>{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="card p-3 flex flex-col gap-3">
        {/* Строка 1: поиск + сортировка */}
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по подрядчику, REQ, маршруту, тексту письма…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-inlogik-400 transition" />
          </div>
          <div className="shrink-0">
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-inlogik-400">
              {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Строка 2: фильтр по типу */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <TypeChip label="Все типы" count={items.length} active={typeFilter === "all"} onClick={() => setTypeFilter("all")} />
          {ALL_TYPES.filter((t) => (typeCounts[t] || 0) > 0).map((t) => (
            <TypeChip key={t} label={TYPE_LABELS[t].label} count={typeCounts[t] || 0}
              active={typeFilter === t} onClick={() => setTypeFilter(t)} />
          ))}
        </div>

        {/* Строка 3: фильтр по ответственному логисту */}
        {logistOptions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
              <UserCheck className="h-3.5 w-3.5" />
              Ответственный:
            </span>
            <button
              onClick={() => setLogistFilter("all")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition whitespace-nowrap",
                logistFilter === "all"
                  ? "bg-indigo-500 text-white border-indigo-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700",
              )}
            >
              Все
            </button>
            {logistOptions.map((name) => {
              const cnt = items.filter((i) => i.logist === name).length;
              return (
                <button
                  key={name}
                  onClick={() => setLogistFilter(logistFilter === name ? "all" : name)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition whitespace-nowrap",
                    logistFilter === name
                      ? "bg-indigo-500 text-white border-indigo-500"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700",
                  )}
                >
                  {name}<span className="opacity-60"> · {cnt}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Показано: {filtered.length}
            {typeFilter !== "all" && (
              <span className="text-slate-400 font-normal"> · {TYPE_LABELS[typeFilter as InboxItem["question_type"]].label}</span>
            )}
            {logistFilter !== "all" && (
              <span className="text-slate-400 font-normal"> · {logistFilter}</span>
            )}
          </h2>
          {isAnyFilterActive && (
            <button onClick={() => { setQuery(""); setTypeFilter("all"); setLogistFilter("all"); }}
              className="text-xs text-inlogik-600 hover:text-inlogik-800">
              Сбросить фильтры
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-3xl mb-3">📬</div>
            <p className="text-slate-500 text-sm">
              {isAnyFilterActive
                ? "Ничего не найдено. Попробуйте изменить фильтр."
                : "Нет писем, требующих ответа. Всё обработано!"}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <InboxCard key={item.id} item={item} logists={logists} onMarkedReplied={handleMarkedReplied} />
          ))
        )}
      </section>
    </div>
  );
}
