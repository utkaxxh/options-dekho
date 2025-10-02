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
  const [cardVisible, setCardVisible] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Defer card entrance animation slightly after mount for smoother perception
  useEffect(() => {
    if (mounted && !user) {
      const t = setTimeout(() => setCardVisible(true), 60)
      return () => clearTimeout(t)
    }
  }, [mounted, user])

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

  const handleTopGoogle = async () => {
    try {
      setOauthLoading(true)
      const supabase = createClient()
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        }
      })
      // Redirect handled by Supabase
    } catch (e) {
      setOauthLoading(false)
    }
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
      {/* Top-right Google sign-in button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={handleTopGoogle}
          disabled={oauthLoading}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white/80 backdrop-blur px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-white disabled:opacity-50 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.045,6.053,28.779,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,19.013,13,24,13c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.045,6.053,28.779,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c4.697,0,8.966-1.802,12.23-4.746l-5.654-5.652C28.437,35.091,26.308,36,24,36 c-5.202,0-9.626-3.329-11.282-7.969l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.23,4.129-4.084,5.602c0.001-0.001,0.002-0.001,0.003-0.002 l6.558,5.104C36.647,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
          <span>{oauthLoading ? 'Redirecting…' : 'Continue with Google'}</span>
        </button>
      </div>
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
            Instant Options Yield Snapshot<br className="hidden sm:block" /> Across the Entire F&O Universe
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
        <div className="max-w-sm mx-auto mb-14 relative">
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 via-indigo-400/30 to-blue-500/30 rounded-xl blur transition-opacity duration-700 ${cardVisible ? 'opacity-60' : 'opacity-0'}`} />
          <div className={`relative bg-white/85 backdrop-blur-sm border border-slate-200 rounded-xl shadow-md p-5 transform transition-all duration-500 ease-out ${cardVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}>
            <h2 className="text-base font-semibold text-slate-800 mb-3 tracking-wide">Get Started Now</h2>
            <Auth compact />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 max-w-2xl mx-auto text-center leading-relaxed">
          Disclaimer: A valid Kite (Zerodha) account is required to access live market data. Option yields are simplified (premium / strike) and not annualized or volatility-adjusted. Information only, not investment advice.
        </p>
      </div>
    </main>
  )
}