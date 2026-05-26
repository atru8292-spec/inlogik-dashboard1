import { NextResponse } from "next/server";
import { getInboxStats } from "@/lib/inbox-queries";

export const dynamic = "force-dynamic";

// GET /api/inbox/count — бейдж в сайдбаре
// Считает реальные классифицированные письма (те что видны в инбоксе),
// а не сырое кол-во clarification_needed из базы.
export async function GET() {
  try {
    const stats = await getInboxStats();
    return NextResponse.json({ count: stats.total });
  } catch (err) {
    console.error("[inbox/count]", err);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
