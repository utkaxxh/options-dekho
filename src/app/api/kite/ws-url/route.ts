import { NextRequest, NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokenManager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
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

    const url = `wss://ws.kite.trade?api_key=${encodeURIComponent(apiKey)}&access_token=${encodeURIComponent(accessToken)}`
    return NextResponse.json({ url })
  } catch (error) {
    console.error('[WS-URL API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
