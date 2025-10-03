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
  // Supabase client may still be needed for child components that use context or queries
  const supabase = createClient()

  return (
    <div className="min-h-screen bg-gray-50">

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