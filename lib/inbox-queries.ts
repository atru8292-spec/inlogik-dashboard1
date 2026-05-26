import { supabaseAdmin } from "./supabase";

// ============================================================
// INBOX — уточнения, требующие ответа логиста
// ============================================================

export type InboxItem = {
  id: string;
  received_at: string;
  body_text: string;
  contractor_name: string | null;
  contractor_email: string | null;
  contractor_id: string | null;
  request_code: string | null;
  request_id: string | null;
  route: string | null;
  logist: string | null;
  author: string | null;
  question_type: "hs_code" | "weight" | "route" | "repack" | "price" | "other";
};

// ── Маппинг message_type из БД (заполняет N8N) → question_type ──────────
function mapDbMessageType(
  dbType: string | null
): InboxItem["question_type"] | null {
  if (!dbType) return null;
  const map: Record<string, InboxItem["question_type"] | null> = {
    quote:              null,
    acknowledgement:    null,
    question:           "other",
    question_redundant: null,
    rate_sheet:         null,
    refusal:            null,
    spam:               null,
    other:              "other",
  };
  return dbType in map ? map[dbType] : "other";
}

/**
 * Вырезает цитату исходного письма из цепочки.
 */
function extractFirstReply(raw: string): string {
  if (!raw) return "";

  const stringMarkers = [
    "-----Original Message-----",
    "-----Исходное сообщение-----",
    "-----Forwarded Message-----",
    "From: mail@inlogik.ru",
    "From: mail ",
    "От: mail@inlogik.ru",
    "От: <mail@inlogik",
    "Sender: mail",
    "发件人: <mail",
    "发件人：<mail",
    "发件人: mail",
    "于20",
    "\nContent-Type: multipart",
  ];

  const regexMarkers = [
    /(?:^|\n)(?:пн|вт|ср|чт|пт|сб|вс),\s+\d{1,2}\s+\S+\s+\d{4}\s+г\.\s+в\s+\d/i,
    /(?:^|\n)On\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+\S+\s+\d{1,2},\s+\d{4}\s+at/i,
    /(?:^|\n)On\s+\d{1,2}\s+\S+\s+\d{4}.*wrote:/i,
    /(?:^|\n)Отправлено:\s+\d{2}\.\d{2}\.\d{4}/,
    /(?:^|\n)Send Time:\s+\d{4}-\d{2}-\d{2}/,
    /于20\d{2}年/,
  ];

  let cutAt = raw.length;

  for (const marker of stringMarkers) {
    const idx = raw.indexOf(marker);
    if (idx > 30 && idx < cutAt) cutAt = idx;
  }

  for (const re of regexMarkers) {
    const m = re.exec(raw);
    if (m && m.index > 30 && m.index < cutAt) cutAt = m.index;
  }

  return raw.substring(0, cutAt).trim();
}

// ── Детектор: контрагент даёт ставку / отвечает с данными ────────────────
function isRateReply(text: string): boolean {
  const t = text.toLowerCase();

  const hasCurrencyWithNumber =
    /\d[\d\s,.]*\s*(rmb|cny|usd|eur|руб|rub|€|\$|¥)/.test(t) ||
    /\b(rmb|cny|usd|eur|руб|rub)\s*[\d,.]+/.test(t);

  const hasRateKeyword =
    t.includes("ставка") ||
    t.includes("тариф") ||
    t.includes("прайс") ||
    t.includes("прикладываю") ||
    t.includes("прикрепляю") ||
    t.includes("во вложении") ||
    t.includes("please find") ||
    t.includes("please see below") ||
    t.includes("please see attached") ||
    t.includes("quotation") ||
    t.includes("our rate") ||
    t.includes("our quote") ||
    t.includes("our price") ||
    t.includes("вариант 1") ||
    t.includes("вариант 2") ||
    t.includes("option 1") ||
    t.includes("option 2") ||
    (t.includes("итого") && hasCurrencyWithNumber) ||
    (t.includes("total") && hasCurrencyWithNumber) ||
    /стоимость за (кг|kg|куб|cbm)/.test(t) ||
    /rate per (kg|cbm|ton)/.test(t) ||
    /\d+\s*(евро|euro|eur)\b/.test(t) ||
    (t.includes("сроки") && hasCurrencyWithNumber) ||
    (t.includes("transit time") && hasCurrencyWithNumber);

  const isAck =
    (t.includes("thank you for your email") || t.includes("thanks for your email")) &&
    !t.includes("?") &&
    text.length < 600;

  const isForwardAck =
    (t.includes("my colleague") && t.includes("will check")) ||
    (t.includes("my colleague") && t.includes("asap")) ||
    t.includes("will get back to you") ||
    (t.includes("добавляю") && t.includes("специалист")) ||
    (t.includes("добавлю") && t.includes("специалист"));

  return (hasRateKeyword && hasCurrencyWithNumber) || isAck || isForwardAck;
}

