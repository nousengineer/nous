'use client'

import { useEffect, useState } from 'react'

interface SessionItem {
  id: string
  status: string
  createdAt: number
  lastActiveAt: number
  workDir: string
  provider: string
  model: string
  userId: string
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [userRole, setUserRole] = useState('')

  function load() {
    fetch('/api/sessions').then(r => r.json()).then(d => setSessions(d.sessions || []))
    fetch('/api/auth/me').then(r => r.json()).then(d => setUserRole(d.role || '')).catch(() => {})
  }

  useEffect(load, [])

  async function remove(id: string) {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    load()
  }

  const statusColor: Record<string, string> = {
    running: 'text-emerald-400', idle: 'text-amber-400',
    stopped: 'text-zinc-500', starting: 'text-blue-400',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <button onClick={load} className="text-sm text-zinc-400 hover:text-white px-3 py-1.5 bg-zinc-800 rounded-md">Refresh</button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-zinc-500">No active sessions.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${statusColor[s.status] || 'text-zinc-400'}`}>●</span>
                  <span className="text-sm font-mono text-zinc-400 truncate">{s.id.slice(0, 8)}…</span>
                  <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded">{s.provider || 'default'}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1 truncate">{s.workDir}</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span>{(Date.now() - s.createdAt) / 1000 < 60 ? 'just now' : `${Math.floor((Date.now() - s.createdAt) / 60000)}m ago`}</span>
                {(userRole === 'admin') && (
                  <button onClick={() => remove(s.id)} className="text-red-400 hover:text-red-300">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
