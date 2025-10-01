"use client"

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { createClient } from '@/lib/supabase'

type OptionEntry = {
  tradingsymbol: string
  strike: number
  instrument_token: number
  expiry: string
  instrument_type: 'CE' | 'PE'
}

type UnderlyingRecord = {
  underlying: string
  expiry: string
  options: OptionEntry[]
}

type Row = {
  underlying: string
  // Put side (closest lower or equal)
  strike: number | null
  tradingsymbol?: string
  strikeDiffPct?: number
  ltp?: number
  yieldPct?: number
  // Call side (closest higher or equal)
  callStrike?: number | null
  callTradingsymbol?: string
  callStrikeDiffPct?: number
  callLtp?: number
  callYieldPct?: number
  // Common
  expiry: string
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
  // We'll fetch quotes for: all underlying spot symbols + selected strikes' PE & CE options (after selection phase)
  const prepared: Row[] = data.map(rec => ({ underlying: rec.underlying, expiry: rec.expiry, strike: null }))
      setRows(prepared)
      // Build a map underlying -> chosen strike
      const instrumentsForQuotes = new Set<string>()
      const strikeMap: Record<string, number> = {}
      const spotNameMap: Record<string, string> = {
        'NIFTY': 'NIFTY 50',
        'BANKNIFTY': 'NIFTY BANK',
        // FINNIFTY underlying corresponds to the NIFTY Financial Services index symbol
        'FINNIFTY': 'NIFTY FIN SERVICE',
        'MIDCPNIFTY': 'NIFTY MIDCAP SELECT'
      }
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
        const spotName = spotNameMap[u] || u
        instrumentsForQuotes.add(`NSE:${spotName}`)
      }
      // initial quote fetch
      if (instrumentsForQuotes.size === 0) return
      const quoteUrl = new URL('/api/kite/quotes', window.location.origin)
      quoteUrl.searchParams.append('user_id', userId)
      instrumentsForQuotes.forEach(ins => quoteUrl.searchParams.append('instruments', ins))
      const spotResp = await axios.get(quoteUrl.toString())
      const spotData = spotResp.data.data as Record<string, any>

      // Now determine closest put (<= spot) and closest call (>= spot)
      const finalRows: Row[] = []
      const optionInstruments = new Set<string>()
      for (const rec of data) {
  const spotName = spotNameMap[rec.underlying] || rec.underlying
  const spotKey = `NSE:${spotName}`
        const spot = spotData[spotKey]?.last_price
        // Separate puts and calls
        const puts = rec.options.filter(o => o.instrument_type === 'PE')
        const calls = rec.options.filter(o => o.instrument_type === 'CE')

        let chosenPut: OptionEntry | null = null
        let chosenCall: OptionEntry | null = null

        if (spot) {
          // Put: highest strike <= spot (else lowest strike)
          if (puts.length) {
            const putCandidates = puts.filter(o => o.strike <= spot).sort((a,b) => b.strike - a.strike)
            if (putCandidates.length > 0) chosenPut = putCandidates[0]
            else chosenPut = puts.slice().sort((a,b) => a.strike - b.strike)[0] || null
          }
          // Call: lowest strike >= spot (else highest strike)
            if (calls.length) {
              const callCandidates = calls.filter(o => o.strike >= spot).sort((a,b) => a.strike - b.strike)
              if (callCandidates.length > 0) chosenCall = callCandidates[0]
              else chosenCall = calls.slice().sort((a,b) => b.strike - a.strike)[0] || null
            }
        } else {
          // No spot: just pick lowest strike for put & call (if present)
          if (puts.length) chosenPut = puts.slice().sort((a,b)=> a.strike - b.strike)[0] || null
          if (calls.length) chosenCall = calls.slice().sort((a,b)=> a.strike - b.strike)[0] || null
        }

        if (chosenPut || chosenCall) {
          if (chosenPut) optionInstruments.add(`NFO:${chosenPut.tradingsymbol}`)
          if (chosenCall) optionInstruments.add(`NFO:${chosenCall.tradingsymbol}`)
          const putStrikeDiffPct = (spot && chosenPut?.strike) ? ((chosenPut.strike - spot) / spot) * 100 : undefined
          const callStrikeDiffPct = (spot && chosenCall?.strike) ? ((chosenCall.strike - spot) / spot) * 100 : undefined
          finalRows.push({
            underlying: rec.underlying,
            expiry: rec.expiry,
            spot,
            strike: chosenPut?.strike ?? null,
            tradingsymbol: chosenPut?.tradingsymbol,
            strikeDiffPct: putStrikeDiffPct,
            callStrike: chosenCall?.strike ?? null,
            callTradingsymbol: chosenCall?.tradingsymbol,
            callStrikeDiffPct: callStrikeDiffPct,
          })
        }
      }

      // Fetch option quotes (both put & call chosen)
      if (optionInstruments.size > 0) {
        const optUrl = new URL('/api/kite/quotes', window.location.origin)
        optUrl.searchParams.append('user_id', userId)
        optionInstruments.forEach(ins => optUrl.searchParams.append('instruments', ins))
        const optResp = await axios.get(optUrl.toString())
        const optData = optResp.data.data as Record<string, any>
        for (const row of finalRows) {
          // Put side
          if (row.tradingsymbol) {
            const pKey = `NFO:${row.tradingsymbol}`
            const pq = optData[pKey]
            if (pq) {
              const pLtp = pq?.last_price
              row.ltp = pLtp
              if (pLtp && row.strike) row.yieldPct = (pLtp / row.strike) * 100
            }
          }
          // Call side
          if (row.callTradingsymbol) {
            const cKey = `NFO:${row.callTradingsymbol}`
            const cq = optData[cKey]
            if (cq) {
              const cLtp = cq?.last_price
              row.callLtp = cLtp
              if (cLtp && row.callStrike) row.callYieldPct = (cLtp / row.callStrike) * 100
            }
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
      <div className="overflow-x-auto overflow-y-auto relative max-h-[70vh] sm:max-h-[75vh] scrollbar-thin">
        {/* Sticky header: we make the thead sticky instead of each th (except first column still needs left freeze) */}
        <table className="min-w-full table-auto border-collapse">
          <thead className="sticky top-0 z-40 bg-gray-50 shadow-sm">
            <tr>
              <th colSpan={4} className="px-3 py-2 text-center text-[10px] font-semibold tracking-wide text-gray-700 border-b border-gray-200">CALLS</th>
              <th rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold text-gray-600 sticky left-0 top-0 z-50 bg-gray-50 align-bottom">Stock</th>
              <th rowSpan={2} className="px-3 py-2 text-right text-xs font-semibold text-gray-600 align-bottom">Spot</th>
              <th colSpan={4} className="px-3 py-2 text-center text-[10px] font-semibold tracking-wide text-gray-700 border-b border-gray-200">PUTS</th>
            </tr>
            <tr>
              {/* Call columns */}
              <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-600">Strike ≥ Spot</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-600">Δ% (Spot)</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-600">LTP</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-600">Yield %</th>
              {/* Put columns */}
              <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-600">Strike ≤ Spot</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-600">
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
                  Δ% (Spot)
                  {sortField === 'delta' && (
                    <span className="text-[10px] text-gray-500 group-hover:text-gray-700">{sortDir === 'desc' ? '▼' : '▲'}</span>
                  )}
                </button>
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-600">LTP</th>
              <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-600">
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
              <tr><td colSpan={10} className="px-3 py-6 text-center text-sm text-gray-500">{loading ? 'Loading universe...' : 'No data'}</td></tr>
            )}
            {display.map(r => (
              <tr key={r.underlying} className="border-b last:border-0">
                <td className="px-3 py-2 text-right tabular-nums">{r.callStrike ?? '-'}</td>
                <td className="px-3 py-2 text-right tabular-nums text-red-600 font-medium">{r.callStrikeDiffPct != null ? r.callStrikeDiffPct.toFixed(2) : '-'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.callLtp != null ? r.callLtp.toFixed(2) : '-'}</td>
                <td className="px-3 py-2 text-right tabular-nums text-green-600 font-medium">{r.callYieldPct != null ? r.callYieldPct.toFixed(2) : '-'}</td>
                <td className="px-3 py-2 text-sm font-medium text-gray-800 sticky left-0 bg-white z-20">{r.underlying}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.spot != null ? r.spot.toFixed(2) : '-'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.strike ?? '-'}</td>
                <td className="px-3 py-2 text-right tabular-nums text-red-600 font-medium">{r.strikeDiffPct != null ? r.strikeDiffPct.toFixed(2) : '-'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.ltp != null ? r.ltp.toFixed(2) : '-'}</td>
                <td className="px-3 py-2 text-right tabular-nums text-green-600 font-medium">{r.yieldPct != null ? r.yieldPct.toFixed(2) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-xs text-gray-400">Auto-refresh pulls full universe; consider pagination or server aggregation if performance degrades.</div>
    </div>
  )
}
