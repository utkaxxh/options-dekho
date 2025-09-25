'use client'

import { useEffect } from 'react'

export default function KiteCallback() {
  useEffect(() => {
    // Handle unhandled promise rejections from browser extensions
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('message channel closed') || 
          event.reason?.message?.includes('listener indicated an asynchronous response')) {
        // Suppress browser extension errors that don't affect our functionality
        event.preventDefault()
        console.log('Suppressed browser extension error:', event.reason?.message)
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

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

    // Function to send message with error handling
    const sendMessageSafely = (message: any) => {
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(message, '*')
          console.log('Message sent via postMessage:', message.type)
          return true
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error'
        console.log('postMessage failed (likely browser extension interference):', errorMsg)
        return false
      }
      return false
    }

  // Prepare BroadcastChannel for robust cross-window communication
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('kite-auth') : null

  if (error || status === 'error') {
      console.log('Authentication error detected:', error)
      
      const errorResult = {
        type: 'KITE_AUTH_ERROR',
        error: error || 'Authentication failed',
        timestamp: Date.now()
      }

      // Try postMessage first
      const messageSent = sendMessageSafely(errorResult)

      // Broadcast channel as additional channel
      try {
        channel?.postMessage(errorResult)
        console.log('Error result sent via BroadcastChannel')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        console.log('BroadcastChannel send failed:', msg)
      }
      
      // Always use localStorage as backup
      try {
        localStorage.setItem(authSessionKey, JSON.stringify(errorResult))
        console.log('Error result stored in localStorage')
      } catch (e) {
        console.log('Failed to store in localStorage:', e)
      }

  } else if (requestToken) {
      console.log('Request token found:', requestToken)
      
      const successResult = {
        type: 'KITE_AUTH_SUCCESS',
        requestToken: requestToken,
        timestamp: Date.now()
      }

      // Try postMessage first
      const messageSent = sendMessageSafely(successResult)

      // Broadcast channel as additional channel
      try {
        channel?.postMessage(successResult)
        console.log('Success result sent via BroadcastChannel')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        console.log('BroadcastChannel send failed:', msg)
      }
      
      // Always use localStorage as backup
      try {
        localStorage.setItem(authSessionKey, JSON.stringify(successResult))
        console.log('Success result stored in localStorage')
      } catch (e) {
        console.log('Failed to store in localStorage:', e)
      }

    } else {
      console.log('No request token found in URL')
      
      const errorResult = {
        type: 'KITE_AUTH_ERROR',
        error: 'No request token received from Kite',
        timestamp: Date.now()
      }

      // Try postMessage first
      const messageSent = sendMessageSafely(errorResult)

      // Broadcast channel as additional channel
      try {
        channel?.postMessage(errorResult)
        console.log('Error result sent via BroadcastChannel')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        console.log('BroadcastChannel send failed:', msg)
      }
      
      // Always use localStorage as backup
      try {
        localStorage.setItem(authSessionKey, JSON.stringify(errorResult))
        console.log('Error result stored in localStorage')
      } catch (e) {
        console.log('Failed to store in localStorage:', e)
      }
    }

    // Close the popup after a delay
    setTimeout(() => {
      console.log('Closing popup window')
      try {
        window.close()
      } catch (e) {
        console.log('Failed to close window:', e)
      }
    }, 3000) // 3 seconds to ensure message is processed

    // Cleanup function
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      try { channel?.close() } catch {}
    }
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