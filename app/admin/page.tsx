import { getSystemMetrics, getFunnel, getRecentAudit } from "@/lib/queries";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";
// NOTE: revalidate removed — force-dynamic already disables caching

export default async function AdminPage() {
  const [metrics, funnel, audit] = await Promise.all([
    getSystemMetrics(),
    getFunnel(),
    getRecentAudit(50),
  ]);

  return <AdminDashboard initialData={{ metrics, funnel, audit }} />;
}
