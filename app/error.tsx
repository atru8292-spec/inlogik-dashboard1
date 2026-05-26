"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorPage]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-inlogik-50 to-white p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-inlogik-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-inlogik-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-2">
          Ведутся технические работы
        </h1>
        <p className="text-slate-500 mb-6 leading-relaxed">
          Дашборд временно недоступен. Обычно это занимает пару минут.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-inlogik-500 text-white rounded-xl font-medium hover:bg-inlogik-600 transition shadow-sm"
        >
          Попробовать снова
        </button>

        <div className="mt-8 p-4 rounded-xl bg-white border border-inlogik-200 text-left">
          <p className="text-sm font-medium text-slate-700 mb-1">
            📊 Пока дашборд недоступен
          </p>
          <p className="text-xs text-slate-500 mb-3">
            Ставки, запросы и рассылки можно посмотреть в таблице:
          </p>
          <a
            href="https://docs.google.com/spreadsheets/d/1fjbToglhD0e2aFDZZcwUMWBs5dRh5_1KbUjlze0b5ww/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-inlogik-50 border border-inlogik-200 text-sm font-medium text-inlogik-700 hover:bg-inlogik-100 transition w-full justify-center"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42a.996.996 0 00-1.41 0l-6.59 6.59a.996.996 0 000 1.41l6.59 6.59a.996.996 0 101.41-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z"/>
            </svg>
            Открыть таблицу Inlogik Logs
          </a>
        </div>

        <div className="mt-6 pt-5 border-t border-inlogik-100">
          <p className="text-xs text-slate-400 mb-2">Что-то не работает?</p>
          <a
            href="https://t.me/arinashrr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-inlogik-600 hover:text-inlogik-800 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            @arinashrr — написать в Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
