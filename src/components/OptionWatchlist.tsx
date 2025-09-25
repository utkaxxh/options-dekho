"use client"

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { createClient } from '@/lib/supabase'

type Row = {
  id: string
  symbol: string
  strike: string
  expiry: string // YYYY-MM-DD
  tradingsymbol?: string
  instrument_token?: number
}

type QuoteRow = Row & {
  ltp?: number
  yieldPct?: number
}

export default function OptionWatchlist() {
  const [rows, setRows] = useState<Row[]>([])
  const [quotes, setQuotes] = useState<Record<string, QuoteRow>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [auto, setAuto] = useState(true)
  const [userId, setUserId] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user?.id) setUserId(session.user.id)
    })
  }, [supabase])

  const canFetch = useMemo(() => rows.length > 0 && userId, [rows, userId])

  const addRow = () => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    setRows(prev => ([...prev, { id, symbol: '', strike: '', expiry: '' }]))
  }

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
    setQuotes(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
  }

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  const resolveAll = async () => {
    const resolved: Row[] = []
    for (const r of rows) {
      if (!r.symbol || !r.strike || !r.expiry) continue
      try {
        const resp = await axios.get('/api/kite/instruments', {
          params: { user_id: userId, symbol: r.symbol, strike: r.strike, expiry: r.expiry }
        })
        const inst = resp.data.instrument
        resolved.push({ ...r, tradingsymbol: inst.tradingsymbol, instrument_token: inst.instrument_token })
      } catch (e: any) {
        setError(e.response?.data?.error || 'Failed to resolve instrument')
      }
    }
    setRows(resolved)
    return resolved
  }

  const fetchQuotes = async () => {
    setError('')
    if (!canFetch) return
    setLoading(true)
    try {
      // Ensure we have resolved tradingsymbols
      const withTsym = rows.every(r => r.tradingsymbol)
      const targets = withTsym ? rows : await resolveAll()
      const instruments = targets.filter(t => t.tradingsymbol).map(t => `NFO:${t.tradingsymbol}`)
      if (instruments.length === 0) return
      const url = new URL('/api/kite/quotes', window.location.origin)
      url.searchParams.append('user_id', userId)
      for (const ins of instruments) url.searchParams.append('instruments', ins)
      const resp = await axios.get(url.toString())
      const data = resp.data.data as Record<string, any>
      const out: Record<string, QuoteRow> = {}
      for (const r of targets) {
        const key = `NFO:${r.tradingsymbol}`
        const q = data[key]
        const ltp = q?.last_price
        const strikeNum = Number(r.strike)
        const yieldPct = ltp && strikeNum ? (ltp / strikeNum) * 100 : undefined
        out[r.id] = { ...r, ltp, yieldPct }
      }
      setQuotes(out)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to fetch quotes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!auto) return
    if (!canFetch) return
    const i = setInterval(fetchQuotes, 10000)
    fetchQuotes()
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, canFetch, rows])

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Watchlist</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input type="checkbox" className="h-4 w-4 text-blue-600" checked={auto} onChange={e => setAuto(e.target.checked)} />
            <span className="ml-2 text-sm text-gray-700">Auto-refresh (10s)</span>
          </label>
          <button type="button" onClick={fetchQuotes} disabled={loading || !userId || rows.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">Refresh</button>
          <button type="button" onClick={addRow} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm">Add row</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Symbol</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Strike</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Expiry (YYYY-MM-DD)</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">LTP</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Yield %</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500 text-sm">No rows yet. Click “Add row”.</td>
              </tr>
            )}
            {rows.map((r) => {
              const q = quotes[r.id]
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <input className="w-32 px-2 py-1 border rounded" placeholder="RELIANCE" value={r.symbol} onChange={e => updateRow(r.id, { symbol: e.target.value.toUpperCase() })} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="w-24 px-2 py-1 border rounded" type="number" placeholder="3000" value={r.strike} onChange={e => updateRow(r.id, { strike: e.target.value })} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="w-40 px-2 py-1 border rounded" placeholder="YYYY-MM-DD" value={r.expiry} onChange={e => updateRow(r.id, { expiry: e.target.value })} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{q?.ltp?.toFixed(2) ?? '-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{q?.yieldPct != null ? q.yieldPct.toFixed(2) : '-'}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => removeRow(r.id)} className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
