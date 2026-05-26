import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Ты — помощник логистов в дашборде компании Инлоджик. Говоришь просто, как коллега в чате.

АБСОЛЮТНЫЕ ПРАВИЛА:
1. НИКОГДА не выдумывай данные. Если тебе не дали конкретные цифры в контексте — скажи "у меня нет этих данных, попробуйте спросить иначе или откройте запрос в дашборде". НИКОГДА не придумывай имена подрядчиков, цены, рейтинги, статусы.
2. Если тебе ДАЛИ данные из базы (они будут в блоке "ДАННЫЕ ИЗ БАЗЫ:") — используй ТОЛЬКО их, цитируй точно.
3. Отвечай по-русски, коротко, без markdown. Никаких ** звёздочек **, ## заголовков, - списков, 1. нумерации. Просто текст как в мессенджере.
4. Если пользователь грубит или оскорбляет — спокойно скажи "Давайте по делу, чем могу помочь?" Не обижайся, не извиняйся, не реагируй на провокации.
5. Не объясняй техническое устройство системы. Логист хочет знать ЧТО происходит, а не КАК работает код.
6. Не говори "перейдите по адресу /requests/..." — либо дай конкретные цифры, либо скажи "откройте этот запрос в списке на главной странице".

ЧТО ТЫ МОЖЕШЬ:
- Рассказать статус, ставки, подрядчиков по конкретному запросу (если данные переданы)
- Подсказать где что найти в дашборде
- Объяснить что значат бейджи, цифры, рейтинги

Краткая навигация:
- Главная = активные запросы с карточками
- Подрядчики = список с рейтингами, можно кликнуть на любого
- Почта = уточнения от подрядчиков, нужен ответ логиста
- Кликнуть на запрос = детальная страница с таблицей ставок

