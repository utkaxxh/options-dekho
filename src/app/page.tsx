'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Dashboard from '@/components/Dashboard'
import Auth from '@/components/Auth'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const supabase = createClient()
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription?.unsubscribe()
  }, [mounted])

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Dashboard user={user} />
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 overflow-hidden">
      {/* decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 bg-gradient-to-tr from-blue-200/60 to-indigo-200/40 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 bg-gradient-to-tr from-emerald-200/50 to-teal-200/40 rounded-full blur-3xl" />
      <div className="relative max-w-6xl mx-auto px-5 pt-24 pb-20">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-medium text-blue-700 mb-5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Live F&O Option Yields
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-transparent mb-6 leading-tight">
            Instant Option Yield Snapshot<br className="hidden sm:block" /> Across the Entire F&O Universe
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            See the nearest expiry strike alignment in real time: closest out-of-the-money Calls & in-the-money Puts, their premiums and simple yield percentages. Build a focused watchlist for contracts you care about and react with clarity.
          </p>
        </div>
        {/* Feature Grid */}
        <div className="grid sm:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {[
            {
              title: 'Full Coverage',
              desc: 'All F&O underlyings, nearest expiry Calls & Puts with spot and strike deltas.',
              icon: (
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z"/></svg>
              )
            },
            {
              title: 'Custom Watchlist',
              desc: 'Pin specific option contracts and monitor their live LTP & yield side by side.',
              icon: (
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5v14l7-4 7 4V5a2 2 0 00-2-2H7a2 2 0 00-2 2z"/></svg>
              )
            },
            {
              title: 'Real-time Refresh',
              desc: 'Background updates every few seconds keep pricing & yields current without manual reloads.',
              icon: (
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8 8 0 116.582 9M20 4v5h-5"/></svg>
              )
            }
          ].map(card => (
            <div key={card.title} className="relative group rounded-xl border border-slate-200/70 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow p-5 overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-blue-50 to-transparent pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-100 text-blue-700">
                  {card.icon}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-wide">{card.title}</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
        {/* Auth Panel */}
        <div className="max-w-lg mx-auto mb-14 relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 via-indigo-400/30 to-blue-500/30 rounded-xl blur opacity-60" />
          <div className="relative bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-md p-6">
            <p className="text-sm text-slate-600 mb-4">Sign in with your Kite account to unlock live market data & build your watchlist.</p>
            <Auth />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 max-w-2xl mx-auto text-center leading-relaxed">
          Disclaimer: A valid Kite (Zerodha) account is required to access live market data. Option yields are simplified (premium / strike) and not annualized or volatility-adjusted. Information only, not investment advice.
        </p>
      </div>
    </main>
  )
}