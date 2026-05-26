import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { request_id, fields } = body;
    if (!request_id || !fields) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    const updateData: Record<string, any> = {
      status: "new",
      last_error: null,
      ai_missing_fields: null,
    };
    if (fields.transport_mode) updateData.ai_transport_mode = fields.transport_mode;
    if (fields.origin_city)    updateData.ai_origin_city    = fields.origin_city;
    if (fields.origin_country) updateData.ai_origin_country = fields.origin_country;
    if (fields.dest_city)      updateData.ai_dest_city      = fields.dest_city;
    if (fields.dest_country)   updateData.ai_dest_country   = fields.dest_country;
    if (fields.cargo_name)     updateData.ai_cargo_name     = fields.cargo_name;
    if (fields.incoterms)      updateData.ai_incoterms      = fields.incoterms;
    if (fields.container_type) updateData.ai_container_type = fields.container_type;
    if (fields.weight_kg)      updateData.ai_weight_kg      = Number(fields.weight_kg);
    if (fields.volume_cbm)     updateData.ai_volume_cbm     = Number(fields.volume_cbm);
    if (fields.note)           updateData.note              = fields.note;
    const { error } = await supabaseAdmin.from("requests").update(updateData).eq("id", request_id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
