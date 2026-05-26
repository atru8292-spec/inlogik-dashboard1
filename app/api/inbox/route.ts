import { NextResponse } from 'next/server'
import { getClarificationsInbox, getInboxStats } from '@/lib/inbox-queries'

export const revalidate = 0

export async function GET() {
  try {
    const [items, stats] = await Promise.all([
      getClarificationsInbox(),
      getInboxStats(),
    ])
    return NextResponse.json({ items, stats })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
