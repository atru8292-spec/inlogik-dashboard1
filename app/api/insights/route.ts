import { NextResponse } from "next/server";
import { getProblematicRequests, getRecentClarifications } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [problematic, clarifications] = await Promise.all([
      getProblematicRequests(),
      getRecentClarifications(50),
    ]);
    return NextResponse.json({ problematic, clarifications });
  } catch (err: any) {
    console.error("/api/insights error:", err);
    return NextResponse.json(
      { problematic: [], clarifications: [], error: err?.message || "unknown" },
      { status: 500 }
    );
  }
}
