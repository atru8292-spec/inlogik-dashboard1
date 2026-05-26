"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", background: "linear-gradient(180deg, #E6FAF8 0%, #fff 100%)" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}>
          <div style={{ maxWidth: "420px", textAlign: "center" }}>
            <div style={{
              width: "64px", height: "64px", margin: "0 auto 20px",
              borderRadius: "16px", background: "#C0F2EC",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "28px"
            }}>🔧</div>
            <h1 style={{ fontSize: "22px", color: "#1e293b", marginBottom: "8px", fontWeight: 600 }}>
              Ведутся технические работы
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px", lineHeight: 1.6 }}>
              Дашборд временно недоступен. Обычно это занимает пару минут.
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 24px",
                background: "#14B5A6",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Попробовать снова
            </button>

            <div style={{
              marginTop: "28px", padding: "16px",
              borderRadius: "12px", background: "white",
              border: "1px solid #8BE5DA", textAlign: "left"
            }}>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#334155", margin: "0 0 4px" }}>
                📊 Пока дашборд недоступен
              </p>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px" }}>
                Ставки, запросы и рассылки — в таблице:
              </p>
              <a
                href="https://docs.google.com/spreadsheets/d/1fjbToglhD0e2aFDZZcwUMWBs5dRh5_1KbUjlze0b5ww/edit"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", textAlign: "center",
                  padding: "10px", borderRadius: "8px",
                  background: "#E6FAF8", border: "1px solid #8BE5DA",
                  color: "#0A6B62", fontSize: "13px", fontWeight: 500,
                  textDecoration: "none"
                }}
              >
                📄 Открыть таблицу Inlogik Logs
              </a>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #C0F2EC" }}>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>Что-то не работает?</p>
              <a
                href="https://t.me/arinashrr"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "14px", color: "#0E8278", textDecoration: "none", fontWeight: 500 }}
              >
                ✈ @arinashrr — написать в Telegram
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
