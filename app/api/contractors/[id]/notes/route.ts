import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET — список заметок подрядчика
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin.rpc("dashboard_contractor_notes", {
      p_contractor_id: params.id,
    });
    if (error) throw error;
    return NextResponse.json({ notes: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — добавить заметку
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const text = (body.text || "").trim();
    const author = (body.author || "team").trim() || "team";
    if (!text) return NextResponse.json({ error: "empty text" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("contractor_notes")
      .insert({ contractor_id: params.id, text, author })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ note: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — редактировать
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = body.id;
    const text = (body.text || "").trim();
    if (!id || !text) return NextResponse.json({ error: "missing fields" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("contractor_notes")
      .update({ text, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ note: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — удалить
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("noteId");
    if (!id) return NextResponse.json({ error: "missing noteId" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("contractor_notes")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
