'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { createClient } from '@/lib/supabase'

interface OptionData {
  last_price: number
  depth: {
    buy: Array<{ price: number; quantity: number }>
    sell: Array<{ price: number; quantity: number }>
  }
  volume: number
  oi: number
}

export default function OptionTracker() {
  const [symbol, setSymbol] = useState('')
  const [strike, setStrike] = useState('')
  const [expiry, setExpiry] = useState('')
  const [requestToken, setRequestToken] = useState('')
  const [hasValidToken, setHasValidToken] = useState(false)
  const [tokenExpiringSoon, setTokenExpiringSoon] = useState(false)
  const [optionData, setOptionData] = useState<OptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoUpdate, setAutoUpdate] = useState(false)
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [useWebSocket, setUseWebSocket] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [resolvedTsym, setResolvedTsym] = useState<string>('')
  const [resolvedToken, setResolvedToken] = useState<number | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<number>(0)

  const supabase = createClient()

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

  // Function to get the last Tuesday of a given month
  const getLastTuesday = (year: number, month: number): Date => {
    const lastDay = new Date(year, month + 1, 0) // Last day of the month
    const lastTuesday = new Date(lastDay)
    
    // Get the day of the week (0 = Sunday, 1 = Monday, ..., 2 = Tuesday)
    const dayOfWeek = lastDay.getDay()
    
    // Calculate days to subtract to get to Tuesday (2)
    const daysToSubtract = dayOfWeek >= 2 ? dayOfWeek - 2 : dayOfWeek + 5
    
    lastTuesday.setDate(lastDay.getDate() - daysToSubtract)
    return lastTuesday
  }

  // Function to get expiry options for dropdown
  const getExpiryOptions = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    const expiryOptions = []
    
    // Current month, next month, and month after that
    for (let i = 0; i < 3; i++) {
      const targetMonth = (currentMonth + i) % 12
      const targetYear = currentMonth + i >= 12 ? currentYear + 1 : currentYear
      
      const lastTuesday = getLastTuesday(targetYear, targetMonth)
      
      // Only include if the expiry date hasn't passed yet
      if (lastTuesday >= now || i > 0) {
        const dateString = lastTuesday.toISOString().split('T')[0]
        const displayString = `${lastTuesday.getDate()} ${monthNames[targetMonth]} ${targetYear}`
        
        expiryOptions.push({
          value: dateString,
          label: displayString
        })
      }
    }
    
    return expiryOptions
  }

  // Get user ID on component mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setUserId(session.user.id)
      }
    }
    getUser()
  }, [supabase])

  // Check for existing valid token when user ID is available
  useEffect(() => {
    if (userId) {
      checkTokenStatus()
    }
  }, [userId])

  const checkTokenStatus = async () => {
    if (!userId) return

    try {
      const response = await axios.get(`/api/kite/token-status?user_id=${userId}`)
      const { hasValidToken: hasToken, expiringSoon } = response.data
      
      setHasValidToken(hasToken)
      setTokenExpiringSoon(expiringSoon)
      
      if (expiringSoon) {
        setError('Your Kite token will expire soon. Please re-authenticate.')
      }
    } catch (err) {
      console.error('Token status check failed:', err)
      setHasValidToken(false)
    }
  }

  const generateTradingSymbol = () => {
    if (!symbol || !strike || !expiry) return ''
    
    const expiryDate = new Date(expiry)
    const year = expiryDate.getFullYear().toString().slice(-2)
    const month = monthNames[expiryDate.getMonth()]
    
    return `${symbol.toUpperCase()}${year}${month}${strike}PE`
  }

  // Resolve exact tradingsymbol and instrument_token from Kite instruments
  const resolveInstrument = async () => {
    if (!userId || !symbol || !strike || !expiry) {
      setError('Please fill all fields')
      return null
    }
    try {
      const resp = await axios.get('/api/kite/instruments', {
        params: {
          user_id: userId,
          symbol: symbol.trim(),
          strike: String(strike).trim(),
          expiry
        }
      })
      const instrument = resp.data.instrument || resp.data?.instrument
      if (!instrument) {
        setError(resp.data?.error || 'No matching instrument found')
        return null
      }
      setResolvedTsym(instrument.tradingsymbol)
      setResolvedToken(instrument.instrument_token)
      return instrument as { tradingsymbol: string; instrument_token: number }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to resolve instrument'
      setError(msg)
      return null
    }
  }

  // Parse Kite full mode packet into OptionData shape
  const parseFullPacket = (buf: ArrayBuffer) => {
    const dv = new DataView(buf)
    let offset = 0
    const packets = dv.getInt16(offset, false); offset += 2 // big-endian
    const results: OptionData[] = []
    for (let i = 0; i < packets; i++) {
      const length = dv.getInt16(offset, false); offset += 2
      const start = offset
      // Packet fields (big-endian int32)
      const instrument_token = dv.getInt32(offset, false); offset += 4
      const ltpPaise = dv.getInt32(offset, false); offset += 4
      const last_qty = dv.getInt32(offset, false); offset += 4
      const avgPricePaise = dv.getInt32(offset, false); offset += 4
      const volume = dv.getInt32(offset, false); offset += 4
      const buyQty = dv.getInt32(offset, false); offset += 4
      const sellQty = dv.getInt32(offset, false); offset += 4
      const openPaise = dv.getInt32(offset, false); offset += 4
      const highPaise = dv.getInt32(offset, false); offset += 4
      const lowPaise = dv.getInt32(offset, false); offset += 4
      const closePaise = dv.getInt32(offset, false); offset += 4
      const lastTs = dv.getInt32(offset, false); offset += 4
      const oi = dv.getInt32(offset, false); offset += 4
      const oiHigh = dv.getInt32(offset, false); offset += 4
      const oiLow = dv.getInt32(offset, false); offset += 4
      const exchTs = dv.getInt32(offset, false); offset += 4

      const bids: Array<{ price: number; quantity: number }> = []
      const asks: Array<{ price: number; quantity: number }> = []
      // 5 bid entries then 5 ask entries; each entry 12 bytes (qty int32, price int32, orders int16, pad int16)
      for (let j = 0; j < 5; j++) {
        const qty = dv.getInt32(offset, false); offset += 4
        const pricePaise = dv.getInt32(offset, false); offset += 4
        offset += 2 // orders
        offset += 2 // padding
        bids.push({ price: pricePaise / 100, quantity: qty })
      }
      for (let j = 0; j < 5; j++) {
        const qty = dv.getInt32(offset, false); offset += 4
        const pricePaise = dv.getInt32(offset, false); offset += 4
        offset += 2 // orders
        offset += 2 // padding
        asks.push({ price: pricePaise / 100, quantity: qty })
      }

      results.push({
        last_price: ltpPaise / 100,
        depth: { buy: bids, sell: asks },
        volume,
        oi
      })

      // Move to next packet (in case)
      const consumed = offset - start
      if (consumed < length) offset = start + length
    }
    return results
  }

  // Connect to Kite WebSocket and stream live quotes
  const connectWebSocket = async () => {
    if (!hasValidToken) {
      setError('Please authenticate with Kite first')
      return
    }
    const instrument = await resolveInstrument()
    if (!instrument) return

    try {
      const urlResp = await axios.get('/api/kite/ws-url', { params: { user_id: userId } })
      const url: string = urlResp.data.url

      // Clean up any existing connection
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
        wsRef.current = null
      }
      setWsConnected(false)
      reconnectRef.current = 0

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.binaryType = 'arraybuffer'
      ws.onopen = () => {
        setWsConnected(true)
        // Subscribe and set mode full
        ws.send(JSON.stringify({ a: 'subscribe', v: [instrument.instrument_token] }))
        ws.send(JSON.stringify({ a: 'mode', v: ['full', [instrument.instrument_token]] }))
      }
      ws.onmessage = async (ev: MessageEvent) => {
        try {
          if (typeof ev.data === 'string') {
            // Text messages: errors or order messages
            // Optionally handle token errors here
            return
          }
          const buf: ArrayBuffer = ev.data as ArrayBuffer
          const results = parseFullPacket(buf)
          if (results.length > 0) {
            // For single subscribed instrument, take first
            setOptionData(results[0])
          }
        } catch (e) {
          console.error('WS message parse error:', e)
        }
      }
      ws.onerror = (e) => {
        console.error('WS error:', e)
      }
      ws.onclose = () => {
        setWsConnected(false)
        if (useWebSocket) {
          // Try a simple bounded reconnect
          if (reconnectRef.current < 3) {
            reconnectRef.current += 1
            setTimeout(() => {
              connectWebSocket()
            }, 1000 * reconnectRef.current)
          }
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to connect WebSocket'
      setError(msg)
    }
  }

  // Cleanup on unmount or when toggling off
  useEffect(() => {
    if (!useWebSocket) {
      if (wsRef.current) {
        try {
          if (resolvedToken && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ a: 'unsubscribe', v: [resolvedToken] }))
          }
        } catch {}
        try { wsRef.current.close() } catch {}
        wsRef.current = null
      }
      setWsConnected(false)
    } else {
      // Start WS streaming
      connectWebSocket()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useWebSocket, symbol, strike, expiry])

  const initiateKiteLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await axios.get('/api/kite/login-url')
      if (response.data.loginUrl) {
        console.log('Preparing listeners for Kite login popup:', response.data.loginUrl)
        
        // Clear any previous auth results
        localStorage.removeItem('kite_auth_result')
        
        let authProcessed = false
        
        // Method 1: Listen for postMessage (register before opening popup)
        const messageListener = (event: MessageEvent) => {
          console.log('Received message from popup:', event.data)
          if (authProcessed) return
          if (event.data?.type === 'KITE_AUTH_SUCCESS' && event.data?.requestToken) {
            authProcessed = true
            cleanup()
            handleRequestToken(event.data.requestToken)
          } else if (event.data?.type === 'KITE_AUTH_ERROR') {
            authProcessed = true
            cleanup()
            setError(event.data.error || 'Authentication failed')
            setLoading(false)
          }
        }
        window.addEventListener('message', messageListener)
        
        // Method 2: BroadcastChannel listener (preferred when available)
        let bc: BroadcastChannel | null = null
        if ('BroadcastChannel' in window) {
          bc = new BroadcastChannel('kite-auth')
          bc.onmessage = (ev: MessageEvent) => {
            const data = ev.data
            console.log('BroadcastChannel message:', data)
            if (authProcessed) return
            if (data?.type === 'KITE_AUTH_SUCCESS' && data?.requestToken) {
              authProcessed = true
              cleanup()
              handleRequestToken(data.requestToken)
            } else if (data?.type === 'KITE_AUTH_ERROR') {
              authProcessed = true
              cleanup()
              setError(data.error || 'Authentication failed')
              setLoading(false)
            }
          }
        }
        
        // Method 3: Poll localStorage as fallback
        const pollInterval = setInterval(() => {
          const authResult = localStorage.getItem('kite_auth_result')
          if (authResult && !authProcessed) {
            try {
              const result = JSON.parse(authResult)
              console.log('Found auth result in localStorage:', result)
              const isRecent = Date.now() - result.timestamp < 120000
              if (!isRecent) return
              authProcessed = true
              localStorage.removeItem('kite_auth_result')
              cleanup()
              if (result.type === 'KITE_AUTH_SUCCESS' && result.requestToken) {
                handleRequestToken(result.requestToken)
              } else if (result.type === 'KITE_AUTH_ERROR') {
                setError(result.error || 'Authentication failed')
                setLoading(false)
              }
            } catch {}
          }
        }, 1000)
        
        // Now open login URL in new window
        console.log('Opening Kite login popup now')
        const features = 'width=600,height=700,scrollbars=yes,resizable=yes,noopener=no,noreferrer=no'
        const popup = window.open(response.data.loginUrl, 'kiteLogin', features)
        
        if (!popup) {
          setError('Popup blocked. Please allow popups for this site and try again.')
          setLoading(false)
          return
        }


        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (popup?.closed && !authProcessed) {
            console.log('Popup closed manually - starting grace period')
            // Grace period: allow 2 seconds for late-arriving messages
            setTimeout(() => {
              if (!authProcessed) {
                console.log('Grace period ended without auth result')
                authProcessed = true
                cleanup()
                setError('Authentication was cancelled. Please try again.')
                setLoading(false)
              }
            }, 2000)
          }
        }, 1000)

        // Cleanup function
        const cleanup = () => {
          clearInterval(pollInterval)
          clearInterval(checkClosed)
          window.removeEventListener('message', messageListener)
          try { bc?.close() } catch {}
          if (popup && !popup.closed) {
            popup.close()
          }
        }

        // Set up event listener
        window.addEventListener('message', messageListener)
        
        // Set maximum timeout for the entire process
        setTimeout(() => {
          if (!authProcessed) {
            console.log('Authentication timeout')
            authProcessed = true
            cleanup()
            setError('Authentication timeout. Please try again.')
            setLoading(false)
          }
        }, 300000) // 5 minute timeout
      }
    } catch (err: any) {
      console.error('Failed to initiate Kite login:', err)
      setError(err.response?.data?.error || 'Failed to initiate Kite login')
      setLoading(false)
    }
  }

  const handleRequestToken = async (requestToken: string) => {
    console.log('Processing request token:', requestToken)
    
    try {
      setLoading(true)
      setError('')
      
      const response = await axios.post('/api/kite/token', {
        request_token: requestToken,
        user_id: userId
      })

      console.log('Token generation response:', response.data)
      const accessToken = response.data.access_token || response.data?.data?.access_token
      if (accessToken) {
        console.log('Access token generated successfully')
        
        // Update all authentication states
        setHasValidToken(true)
        setTokenExpiringSoon(false) // Reset expiry warning
        setShowTokenInput(false)
        setRequestToken('')
        setError('')
        setLoading(false)
        
        // Also check token status to update the UI properly
        setTimeout(() => {
          checkTokenStatus()
        }, 1000)
      } else {
        throw new Error('No access token received from server')
      }
    } catch (err: any) {
      console.error('Token generation failed:', err)
      setError(err.response?.data?.error || 'Failed to generate access token')
      setLoading(false)
      
      // If token generation fails, reset auth state
      setHasValidToken(false)
    }
  }

  const generateAccessToken = async () => {
    if (!requestToken || !userId) {
      setError('Please enter the request token')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/kite/token', {
        request_token: requestToken,
        user_id: userId
      })

      const accessToken = response.data.access_token || response.data?.data?.access_token
      if (accessToken) {
        setHasValidToken(true)
        setShowTokenInput(false)
        setRequestToken('')
        setError('')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate access token')
    } finally {
      setLoading(false)
    }
  }

  const fetchOptionData = async () => {
    if (!hasValidToken || !userId) {
      setError('Please authenticate with Kite first')
      return
    }

    const tradingSymbol = generateTradingSymbol()
    if (!tradingSymbol) {
      setError('Please fill all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.get('/api/kite/quote', {
        params: {
          user_id: userId,
          instruments: `NFO:${tradingSymbol}`
        }
      })

      const data = response.data.data[`NFO:${tradingSymbol}`]
      if (data) {
        setOptionData(data)
      } else {
        setError('No data found for the given option')
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch option data'
      setError(errorMsg)
      
      // If token is invalid, reset authentication state
      if (err.response?.data?.requiresAuth) {
        setHasValidToken(false)
        setShowTokenInput(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReAuthenticate = () => {
    setHasValidToken(false)
    setShowTokenInput(false)
    setTokenExpiringSoon(false)
    setError('')
  }

  // Auto-update every 10 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoUpdate && hasValidToken && optionData) {
      interval = setInterval(() => {
        fetchOptionData()
      }, 10000)
    }
    return () => clearInterval(interval)
  }, [autoUpdate, hasValidToken, optionData])

  return (
    <div className="space-y-6">
      {/* Kite Authentication Section */}
      {!hasValidToken && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Kite Authentication</h3>
          
          {!showTokenInput ? (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Authenticate with Zerodha Kite to access real-time market data
              </p>
              <button
                onClick={initiateKiteLogin}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Authenticate with Kite'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-blue-600">
                Complete the login in the popup window and paste the request token below:
              </p>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Enter request token from Kite login URL"
                  value={requestToken}
                  onChange={(e) => setRequestToken(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={generateAccessToken}
                  disabled={loading || !requestToken}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
                >
                  Generate Access Token
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Token Expiry Warning */}
      {hasValidToken && tokenExpiringSoon && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="text-yellow-800">
              ⚠️ Your Kite token will expire soon. Re-authenticate to continue using the app.
            </div>
            <button
              onClick={handleReAuthenticate}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Re-authenticate
            </button>
          </div>
        </div>
      )}

      {/* Option Input Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Option Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Symbol
            </label>
            <input
              type="text"
              placeholder="e.g., RELIANCE"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strike Price
            </label>
            <input
              type="number"
              placeholder="e.g., 3000"
              value={strike}
              onChange={(e) => setStrike(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date
            </label>
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select expiry date</option>
              {getExpiryOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {generateTradingSymbol() && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md">
            <span className="text-sm font-medium text-gray-700">Trading Symbol: </span>
            <span className="text-sm font-mono text-blue-600">{generateTradingSymbol()}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={(e) => setAutoUpdate(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-update every 10 seconds</span>
          </label>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useWebSocket}
                onChange={(e) => {
                  setUseWebSocket(e.target.checked)
                  // If WS is enabled, turn off REST auto-update to avoid conflicts
                  if (e.target.checked) setAutoUpdate(false)
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Live via WebSocket</span>
            </label>
            <button
              onClick={fetchOptionData}
              disabled={loading || !hasValidToken}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
              title={useWebSocket ? 'Fetch once via REST (WebSocket streaming is active)' : 'Fetch via REST'}
            >
              {loading ? 'Loading...' : 'Get LTP'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Option Data Display */}
      {optionData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {generateTradingSymbol()} - Put Option LTP
            </h3>
            {(autoUpdate || (useWebSocket && wsConnected)) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {useWebSocket ? 'Live (WebSocket)' : 'Auto-updating'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LTP */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ₹{optionData.last_price.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">Last Traded Price</div>
            </div>

            {/* Bid Price */}
            <div className="text-center">
              <div className="text-xl font-semibold text-green-600">
                ₹{optionData.depth.buy[0]?.price?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Best Bid</div>
              <div className="text-xs text-gray-400">
                Qty: {optionData.depth.buy[0]?.quantity || 'N/A'}
              </div>
            </div>

            {/* Ask Price */}
            <div className="text-center">
              <div className="text-xl font-semibold text-red-600">
                ₹{optionData.depth.sell[0]?.price?.toFixed(2) || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Best Ask</div>
              <div className="text-xs text-gray-400">
                Qty: {optionData.depth.sell[0]?.quantity || 'N/A'}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900">{optionData.volume}</div>
              <div className="text-sm text-gray-500">Volume</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900">{optionData.oi}</div>
              <div className="text-sm text-gray-500">Open Interest</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400 text-center">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  )
}