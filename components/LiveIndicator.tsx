"use client";

export function LiveIndicator({
  isLive,
  lastUpdated,
}: {
  isLive: boolean;
  lastUpdated: Date;
}) {
  const time = lastUpdated.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className="flex items-center gap-2 text-xs text-slate-500 group relative cursor-default"
      title="Данные обновляются автоматически через Supabase Realtime + опрос каждые 60 сек"
    >
      <span
        className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-slate-300"}`}
      />
      <span>{isLive ? "Live" : "Подключение…"}</span>
      <span className="text-slate-400">· {time}</span>
      {/* Tooltip */}
      <span
        className="pointer-events-none absolute right-0 top-6 z-10 hidden group-hover:block w-56 rounded-lg bg-slate-800 text-white text-xs px-3 py-2 shadow-lg leading-relaxed"
      >
        Данные обновляются автоматически через Supabase Realtime и каждые 60 сек
      </span>
    </div>
  );
}
