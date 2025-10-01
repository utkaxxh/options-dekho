import { NextRequest, NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokenManager'

// In-memory cache (process scoped)
let cache: { data: string | null; ts: number } = { data: null, ts: 0 }
const ONE_DAY_MS = 24 * 60 * 60 * 1000

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    const apiKey = process.env.KITE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing KITE_API_KEY' }, { status: 500 })
    }

    const tokenManager = new TokenManager()
    const accessToken = await tokenManager.getValidToken(user_id)
    if (!accessToken) {
      return NextResponse.json({ error: 'No valid access token', requiresAuth: true }, { status: 401 })
    }

    const now = Date.now()
    if (!cache.data || now - cache.ts > ONE_DAY_MS) {
      const resp = await fetch('https://api.kite.trade/instruments', {
        headers: {
          'Authorization': `token ${apiKey}:${accessToken}`,
          'X-Kite-Version': '3'
        }
      })
      if (!resp.ok) {
        const text = await resp.text()
        return NextResponse.json({ error: 'Failed to fetch instruments', details: text }, { status: 502 })
      }
      const csv = await resp.text()
      cache = { data: csv, ts: now }
    }

    const csv = cache.data as string
    const lines = csv.split(/\r?\n/)
    const header = lines.shift() || ''
    const cols = header.split(',')
    const idx = {
      instrument_token: cols.indexOf('instrument_token'),
      tradingsymbol: cols.indexOf('tradingsymbol'),
      name: cols.indexOf('name'),
      expiry: cols.indexOf('expiry'),
      strike: cols.indexOf('strike'),
      instrument_type: cols.indexOf('instrument_type'),
      exchange: cols.indexOf('exchange')
    }

    const today = new Date()
    today.setHours(0,0,0,0)

    // underlying -> expiry -> options
    const map: Record<string, Record<string, OptionEntry[]>> = {}

    for (const line of lines) {
      if (!line) continue
      const parts = line.split(',')
      if (parts.length < cols.length) continue
      if (parts[idx.exchange] !== 'NFO') continue
      const instType = parts[idx.instrument_type]
      if (instType !== 'PE' && instType !== 'CE') continue // keep only options (puts & calls)
      const tsym = parts[idx.tradingsymbol]
      const strike = Number(parts[idx.strike])
      const expiry = parts[idx.expiry]
      if (!Number.isFinite(strike) || !expiry) continue
      const token = Number(parts[idx.instrument_token])
      if (!Number.isFinite(token)) continue
      const expDate = new Date(expiry)
      if (isNaN(expDate.getTime())) continue
      // Determine underlying root using tradingsymbol prefix until first digit
      const rootMatch = tsym.match(/^[A-Z]+/)
      if (!rootMatch) continue
      const underlying = rootMatch[0]
      if (!map[underlying]) map[underlying] = {}
      if (!map[underlying][expiry]) map[underlying][expiry] = []
      map[underlying][expiry].push({ tradingsymbol: tsym, strike, instrument_token: token, expiry, instrument_type: instType as 'CE' | 'PE' })
    }

    const result: UnderlyingRecord[] = []
    for (const underlying of Object.keys(map)) {
      // choose nearest (earliest) expiry that is today or in future
      const expiries = Object.keys(map[underlying]).sort()
      let chosenExpiry: string | null = null
      for (const exp of expiries) {
        const d = new Date(exp)
        d.setHours(0,0,0,0)
        if (d >= today) { chosenExpiry = exp; break }
      }
      if (!chosenExpiry) continue
      const options = map[underlying][chosenExpiry]
      result.push({ underlying, expiry: chosenExpiry, options })
    }

    return NextResponse.json({ data: result })
  } catch (e) {
    console.error('[FNO UNIVERSE API] Error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
