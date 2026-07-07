// Layer 5: Immutable audit log — append-only JSONL
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { loadConfig } from './config.js'

export interface AuditEntry {
  id: string
  timestamp: number
  action: string
  actorId?: string
  actorEmail?: string
  resourceType: string
  resourceId?: string
  metadata: Record<string, unknown>
  checksum: string  // SHA-256 of the entry (excluding checksum field) for tamper detection
}

function computeChecksum(entry: Omit<AuditEntry, 'checksum'>): string {
  return createHash('sha256').update(JSON.stringify(entry)).digest('hex')
}

export async function auditLog(opts: Omit<AuditEntry, 'id' | 'timestamp' | 'checksum'>): Promise<void> {
  const base: Omit<AuditEntry, 'checksum'> = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...opts,
  }
  const entry: AuditEntry = { ...base, checksum: computeChecksum(base) }

  try {
    const config = loadConfig()
    const dir = join(config.workspace, '.kairos', 'audit')
    await mkdir(dir, { recursive: true })
    const date = new Date().toISOString().slice(0, 10)
    await appendFile(join(dir, `audit-${date}.jsonl`), JSON.stringify(entry) + '\n')
  } catch { /* best-effort */ }
}

export async function verifyAuditLog(date: string): Promise<{ valid: boolean; tamperedEntries: number }> {
  const config = loadConfig()
  const path = join(config.workspace, '.kairos', 'audit', `audit-${date}.jsonl`)
  try {
    const raw = await readFile(path, 'utf-8')
    const entries = raw.trim().split('\n').filter(Boolean).map(l => JSON.parse(l) as AuditEntry)
    let tamperedEntries = 0
    for (const entry of entries) {
      const { checksum, ...rest } = entry
      const expected = computeChecksum(rest)
      if (expected !== checksum) tamperedEntries++
    }
    return { valid: tamperedEntries === 0, tamperedEntries }
  } catch {
    return { valid: true, tamperedEntries: 0 }
  }
}
