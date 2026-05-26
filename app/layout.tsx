import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";

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
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-x-auto pt-14 lg:pt-0">
            <div className="max-w-7xl mx-auto p-4 lg:p-8">
              {children}
            </div>
          </main>
        </div>
        <ToastProvider />
      </body>
    </html>
  );
}
