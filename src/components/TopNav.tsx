"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

function classNames(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export default function TopNav() {
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session?.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session?.user)
    })
    return () => subscription?.unsubscribe()
  }, [supabase])

  // Hide nav entirely if not authenticated (keeps landing page clean)
  if (!authed) return null

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/fno', label: 'F&O Universe' },
  ]

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-gray-900 tracking-tight">Put LTP</span>
          <nav className="flex items-center gap-4">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={classNames(
                  'text-sm px-2 py-1.5 rounded-md transition-colors',
                  pathname === l.href
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
