import { NextRequest, NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokenManager'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user ID parameter' }, { status: 400 })
    }

    // Gather instruments from repeated params or comma-separated
    const allParams = searchParams.getAll('instruments')
    let instruments: string[] = []
    if (allParams.length === 0) {
      const csv = searchParams.get('instruments') || ''
      if (csv) instruments = csv.split(',').map(s => s.trim()).filter(Boolean)
    } else {
      for (const p of allParams) {
        if (p.includes(',')) {
          instruments.push(...p.split(',').map(s => s.trim()).filter(Boolean))
        } else {
          instruments.push(p.trim())
        }
      }
    }

    if (instruments.length === 0) {
      return NextResponse.json({ error: 'Missing instruments parameter(s)' }, { status: 400 })
    }

  // Validate each instrument "EXCH:SYMBOL"
  // Some tradingsymbols include hyphens (e.g., BAJAJ-AUTO), ampersands, dots, or underscores.
  // Allow a broader safe character set after the colon.
  const instrumentPattern = /^[A-Z]+:[A-Z0-9][A-Z0-9_.\-&]*$/
    for (const ins of instruments) {
      if (!instrumentPattern.test(ins)) {
        return NextResponse.json({ error: `Invalid instrument format: ${ins}` }, { status: 400 })
      }
    }

    const tokenManager = new TokenManager()
    const access_token = await tokenManager.getValidToken(user_id)
    if (!access_token) {
      return NextResponse.json({ error: 'No valid access token found. Please re-authenticate with Kite.', requiresAuth: true }, { status: 401 })
    }

    const api_key = process.env.KITE_API_KEY
    if (!api_key) {
      return NextResponse.json({ error: 'Server missing KITE_API_KEY' }, { status: 500 })
    }

    // Build URL with repeated i params
    const url = new URL('https://api.kite.trade/quote')
    for (const ins of instruments) url.searchParams.append('i', ins)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `token ${api_key}:${access_token}`,
        'X-Kite-Version': '3'
      },
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    const data = await response.json()
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        await tokenManager.deleteToken(user_id)
      }
      return NextResponse.json({ 
        error: data.message || 'Failed to fetch quotes',
        requiresAuth: response.status === 401 || response.status === 403,
        kiteErrorType: data.error_type || 'unknown'
      }, { status: response.status })
    }

    const duration = Date.now() - startTime
    console.log(`[QUOTES API] Fetched ${instruments.length} instruments in ${duration}ms`)
    return NextResponse.json(data)
  } catch (error: any) {
    const duration = Date.now() - startTime
    if (error?.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout. Please try again.' }, { status: 408 })
    }
    console.error('[QUOTES API] Error after', duration, 'ms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
