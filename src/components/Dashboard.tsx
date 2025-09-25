'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import OptionTracker from '@/components/OptionTracker'
import OptionWatchlist from '@/components/OptionWatchlist'

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const [signingOut, setSigningOut] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    setSigningOut(true)
    
    try {
      // Start Supabase signout immediately - this is the most important action
      const signOutPromise = supabase.auth.signOut()

      // Start token clearing in parallel with a very short timeout
      const tokenClearPromise = Promise.race([
        fetch('/api/kite/token-status', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: user.id })
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000) // 2 second timeout
        )
      ]).catch(() => {
        // Ignore errors/timeouts when clearing tokens - not critical for signout
      })

      // Wait for Supabase signout (should be fast)
      const { error } = await signOutPromise
      if (error) {
        console.error('Sign out error:', error)
      }

      // Don't wait for token clearing - let it finish in background
      tokenClearPromise.catch(() => {})
      
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
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Put LTP Tracker</h1>
            </div>
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
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <OptionTracker />
          <OptionWatchlist />
        </div>
      </main>
    </div>
  )
}