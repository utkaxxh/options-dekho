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
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-100">
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
            Real-time Option Yield Intelligence
          </h1>
          <p className="text-base sm:text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
            Track live Call and Put option yields across the entire F&O universe. Instantly see the closest in-the-money and out-of-the-money strikes, compare premiums, and spot opportunities. Create your own custom watchlist to focus on contracts that matter to you. All data updates automatically in real time.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">Full F&O Coverage</h3>
            <p className="text-sm text-gray-600">Nearest expiry Calls & Puts with live spot, strike deltas and yield %.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">Custom Watchlist</h3>
            <p className="text-sm text-gray-600">Pin specific options to monitor their LTP and yield in one place.</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">Auto Refresh</h3>
            <p className="text-sm text-gray-600">Data fetches in the background so you can focus on decisions.</p>
          </div>
        </div>
        <div className="max-w-md mx-auto mb-10 bg-white border border-gray-200 rounded-lg p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Get Started</h2>
          <p className="text-sm text-gray-600 mb-4">Authenticate with your Kite account to load live market data and build your watchlist.</p>
          <Auth />
        </div>
        <p className="text-[11px] text-gray-500 max-w-2xl mx-auto text-center leading-relaxed">
          Disclaimer: A valid Kite (Zerodha) account is required to access live market data. Option yields shown are simplified (premium / strike) and do not represent annualized returns or implied volatility. This tool is for informational purposes only and not investment advice.
        </p>
      </div>
    </main>
  )
}