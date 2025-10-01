"use client"

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { createClient } from '@/lib/supabase'

type OptionEntry = {
  tradingsymbol: string
  strike: number
  instrument_token: number
  expiry: string
}

type UnderlyingRecord = {
  underlying: string
  expiry: string
  options: OptionEntry[]
}

type Row = {
  underlying: string
  strike: number | null
  expiry: string
  tradingsymbol?: string
  strikeDiffPct?: number
  ltp?: number
  yieldPct?: number
  spot?: number
}

export default function FnoUniversePage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [auto, setAuto] = useState(true)
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState<'yield' | 'delta'>('yield')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null)
    })
  }, [supabase])

  const fetchUniverse = async () => {
    if (!userId) return
    setError('')
    setLoading(true)
    try {
      const resp = await axios.get('/api/kite/fno-universe', { params: { user_id: userId } })
      const data: UnderlyingRecord[] = resp.data.data || []
      // We'll fetch quotes for: all underlying spot symbols + selected strikes' PE options
      const prepared: Row[] = data.map(rec => ({ underlying: rec.underlying, expiry: rec.expiry, strike: null }))
      setRows(prepared)
      // Build a map underlying -> chosen strike
      const instrumentsForQuotes = new Set<string>()
      const strikeMap: Record<string, number> = {}
      for (const rec of data) {
        // We need spot first to determine closest lower strike; fetch spot later, so choose provisional strike = min strike for now
        const sorted = rec.options.slice().sort((a,b) => a.strike - b.strike)
        if (sorted.length > 0) {
          // provisional chosen strike will be refined after spot retrieval; store all strikes grouped for later selection
          // For efficiency we just keep minimal now and refine post-spot
          strikeMap[rec.underlying] = sorted[0].strike
        }
      }
      // Compose instruments list (spots + provisional options)
      for (const u of Object.keys(strikeMap)) {
        instrumentsForQuotes.add(`NSE:${u}`)
      }
      // initial quote fetch
      if (instrumentsForQuotes.size === 0) return
      const quoteUrl = new URL('/api/kite/quotes', window.location.origin)
      quoteUrl.searchParams.append('user_id', userId)
      instrumentsForQuotes.forEach(ins => quoteUrl.searchParams.append('instruments', ins))
      const spotResp = await axios.get(quoteUrl.toString())
      const spotData = spotResp.data.data as Record<string, any>

      // Now determine closest lower strike using actual spot
  const finalRows: Row[] = []
  const optionInstruments = new Set<string>()
      for (const rec of data) {
        const spotKey = `NSE:${rec.underlying}`
        const spot = spotData[spotKey]?.last_price
        let chosen: OptionEntry | null = null
        if (spot) {
          // pick highest strike <= spot; fallback to lowest strike if all above
          const candidates = rec.options.filter(o => o.strike <= spot).sort((a,b) => b.strike - a.strike)
          if (candidates.length > 0) chosen = candidates[0]
          else {
            const asc = rec.options.slice().sort((a,b) => a.strike - b.strike)
            chosen = asc[0] || null
          }
        } else {
          // no spot -> lowest strike
            const asc = rec.options.slice().sort((a,b) => a.strike - b.strike)
            chosen = asc[0] || null
        }
        if (chosen) {
          optionInstruments.add(`NFO:${chosen.tradingsymbol}`)
          const strikeDiffPct = (spot && chosen.strike) ? ((chosen.strike - spot) / spot) * 100 : undefined
          finalRows.push({
            underlying: rec.underlying,
            strike: chosen.strike,
            expiry: rec.expiry,
            tradingsymbol: chosen.tradingsymbol,
            spot,
            strikeDiffPct,
          })
        }
      }

      // Fetch option quotes
      if (optionInstruments.size > 0) {
        const optUrl = new URL('/api/kite/quotes', window.location.origin)
        optUrl.searchParams.append('user_id', userId)
        optionInstruments.forEach(ins => optUrl.searchParams.append('instruments', ins))
        const optResp = await axios.get(optUrl.toString())
        const optData = optResp.data.data as Record<string, any>
        for (const row of finalRows) {
          if (!row.tradingsymbol) continue
          const key = `NFO:${row.tradingsymbol}`
          const q = optData[key]
          if (!q) continue
          const ltp = q?.last_price
          row.ltp = ltp
          if (ltp && row.strike) {
            row.yieldPct = (ltp / row.strike) * 100
          }
        }
      }
      setRows(finalRows)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load F&O universe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return
    fetchUniverse()
    if (!auto) return
    const id = setInterval(fetchUniverse, 10000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, auto])

  const display = useMemo(() => {
    const arr = rows.slice()
    arr.sort((a, b) => {
      const getVal = (r: Row) => {
        if (sortField === 'yield') return r.yieldPct
        return r.strikeDiffPct
      }
      const va = getVal(a)
      const vb = getVal(b)
      const aNum = va == null ? (sortDir === 'desc' ? -Infinity : Infinity) : va
      const bNum = vb == null ? (sortDir === 'desc' ? -Infinity : Infinity) : vb
      if (aNum !== bNum) {
        return sortDir === 'desc' ? (bNum - aNum) : (aNum - bNum)
      }
      // Secondary: underlying alpha
      return a.underlying.localeCompare(b.underlying)
    })
    return arr
  }, [rows, sortField, sortDir])

  const strikeDeltaClass = (v?: number) => {
    if (v == null) return 'text-gray-500'
    if (v > 0) return 'text-green-600 font-medium' // Strike above spot (OTM for put)
    if (v < 0) return 'text-red-600 font-medium'   // Strike below spot (ITM for put)
    return 'text-gray-700'
  }

  const yieldClass = (v?: number) => {
    if (v == null) return 'text-gray-500'
    if (v >= 10) return 'text-green-700 font-semibold'
    if (v >= 5) return 'text-green-600 font-medium'
    if (v >= 2) return 'text-amber-600 font-medium'
    return 'text-gray-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          F&O Universe (Nearest Expiry Puts)
          <span className="block mt-1 text-sm font-normal text-gray-600">
            {(() => {
              const exps = Array.from(new Set(rows.map(r => r.expiry))).sort()
              if (exps.length === 0) return 'Loading…'
              if (exps.length === 1) return `Expiry: ${exps[0]}`
              return `Expiries: ${exps.slice(0,3).join(', ')}${exps.length>3?'…':''}`
            })()}
          </span>
        </h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center text-sm">
            <input type="checkbox" className="h-4 w-4 text-blue-600" checked={auto} onChange={e => setAuto(e.target.checked)} />
            <span className="ml-2 text-gray-700">Auto-refresh (10s)</span>
          </label>
          <button onClick={fetchUniverse} disabled={loading || !userId} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50">Refresh</button>
        </div>
      </div>
      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
      <div className="overflow-x-auto relative">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 sticky left-0 top-0 z-30 bg-gray-50">Stock</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 sticky top-0 bg-gray-50">Spot</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 sticky top-0 bg-gray-50">Closest Strike ≤ Spot</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                <button
                  type="button"
                  onClick={() => {
                    if (sortField === 'delta') {
                      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
                    } else {
                      setSortField('delta'); setSortDir('desc')
                    }
                  }}
                  className="inline-flex items-center gap-1 group"
                >
                  Strike Δ% (Spot)
                  {sortField === 'delta' && (
                    <span className="text-[10px] text-gray-500 group-hover:text-gray-700">{sortDir === 'desc' ? '▼' : '▲'}</span>
                  )}
                </button>
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">LTP</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
                <button
                  type="button"
                  onClick={() => {
                    if (sortField === 'yield') {
                      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
                    } else {
                      setSortField('yield'); setSortDir('desc')
                    }
                  }}
                  className="inline-flex items-center gap-1 group"
                >
                  Yield %
                  {sortField === 'yield' && (
                    <span className="text-[10px] text-gray-500 group-hover:text-gray-700">{sortDir === 'desc' ? '▼' : '▲'}</span>
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {display.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">{loading ? 'Loading universe...' : 'No data'}</td></tr>
            )}
            {display.map(r => (
              <tr key={r.underlying} className="border-b last:border-0">
                <td className="px-3 py-2 text-sm font-medium text-gray-800 sticky left-0 bg-white z-20">{r.underlying}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.spot != null ? r.spot.toFixed(2) : '-'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.strike ?? '-'}</td>
                <td className={"px-3 py-2 text-right tabular-nums " + strikeDeltaClass(r.strikeDiffPct)}>
                  {r.strikeDiffPct != null ? r.strikeDiffPct.toFixed(2) : '-'}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.ltp != null ? r.ltp.toFixed(2) : '-'}</td>
                <td className={"px-3 py-2 text-right tabular-nums " + yieldClass(r.yieldPct)}>
                  {r.yieldPct != null ? r.yieldPct.toFixed(2) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-xs text-gray-400">Auto-refresh pulls full universe; consider pagination or server aggregation if performance degrades.</div>
    </div>
  )
}
