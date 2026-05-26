import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Skip if already Russian
    const cyrillicRatio = (text.match(/[а-яёА-ЯЁ]/g) || []).length / text.length;
    if (cyrillicRatio > 0.5) {
      return NextResponse.json({ translated: text, skipped: true });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "Переведи текст на русский язык. Сохрани форматирование, переносы строк, имена и названия компаний. Не добавляй ничего от себя. Если текст уже на русском — верни как есть.",
          },
          { role: "user", content: text.slice(0, 3000) },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!openaiRes.ok) {
      return NextResponse.json({ error: "Translation failed" }, { status: 502 });
    }

    const data = await openaiRes.json();
    const translated = data.choices?.[0]?.message?.content || text;

    return NextResponse.json({ translated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
