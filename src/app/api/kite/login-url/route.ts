import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const api_key = process.env.KITE_API_KEY

    if (!api_key) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    // Get the base URL for redirect
    const { headers } = request
    const host = headers.get('host')
    const protocol = headers.get('x-forwarded-proto') || 'https'
    const redirectUri = `${protocol}://${host}/kite-callback`

    const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${api_key}&v=3&redirect=${encodeURIComponent(redirectUri)}`

    return NextResponse.json({ loginUrl })
  } catch (error) {
    console.error('Login URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate login URL' },
      { status: 500 }
    )
  }
}