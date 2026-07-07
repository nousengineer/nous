'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: '◇' },
  { href: '/dashboard/sessions', label: 'Sessions', icon: '□' },
  { href: '/dashboard/users', label: 'Users', icon: '◎' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="font-bold">Kairos Server</h2>
          <p className="text-xs text-zinc-500 mt-0.5">admin</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                pathname === item.href ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <p className="text-sm truncate text-zinc-400">Local Admin</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
