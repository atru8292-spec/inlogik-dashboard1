import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import nodemailer from "nodemailer";

// POST /api/inbox/send-reply
// Отправляет письмо подрядчику через SMTP
// Использует: SMTP_HOST, SMTP_PORT (587), SMTP_USER, SMTP_PASS
export async function POST(req: Request) {
  try {
    const { id, to, subject, body, replied_by } = await req.json();
    if (!id || !to || !body) {
      return NextResponse.json(
        { error: "id, to, body are required" },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    let sent = false;
    let sendError: string | null = null;

    if (!host || !user || !pass) {
      sendError = "SMTP не настроен: отсутствуют SMTP_HOST, SMTP_USER или SMTP_PASS";
    } else {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,  // 465 → SSL, 587 → STARTTLS
          auth: { user, pass },
        });

        await transporter.sendMail({
          from: `"Inlogik" <${user}>`,
          to,
          subject: subject ?? "Re: Запрос",
          text: body,
        });

        sent = true;
      } catch (e: any) {
        sendError = e.message ?? "SMTP error";
      }
    }

    const now = new Date().toISOString();

    // Пишем в outbound_messages (лог ответов логистов)
    const { error: logError } = await supabaseAdmin
      .from("outbound_messages")
      .insert({
        inbound_message_id: id,
        to_email: to,
        subject: subject ?? "Re: Запрос",
        body,
        replied_by: replied_by ?? null,
        sent_at: sent ? now : null,
        send_error: sendError,
      });

    if (logError) {
      console.warn("outbound_messages insert failed (таблица не создана?):", logError.message);
    }

    // Обновляем статус входящего
    const { error: updateError } = await supabaseAdmin
      .from("inbound_messages")
      .update({
        status: "auto_replied",
        replied_at: now,
        replied_by: replied_by ?? null,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      sent,
      sendError,
      note: sent
        ? `Письмо отправлено через ${host}:${port}`
        : `Статус обновлён, но письмо не отправлено: ${sendError}`,
    });
  } catch (err: any) {
    console.error("send-reply error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
