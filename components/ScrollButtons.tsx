"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export function ScrollButtons() {
  const [show, setShow] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const check = () => {
      const scrollY = window.scrollY;
      const windowH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      setShow(scrollY > 200 || docH > windowH + 200);
      setAtBottom(scrollY + windowH >= docH - 100);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/90 border border-slate-200 text-slate-500 hover:text-inlogik-600 hover:border-inlogik-300 shadow-sm backdrop-blur transition"
        title="Наверх"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      {!atBottom && (
        <button
          onClick={() => window.scrollBy({ top: window.innerHeight * 0.7, behavior: "smooth" })}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/90 border border-slate-200 text-slate-500 hover:text-inlogik-600 hover:border-inlogik-300 shadow-sm backdrop-blur transition"
          title="Вниз"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
