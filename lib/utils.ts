import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string | Date | null): string {
  if (!date) return "—";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ru });
  } catch {
    return "—";
  }
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return "—";
  try {
    const d = new Date(date);
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatHours(hours: number | null): string {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} мин`;
  if (hours < 24) return `${Math.round(hours)} ч`;
  return `${Math.round(hours / 24)} дн`;
}

export function formatPrice(price: number | string | null, currency: string | null): string {
  if (price === null || price === undefined) return "—";
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return String(price);
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
  return `${formatted} ${currency || ""}`.trim();
}

// Маппинг статусов outreach → бейдж
export function outreachStatusBadge(status: string): { label: string; klass: string } {
  switch (status) {
    case "sent":
      return { label: "Отправлено", klass: "badge-inlogik" };
    case "replied":
    case "auto_replied":
      return { label: "Ответил", klass: "badge-good" };
    case "refused":
      return { label: "Отказ", klass: "badge-warn" };
    case "bounced":
      return { label: "Не доставлено", klass: "badge-bad" };
    case "failed":
      return { label: "Ошибка", klass: "badge-bad" };
    case "pending":
      return { label: "В резерве", klass: "badge-muted" };
    case "queued":
      return { label: "В очереди", klass: "badge-warn" };
    default:
      return { label: status, klass: "badge-muted" };
  }
}

// Маппинг статусов request → бейдж
export function requestStatusBadge(status: string): { label: string; klass: string } {
  switch (status) {
    case "new":
      return { label: "Новый", klass: "badge-muted" };
    case "parsed":
      return { label: "Распарсен", klass: "badge-inlogik" };
    case "sent":
      return { label: "Разослан", klass: "badge-good" };
    case "needs_review":
      return { label: "На проверку", klass: "badge-warn" };
    case "failed":
      return { label: "Ошибка", klass: "badge-bad" };
    case "archived":
      return { label: "В архиве", klass: "badge-muted" };
    default:
      return { label: status, klass: "badge-muted" };
  }
}

export function transportIcon(mode: string | null): string {
  switch (mode) {
    case "auto": return "🚚";
    case "rail": return "🚆";
    case "sea": return "🚢";
    case "air": return "✈️";
    case "assembly": return "📦";
    case "export": return "🌍";
    default: return "📋";
  }
}
