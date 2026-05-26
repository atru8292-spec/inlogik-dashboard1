"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Hash,
  MapPin,
  Package,
  Truck,
  MessageCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

// Фикс кракозябр от cp1251/latin1 mojibake
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

const CHECKLIST = [
  {
    icon: Hash,
    title: "Код ТН ВЭД (HS code)",
    desc: "При любом международном грузе. Часто переспрашивают для расчёта таможенных платежей и проверки санкций.",
    example: "ТН ВЭД: 8479899708 (промышленное оборудование)",
    priority: "high",
  },
  {
    icon: Package,
    title: "Точное наименование груза",
    desc: 'Конкретно "оправа для очков пластиковая" — а не просто "оправа". Подрядчики должны понимать класс груза.',
    example: 'Не "оборудование" → а "Шлифовальный станок для металла, 1 шт"',
    priority: "high",
  },
  {
    icon: MapPin,
    title: "Полный адрес забора (Pickup Address)",
    desc: "Город + страна + индекс + улица. Если несколько адресов — нумеровать (Pickup #1, Pickup #2).",
    example: "PAVO TOOLS (HANGZHOU) CO., LTD, No.352 Huipu Road, Hangzhou, China",
    priority: "high",
  },
  {
    icon: FileText,
    title: "Растаможка — чьими силами?",
    desc: "Явно указать кто оформляет импортную растаможку: подрядчик или клиент сам.",
    example: '"Растаможка: силами получателя" или "Растаможка: входит в стоимость"',
    priority: "medium",
  },
  {
    icon: Truck,
    title: "Город и аэропорт назначения",
    desc: 'Не просто "Россия" — а конкретный город или аэропорт (SVO/VKO/DME для Москвы и т.д.).',
    example: '"До SVO1" или "До склада в Дзержинске, Нижегородская обл."',
    priority: "medium",
  },
  {
    icon: Package,
    title: "Габариты и упаковка",
    desc: "Особенно важно для хрупкого, нестандартного и сборного груза. Нужны размеры коробок и тип упаковки.",
    example: "5 коробок 80x80x38 см, общий вес 111 кг, упаковка — деревянная обрешётка",
    priority: "medium",
  },
  {
    icon: FileText,
    title: "Стоимость груза для страховки",
    desc: "Опциональное поле, но многие подрядчики уточняют для расчёта страховки и комиссий.",
    example: "Стоимость груза: 150 000 USD",
    priority: "low",
  },
  {
    icon: Truck,
    title: "Инкотермс (если фиксирован клиентом)",
    desc: "EXW / FCA / FOB / CIF / DAP / DDP. Если не указан — подрядчик предложит свой вариант.",
    example: "EXW Hangzhou — клиент сам забирает с завода",
    priority: "low",
  },
];

const PERFECT_REQUEST = `Заявка на расчёт: EXW Hangzhou → Нижний Новгород (auto)

Ref: REQ-004415-1

Pickup Address:
  PAVO TOOLS (HANGZHOU) CO., LTD
  No.352 Huipu Road, Hangzhou, China

Delivery:
  Склад в Нижнем Новгороде

Cargo:
  Инструменты ручные (отвёртки, наборы)
  ТН ВЭД: 8205590000
  Вес: 1 200 кг
  Объём: 3.5 м³
  10 коробок 80×60×40 см
  Стоимость: 12 000 USD

Условия (Incoterms): EXW
Растаможка: силами получателя
Тип перевозки: auto-сборка, через Маньчжурию-Забайкальск

Прошу указать:
  - Ставка + валюта
  - Что включено / не включено
  - Транзитное время
  - Валидность

Inlogik LLC
mail@inlogik.ru`;

type Clarification = {
  id: string | number;
  contractor_name?: string;
  request_code?: string;
  route?: string;
  received_at: string;
  question_text: string;
};

type Problematic = {
  request_id: string;
  request_code: string;
  customer?: string;
  route: string;
  cargo_name?: string;
  clarification_count: number;
  quotes_count: number;
};

