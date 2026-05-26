import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { id, logist } = await req.json();
    if (!id || !logist) {
      return NextResponse.json({ error: "id and logist are required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("inbound_messages")
      .update({ assigned_logist: logist })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("assign-logist error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
