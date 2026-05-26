"use client";

import { useEffect, useRef } from "react";
import { getSupabaseClient } from "./supabase-client";

type TableName =
  | "requests"
  | "quotes"
  | "outreach_messages"
  | "inbound_messages"
  | "audit_log"
  | "contractor_notes"
  | "contractors";

/**
 * Подписывается на изменения указанных таблиц и зовёт onChange (debounce 500мс)
 * при любом INSERT/UPDATE/DELETE. onChange должен заново загрузить данные.
 */
export function useRealtimeRefresh(
  tables: TableName[],
  onChange: () => void,
  enabled = true,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`dashboard-${tables.join("-")}-${Math.random()}`);

    const trigger = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onChange(), 500);
    };

    for (const table of tables) {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        trigger,
      );
    }

    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tables.join(",")]);
}
