import { NextRequest, NextResponse } from 'next/server'
import { isFirebaseReady, updateUser, deleteUser } from '@/lib/firebase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  if (!isFirebaseReady()) return NextResponse.json({ error: 'Firebase not configured' }, { status: 503 })
  const { uid } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.role) updates.role = body.role
  if (body.enabled !== undefined) updates.enabled = body.enabled
  await updateUser(uid, updates as any)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  if (!isFirebaseReady()) return NextResponse.json({ error: 'Firebase not configured' }, { status: 503 })
  const { uid } = await params
  await deleteUser(uid)
  return NextResponse.json({ ok: true })
}
