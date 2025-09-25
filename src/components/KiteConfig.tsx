'use client'

import { useState } from 'react'

interface KiteConfigProps {
  onCredentialsSet: (credentials: { apiKey: string; apiSecret: string }) => void
}

export default function KiteConfig({ onCredentialsSet }: KiteConfigProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSetup = async () => {
    setLoading(true)
    setMessage('')

    // Generate Kite Connect login URL using environment API key
    const response = await fetch('/api/kite/login-url')
    const data = await response.json()
    
    if (data.loginUrl) {
      // Open login URL in new window
      window.open(data.loginUrl, '_blank', 'width=600,height=600')
      
      setMessage('Please complete the login in the popup window and copy the request token from the URL')
      onCredentialsSet({ apiKey: 'configured', apiSecret: 'configured' })
    } else {
      setMessage('Error: ' + (data.error || 'Failed to generate login URL'))
    }
    
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Kite API Setup</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            API credentials are configured server-side. Click below to authenticate with Zerodha.
          </p>
        </div>

        {message && (
          <div className={`text-sm ${message.includes('error') || message.includes('Error') ? 'text-red-600' : 'text-blue-600'}`}>
            {message}
          </div>
        )}

        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? 'Setting up...' : 'Setup Kite Authentication'}
        </button>
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p><strong>Instructions:</strong></p>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>Click &quot;Setup Kite Authentication&quot;</li>
          <li>Complete the login in the popup window</li>
          <li>Copy the request token from the redirect URL</li>
          <li>Use it in the next step to get live market data</li>
        </ol>
      </div>
    </div>
  )
}