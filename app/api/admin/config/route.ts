import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_config")
      .select("key, value, description, updated_at")
      .order("key");
    if (error) throw error;
    return NextResponse.json({ config: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { key, value } = await request.json();
    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("system_config")
      .update({ value: String(value), updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
