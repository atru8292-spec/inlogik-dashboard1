import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { quote_id, request_id } = await request.json();
    if (!quote_id) {
      return NextResponse.json({ error: "quote_id is required" }, { status: 400 });
    }

    // Unselect all quotes for this request
    if (request_id) {
      await supabaseAdmin
        .from("quotes")
        .update({ is_selected: false, is_best: false })
        .eq("request_id", request_id);
    }

    // Select this quote
    const { error } = await supabaseAdmin
      .from("quotes")
      .update({
        is_selected: true,
        is_best: true,
        selected_at: new Date().toISOString(),
        selected_by: "logist_dashboard",
      })
      .eq("id", quote_id);

    if (error) throw error;

    // Recalculate contractor score
    const { data: quote } = await supabaseAdmin
      .from("quotes")
      .select("contractor_id")
      .eq("id", quote_id)
      .maybeSingle();

    if (quote?.contractor_id) {
      await supabaseAdmin.rpc("update_single_contractor_score", {
        p_contractor_id: quote.contractor_id,
      });
    }

    // Audit log
    await supabaseAdmin.from("audit_log").insert({
      entity_type: "quote",
      entity_id: quote_id,
      event: "quote_selected",
      details: { request_id, selected_by: "logist_dashboard" },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
