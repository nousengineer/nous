// MCP Registry API: GET/POST /api/mcp
import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession, requireRole } from '@/lib/auth'
import { registerMcpServer, listMcpServers, getMcpTraces } from '@/lib/mcp-registry/mcpRegistry'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const url = new URL(req.url)
  if (url.searchParams.get('traces') === '1') {
    const traces = getMcpTraces({ userId: user!.role === 'admin' ? undefined : user!.uid })
    return NextResponse.json({ traces })
  }
  const servers = await listMcpServers(user!.uid)
  return NextResponse.json({ servers })
}

export async function POST(req: NextRequest) {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const server = await registerMcpServer({
    name: body.name || 'Unnamed MCP Server',
    description: body.description || '',
    command: body.command,
    args: body.args,
    url: body.url,
    type: body.type || 'stdio',
    ownerId: user!.uid,
    orgId: body.orgId,
    enabled: true,
    permissions: body.permissions || [],
    billingRate: body.billingRate,
  })
  return NextResponse.json({ server }, { status: 201 })
}