function ClarificationCard({ c }: { c: Clarification }) {
  const [expanded, setExpanded] = useState(false);
  const text = fixEncoding(c.question_text || "");
  const lines = text.split("\n");
  const isLong = lines.length > 4 || text.length > 300;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="font-medium text-slate-900">
            {c.contractor_name || "—"}
          </span>
          {c.request_code && (
            <Link
              href={`/requests/${encodeURIComponent(c.request_code)}`}
              className="badge badge-inlogik hover:opacity-80"
            >
              REQ-{c.request_code}
            </Link>
          )}
          {c.route && (
            <span className="text-xs text-slate-500">{c.route}</span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {formatDateTime(c.received_at)}
        </span>
      </div>
      <div
        className={`text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg overflow-hidden transition-all duration-200 ${
          expanded ? "" : "line-clamp-4"
        }`}
      >
        {text}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-inlogik-600 hover:text-inlogik-800 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Свернуть
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Показать полностью
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const [problematic, setProblematic] = useState<Problematic[]>([]);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => {
        setProblematic(d.problematic || []);
        setClarifications(d.clarifications || []);
      })
      .catch(() => {});
  }, []);

  const highPriority = CHECKLIST.filter((c) => c.priority === "high");
  const mediumPriority = CHECKLIST.filter((c) => c.priority === "medium");
  const lowPriority = CHECKLIST.filter((c) => c.priority === "low");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Памятка и инсайты
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Как описать запрос в 1С, чтобы подрядчики не переспрашивали
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-padded border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                Запросов с переспросами
              </div>
              <div className="text-2xl font-semibold text-amber-900 mt-1">
                {problematic.length}
              </div>
              <div className="text-xs text-amber-700 mt-1">
                за последние 14 дней
              </div>
            </div>
          </div>
        </div>
        <div className="card-padded">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Уточняющих писем
              </div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">
                {clarifications.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                подрядчики просят добавить инфу
              </div>
            </div>
          </div>
        </div>
        <div className="card-padded border-emerald-200 bg-emerald-50/50">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                Цель
              </div>
              <div className="text-2xl font-semibold text-emerald-900 mt-1">
                0 переспросов
              </div>
              <div className="text-xs text-emerald-700 mt-1">
                каждое поле заполнено в 1С сразу
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Идеальный пример */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-inlogik-500" />
          Идеально оформленный запрос — равняйтесь
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Подрядчики отвечают быстро и без переспросов
        </p>
        <div className="card-padded bg-inlogik-50/30 border-inlogik-200">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide">
            <span>Пример: auto, Китай → РФ</span>
          </div>
          <pre className="text-sm font-mono whitespace-pre-wrap text-slate-800 leading-relaxed bg-white p-4 rounded-lg border border-inlogik-100 overflow-x-auto">
{PERFECT_REQUEST}
          </pre>
          <div className="mt-4 text-xs text-emerald-700 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Здесь сразу указано: точный адрес забора, ТН ВЭД, описание груза, габариты, стоимость,
              кто делает растаможку, и что именно нужно от подрядчика в ответе.{" "}
              <strong>Подрядчик может ответить ставкой не задавая ни одного уточняющего вопроса.</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          📋 Чек-лист: что писать в 1С
        </h2>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-bad">обязательно</span>
            <span className="text-xs text-slate-500">эти поля — частая причина переспросов</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {highPriority.map((item) => (
              <ChecklistCard key={item.title} {...item} />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-warn">желательно</span>
            <span className="text-xs text-slate-500">существенно ускоряет ответ</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {mediumPriority.map((item) => (
              <ChecklistCard key={item.title} {...item} />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-muted">опционально</span>
            <span className="text-xs text-slate-500">помогает в специфичных случаях</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {lowPriority.map((item) => (
              <ChecklistCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* Problematic requests */}
      {problematic.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            🔥 Запросы с большим количеством переспросов
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Эти запросы стоит доработать — много подрядчиков просят уточнения
          </p>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Запрос</th>
                  <th className="text-left px-4 py-3">Клиент</th>
                  <th className="text-left px-4 py-3">Маршрут</th>
                  <th className="text-left px-4 py-3">Груз</th>
                  <th className="text-right px-4 py-3">Переспросов</th>
                  <th className="text-right px-4 py-3">Ставок</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {problematic.map((p) => (
                  <tr key={p.request_id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      REQ-{p.request_code}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.customer || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.route}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs truncate max-w-xs">
                      {p.cargo_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="badge badge-warn">{p.clarification_count}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {p.quotes_count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/requests/${encodeURIComponent(p.request_code)}`}
                        className="inline-flex items-center gap-1 text-xs text-inlogik-600 hover:text-inlogik-800"
                      >
                        Открыть <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent clarifications */}
      {clarifications.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            💬 Последние вопросы от подрядчиков
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Что именно переспрашивают — реальные примеры из ваших запросов
          </p>
          <div className="space-y-2">
            {clarifications.map((c) => (
              <ClarificationCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ChecklistCard({
  icon: Icon,
  title,
  desc,
  example,
  priority,
}: {
  icon: any;
  title: string;
  desc: string;
  example: string;
  priority: string;
}) {
  const borderColor =
    priority === "high"
      ? "border-rose-200"
      : priority === "medium"
      ? "border-amber-200"
      : "border-slate-200";

  return (
    <div className={`card p-4 ${borderColor}`}>
      <div className="flex items-start gap-3 mb-2">
        <div className="shrink-0 h-9 w-9 rounded-lg bg-inlogik-50 text-inlogik-600 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
          <p className="text-xs text-slate-600 mt-1">{desc}</p>
        </div>
      </div>
      <div className="mt-3 text-xs bg-slate-50 p-2.5 rounded font-mono text-slate-700 border-l-2 border-inlogik-300">
        💡 {example}
      </div>
    </div>
  );
}
