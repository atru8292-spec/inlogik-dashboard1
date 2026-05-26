"use client";

import { useState } from "react";
import { MessageSquarePlus, MessageSquare, Send, X, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_OPTIONS = [
  { emoji: "🐌", text: "Дашборд тормозит" },
  { emoji: "🤷", text: "Не понимаю где что найти" },
  { emoji: "📧", text: "Письма подрядчикам уходят странные" },
  { emoji: "📊", text: "Не хватает данных по запросу" },
  { emoji: "💡", text: "Есть идея как улучшить" },
];

const CATEGORIES = [
  { value: "ui", label: "Интерфейс", hint: "Неудобно, не вижу, не понимаю" },
  { value: "speed", label: "Скорость", hint: "Долго грузит, тормозит" },
  { value: "accuracy", label: "Точность", hint: "Данные неверные, ставки не те" },
  { value: "coverage", label: "Охват", hint: "Мало подрядчиков, не тем шлёт" },
  { value: "other", label: "Другое", hint: "" },
];

const RATINGS = [
  { value: 1, emoji: "😞", label: "Плохо" },
  { value: 2, emoji: "😐", label: "Так себе" },
  { value: 3, emoji: "🙂", label: "Нормально" },
  { value: 4, emoji: "😊", label: "Хорошо" },
  { value: 5, emoji: "🤩", label: "Отлично" },
];

type Step = "quick" | "detail" | "done";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("quick");
  const [name, setName] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [category, setCategory] = useState("other");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const reset = () => {
    setStep("quick");
    setMessage("");
    setRating(null);
    setName("");
    setCategory("other");
  };

  const handleQuickSelect = (text: string) => {
    setMessage(text + "\n\n");
    setStep("detail");
  };

  const handleSubmit = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logist_name: name || null,
          rating,
          category,
          message: message.trim(),
          page_url: typeof window !== "undefined" ? window.location.pathname : null,
        }),
      });
      if (res.ok) {
        setStep("done");
        setTimeout(() => {
          setOpen(false);
          reset();
        }, 2500);
      }
    } catch (e) {
      console.warn("feedback failed", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button — LEFT side */}
      {!open && (
        <button
          onClick={() => { setOpen(true); reset(); }}
          className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 lg:left-[17.5rem] z-40 flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-800 text-white rounded-2xl shadow-lg hover:bg-slate-900 hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-xs sm:text-sm font-medium">Как вам система?</span>
        </button>
      )}

      {/* Panel — LEFT side */}
      {open && (
        <div className="fixed inset-x-4 bottom-4 sm:inset-auto sm:bottom-6 sm:left-6 lg:left-[17.5rem] z-50 w-auto sm:w-[340px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-inlogik-50 to-white flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {step === "done" ? "Спасибо!" : "Помогите нам стать лучше"}
              </h3>
              {step !== "done" && (
                <p className="text-[11px] text-slate-500">Ваш отзыв получит Арина лично</p>
              )}
            </div>
            <button
              onClick={() => { setOpen(false); reset(); }}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Step: Quick options ── */}
          {step === "quick" && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-500">Выберите или напишите своё:</p>

              <div className="space-y-1.5">
                {QUICK_OPTIONS.map((opt) => (
                  <button
                    key={opt.text}
                    onClick={() => handleQuickSelect(opt.text)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-left text-sm text-slate-700 hover:border-inlogik-300 hover:bg-inlogik-50/50 transition group"
                  >
                    <span className="text-lg shrink-0">{opt.emoji}</span>
                    <span className="flex-1">{opt.text}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-inlogik-500 transition" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep("detail")}
                className="w-full text-center text-xs text-inlogik-600 hover:text-inlogik-800 py-2 transition"
              >
                Написать своё →
              </button>
            </div>
          )}

          {/* ── Step: Detail form ── */}
          {step === "detail" && (
            <div className="p-4 space-y-3">
              {/* Name */}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя (чтобы знать от кого)"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-inlogik-400 placeholder:text-slate-400"
              />

              {/* Rating */}
              <div>
                <div className="text-xs text-slate-500 mb-1.5">Как оцениваете систему?</div>
                <div className="flex gap-1">
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRating(r.value)}
                      title={r.label}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition border",
                        rating === r.value
                          ? "bg-inlogik-50 border-inlogik-300 scale-105"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100",
                      )}
                    >
                      <span className="text-lg">{r.emoji}</span>
                      <span className="text-[9px] text-slate-400">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category chips */}
              <div>
                <div className="text-xs text-slate-500 mb-1.5">О чём отзыв?</div>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      title={c.hint}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition",
                        category === c.value
                          ? "bg-inlogik-500 text-white border-inlogik-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-inlogik-300",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="text-xs text-slate-500 mb-1.5">Расскажите подробнее</div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={"Например:\n— Не могу быстро найти ставки по запросу\n— Хотелось бы видеть статус 1С\n— Рассылка ушла не тем подрядчикам"}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-inlogik-400 placeholder:text-slate-400 resize-none leading-relaxed"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep("quick"); setMessage(""); }}
                  className="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition"
                >
                  ← Назад
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || sending}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition bg-inlogik-500 text-white hover:bg-inlogik-600 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sending ? "Отправляю…" : "Отправить"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && (
            <div className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-base font-medium text-slate-800">Спасибо за отзыв!</p>
              <p className="text-sm text-slate-500 mt-1">Арина получит его в Telegram</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
