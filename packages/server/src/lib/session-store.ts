import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export type SessionStatus = 'starting' | 'running' | 'idle' | 'stopping' | 'stopped' | 'error'

export interface Session {
  id: string
  status: SessionStatus
  createdAt: number
  lastActiveAt: number
  workDir: string
  provider: string
  model: string
  userId: string
  metadata: Record<string, string>
}

interface PersistedEntry {
  sessionId: string
  cwd: string
  createdAt: number
  lastActiveAt: number
  userId?: string
  provider?: string
  model?: string
}

export class SessionStore {
  private sessions = new Map<string, Session>()
  private persistencePath: string
  private savePromise: Promise<void> | null = null

  constructor(baseDir: string) {
    this.persistencePath = join(baseDir, '.kairos-server', 'sessions.json')
  }

  async init() {
    try {
      const data = await readFile(this.persistencePath, 'utf-8')
      const entries = JSON.parse(data) as Record<string, PersistedEntry>
      for (const [, e] of Object.entries(entries)) {
        this.sessions.set(e.sessionId, {
          id: e.sessionId, status: 'idle',
          createdAt: e.createdAt, lastActiveAt: e.lastActiveAt,
          workDir: e.cwd, provider: e.provider || '', model: e.model || '',
          userId: e.userId || '', metadata: {},
        })
      }
    } catch { /* no persisted sessions */ }
  }

  create(workDir: string, provider: string, model: string, userId = '', metadata?: Record<string, string>): Session {
    const id = randomUUID()
    const now = Date.now()
    const s: Session = {
      id, status: 'starting', createdAt: now, lastActiveAt: now,
      workDir, provider, model, userId, metadata: metadata || {},
    }
    this.sessions.set(id, s)
    this.persist()
    return s
  }

  get(id: string) { return this.sessions.get(id) }

  updateStatus(id: string, status: SessionStatus) {
    const s = this.sessions.get(id)
    if (s) { s.status = status; s.lastActiveAt = Date.now(); this.persist() }
  }

  touch(id: string) { const s = this.sessions.get(id); if (s) s.lastActiveAt = Date.now() }

  list() { return Array.from(this.sessions.values()) }

  listByUser(userId: string) { return this.list().filter(s => s.userId === userId) }

  remove(id: string) { const r = this.sessions.delete(id); if (r) this.persist(); return r }

  private persist() {
    if (this.savePromise) return
    this.savePromise = (async () => {
      try {
        await mkdir(join(this.persistencePath, '..'), { recursive: true })
        const idx: Record<string, PersistedEntry> = {}
        for (const [, s] of this.sessions) {
          idx[s.id] = {
            sessionId: s.id, cwd: s.workDir,
            createdAt: s.createdAt, lastActiveAt: s.lastActiveAt,
            userId: s.userId, provider: s.provider, model: s.model,
          }
        }
        await writeFile(this.persistencePath, JSON.stringify(idx, null, 2))
      } catch { /* best-effort */ } finally { this.savePromise = null }
    })()
  }
}
