"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

function classNames(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export default function TopNav() {
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      setAuthed(!!user)
      setEmail(user?.email ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const user = session?.user
      setAuthed(!!user)
      setEmail(user?.email ?? null)
    })
    return () => subscription?.unsubscribe()
  }, [supabase])

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Hide nav entirely if not authenticated (keeps landing page clean)
  if (!authed) return null

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/fno', label: 'F&O Universe' },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setMenuOpen(false)
  }

  const initial = email ? email.charAt(0).toUpperCase() : 'A'

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-gray-900 tracking-tight">OptionsDekho</span>
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
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-semibold">
              {initial}
            </span>
            <span className="hidden sm:inline">Account</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={classNames('w-4 h-4 transition-transform', menuOpen && 'rotate-180')}
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
            </svg>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg py-1 text-sm z-50"
            >
              <div className="px-3 py-2 text-[11px] text-gray-500 border-b border-gray-100 truncate" title={email || undefined}>
                {email || 'Signed in'}
              </div>
              <button
                onClick={handleSignOut}
                role="menuitem"
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3m6 6l-6-6 6-6m4 12h5a2 2 0 002-2V6a2 2 0 00-2-2h-5" /></svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
