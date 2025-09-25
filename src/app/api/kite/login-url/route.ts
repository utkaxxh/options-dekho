import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const api_key = process.env.KITE_API_KEY

    if (!api_key) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${api_key}&v=3`

    return NextResponse.json({ loginUrl })
  } catch (error) {
    console.error('Login URL generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate login URL' },
      { status: 500 }
    )
  }
}