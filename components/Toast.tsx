"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Mail, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastMessage {
  id: string;
  type: "inbox" | "request";
  text: string;
  count?: number;
}

let _addToast: ((msg: Omit<ToastMessage, "id">) => void) | null = null;

/** Вызывать из любого места — не нужен контекст */
export function showToast(msg: Omit<ToastMessage, "id">) {
  _addToast?.(msg);
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const add = useCallback((msg: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-3), { ...msg, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    _addToast = add;
    return () => { _addToast = null; };
  }, [add]);

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium",
            "animate-in slide-in-from-bottom-4 fade-in duration-300",
            t.type === "inbox"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-inlogik-50 border-inlogik-200 text-inlogik-800",
          )}
        >
          {t.type === "inbox"
            ? <Mail className="h-4 w-4 shrink-0 text-amber-500" />
            : <Inbox className="h-4 w-4 shrink-0 text-inlogik-500" />}
          <span>{t.text}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="ml-1 opacity-50 hover:opacity-100 transition"
            aria-label="Закрыть"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
