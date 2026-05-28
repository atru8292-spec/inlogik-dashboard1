import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { quotes, requestInfo } = await request.json();

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({ error: "Нет ставок для анализа" }, { status: 400 });
    }

    const quotesText = quotes.map((q: any, i: number) => {
      const priceRaw = `${q.price} ${q.currency}`;
      const priceUSD = q.estimated_total
        ? `≈ $${Number(q.estimated_total).toLocaleString("ru")}`
        : "USD-эквивалент неизвестен";
      const transit = q.transit_days
        ? `${q.transit_days} дн`
        : q.transit_days_min && q.transit_days_max
        ? `${q.transit_days_min}–${q.transit_days_max} дн`
        : "НЕ УКАЗАН";
      const included = q.included?.length ? q.included.join(", ") : "НЕ УКАЗАНО";
      const excluded = q.excluded?.length ? q.excluded.join(", ") : "нет данных";
      const warnings = q.hidden_cost_warnings?.length
        ? q.hidden_cost_warnings.join("; ")
        : "нет";
      const localCharges = q.local_charges_breakdown || "";
      const freightAmount = q.freight_amount
        ? `фрахт отдельно: $${q.freight_amount}`
        : "";
      const termOrigin = q.terminal_origin || "";
      const termDest = q.terminal_dest || "";
      const customs = q.customs_included || "";
      const valid = q.valid_until ? `до ${q.valid_until}` : "не указана";
      const notes = q.notes || q.summary_human || "";
      const emailBody = q.email_body
        ? q.email_body.replace(/\s+/g, " ").trim().slice(0, 500)
        : "";

      return `[${i + 1}] ${q.contractor?.name || "Неизвестный"}
  Цена: ${priceRaw} (${priceUSD})
  Транзит: ${transit}
  Инкотермс: ${q.incoterms || "не указан"}
  Контейнер: ${q.container_type || "не указан"}
  Терминал отправления: ${termOrigin || "не указан"}
  Терминал назначения: ${termDest || "не указан"}
  Таможня включена: ${customs || "не указано"}
  Включено в ставку: ${included}
  НЕ включено: ${excluded}
  Скрытые расходы / предупреждения: ${warnings}
  Локальные сборы: ${localCharges || "нет данных"}
  ${freightAmount}
  Валидность: ${valid}
  ${notes ? "Краткое описание: " + notes : ""}
  ${emailBody ? "Текст письма: " + emailBody : ""}`;
    }).join("\n\n---\n\n");

    const systemPrompt = `Ты — старший логист с 10+ годами опыта в международных грузоперевозках (Китай, Европа, Турция → Россия).
Твоя задача — помочь выбрать ставку с МИНИМАЛЬНОЙ итоговой стоимостью доставки под ключ.

═══ ГЛАВНЫЕ ПРАВИЛА ═══

1. СЧИТАЙ ИТОГ ДЛЯ КАЖДОЙ СТАВКИ
Итог = цена ставки + всё что придётся доплатить (DTHC, таможня, забор груза, последняя миля, доставка от порта).
Только после расчёта итога по всем ставкам выбирай лучшую.

2. НЕПОЛНЫЕ СТАВКИ — КРАСНЫЙ ФЛАГ
Если ставка покрывает только фрахт ($400 за контейнер при средней $3000-8000) — она НЕПОЛНАЯ.
К ней обязательно добавятся: DTHC $400-800, таможня $300-600, последняя миля $500-2000.
Не объявляй её лучшей только потому что цифра маленькая.

3. ВАЛЮТЫ — ПРИВОДИ К USD
CNY ÷ 7.1 = USD
EUR × 1.08 = USD
RUB ÷ 90 = USD

4. ИНКОТЕРМС
EXW — забор с завода НЕ включён (+$200-500)
FOB — отправитель везёт до порта сам
CIF/DAP/DDP — больше включено, цена выше но сравнивать честнее

5. DTHC И ТЕРМИНАЛЬНЫЕ СБОРЫ
DTHC в порту назначения — если не включён, добавь $400-800
Терминальная обработка на ЖД станции — $300-600 если не включена

6. РАЗНЫЕ ПОРТЫ НАЗНАЧЕНИЯ — ОБЯЗАТЕЛЬНО УЧИТЫВАЙ
Ставка до Владивостока: + ЖД до Москвы $2500-3500 + терминал $500-800 = итого +$3000-4300
Ставка до Новороссийска: + доставка до Москвы $800-1500
Ставка до СПб: + доставка до Москвы $500-1200
Ставка ЖД до Москвы/Белый Раст/Ворсино: + только последняя миля $200-500
Ставки с разными портами НЕЛЬЗЯ сравнивать без приведения к общему конечному городу.

7. СРОК ДОСТАВКИ
Без срока = риск. Реальные ориентиры:
ЖД Китай→Москва: 18-28 дней
Авто Китай→Москва: 15-22 дня
Море через Владик: 28-40 дней + ЖД
Море через Новороссийск: 35-50 дней
Авиа: 2-5 дней

═══ СТРУКТУРА ОТВЕТА ═══

Сначала — таблица расчётов (текстом, без символов таблицы):

Расчёт итоговой стоимости:
[название] — ставка $X + DTHC ~$Y + таможня ~$Z + последняя миля ~$W = итого ~$TOTAL
[название] — ставка $X + ... = итого ~$TOTAL
...

Затем:

РЕКОМЕНДУЮ: [название] — итого ~$TOTAL

Почему: 3-4 предложения. Конкретно: что включено, почему итог самый низкий, есть ли риски. Говори как коллега.

На что обратить внимание: конкретные риски выбранной ставки. Что уточнить у подрядчика до подтверждения.

Остальные варианты:
[название] — итого ~$X — одна фраза (почему дороже или хуже)

Пиши по-русски. Без звёздочек, решёток, маркеров списков. Просто текст.`;

    const r = requestInfo || {};
    const userPrompt = `=== ЗАПРОС ===
Маршрут: ${r.route || "не указан"}${r.originCountry ? " (" + r.originCountry + " →" : ""}${r.destCountry ? " " + r.destCountry + ")" : ""}
Адрес забора груза: ${r.loadingAddress || "не указан"}
Адрес доставки: ${r.deliveryAddress || "не указан"}
Клиент: ${r.customer || "не указан"}
Груз: ${r.cargo || "не указан"}${r.hsCode ? " (ТН ВЭД: " + r.hsCode + ")" : ""}
Вес: ${r.weightKg ? r.weightKg + " кг" : "не указан"}
Объём: ${r.volumeCbm ? r.volumeCbm + " м³" : "не указан"}
Мест: ${r.pieces || "не указано"}
Контейнер: ${r.containerType || "не указан"}
Транспорт: ${r.transportMode || "не указан"}
Условия поставки: ${r.incoterms || "не указаны"}
Таможня: ${r.customsBy || "не указано"}
Особые условия: ${r.specialNotes || "нет"}

=== СТАВКИ (${quotes.length} шт.) ===

${quotesText}

Посчитай итоговую стоимость под ключ для каждой ставки. Выбери самую дешёвую реальную.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1200,
        temperature: 0.15,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await res.json();
    const analysis = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ analysis });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
