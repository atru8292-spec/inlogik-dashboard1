import { getActiveRequests, getSystemMetrics } from "@/lib/queries";
import { RequestsView } from "@/components/RequestsView";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [requests, metrics] = await Promise.all([
    getActiveRequests(),
    getSystemMetrics(),
  ]);

  return <RequestsView initialRequests={requests} initialMetrics={metrics} />;
}