// ── Классификация по тексту (fallback когда message_type = null) ─────────
function classifyByText(rawText: string): InboxItem["question_type"] | null {
  const text = extractFirstReply(rawText);
  const t = text.toLowerCase();

  if (/\u001b\$B['"]/.test(text) || /\$B['"][A-Z'"]{3,}/.test(text)) return null;
  if (text.length < 15) return null;

  const isRedirect =
    t.includes("добавлю в копию") ||
    t.includes("добавляю в копию") ||
    t.includes("добавлю игоря") ||
    t.includes("добавлю коллегу") ||
    t.includes("павел ответит") ||
    t.includes("our manager is in copy") ||
    t.includes("manager in copy") ||
    t.includes("являюсь менеджером закреплённым") ||
    t.includes("начала расчет") ||
    t.includes("начал расчет") ||
    t.includes("взяли в работу") ||
    t.includes("взял в работу") ||
    t.includes("working on it") ||
    t.includes("we are working on") ||
    t.includes("постараюсь вернуться с обратной связью") ||
    t.includes("nice to meet you") ||
    t.includes("may i know where did you get my contact") ||
    (t.includes("my colleague") && t.includes("will check")) ||
    (t.includes("в копии") && text.length < 300) ||
    (t.includes("ответит") && text.length < 200) ||
    t.includes("he will answer") ||
    t.includes("she will answer") ||
    ((t.includes("ok") || t.includes("ок")) && text.length < 100);

  if (isRedirect) return null;
  if (isRateReply(text)) return null;

  const isHsCode =
    t.includes("тн вэд") ||
    t.includes("тнвэд") ||
    t.includes("hs code") ||
    t.includes("hs-code") ||
    t.includes("hscode") ||
    t.includes("hs:") ||
    t.includes("hs?") ||
    t.includes("код товара") ||
    t.includes("код тн") ||
    t.includes("коды тн") ||
    t.includes("попрошу код") ||
    t.includes("подскажите код") ||
    t.includes("укажите код тн") ||
    t.includes("share hs") ||
    t.includes("provide hs") ||
    t.includes("advise hs") ||
    t.includes("send hs") ||
    (t.includes("please advise") && t.includes("hs")) ||
    (t.includes("please") && t.includes("hs") && t.includes("code")) ||
    /\b\d{8,10}\b/.test(t);

  if (isHsCode) return "hs_code";

  const isWeight =
    t.includes("планируемый вес") ||
    t.includes("сообщить вес") ||
    t.includes("уточните вес") ||
    t.includes("укажите вес") ||
    t.includes("сообщите вес") ||
    t.includes("прошу сообщить") ||
    (t.includes("необходима информация") && (t.includes("вес") || t.includes("габарит"))) ||
    (t.includes("advise") && t.includes("weight")) ||
    (t.includes("please") && t.includes("weight") && t.includes("?")) ||
    (t.includes("please provide") && t.includes("weight")) ||
    (t.includes("please confirm") && t.includes("weight")) ||
    t.includes("height limit") ||
    t.includes("can repack") ||
    t.includes("repack the pallet") ||
    t.includes("repack pallet") ||
    t.includes("размеры мест") ||
    t.includes("параметры груза") ||
    (t.includes("габарит") && t.includes("?")) ||
    (t.includes("размер") && t.includes("?")) ||
    (t.includes("вес") && t.includes("?") && !t.includes("итого")) ||
    (t.includes("для") && t.includes("расчет") && (t.includes("вес") || t.includes("габарит")));

  if (isWeight) return "weight";

  const isRoute =
    t.includes("маршрут") ||
    t.includes("граница") ||
    t.includes("переход границы") ||
    t.includes("border ok") ||
    t.includes("border fine") ||
    t.includes("border crossing") ||
    t.includes("at the border") ||
    /\bborder\b/.test(t) ||
    t.includes("transit via") ||
    t.includes("direct service") ||
    t.includes("via istanbul") ||
    t.includes("via turkey") ||
    t.includes("via belarus") ||
    t.includes("via mongolia") ||
    t.includes("через монголию") ||
    t.includes("через казахстан") ||
    t.includes("manzhouli") ||
    t.includes("маньчжурия") ||
    t.includes("re-stuffed") ||
    t.includes("второй адрес отправки") ||
    t.includes("куда едет груз") ||
    (t.includes("shandong is a province") && t.includes("check city")) ||
    (t.includes("please check") && t.includes("city"));

  if (isRoute) return "route";

  if (t.includes("repack") || t.includes("re-stuff") || t.includes("переупаковк"))
    return "repack";

  const isPrice =
    t.includes("цена") ||
    t.includes("стоимост") ||
    t.includes("value of the cargo") ||
    t.includes("cargo value") ||
    t.includes("invoice value") ||
    t.includes("инвойс") ||
    (t.includes("price") && t.includes("?"));

  if (isPrice) return "price";

  return "other";
}

