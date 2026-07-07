'use client'

import { useEffect, useState } from 'react'
import type { UserRecord } from '@/lib/firebase'

export default function DashboardPage() {
  const [stats, setStats] = useState({ sessions: 0, users: 0, uptime: 0 })

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => setStats(s => ({ ...s, sessions: d.sessions?.length || 0 })))
    fetch('/api/admin/users').then(r => r.json()).then(d => setStats(s => ({ ...s, users: d.users?.length || 0 })))
    fetch('/api/health').then(r => r.json()).then(d => setStats(s => ({ ...s, uptime: Math.floor(d.uptime || 0) })))
  }, [])

  const cards = [
    { label: 'Active Sessions', value: stats.sessions, color: 'bg-blue-600' },
    { label: 'Total Users', value: stats.users, color: 'bg-emerald-600' },
    { label: 'Uptime (s)', value: stats.uptime, color: 'bg-amber-600' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`${c.color} rounded-xl p-5`}>
            <p className="text-sm opacity-80">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
