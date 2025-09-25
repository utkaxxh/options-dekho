'use client'

import { useEffect } from 'react'

export default function KiteCallback() {
  useEffect(() => {
    console.log('Kite callback page loaded')
    console.log('Current URL:', window.location.href)
    console.log('window.opener exists:', !!window.opener)
    
    const urlParams = new URLSearchParams(window.location.search)
    const requestToken = urlParams.get('request_token')
    const status = urlParams.get('status')
    const error = urlParams.get('error')

    console.log('URL params:', { requestToken, status, error })

    // Create a unique key for this authentication session
    const authSessionKey = 'kite_auth_result'

    if (error || status === 'error') {
      console.log('Authentication error detected:', error)
      
      const errorResult = {
        type: 'KITE_AUTH_ERROR',
        error: error || 'Authentication failed',
        timestamp: Date.now()
      }

      // Method 1: Try postMessage to parent window
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(errorResult, '*')
          console.log('Error message sent via postMessage')
        }
      } catch (e) {
        console.log('postMessage failed:', e)
      }

      // Method 2: Use localStorage as fallback
      localStorage.setItem(authSessionKey, JSON.stringify(errorResult))
      console.log('Error result stored in localStorage')

    } else if (requestToken) {
      console.log('Request token found:', requestToken)
      
      const successResult = {
        type: 'KITE_AUTH_SUCCESS',
        requestToken: requestToken,
        timestamp: Date.now()
      }

      // Method 1: Try postMessage to parent window
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(successResult, '*')
          console.log('Success message sent via postMessage')
        } else {
          console.log('window.opener is null or closed, using localStorage fallback')
        }
      } catch (e) {
        console.log('postMessage failed:', e)
      }

      // Method 2: Use localStorage as fallback (always set this)
      localStorage.setItem(authSessionKey, JSON.stringify(successResult))
      console.log('Success result stored in localStorage')

    } else {
      console.log('No request token found in URL')
      
      const errorResult = {
        type: 'KITE_AUTH_ERROR',
        error: 'No request token received from Kite',
        timestamp: Date.now()
      }

      // Method 1: Try postMessage
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(errorResult, '*')
        }
      } catch (e) {
        console.log('postMessage failed:', e)
      }

      // Method 2: localStorage fallback
      localStorage.setItem(authSessionKey, JSON.stringify(errorResult))
    }

    // Close the popup after a delay
    setTimeout(() => {
      console.log('Closing popup window')
      window.close()
    }, 3000) // 3 seconds to ensure message is processed
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