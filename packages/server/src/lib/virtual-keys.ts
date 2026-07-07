// Layer 4: Virtual API keys — per-client keys with limits
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { loadConfig } from './config.js'

export interface VirtualKeyRecord {
  key: string            // sk-kairos-...
  keyHash: string        // SHA-256 for lookups
  userId: string
  orgId?: string
  name: string
  defaultProvider?: string
  rateLimit?: {          // requests per minute
    rpm: number
    tpm: number          // tokens per minute
  }
  budget?: {
    daily?: number       // USD
    monthly?: number
  }
  quota?: {
    dailyRequests?: number
    monthlyTokens?: number
  }
  allowedModels?: string[]
  allowedProviders?: string[]
  expiresAt?: number
  createdAt: number
  lastUsedAt?: number
  enabled: boolean
}

let _store: Map<string, VirtualKeyRecord> | null = null

async function getStore(): Promise<Map<string, VirtualKeyRecord>> {
  if (_store) return _store
  _store = new Map()
  try {
    const config = loadConfig()
    const path = join(config.workspace, '.kairos', 'virtual-keys.json')
    const raw = await readFile(path, 'utf-8')
    const arr: VirtualKeyRecord[] = JSON.parse(raw)
    for (const k of arr) _store.set(k.keyHash, k)
  } catch { /* empty */ }
  return _store
}

async function saveStore(): Promise<void> {
  const store = await getStore()
  try {
    const config = loadConfig()
    const dir = join(config.workspace, '.kairos')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'virtual-keys.json'), JSON.stringify([...store.values()], null, 2))
  } catch { /* best-effort */ }
}

async function hashKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createVirtualKey(opts: Omit<VirtualKeyRecord, 'key' | 'keyHash' | 'createdAt' | 'enabled'>): Promise<VirtualKeyRecord> {
  const key = `sk-kairos-${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`
  const keyHash = await hashKey(key)
  const record: VirtualKeyRecord = { ...opts, key, keyHash, createdAt: Date.now(), enabled: true }
  const store = await getStore()
  store.set(keyHash, record)
  await saveStore()
  return record
}

export async function resolveVirtualKey(key: string): Promise<VirtualKeyRecord | null> {
  const store = await getStore()
  const keyHash = await hashKey(key)
  const record = store.get(keyHash)
  if (!record || !record.enabled) return null
  if (record.expiresAt && record.expiresAt < Date.now()) return null
  // Update last used
  record.lastUsedAt = Date.now()
  return record
}

export async function listVirtualKeys(userId?: string): Promise<VirtualKeyRecord[]> {
  const store = await getStore()
  const all = [...store.values()]
  const filtered = userId ? all.filter(k => k.userId === userId) : all
  // Mask actual key values
  return filtered.map(k => ({ ...k, key: `sk-kairos-...${k.key.slice(-4)}` }))
}

export async function revokeVirtualKey(keyHash: string): Promise<void> {
  const store = await getStore()
  const record = store.get(keyHash)
  if (record) { record.enabled = false; await saveStore() }
}
