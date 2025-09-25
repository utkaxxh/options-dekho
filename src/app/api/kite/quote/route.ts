import { NextRequest, NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokenManager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const instruments = searchParams.get('instruments')

    if (!user_id || !instruments) {
      return NextResponse.json(
        { error: 'Missing user ID or instruments' },
        { status: 400 }
      )
    }

    // Get stored access token for the user
    const tokenManager = new TokenManager()
    const access_token = await tokenManager.getValidToken(user_id)

    if (!access_token) {
      return NextResponse.json(
        { error: 'No valid access token found. Please re-authenticate with Kite.' },
        { status: 401 }
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
      // If token is invalid, delete it from storage
      if (response.status === 403 || response.status === 401) {
        await tokenManager.deleteToken(user_id)
      }
      
      return NextResponse.json(
        { error: data.message || 'Failed to fetch quote', requiresAuth: response.status === 403 || response.status === 401 },
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