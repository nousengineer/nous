import { NextRequest, NextResponse } from 'next/server'
import { getServerSession, requireRole } from '@/lib/auth'
import { loadConfig } from '@/lib/config'

const { SessionStore } = await import('@/lib/session-store')
const config = loadConfig()
const store = new SessionStore(config.workspace)
await store.init()

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const workDir = body.cwd || config.workspace
  const provider = body.provider || config.defaultProvider
  const model = body.model || config.defaultModel
  const session = store.create(workDir, provider, model, user!.uid, body.metadata)
  store.updateStatus(session.id, 'running')

  const wsUrl = `${process.env.KAIROS_WS_PUBLIC_URL || `ws://localhost:${config.port}`}/api/sessions/${session.id}/ws`
  return NextResponse.json({ session_id: session.id, ws_url: wsUrl, work_dir: workDir }, { status: 201 })
}

export async function GET() {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const list = user!.role === 'admin' ? store.list() : store.listByUser(user!.uid)
  return NextResponse.json({ sessions: list.map(s => ({ id: s.id, status: s.status, createdAt: s.createdAt, lastActiveAt: s.lastActiveAt, workDir: s.workDir, provider: s.provider, model: s.model, userId: s.userId })) })
}
