// FinOps + analytics API: GET /api/admin/analytics
import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession, requireRole } from '@/lib/auth'
import { getAnalytics, getFinOps } from '@/lib/observability'
import { getCacheStats } from '@/lib/cache/semantic-cache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getServerSession()
  if (!requireRole(user, 'admin')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const view = url.searchParams.get('view') ?? 'summary'
  const sinceParam = url.searchParams.get('since')
  const since = sinceParam ? parseInt(sinceParam, 10) : Date.now() - 24 * 60 * 60 * 1000

  if (view === 'finops') {
    const finops = getFinOps({ since })
    return NextResponse.json({ finops })
  }

  if (view === 'cache') {
    return NextResponse.json({ cache: getCacheStats() })
  }

  const userId = url.searchParams.get('userId') ?? undefined
  const analytics = getAnalytics({ userId, since })
  return NextResponse.json({ analytics, since })
}
