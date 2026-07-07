// Virtual API Keys CRUD: GET/POST /api/keys
import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession, requireRole } from '@/lib/auth'
import { createVirtualKey, listVirtualKeys } from '@/lib/virtual-keys'
import { auditLog } from '@/lib/audit-log'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  const keys = await listVirtualKeys(user!.role === 'admin' ? undefined : user!.uid)
  return NextResponse.json({ keys })
}

export async function POST(req: NextRequest) {
  const user = await getServerSession()
  if (!requireRole(user)) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const key = await createVirtualKey({
    userId: user!.uid,
    orgId: body.orgId,
    name: body.name || 'My API Key',
    defaultProvider: body.defaultProvider,
    rateLimit: body.rateLimit,
    budget: body.budget,
    quota: body.quota,
    allowedModels: body.allowedModels,
    allowedProviders: body.allowedProviders,
    expiresAt: body.expiresAt,
  })

  await auditLog({
    action: 'api_key.created',
    actorId: user!.uid,
    actorEmail: user!.email,
    resourceType: 'virtual_key',
    resourceId: key.keyHash,
    metadata: { name: key.name },
  })

  return NextResponse.json({ key: key.key, keyHash: key.keyHash, name: key.name, createdAt: key.createdAt }, { status: 201 })
}
