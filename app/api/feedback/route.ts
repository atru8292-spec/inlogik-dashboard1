import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  ui: "Интерфейс",
  speed: "Скорость",
  accuracy: "Точность данных",
  coverage: "Охват подрядчиков",
  other: "Другое",
};

const RATING_EMOJI = ["", "😞", "😐", "🙂", "😊", "🤩"];

async function sendTelegramNotify(feedback: {
  logist_name: string | null;
  rating: number | null;
  category: string;
  message: string;
}) {
  try {
    const { data: botRow } = await supabaseAdmin
      .from("system_config")
      .select("value")
      .eq("key", "telegram_bot_token")
      .maybeSingle();

    const { data: chatRow } = await supabaseAdmin
      .from("system_config")
      .select("value")
      .eq("key", "feedback_telegram_chat_id")
      .maybeSingle();

    const botToken = botRow?.value;
    const chatId = chatRow?.value;

    if (!botToken || !chatId) {
      console.log("[feedback] TG notify skipped — no bot token or chat id in system_config");
      return;
    }

    const ratingText = feedback.rating ? `${RATING_EMOJI[feedback.rating]} ${feedback.rating}/5` : "не указана";
    const catText = CATEGORY_LABELS[feedback.category] || feedback.category;

    const text = [
      "📝 *Новый отзыв от логиста*",
      "",
      `👤 ${feedback.logist_name || "Аноним"}`,
      `⭐ Оценка: ${ratingText}`,
      `📂 Категория: ${catText}`,
      "",
      feedback.message,
    ].join("\n");

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (e) {
    console.warn("[feedback] TG notify failed:", e);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { logist_name, rating, category, message, page_url } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("feedback")
      .insert({
        logist_name: logist_name || null,
        rating: rating || null,
        category: category || "other",
        message: message.trim(),
        page_url: page_url || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabaseAdmin.from("audit_log").insert({
      entity_type: "feedback",
      event: "feedback_submitted",
      details: {
        logist: logist_name,
        rating,
        category,
        preview: message.trim().substring(0, 100),
      },
    });

    // TG notification to Arina
    await sendTelegramNotify({
      logist_name: logist_name || null,
      rating: rating || null,
      category: category || "other",
      message: message.trim(),
    });

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ feedback: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
