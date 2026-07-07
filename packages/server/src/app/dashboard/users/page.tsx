'use client'

import { useEffect, useState } from 'react'

interface UserItem {
  uid: string
  email: string
  displayName: string
  role: string
  enabled: boolean
  createdAt: number
  githubLogin?: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [myRole, setMyRole] = useState('')

  function load() {
    fetch('/api/admin/users').then(r => {
      if (r.status === 403) return setUsers([])
      return r.json()
    }).then(d => setUsers(d.users || [])).catch(() => setUsers([]))
    fetch('/api/auth/me').then(r => r.json()).then(d => setMyRole(d.role || '')).catch(() => {})
  }

  useEffect(load, [])

  async function toggleRole(uid: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    await fetch(`/api/admin/users/${uid}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    load()
  }

  async function toggleEnabled(uid: string, current: boolean) {
    await fetch(`/api/admin/users/${uid}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: !current }),
    })
    load()
  }

  async function remove(uid: string) {
    if (!confirm('Delete this user?')) return
    await fetch(`/api/admin/users/${uid}`, { method: 'DELETE' })
    load()
  }

  const isAdmin = myRole === 'admin'

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      {!isAdmin ? (
        <p className="text-zinc-500">Only admins can manage users.</p>
      ) : users.length === 0 ? (
        <p className="text-zinc-500">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-2 px-3">Name</th>
                <th className="text-left py-2 px-3">GitHub</th>
                <th className="text-left py-2 px-3">Role</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Joined</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.uid} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-2.5 px-3">{u.displayName || u.email}</td>
                  <td className="py-2.5 px-3 text-zinc-400">{u.githubLogin || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-purple-900 text-purple-300' : 'bg-zinc-800 text-zinc-300'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={u.enabled ? 'text-emerald-400' : 'text-red-400'}>{u.enabled ? 'active' : 'disabled'}</span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 text-right space-x-2">
                    <button onClick={() => toggleRole(u.uid, u.role)} className="text-xs text-zinc-400 hover:text-white">Toggle role</button>
                    <button onClick={() => toggleEnabled(u.uid, u.enabled)} className="text-xs text-zinc-400 hover:text-white">
                      {u.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => remove(u.uid)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
