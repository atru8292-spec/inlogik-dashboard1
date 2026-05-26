import { getContractorStats } from "@/lib/queries";
import { ContractorsView } from "@/components/ContractorsView";

export const dynamic = "force-dynamic";

export default async function ContractorsPage() {
  const stats = await getContractorStats();
  return <ContractorsView initialStats={stats} />;
}
