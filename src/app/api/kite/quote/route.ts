import { NextRequest, NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokenManager'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const instruments = searchParams.get('instruments')

    // Enhanced input validation
    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user ID parameter' },
        { status: 400 }
      )
    }

    if (!instruments) {
      return NextResponse.json(
        { error: 'Missing instruments parameter' },
        { status: 400 }
      )
    }

    // Validate instrument format (should be like "NFO:RELIANCE25NOV3000PE")
    const instrumentPattern = /^[A-Z]+:[A-Z0-9]+$/
    if (!instrumentPattern.test(instruments.trim())) {
      return NextResponse.json(
        { error: 'Invalid instrument format. Expected format: EXCHANGE:TRADINGSYMBOL' },
        { status: 400 }
      )
    }

    // Basic rate limiting check (could be enhanced with Redis/database)
    const userAgent = request.headers.get('user-agent') || ''
    if (userAgent.toLowerCase().includes('bot') || userAgent.toLowerCase().includes('crawler')) {
      return NextResponse.json(
        { error: 'Bot requests not allowed' },
        { status: 403 }
      )
    }

    // Get stored access token for the user
    const tokenManager = new TokenManager()
    const access_token = await tokenManager.getValidToken(user_id)

    if (!access_token) {
      console.log(`[QUOTE API] No valid token found for user: ${user_id}`)
      return NextResponse.json(
        { error: 'No valid access token found. Please re-authenticate with Kite.', requiresAuth: true },
        { status: 401 }
      )
    }

    console.log(`[QUOTE API] Fetching quote for ${instruments} (user: ${user_id})`)

    // Fetch quote from Kite API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(`https://api.kite.trade/quote?i=${encodeURIComponent(instruments)}`, {
      headers: {
        'Authorization': `token ${access_token}`,
        'X-Kite-Version': '3'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)
    const data = await response.json()

    if (!response.ok) {
      console.log(`[QUOTE API] Kite API error: ${response.status} - ${data.message || 'Unknown error'}`)
      
      // If token is invalid, delete it from storage
      if (response.status === 403 || response.status === 401) {
        await tokenManager.deleteToken(user_id)
        console.log(`[QUOTE API] Deleted invalid token for user: ${user_id}`)
      }
      
      return NextResponse.json(
        { 
          error: data.message || 'Failed to fetch quote', 
          requiresAuth: response.status === 403 || response.status === 401,
          kiteErrorType: data.error_type || 'unknown'
        },
        { status: response.status }
      )
    }

    const duration = Date.now() - startTime
    console.log(`[QUOTE API] Successfully fetched quote in ${duration}ms`)
    
    return NextResponse.json(data)
  } catch (error) {
    const duration = Date.now() - startTime
    
    // Handle different types of errors
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`[QUOTE API] Request timeout after ${duration}ms:`, error.message)
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' },
          { status: 408 }
        )
      }
      
      console.error(`[QUOTE API] Request failed after ${duration}ms:`, error.message)
      
      // Network or fetch errors
      if (error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Unable to connect to Kite API. Please check your internet connection.' },
          { status: 503 }
        )
      }
    }
    
    console.error(`[QUOTE API] Unexpected error after ${duration}ms:`, error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}