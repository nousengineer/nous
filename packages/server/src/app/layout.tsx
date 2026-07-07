import type { Metadata } from 'next'
// @ts-ignore
import './globals.css'

export const metadata: Metadata = {
  title: 'Kairos Server',
  description: 'Chronokairo Agent Host',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">{children}</body>
    </html>
  )
}
