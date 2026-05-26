import { NextResponse } from "next/server";
import { getFunnel } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const funnel = await getFunnel();
    return NextResponse.json({ funnel });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