Рейтинг подрядчика 0-100 виден в таблице подрядчиков (страница "Подрядчики") и на странице конкретного подрядчика. Чем выше — тем надёжнее.`;

async function lookupRequest(code: string) {
  const cleanCode = code.replace(/^req[- ]*/i, "").replace(/^0+/, "");

  const { data: rows } = await supabaseAdmin
    .from("requests")
    .select("id, request_code, status, status_1c, customer, logist, author, ai_origin_city, ai_dest_city, ai_cargo_name, ai_transport_mode, received_at")
    .or(`request_code.ilike.%${cleanCode}%,request_code.ilike.%${code}%`)
    .limit(3);

  if (!rows || rows.length === 0) return null;
  const r = rows[0];

  const { data: quotes } = await supabaseAdmin
    .from("quotes")
    .select("id, price, currency, transit_days, transit_days_min, transit_days_max, incoterms, is_best, is_selected, created_at, contractor:contractors(name, priority_score)")
    .eq("request_id", r.id)
    .order("price", { ascending: true, nullsFirst: false });

  const { data: outreach } = await supabaseAdmin
    .from("outreach_messages")
    .select("status")
    .eq("request_id", r.id);

  const sent = outreach?.filter((o: any) => ["sent", "replied", "auto_replied", "refused", "bounced"].includes(o.status)).length || 0;
  const replied = outreach?.filter((o: any) => ["replied", "auto_replied"].includes(o.status)).length || 0;

  return { request: r, quotes: quotes || [], sent, replied, totalOutreach: outreach?.length || 0 };
}

function formatRequestContext(data: any): string {
  const r = data.request;
  const q = data.quotes;

  let text = `\n\nДАННЫЕ ИЗ БАЗЫ по запросу ${r.request_code}:\n`;
  text += `Статус: ${r.status}${r.status_1c ? ', статус 1С: ' + r.status_1c : ''}\n`;
  text += `Маршрут: ${r.ai_origin_city || '?'} → ${r.ai_dest_city || '?'}\n`;
  text += `Груз: ${r.ai_cargo_name || 'не указан'}\n`;
  text += `Клиент: ${r.customer || 'не указан'}\n`;
  text += `Логист: ${r.logist || 'не назначен'}\n`;
  text += `Автор: ${r.author || 'не указан'}\n`;
  text += `Рассылка: отправлено ${data.sent}, ответили ${data.replied}\n`;
  text += `Всего ставок: ${q.length}\n`;

  if (q.length > 0) {
    const best = q.find((x: any) => x.is_best || x.is_selected);
    if (best) {
      text += `Лучшая ставка (выбрана): ${best.contractor?.name || 'неизвестный'}, ${best.price} ${best.currency || ''}, ${best.transit_days ? best.transit_days + ' дн' : 'срок не указан'}, ${best.incoterms || 'условия не указаны'}, рейтинг подрядчика ${best.contractor?.priority_score || '?'}\n`;
    }
    text += 'Все ставки:\n';
    for (const quote of q) {
      const name = quote.contractor?.name || 'неизвестный';
      const price = quote.price != null ? `${quote.price} ${quote.currency || ''}` : 'цена не указана';
      const transit = quote.transit_days ? `${quote.transit_days} дн` : (quote.transit_days_min && quote.transit_days_max ? `${quote.transit_days_min}-${quote.transit_days_max} дн` : 'срок не указан');
      const score = quote.contractor?.priority_score ? `рейтинг ${quote.contractor.priority_score}` : '';
      const selected = (quote.is_best || quote.is_selected) ? ' [ЛУЧШАЯ]' : '';
      text += `  ${name}: ${price}, ${transit}, ${quote.incoterms || '—'}${score ? ', ' + score : ''}${selected}\n`;
    }
  } else {
    text += 'Ставок пока нет.\n';
  }

  text += '\nОтвечай ТОЛЬКО на основе этих данных. Если чего-то нет — скажи что нет данных.';
  return text;
}

async function lookupTopContractors() {
  const { data } = await supabaseAdmin
    .from("contractors")
    .select("name, priority_score, email")
    .gt("priority_score", 0)
    .order("priority_score", { ascending: false })
    .limit(5);

  if (!data || data.length === 0) return null;

  let text = '\n\nДАННЫЕ ИЗ БАЗЫ — топ подрядчиков по рейтингу:\n';
  for (const c of data) {
    text += `  ${c.name}: рейтинг ${c.priority_score}\n`;
  }
  text += '\nОтвечай ТОЛЬКО на основе этих данных.';
  return text;
}

// Extract request code from conversation history
function findRequestCodeInHistory(history: any[], currentMessage: string): string | null {
  const allText = [...(history || []).map((h: any) => h.content), currentMessage].join(" ");
  const matches = allText.match(/(?:запрос|req|реквест|заявк)[а-яё\s#-]*(\d{3,6})/gi);
  if (matches) {
    const last = matches[matches.length - 1];
    const num = last.match(/(\d{3,6})/);
    if (num) return num[1];
  }
  const numMatches = allText.match(/\b(\d{4,6})\b/g);
  if (numMatches) return numMatches[numMatches.length - 1];
  return null;
}

export async function POST(request: Request) {
  try {
    const { message, history, messageCount } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Rate limit: 30 messages per session
    if (messageCount && messageCount > 30) {
      return NextResponse.json({
        reply: "Вы задали уже много вопросов за эту сессию. Обновите страницу и попробуйте позже, или обратитесь к Арине напрямую."
      });
    }

    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];

    if (Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    let extraContext = "";

    // Check for request code in current message or history
    const directReqMatch = message.match(/(?:запрос|req|реквест|заявк)[а-яё\s#-]*(\d{3,6})/i)
      || message.match(/\b(\d{4,6})\b/);

    const isFollowUp = !directReqMatch && /(?:а |какая|какой|какие|кто|сколько|стоимость|цена|лучш|подрядчик|ставк|статус)/i.test(message);

    let reqCode = directReqMatch ? directReqMatch[1] : null;
    if (!reqCode && isFollowUp) {
      reqCode = findRequestCodeInHistory(history, "");
    }

    if (reqCode) {
      const data = await lookupRequest(reqCode);
      if (data) {
        extraContext = formatRequestContext(data);
      } else {
        extraContext = `\n\nДАННЫЕ ИЗ БАЗЫ: Запрос "${reqCode}" не найден.`;
      }
    }

    // Check if asking about best/top contractors overall
    if (/(?:лучш|топ|рейтинг|надёжн|надежн).*(?:подрядчик|контрактор|все|общ|в целом)/i.test(message)
      || /(?:в целом|из всех|самый)/i.test(message)) {
      const topData = await lookupTopContractors();
      if (topData) extraContext += topData;
    }

    // Add metrics
    try {
      const { data: metrics } = await supabaseAdmin.rpc("dashboard_system_metrics", { p_hours: 24 });
      if (metrics?.[0]) {
        const m = metrics[0];
        extraContext += `\n\nОбщая сводка за 24ч: ${m.requests_24h} новых запросов, ${m.outreach_sent_24h} писем, ${m.quotes_received_24h} ставок, ${m.contractors_total} подрядчиков в базе.`;
      }
    } catch (_) {}

    if (extraContext) {
      messages[0].content += extraContext;
    }

    messages.push({ role: "user", content: message });

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages,
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error("[chat] OpenAI error:", err);
      return NextResponse.json({ reply: "AI временно недоступен, попробуйте через минуту" });
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content || "Не удалось получить ответ.";

    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
