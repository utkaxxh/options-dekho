'use client'

import { useEffect } from 'react'

export default function KiteCallback() {
  useEffect(() => {
    console.log('Kite callback page loaded')
    console.log('Current URL:', window.location.href)
    
    const urlParams = new URLSearchParams(window.location.search)
    const requestToken = urlParams.get('request_token')
    const status = urlParams.get('status')
    const error = urlParams.get('error')

    console.log('URL params:', { requestToken, status, error })

    if (error || status === 'error') {
      console.log('Authentication error detected:', error)
      // Send error message to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'KITE_AUTH_ERROR',
          error: error || 'Authentication failed'
        }, '*') // Use '*' for broader compatibility
      }
    } else if (requestToken) {
      console.log('Request token found:', requestToken)
      // Send success message with request token to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'KITE_AUTH_SUCCESS',
          requestToken: requestToken
        }, '*') // Use '*' for broader compatibility
      }
    } else {
      console.log('No request token found in URL')
      // No token found
      if (window.opener) {
        window.opener.postMessage({
          type: 'KITE_AUTH_ERROR',
          error: 'No request token received from Kite'
        }, '*') // Use '*' for broader compatibility
      }
    }

    // Close the popup after a short delay
    setTimeout(() => {
      console.log('Closing popup window')
      window.close()
    }, 2000) // Increased delay to 2 seconds for better UX
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