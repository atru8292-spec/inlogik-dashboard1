import { getClarificationsInbox } from "@/lib/inbox-queries";
import { InboxView } from "@/components/InboxView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Инбокс уточнений — Inlogik" };

export default async function InboxPage() {
  const items = await getClarificationsInbox();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <InboxView initialItems={items} />
    </main>
  );
}
