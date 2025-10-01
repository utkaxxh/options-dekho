'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import OptionTracker from '@/components/OptionTracker'
import OptionWatchlist from '@/components/OptionWatchlist'
import { WatchlistProvider } from '@/context/WatchlistContext'

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const [signingOut, setSigningOut] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    setSigningOut(true)
    
    try {
      // Sign out from Supabase; keep Kite token intact across app logouts
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
      }
      
    } catch (error) {
      console.error('Sign out failed:', error)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center" />
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.email}</span>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <WatchlistProvider>
          <div className="px-4 py-6 sm:px-0 space-y-6">
            <OptionTracker />
            <OptionWatchlist />
          </div>
        </WatchlistProvider>
      </main>
    </div>
  )
}