"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

function getMoscowGreeting(): string {
  // Get Moscow time (UTC+3)
  const now = new Date();
  const msk = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
  const h = msk.getHours();
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export function WelcomeScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Only show on very first visit this session, not on page navigations
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("inlogik_welcomed")) return;

    // Mark as shown immediately so navigations don't trigger it
    sessionStorage.setItem("inlogik_welcomed", "1");
    setVisible(true);

    const fadeTimer = setTimeout(() => setFading(true), 1500);
    const hideTimer = setTimeout(() => setVisible(false), 2200);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-700 ${fading ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <div className="text-2xl font-semibold text-slate-800">{getMoscowGreeting()}</div>
        <div className="text-sm text-slate-500">Дашборд логистики Инлоджик</div>
        <div className="mt-4 flex gap-1">
          <div className="w-2 h-2 rounded-full bg-inlogik-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-inlogik-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-inlogik-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
