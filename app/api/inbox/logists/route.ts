import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/inbox/logists — список логистов из таблицы public.logists (данные из 1С)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("logists")
      .select("id, full_name, email")
      .eq("is_active", true)
      .order("full_name");

    if (error) {
      console.error("logists fetch error:", error);
      // Fallback — хардкод логистов из 1С на случай проблем с БД
      return NextResponse.json({
        logists: [
          { id: "static-1", full_name: "Андорская Анна",      email: "" },
          { id: "static-2", full_name: "Бесчастная Наталья",  email: "" },
          { id: "static-3", full_name: "Захарова Мария",      email: "" },
          { id: "static-4", full_name: "Морозова Марина",     email: "" },
          { id: "static-5", full_name: "Рожнов Роман",        email: "" },
          { id: "static-6", full_name: "Темникова Елена",     email: "" },
          { id: "static-7", full_name: "Шишулина Екатерина",  email: "" },
        ],
      });
    }

    return NextResponse.json({ logists: data ?? [] });
  } catch (err: any) {
    console.error("logists unexpected error:", err);
    return NextResponse.json({ logists: [] });
  }
}
