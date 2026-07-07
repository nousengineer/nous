import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ uid: 'local', email: 'local@localhost', displayName: 'Local Admin', role: 'admin' })
}
