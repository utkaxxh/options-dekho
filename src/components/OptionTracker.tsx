'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

interface OptionTrackerProps {
  kiteCredentials: {
    apiKey: string
    apiSecret: string
    accessToken?: string
  }
}

interface OptionData {
  last_price: number
  depth: {
    buy: Array<{ price: number; quantity: number }>
    sell: Array<{ price: number; quantity: number }>
  }
  volume: number
  oi: number
}

export default function OptionTracker({ kiteCredentials }: OptionTrackerProps) {
  const [symbol, setSymbol] = useState('')
  const [strike, setStrike] = useState('')
  const [expiry, setExpiry] = useState('')
  const [requestToken, setRequestToken] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [optionData, setOptionData] = useState<OptionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoUpdate, setAutoUpdate] = useState(false)

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

  const generateTradingSymbol = () => {
    if (!symbol || !strike || !expiry) return ''
    
    const expiryDate = new Date(expiry)
    const year = expiryDate.getFullYear().toString().slice(-2)
    const month = monthNames[expiryDate.getMonth()]
    
    return `${symbol.toUpperCase()}${year}${month}${strike}PE`
  }

  const generateAccessToken = async () => {
    if (!requestToken) {
      setError('Please enter the request token')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/kite/token', {
        request_token: requestToken
      })

      if (response.data.access_token) {
        setAccessToken(response.data.access_token)
        setError('')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate access token')
    } finally {
      setLoading(false)
    }
  }

  const fetchOptionData = async () => {
    if (!accessToken) {
      setError('Please generate access token first')
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
          access_token: accessToken,
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
      setError(err.response?.data?.error || 'Failed to fetch option data')
    } finally {
      setLoading(false)
    }
  }

  // Auto-update every 10 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoUpdate && accessToken && optionData) {
      interval = setInterval(() => {
        fetchOptionData()
      }, 10000)
    }
    return () => clearInterval(interval)
  }, [autoUpdate, accessToken, optionData])

  return (
    <div className="space-y-6">
      {/* Access Token Section */}
      {!accessToken && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Access Token</h3>
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
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
            >
              Generate Token
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
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
          
          <button
            onClick={fetchOptionData}
            disabled={loading || !accessToken}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Get LTP'}
          </button>
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
            {autoUpdate && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Auto-updating
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