'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import KiteConfig from '@/components/KiteConfig'
import OptionTracker from '@/components/OptionTracker'

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const [kiteCredentials, setKiteCredentials] = useState<{
    apiKey: string
    apiSecret: string
    accessToken?: string
  } | null>(null)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
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
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {!kiteCredentials ? (
            <KiteConfig onCredentialsSet={setKiteCredentials} />
          ) : (
            <OptionTracker kiteCredentials={kiteCredentials} />
          )}
        </div>
      </main>
    </div>
  )
}