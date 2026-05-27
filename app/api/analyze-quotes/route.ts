import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { quotes, requestInfo } = await request.json();

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({ error: "Нет ставок для анализа" }, { status: 400 });
    }

    // Форматируем ставки для AI
    const quotesText = quotes.map((q: any, i: number) => {
      const price = q.estimated_total
        ? `${q.price} ${q.currency} (итого ~$${q.estimated_total})`
        : `${q.price} ${q.currency}`;
      const transit = q.transit_days
        ? `${q.transit_days} дн`
        : q.transit_days_min && q.transit_days_max
        ? `${q.transit_days_min}–${q.transit_days_max} дн`
        : "срок не указан";
      const included = q.included?.length ? `✓ ${q.included.join(", ")}` : "";
      const excluded = q.excluded?.length ? `✗ ${q.excluded.join(", ")}` : "";
      const warnings = q.hidden_cost_warnings?.length ? `⚠️ ${q.hidden_cost_warnings.join("; ")}` : "";
      const notes = q.notes ? `Примечание: ${q.notes}` : "";
      const rating = q.contractor?.priority_score ? `рейтинг ${q.contractor.priority_score}` : "";
      const valid = q.valid_until ? `действительна до ${q.valid_until}` : "";

      return [
        `${i + 1}. ${q.contractor?.name || "Неизвестный"}${rating ? ` (${rating})` : ""}`,
        `   Цена: ${price}`,
        `   Транзит: ${transit}`,
        q.incoterms ? `   Условия: ${q.incoterms}` : "",
        q.container_type ? `   Контейнер: ${q.container_type}` : "",
        included,
        excluded,
        warnings,
        notes,
        valid,
      ]
        .filter(Boolean)
        .join("\n");
    }).join("\n\n");

    const systemPrompt = `Ты — опытный логист-аналитик. Твоя задача — помочь выбрать лучшую ставку из предложенных.

Анализируй честно и практично. Пиши как коллега-логист, без воды и канцелярита.

Структура ответа (строго):
1. РЕКОМЕНДУЮ: [название подрядчика] — [цена]
2. ПОЧЕМУ: 2-3 предложения, конкретно — цена, надёжность, условия, срок. Что реально важно.
3. НА ЧТО ОБРАТИТЬ ВНИМАНИЕ: скрытые расходы, риски, что не включено. Если всё чисто — так и скажи.
4. ОСТАЛЬНЫЕ СТАВКИ: по одной строке на каждого — почему не выбрал, что у них не так или чего не хватает.

Пиши по-русски, без markdown, без звёздочек и решёток. Просто текст абзацами.`;

    const userPrompt = `Маршрут: ${requestInfo?.route || "не указан"}
Груз: ${requestInfo?.cargo || "не указан"}
Условия: ${requestInfo?.incoterms || "не указаны"}

Ставки (${quotes.length} шт.):

${quotesText}

Проведи анализ и скажи какую ставку выбрать и почему.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
        temperature: 0.3,
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
