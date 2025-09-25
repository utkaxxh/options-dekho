"use client"

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useWatchlist } from '@/context/WatchlistContext'
import type { WatchlistRow } from '@/context/WatchlistContext'

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
  const { userId, rows, removeRow, replaceAll } = useWatchlist() as {
    userId: string | null,
    rows: WatchlistRow[],
    removeRow: (id: string) => Promise<void>,
    replaceAll: (rows: WatchlistRow[]) => Promise<void>,
  }
  const [quotes, setQuotes] = useState<Record<string, QuoteRow>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [auto, setAuto] = useState(true)
  // userId comes from context

  const hasCompleteRow = useMemo(
    () => rows.some((r: WatchlistRow) => r.symbol && r.strike && r.expiry),
    [rows]
  )
  const canFetch = useMemo(
    () => hasCompleteRow && !!userId,
    [hasCompleteRow, userId]
  )

  // Dynamically order rows by highest yield first (UI only; DB order unchanged)
  const displayRows = useMemo(() => {
    const arr = [...rows]
    arr.sort((a: WatchlistRow, b: WatchlistRow) => {
      const ya = quotes[a.id]?.yieldPct ?? -Infinity
      const yb = quotes[b.id]?.yieldPct ?? -Infinity
      if (yb !== ya) return yb - ya
      const pa = (a as any).position ?? 0
      const pb = (b as any).position ?? 0
      if (pa !== pb) return pa - pb
      return a.id.localeCompare(b.id)
    })
    return arr
  }, [rows, quotes])

  // removeRow from context; also prune quotes
  const removeRowAndQuote = (id: string) => {
    removeRow(id)
    setQuotes(prev => { const copy = { ...prev }; delete copy[id]; return copy })
  }

  // rows are read-only in UI; add via Option Details above

  const resolveAll = async () => {
    // Resolve only complete rows and preserve incomplete rows as-is
    const updated: WatchlistRow[] = await Promise.all(
      rows.map(async (r: WatchlistRow) => {
        if (!r.symbol || !r.strike || !r.expiry) return r
        try {
          const resp = await axios.get('/api/kite/instruments', {
            params: { user_id: userId, symbol: r.symbol, strike: r.strike, expiry: r.expiry }
          })
          const inst = resp.data.instrument
          if (inst?.tradingsymbol && inst?.instrument_token != null) {
            return { ...r, tradingsymbol: inst.tradingsymbol, instrument_token: inst.instrument_token }
          }
          return r
        } catch (e: any) {
          // Keep the row and surface the error, but don't drop it
          setError(e.response?.data?.error || 'Failed to resolve instrument')
          return r
        }
      })
    )
    await replaceAll(updated)
    return updated
  }

  const fetchQuotes = async () => {
    setError('')
    if (!canFetch) return
    setLoading(true)
    try {
      // Ensure we have resolved tradingsymbols
  const withTsym = rows.every((r: WatchlistRow) => r.tradingsymbol)
  const targets: WatchlistRow[] = withTsym ? rows : await resolveAll()
  const instruments = targets.filter((t: WatchlistRow) => t.tradingsymbol).map((t: WatchlistRow) => `NFO:${t.tradingsymbol}`)
      if (instruments.length === 0) return
  const url = new URL('/api/kite/quotes', window.location.origin)
  url.searchParams.append('user_id', userId as string)
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
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-medium text-gray-900">Watchlist</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input type="checkbox" className="h-4 w-4 text-blue-600" checked={auto} onChange={e => setAuto(e.target.checked)} />
            <span className="ml-2 text-sm text-gray-700">Auto-refresh (10s)</span>
          </label>
          <button type="button" onClick={fetchQuotes} disabled={loading || !userId || !hasCompleteRow} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50 w-full sm:w-auto">Refresh</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}

      {/* Table on sm+ screens */}
      <div className="hidden sm:block overflow-x-auto">
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
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500 text-sm">No rows yet. Use “Add to Watchlist” above.</td>
              </tr>
            )}
            {displayRows.map((r: WatchlistRow) => {
              const q = quotes[r.id]
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <span className="w-32 inline-block px-2 py-1 border rounded bg-gray-50 text-gray-700 select-text">{r.symbol}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="w-24 inline-block px-2 py-1 border rounded bg-gray-50 text-gray-700 select-text">{r.strike}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="w-40 inline-block px-2 py-1 border rounded bg-gray-50 text-gray-700 select-text">{r.expiry}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{q?.ltp?.toFixed(2) ?? '-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{q?.yieldPct != null ? q.yieldPct.toFixed(2) : '-'}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => removeRowAndQuote(r.id)} className="text-red-600 hover:text-red-700 text-sm">Remove</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Card list on small screens */}
      <div className="sm:hidden space-y-3">
        {displayRows.length === 0 ? (
          <div className="px-3 py-6 text-center text-gray-500 text-sm">No rows yet. Use “Add to Watchlist” above.</div>
        ) : (
          displayRows.map((r: WatchlistRow) => {
            const q = quotes[r.id]
            return (
              <div key={r.id} className="border rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-700 font-medium">{r.symbol}</div>
                    <div className="text-xs text-gray-500">{r.expiry} · {r.strike}</div>
                  </div>
                  <button type="button" onClick={() => removeRowAndQuote(r.id)} className="text-red-600 hover:text-red-700 text-xs">Remove</button>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <div className="text-gray-600">LTP</div>
                  <div className="font-semibold tabular-nums">{q?.ltp?.toFixed(2) ?? '-'}</div>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <div className="text-gray-600">Yield %</div>
                  <div className="font-semibold tabular-nums">{q?.yieldPct != null ? q.yieldPct.toFixed(2) : '-'}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
