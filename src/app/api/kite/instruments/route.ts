import { NextRequest, NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokenManager'

// Simple in-memory cache for the current process (resets on cold start)
let cache: { data: string | null; ts: number } = { data: null, ts: 0 }
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const symbol = (searchParams.get('symbol') || '').toUpperCase().trim()
    const strikeStr = searchParams.get('strike')
    const expiry = searchParams.get('expiry') // YYYY-MM-DD

    if (!user_id || !symbol || !strikeStr || !expiry) {
      return NextResponse.json({ error: 'Missing user_id, symbol, strike, or expiry' }, { status: 400 })
    }
    const strike = Number(strikeStr)
    if (!Number.isFinite(strike)) {
      return NextResponse.json({ error: 'Invalid strike' }, { status: 400 })
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

    // Refresh cache once a day
    const now = Date.now()
    if (!cache.data || now - cache.ts > ONE_DAY_MS) {
      const resp = await fetch('https://api.kite.trade/instruments', {
        headers: {
          'X-Kite-Version': '3',
          'Authorization': `token ${apiKey}:${accessToken}`
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
    // Parse CSV quickly: header, then rows
    const lines = csv.split(/\r?\n/)
    const header = lines.shift() || ''
    const cols = header.split(',')
    const idx = {
      instrument_token: cols.indexOf('instrument_token'),
      tradingsymbol: cols.indexOf('tradingsymbol'),
      name: cols.indexOf('name'),
      last_price: cols.indexOf('last_price'),
      expiry: cols.indexOf('expiry'),
      strike: cols.indexOf('strike'),
      instrument_type: cols.indexOf('instrument_type'),
      segment: cols.indexOf('segment'),
      exchange: cols.indexOf('exchange'),
    }

    const matches: Array<{ tradingsymbol: string; instrument_token: number; expiry: string; strike: number } > = []
    for (const line of lines) {
      if (!line) continue
      const parts = line.split(',')
      if (parts.length < cols.length) continue
      if (parts[idx.exchange] !== 'NFO') continue
      if (parts[idx.instrument_type] !== 'PE') continue

      const tsym = parts[idx.tradingsymbol]
      const name = parts[idx.name]
      const exp = parts[idx.expiry] // YYYY-MM-DD
      const stk = Number(parts[idx.strike])
      if (!Number.isFinite(stk)) continue

      // Match underlying by tradingsymbol prefix OR name prefix
      if (!(tsym?.startsWith(symbol) || name?.toUpperCase().startsWith(symbol))) continue

      if (stk !== strike) continue
      if (exp !== expiry) continue

      const token = Number(parts[idx.instrument_token])
      if (!Number.isFinite(token)) continue
      matches.push({ tradingsymbol: tsym, instrument_token: token, expiry: exp, strike: stk })
    }

    if (matches.length === 0) {
      return NextResponse.json({ error: 'No instrument found for selection' }, { status: 404 })
    }
    if (matches.length > 1) {
      // Return the first for now along with all matches for debugging
      return NextResponse.json({ warning: 'Multiple instruments matched, returning the first', instrument: matches[0], all: matches })
    }

    return NextResponse.json({ instrument: matches[0] })
  } catch (error) {
    console.error('[INSTRUMENTS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
