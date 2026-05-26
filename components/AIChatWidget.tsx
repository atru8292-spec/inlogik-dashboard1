"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_QUESTIONS = [
  "Сколько ставок по запросу 4419?",
  "Какой статус у запроса 4407?",
  "Кто лучший подрядчик?",
  "Где посмотреть рейтинг?",
];

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Show welcome bubble after 5 seconds, hide after 8 more
  useEffect(() => {
    const show = setTimeout(() => setShowBubble(true), 5000);
    const hide = setTimeout(() => setShowBubble(false), 13000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setShowBubble(false);

    const newCount = messageCount + 1;
    setMessageCount(newCount);

    if (newCount > 30) {
      setMessages((prev) => [...prev,
        { role: "user", content: text.trim() },
        { role: "assistant", content: "Вы задали много вопросов за эту сессию. Обновите страницу чтобы продолжить, или обратитесь к Арине." },
      ]);
      setInput("");
      return;
    }

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-10),
          messageCount: newCount,
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || "Что-то пошло не так, попробуйте ещё раз";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Не получилось подключиться. Попробуйте через минуту." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setMessageCount(0);
  };

  return (
    <>
      {/* Floating button + bubble */}
      {!open && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 flex items-end gap-2">
          {/* Welcome bubble */}
          {showBubble && (
            <div
              className="hidden sm:block bg-slate-800 text-white rounded-2xl rounded-br-md shadow-lg px-4 py-2.5 text-sm max-w-[200px] animate-in fade-in slide-in-from-right-2 cursor-pointer"
              onClick={() => { setShowBubble(false); setOpen(true); }}
            >
              Что-то непонятно? Спросите
            </div>
          )}
          <button
            onClick={() => { setOpen(true); setShowBubble(false); }}
            className="flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 bg-inlogik-600 text-white rounded-2xl shadow-lg hover:bg-inlogik-700 hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <Bot className="h-5 w-5" />
            <span className="text-xs sm:text-sm font-medium">Спросить</span>
          </button>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 z-50 sm:w-[400px] sm:h-[560px] bg-white sm:rounded-2xl shadow-2xl sm:border sm:border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-inlogik-500 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Помощник Инлоджик</h3>
                <p className="text-[11px] text-inlogik-100">Запросы, ставки, подрядчики</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={handleClear} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition" title="Очистить чат">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="pt-4">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-inlogik-50 flex items-center justify-center mx-auto mb-3">
                    <Bot className="h-6 w-6 text-inlogik-500" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">Спросите про любой запрос — я покажу статус, ставки, подрядчиков. Прямо из базы.</p>
                </div>
                <div className="space-y-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left px-3.5 py-2.5 text-sm bg-slate-50 text-slate-700 rounded-xl hover:bg-inlogik-50 hover:text-inlogik-700 transition border border-transparent hover:border-inlogik-200"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-inlogik-500 text-white rounded-2xl rounded-br-lg"
                    : "bg-slate-100 text-slate-800 rounded-2xl rounded-bl-lg",
                )}>
                  {msg.content.split("\n").map((line, j) => (
                    <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-400 px-4 py-3 rounded-2xl rounded-bl-lg text-sm">
                  <span className="inline-flex gap-1.5">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Спросите что-нибудь…"
                rows={1}
                className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-inlogik-400 placeholder:text-slate-400 resize-none max-h-24 transition"
                style={{ minHeight: "40px" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-inlogik-500 text-white hover:bg-inlogik-600 disabled:bg-slate-200 disabled:text-slate-400 transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
