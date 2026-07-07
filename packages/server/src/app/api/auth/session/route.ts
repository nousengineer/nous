import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ uid: 'local', email: 'local@localhost', displayName: 'Local Admin' })
}

export async function DELETE() {
  return NextResponse.json({ ok: true })
}