// ── Является ли письмо реальным вопросом ─────────────────────────────────
function isRealQuestion(row: any): boolean {
  const body = (row.body_text || "").trim();
  if (!body || body.length < 20) return false;
  const t = body.toLowerCase();
  const skipPatterns = [
    "this email and any attachments are confidential",
    "if you have received this",
    "please do not read",
    "unsubscribe",
  ];
  if (skipPatterns.some((p) => t.includes(p)) && t.length < 200) return false;
  return true;
}

export async function getClarificationsInbox(): Promise<InboxItem[]> {
  // Step 1: fetch inbound_messages with status=clarification_needed
  const { data, error } = await supabaseAdmin
    .from("inbound_messages")
    .select(`
      id,
      received_at,
      body_text,
      message_type,
      matched_request_id,
      matched_contractor_id,
      assigned_logist
    `)
    .eq("status", "clarification_needed")
    .order("received_at", { ascending: false });

  if (error) throw error;

  const rows = (data as any[]) || [];
  if (rows.length === 0) return [];

  // Step 2: collect unique IDs for batch lookups
  const contractorIds = [...new Set(rows.map((r) => r.matched_contractor_id).filter(Boolean))] as string[];
  const requestIds = [...new Set(rows.map((r) => r.matched_request_id).filter(Boolean))] as string[];

  // Step 3: batch fetch contractors
  const contractorMap: Record<string, { id: string; name: string; email: string | null }> = {};
  if (contractorIds.length > 0) {
    const { data: contractors, error: ce } = await supabaseAdmin
      .from("contractors")
      .select("id, name, email")
      .in("id", contractorIds);
    if (ce) throw ce;
    for (const c of contractors || []) {
      contractorMap[c.id] = c;
    }
  }

  // Step 4: batch fetch requests (без logist — колонки нет в таблице)
  const requestMap: Record<string, {
    request_code: string;
    ai_origin_city: string | null;
    ai_dest_city: string | null;
    logist: string | null;
    author: string | null;
  }> = {};
  if (requestIds.length > 0) {
    const { data: requests, error: re } = await supabaseAdmin
      .from("requests")
      .select("id, request_code, ai_origin_city, ai_dest_city, logist, author")
      .in("id", requestIds);
    if (re) throw re;
    for (const r of requests || []) {
      requestMap[r.id] = r;
    }
  }

  // Step 5: assemble results
  const results: InboxItem[] = [];

  for (const row of rows) {
    if (!isRealQuestion(row)) continue;

    let question_type: InboxItem["question_type"] | null = null;

    if (row.message_type) {
      question_type = mapDbMessageType(row.message_type);
    }

    if (question_type === null || question_type === undefined) {
      question_type = classifyByText(row.body_text);
    }

    if (!question_type) continue;

    const contractor = row.matched_contractor_id ? contractorMap[row.matched_contractor_id] : null;
    const request = row.matched_request_id ? requestMap[row.matched_request_id] : null;

    results.push({
      id: row.id,
      received_at: row.received_at,
      body_text: row.body_text || "",
      contractor_id: row.matched_contractor_id ?? null,
      contractor_name: contractor?.name ?? null,
      contractor_email: contractor?.email ?? null,
      request_code: request?.request_code ?? null,
      request_id: row.matched_request_id ?? null,
      route:
        request
          ? `${request.ai_origin_city ?? "?"} → ${request.ai_dest_city ?? "?"}`
          : null,
      logist: row.assigned_logist ?? request?.logist ?? null,
      author: request?.author ?? null,
      question_type,
    });
  }

  return results;
}

export async function getInboxStats(): Promise<{
  total: number;
  oldest_age_h: number;
  by_type: Record<string, number>;
}> {
  const items = await getClarificationsInbox();
  const by_type: Record<string, number> = {};
  let oldest_age_h = 0;

  for (const item of items) {
    by_type[item.question_type] = (by_type[item.question_type] || 0) + 1;
    const ageH = (Date.now() - new Date(item.received_at).getTime()) / 3_600_000;
    if (ageH > oldest_age_h) oldest_age_h = ageH;
  }

  return { total: items.length, oldest_age_h: Math.round(oldest_age_h), by_type };
}
