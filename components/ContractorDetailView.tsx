"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  Plus,
  Languages,
  ShieldAlert,
  Ban,
} from "lucide-react";
import { useRealtimeRefresh } from "@/lib/use-realtime";
import { LiveIndicator } from "./LiveIndicator";
import { cn, formatDateTime, formatPrice, timeAgo, outreachStatusBadge } from "@/lib/utils";

type Note = {
  id: string;
  text: string;
  author: string;
  created_at: string;
  updated_at: string;
};

export function ContractorDetailView({
  id,
  initialData,
}: {
  id: string;
  initialData: any;
}) {
  const [data, setData] = useState<any>(initialData);
  const [notes, setNotes] = useState<Note[]>(initialData.notes || []);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Форма добавления заметки
  const [newNoteText, setNewNoteText] = useState("");
  const [author, setAuthor] = useState("team");
  const [submitting, setSubmitting] = useState(false);

  // Редактирование
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/contractors/${id}/notes`, { cache: "no-store" });
      if (res.ok) {
        const { notes } = await res.json();
        setNotes(notes || []);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.warn("refresh notes failed", e);
    }
  }, [id]);

  useRealtimeRefresh(["contractor_notes", "outreach_messages", "quotes"], refresh, true);

  useEffect(() => {
    const t = setTimeout(() => setIsLive(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const submitNote = async () => {
    const text = newNoteText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contractors/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, author: author.trim() || "team" }),
      });
      if (res.ok) {
        const { note } = await res.json();
        setNotes((prev) => [note, ...prev]);
        setNewNoteText("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async (noteId: string) => {
    const text = editText.trim();
    if (!text) return;
    const res = await fetch(`/api/contractors/${id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: noteId, text }),
    });
    if (res.ok) {
      const { note } = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === noteId ? note : n)));
      setEditingId(null);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Удалить заметку?")) return;
    const res = await fetch(`/api/contractors/${id}/notes?noteId=${noteId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  };

  const { contractor, outreach, quotes } = data;

  // Статистика
  const stats = {
    total_sent: outreach.filter((o: any) =>
      ["sent", "replied", "auto_replied", "refused", "bounced"].includes(o.status),
    ).length,
    total_replied: outreach.filter((o: any) =>
      ["replied", "auto_replied"].includes(o.status),
    ).length,
    total_quoted: quotes.length,
    total_wins: quotes.filter((q: any) => q.is_selected).length,
  };
  const rr = stats.total_sent > 0
    ? Math.round((stats.total_replied / stats.total_sent) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/contractors" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-inlogik-700">
          <ArrowLeft className="h-4 w-4" /> К списку подрядчиков
        </Link>
        <LiveIndicator isLive={isLive} lastUpdated={lastUpdated} />
      </div>

      {/* Header */}
      <header className="card-padded">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-slate-900">{contractor.name}</h1>
              {contractor.contact_language && (
                <span className="badge badge-muted">
                  <Languages className="h-3 w-3" /> {contractor.contact_language.toUpperCase()}
                </span>
              )}
              {contractor.has_contract && (
                <span className="badge badge-good">✓ С контрактом</span>
              )}
              {contractor.blacklisted && (
                <span className="badge badge-bad">
                  <Ban className="h-3 w-3" /> Чёрный список
                </span>
              )}
              {contractor.opted_out && (
                <span className="badge badge-warn">
                  <ShieldAlert className="h-3 w-3" /> Opt-out
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
              {contractor.email && (
                <a href={`mailto:${contractor.email}`} className="inline-flex items-center gap-1.5 hover:text-inlogik-600">
                  <Mail className="h-3.5 w-3.5" /> {contractor.email}
                </a>
              )}
              {contractor.phone && (
                <a href={`tel:${contractor.phone}`} className="inline-flex items-center gap-1.5 hover:text-inlogik-600">
                  <Phone className="h-3.5 w-3.5" /> {contractor.phone}
                </a>
              )}
              {contractor.whatsapp_phone && (
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> WA: {contractor.whatsapp_phone}
                </span>
              )}
              {contractor.telegram_username && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> TG: {contractor.telegram_username}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Stat label="Отправлено" value={stats.total_sent} />
          <Stat label="Ответили" value={stats.total_replied} accent="good" />
          <Stat label="Ставок" value={stats.total_quoted} accent="inlogik" />
          <Stat label="Выбрано" value={stats.total_wins} accent="good" />
          <Stat
            label="Response rate"
            value={`${rr}%`}
            accent={rr >= 60 ? "good" : rr >= 30 ? "warn" : "muted"}
          />
        </div>
      </header>

      {/* Notes */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          📝 Заметки команды
        </h2>

        {/* Форма добавления */}
        <div className="card p-4 mb-3">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Заметка о подрядчике — особенности работы, контакты, что обсуждали…"
            rows={3}
            className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-inlogik-200 focus:border-inlogik-400 resize-none"
          />
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Автор:</span>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="имя"
                className="text-sm px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-inlogik-400 w-32"
              />
            </div>
            <button
              onClick={submitNote}
              disabled={!newNoteText.trim() || submitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-inlogik-500 text-white text-sm font-medium rounded-lg hover:bg-inlogik-600 disabled:bg-slate-200 disabled:text-slate-400 transition"
            >
              <Plus className="h-4 w-4" />
              Добавить заметку
            </button>
          </div>
        </div>

        {/* Лента */}
        {notes.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">
            Заметок пока нет. Добавьте первую — например что подрядчик специализируется на определённом маршруте.
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div key={note.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{note.author}</span>
                    <span>·</span>
                    <span>{formatDateTime(note.created_at)}</span>
                    {note.updated_at !== note.created_at && (
                      <>
                        <span>·</span>
                        <span className="italic">изменено {timeAgo(note.updated_at)}</span>
                      </>
                    )}
                  </div>
                  {editingId !== note.id && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingId(note.id);
                          setEditText(note.text);
                        }}
                        className="p-1.5 text-slate-400 hover:text-inlogik-600 hover:bg-slate-50 rounded"
                        title="Редактировать"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded"
                        title="Удалить"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {editingId === note.id ? (
                  <div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-inlogik-200 focus:border-inlogik-400 resize-none"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => saveEdit(note.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-inlogik-500 text-white text-xs font-medium rounded hover:bg-inlogik-600"
                      >
                        <Check className="h-3 w-3" /> Сохранить
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-slate-600 text-xs font-medium rounded hover:bg-slate-100"
                      >
                        <X className="h-3 w-3" /> Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-800 whitespace-pre-wrap">{note.text}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quotes history */}
      {quotes.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            Ставки от этого подрядчика ({quotes.length})
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Запрос</th>
                  <th className="text-left px-4 py-3">Маршрут</th>
                  <th className="text-right px-4 py-3">Цена</th>
                  <th className="text-left px-4 py-3">Условия</th>
                  <th className="text-left px-4 py-3">Срок</th>
                  <th className="text-left px-4 py-3">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((q: any) => (
                  <tr key={q.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/requests/${encodeURIComponent(q.request?.request_code || "")}`}
                        className="font-medium text-inlogik-700 hover:text-inlogik-900"
                      >
                        REQ-{q.request?.request_code}
                      </Link>
                      {q.is_selected && <span className="ml-2 badge badge-good">★ выбрано</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {q.request?.ai_origin_city || "?"} → {q.request?.ai_dest_city || "?"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatPrice(q.price, q.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{q.incoterms || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {q.transit_days ? `${q.transit_days} дн` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(q.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Outreach history */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          История рассылок ({outreach.length})
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Запрос</th>
                <th className="text-left px-4 py-3">Маршрут</th>
                <th className="text-left px-4 py-3">Волна</th>
                <th className="text-left px-4 py-3">Статус</th>
                <th className="text-left px-4 py-3">Отправлено</th>
                <th className="text-left px-4 py-3">Ответил</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {outreach.slice(0, 30).map((o: any) => {
                const badge = outreachStatusBadge(o.status);
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3">
                      {o.request?.request_code ? (
                        <Link
                          href={`/requests/${encodeURIComponent(o.request.request_code)}`}
                          className="text-inlogik-700 hover:text-inlogik-900"
                        >
                          REQ-{o.request.request_code}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {o.request?.ai_origin_city || "?"} → {o.request?.ai_dest_city || "?"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-muted">W{o.wave}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${badge.klass}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(o.sent_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(o.replied_at)}</td>
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "good" | "warn" | "muted" | "inlogik";
}) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div
        className={cn(
          "text-2xl font-semibold tabular-nums mt-1",
          accent === "good" && "text-emerald-600",
          accent === "warn" && "text-amber-600",
          accent === "muted" && "text-slate-400",
          accent === "inlogik" && "text-inlogik-700",
          !accent && "text-slate-900",
        )}
      >
        {value}
      </div>
    </div>
  );
}
