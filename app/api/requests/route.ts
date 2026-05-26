import { NextResponse } from "next/server";
import { getActiveRequests, getSystemMetrics } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get("hours") || "24", 10);
    const [requests, metrics] = await Promise.all([
      getActiveRequests(),
      getSystemMetrics(hours),
    ]);
    return NextResponse.json({ requests, metrics });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
