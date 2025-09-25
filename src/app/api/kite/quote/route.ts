import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const access_token = searchParams.get('access_token')
    const instruments = searchParams.get('instruments')

    if (!access_token || !instruments) {
      return NextResponse.json(
        { error: 'Missing access token or instruments' },
        { status: 400 }
      )
    }

    // Fetch quote from Kite API
    const response = await fetch(`https://api.kite.trade/quote?i=${encodeURIComponent(instruments)}`, {
      headers: {
        'Authorization': `token ${access_token}`,
        'X-Kite-Version': '3'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch quote' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Quote fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}