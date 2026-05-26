import { notFound } from "next/navigation";
import { getRequestByCode } from "@/lib/queries";
import { RequestDetailView } from "@/components/RequestDetailView";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({
  params,
}: {
  params: { code: string };
}) {
  const code = decodeURIComponent(params.code);
  const data = await getRequestByCode(code);
  if (!data) notFound();

  return <RequestDetailView code={code} initialData={data} />;
}
