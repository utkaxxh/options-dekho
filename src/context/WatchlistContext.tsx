"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type WatchlistRow = {
  id: string
  symbol: string
  strike: string
  expiry: string // YYYY-MM-DD
  tradingsymbol?: string
  instrument_token?: number
  position?: number
}

type Ctx = {
  userId: string | null
  rows: WatchlistRow[]
  loading: boolean
  addRow: (init?: Partial<WatchlistRow>) => Promise<void>
  updateRow: (id: string, patch: Partial<WatchlistRow>) => Promise<void>
  removeRow: (id: string) => Promise<void>
  replaceAll: (rows: WatchlistRow[]) => Promise<void>
}

const WatchlistContext = createContext<Ctx | undefined>(undefined)

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<WatchlistRow[]>([])
  const [loading, setLoading] = useState(true)

  // Load user
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (!mounted) return
      setUserId(session?.user?.id ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [supabase])

  // Load rows for user
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!userId) {
        setRows([])
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await supabase
        .from('watchlist_rows')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true, nullsFirst: true })
      if (!active) return
      if (error) {
        console.error('Load watchlist error', error)
        setRows([])
      } else {
        const mapped = (data || []).map((r: any) => ({
          id: r.id,
          symbol: r.symbol ?? '',
          strike: r.strike != null ? String(r.strike) : '',
          expiry: r.expiry ?? '',
          tradingsymbol: r.tradingsymbol ?? undefined,
          instrument_token: r.instrument_token ?? undefined,
          position: r.position ?? undefined,
        }))
        setRows(mapped)
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [supabase, userId])

  const genId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      try { return (crypto as any).randomUUID() as string } catch {}
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }

  const addRow = useCallback(async (init?: Partial<WatchlistRow>) => {
    const id = genId()
    const row: WatchlistRow = {
      id,
      symbol: init?.symbol?.toUpperCase?.() || '',
      strike: init?.strike != null ? String(init.strike) : '',
      expiry: init?.expiry || '',
      tradingsymbol: init?.tradingsymbol,
      instrument_token: init?.instrument_token,
      position: (rows?.length || 0) + 1,
    }
    setRows(prev => [...prev, row])
    if (!userId) return
    const { error } = await supabase.from('watchlist_rows').insert({
      id: row.id,
      user_id: userId,
      symbol: row.symbol,
      strike: row.strike,
      expiry: row.expiry,
      tradingsymbol: row.tradingsymbol ?? null,
      instrument_token: row.instrument_token ?? null,
      position: row.position ?? null,
    })
    if (error) console.error('Insert watchlist row failed', error)
  }, [rows, supabase, userId])

  const updateRow = useCallback(async (id: string, patch: Partial<WatchlistRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    if (!userId) return
    const dbPatch: any = { ...patch }
    if ('instrument_token' in dbPatch && dbPatch.instrument_token == null) dbPatch.instrument_token = null
    if ('tradingsymbol' in dbPatch && dbPatch.tradingsymbol == null) dbPatch.tradingsymbol = null
    if ('position' in dbPatch && dbPatch.position == null) dbPatch.position = null
    const { error } = await supabase.from('watchlist_rows')
      .update(dbPatch)
      .eq('id', id)
      .eq('user_id', userId)
    if (error) console.error('Update watchlist row failed', error)
  }, [supabase, userId])

  const removeRow = useCallback(async (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
    if (!userId) return
    const { error } = await supabase.from('watchlist_rows')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) console.error('Delete watchlist row failed', error)
  }, [supabase, userId])

  const replaceAll = useCallback(async (next: WatchlistRow[]) => {
    // Reindex positions
    const normalized = next.map((r, idx) => ({ ...r, position: idx + 1 }))
    setRows(normalized)
    if (!userId) return
    const ids = normalized.map(r => r.id)
    // Delete rows not present anymore
    if (ids.length > 0) {
      const { error: delErr } = await supabase
        .from('watchlist_rows')
        .delete()
        .eq('user_id', userId)
        .not('id', 'in', `(${ids.map(i => `'${i}'`).join(',')})`)
      if (delErr) console.error('Cleanup watchlist delete failed', delErr)
    } else {
      const { error: delAllErr } = await supabase
        .from('watchlist_rows')
        .delete()
        .eq('user_id', userId)
      if (delAllErr) console.error('Cleanup all watchlist failed', delAllErr)
    }
    // Upsert current
    const payload = normalized.map(r => ({
      id: r.id,
      user_id: userId,
      symbol: r.symbol,
      strike: r.strike,
      expiry: r.expiry,
      tradingsymbol: r.tradingsymbol ?? null,
      instrument_token: r.instrument_token ?? null,
      position: r.position ?? null,
    }))
    const { error: upErr } = await supabase
      .from('watchlist_rows')
      .upsert(payload)
    if (upErr) console.error('Upsert watchlist failed', upErr)
  }, [supabase, userId])

  const value = useMemo<Ctx>(() => ({
    userId,
    rows,
    loading,
    addRow,
    updateRow,
    removeRow,
    replaceAll,
  }), [userId, rows, loading, addRow, updateRow, removeRow, replaceAll])

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  )
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext)
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider')
  return ctx
}
