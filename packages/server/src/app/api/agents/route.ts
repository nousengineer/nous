// Agent Registry + Memory API: GET/POST /api/agents
import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession, requireRole } from '@/lib/auth'
import { registerAgent, listAgents, getAgent, addMemoryEntry, searchMemory } from '@/lib/agent-registry'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const url = new URL(req.url)
  const agentId = url.searchParams.get('id')
  const memoryQuery = url.searchParams.get('memory')

  if (agentId && memoryQuery !== null) {
    const memory = searchMemory(agentId, user!.uid, memoryQuery)
    return NextResponse.json({ memory })
  }
  if (agentId) {
    const agent = await getAgent(agentId)
    if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ agent })
  }

  const agents = await listAgents(user!.role === 'admin' ? undefined : user!.uid)
  return NextResponse.json({ agents })
}

export async function POST(req: NextRequest) {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const body = await req.json().catch(() => ({}))

  if (body.action === 'add_memory') {
    const entry = addMemoryEntry(body.agentId, user!.uid, {
      content: body.content,
      type: body.type || 'fact',
      ttl: body.ttl,
    })
    return NextResponse.json({ entry }, { status: 201 })
  }

  const agent = await registerAgent({
    name: body.name || 'Unnamed Agent',
    description: body.description || '',
    systemPrompt: body.systemPrompt,
    defaultModel: body.defaultModel,
    defaultProvider: body.defaultProvider,
    tools: body.tools,
    ownerId: user!.uid,
    orgId: body.orgId,
    tags: body.tags || [],
  })
  return NextResponse.json({ agent }, { status: 201 })
}
