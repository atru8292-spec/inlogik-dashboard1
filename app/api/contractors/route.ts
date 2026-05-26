import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, contact_name, contact_language, has_contract, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email обязателен" }, { status: 400 });
    }

    // Check for duplicate email
    const { data: existing } = await supabaseAdmin
      .from("contractors")
      .select("id, name")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ 
        error: "duplicate", 
        existing_id: existing.id, 
        existing_name: existing.name 
      }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from("contractors")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        contact_name: contact_name?.trim() || null,
        contact_language: contact_language || "ru",
        has_contract: has_contract || false,
        priority_score: 50,
        bounce_count: 0,
        blacklisted: false,
        opted_out: false,
      })
      .select("id, name, email")
      .single();

    if (error) throw error;

    // Save note if provided
    if (notes?.trim()) {
      await supabaseAdmin.from("contractor_notes").insert({
        contractor_id: data.id,
        text: notes.trim(),
        author: "dashboard",
      });
    }

    await supabaseAdmin.from("audit_log").insert({
      entity_type: "contractor",
      entity_id: data.id,
      event: "contractor_created",
      details: { name: data.name, email: data.email, source: "dashboard" },
    });

    return NextResponse.json({ ok: true, contractor: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
