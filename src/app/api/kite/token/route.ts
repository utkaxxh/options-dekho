import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { request_token } = body

    const api_key = process.env.KITE_API_KEY
    const api_secret = process.env.KITE_API_SECRET

    if (!api_key || !api_secret || !request_token) {
      return NextResponse.json(
        { error: 'Missing API credentials or request token' },
        { status: 400 }
      )
    }

    // Generate checksum for Kite API
    const checksum = crypto
      .createHash('sha256')
      .update(api_key + request_token + api_secret)
      .digest('hex')

    // Exchange request token for access token
    const response = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Kite-Version': '3'
      },
      body: new URLSearchParams({
        api_key,
        request_token,
        checksum
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to generate access token' },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}