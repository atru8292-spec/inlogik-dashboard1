import { notFound } from "next/navigation";
import { getContractorById } from "@/lib/queries";
import { ContractorDetailView } from "@/components/ContractorDetailView";

export const dynamic = "force-dynamic";

export default async function ContractorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getContractorById(params.id);
  if (!data) notFound();
  return <ContractorDetailView id={params.id} initialData={data} />;
}
