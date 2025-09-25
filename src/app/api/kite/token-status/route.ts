import { NextRequest, NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokenManager'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      )
    }

    const tokenManager = new TokenManager()
    const validToken = await tokenManager.getValidToken(user_id)
    const expiringSoon = await tokenManager.isTokenExpiringSoon(user_id)

    return NextResponse.json({
      hasValidToken: !!validToken,
      expiringSoon,
      accessToken: validToken
    })
  } catch (error) {
    console.error('Token check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      )
    }

    const tokenManager = new TokenManager()
    await tokenManager.deleteToken(user_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Token deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}