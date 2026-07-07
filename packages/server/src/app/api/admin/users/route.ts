import { NextRequest, NextResponse } from 'next/server'
import { isFirebaseReady, listUsers } from '@/lib/firebase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isFirebaseReady()) return NextResponse.json({ users: [] })
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
  const startAfter = req.nextUrl.searchParams.get('startAfter') || undefined
  const users = await listUsers(limit, startAfter)
  return NextResponse.json({ users })
}
