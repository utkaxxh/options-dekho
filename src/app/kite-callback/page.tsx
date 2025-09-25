'use client'

import { useEffect } from 'react'

export default function KiteCallback() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const requestToken = urlParams.get('request_token')
    const status = urlParams.get('status')
    const error = urlParams.get('error')

    if (error || status === 'error') {
      // Send error message to parent window
      window.opener?.postMessage({
        type: 'KITE_AUTH_ERROR',
        error: error || 'Authentication failed'
      }, window.location.origin)
    } else if (requestToken) {
      // Send success message with request token to parent window
      window.opener?.postMessage({
        type: 'KITE_AUTH_SUCCESS',
        requestToken: requestToken
      }, window.location.origin)
    } else {
      // No token found
      window.opener?.postMessage({
        type: 'KITE_AUTH_ERROR',
        error: 'No request token received'
      }, window.location.origin)
    }

    // Close the popup after a short delay
    setTimeout(() => {
      window.close()
    }, 1000)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
        <p className="text-sm text-gray-500 mt-2">This window will close automatically.</p>
      </div>
    </div>
  )
}