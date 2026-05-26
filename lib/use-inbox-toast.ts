"use client";

import { useEffect, useRef } from "react";
import { getSupabaseClient } from "./supabase-client";
import { showToast } from "@/components/Toast";

/**
 * Слушает inbound_messages через Realtime и показывает toast
 * когда появляются новые письма (INSERT).
 */
export function useInboxToast(enabled = true) {
  const countRef = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseClient();

    // Получить текущее количество при монтировании
    supabase
      .from("inbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "clarification_needed")
      .then(({ count }) => {
        if (count !== null) countRef.current = count;
      });

    const channel = supabase.channel("inbox-toast-channel");

    channel.on(
      "postgres_changes" as any,
      { event: "INSERT", schema: "public", table: "inbound_messages" },
      () => {
        // debounce 800мс чтобы не спамить при пачке
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
          const { count } = await supabase
            .from("inbound_messages")
            .select("id", { count: "exact", head: true })
            .eq("status", "clarification_needed");

          if (count !== null && countRef.current !== null) {
            const diff = count - countRef.current;
            if (diff > 0) {
              showToast({
                type: "inbox",
                text: diff === 1
                  ? "📬 Новое письмо требует ответа"
                  : `📬 ${diff} новых письма требуют ответа`,
                count: diff,
              });
            }
          }
          if (count !== null) countRef.current = count;
        }, 800);
      },
    );

    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
