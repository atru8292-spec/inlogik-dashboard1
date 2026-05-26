"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const start = prev.current;
    const end = value;
    const duration = 600;
    const startTime = performance.now();
    const raf = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) requestAnimationFrame(raf);
      else prev.current = end;
    };
    requestAnimationFrame(raf);
  }, [value]);

  return <>{display}</>;
}

export function StatCard({
  label,
  value,
  meta,
  icon: Icon,
  accent = false,
  trend,
}: {
  label: string;
  value: string | number;
  meta?: string;
  icon?: LucideIcon;
  accent?: boolean;
  trend?: "good" | "warn" | "bad";
}) {
  const isNumeric = typeof value === "number";

  return (
    <div className={cn("stat-card", accent && "border-inlogik-200 bg-inlogik-50/30")}>
      <div className="flex items-start justify-between gap-3">
        <div className="stat-label">{label}</div>
        {Icon && (
          <div className={cn(
            "shrink-0 h-8 w-8 rounded-lg flex items-center justify-center",
            accent ? "bg-inlogik-500 text-white" : "bg-slate-100 text-slate-500"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className={cn(
        "stat-value",
        trend === "good" && "text-emerald-600",
        trend === "warn" && "text-amber-600",
        trend === "bad" && "text-rose-600",
      )}>
        {isNumeric ? <AnimatedNumber value={value as number} /> : value}
      </div>
      {meta && <div className="stat-meta">{meta}</div>}
    </div>
  );
}
