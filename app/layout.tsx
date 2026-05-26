import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { AIChatWidget } from "@/components/AIChatWidget";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ScrollButtons } from "@/components/ScrollButtons";

export const metadata: Metadata = {
  title: "Inlogik · Дашборд",
  description: "Управление запросами ставок логистики",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen overflow-y-auto">
        <WelcomeScreen />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-x-hidden pt-14 lg:pt-0">
            <div className="max-w-7xl mx-auto p-4 lg:p-8 pb-24">
              {children}
            </div>
          </main>
        </div>
        <ToastProvider />
        <ScrollButtons />
        <FeedbackWidget />
        <AIChatWidget />
      </body>
    </html>
  );
}
