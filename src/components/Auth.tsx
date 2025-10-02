'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

interface AuthProps { compact?: boolean }

export default function Auth({ compact = false }: AuthProps) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetting, setResetting] = useState(false)

  const supabase = createClient()

  const handleGoogleAuth = async () => {
    try {
      setLoading(true)
      setMessage('')
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) setMessage(error.message)
    } catch (e: any) {
      setMessage(e.message || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage('Enter your email to reset password')
      return
    }
    try {
      setResetting(true)
      setMessage('')
      const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setMessage('If that email exists, a reset link has been sent')
    } catch (e: any) {
      setMessage(e.message || 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  const GoogleButton = (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={loading}
      className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' className='h-4 w-4 sm:h-5 sm:w-5' aria-hidden='true'><path fill='#FFC107' d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.045,6.053,28.779,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'/><path fill='#FF3D00' d='M6.306,14.691l6.571,4.819C14.655,16.108,19.013,13,24,13c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.045,6.053,28.779,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'/><path fill='#4CAF50' d='M24,44c4.697,0,8.966-1.802,12.23-4.746l-5.654-5.652C28.437,35.091,26.308,36,24,36 c-5.202,0-9.626-3.329-11.282-7.969l-6.522,5.025C9.505,39.556,16.227,44,24,44z'/><path fill='#1976D2' d='M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.23,4.129-4.084,5.602c0.001-0.001,0.002-0.001,0.003-0.002 l6.558,5.104C36.647,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z'/></svg>
  <span>{loading ? 'Please wait' : 'Continue with Google'}</span>
    </button>
  )

  if (compact) {
    return (
      <form className="space-y-4" onSubmit={handleAuth}>
        <div className="rounded-md shadow-sm -space-y-px">
          <div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Email"
            />
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="appearance-none rounded-none relative block w-full pr-14 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute inset-y-0 right-0 px-3 text-[11px] text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {message && (
          <div className={`text-xs text-center ${/fail|error/i.test(message) ? 'text-red-600' : 'text-green-600'}`}>{message}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex"
        >
          {loading ? 'Loading...' : (isSignUp ? 'Sign up' : 'Sign in')}
        </button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-2 bg-transparent text-gray-400 text-[11px]">or</span>
          </div>
        </div>
        {GoogleButton}
        <div className="flex items-center justify-between text-[11px]">
          <button type="button" onClick={handleForgotPassword} disabled={resetting} className="text-gray-500 hover:text-gray-700">{resetting ? 'Sending…' : 'Forgot?'}</button>
          <button type="button" onClick={() => setIsSignUp(s => !s)} className="text-blue-600 hover:text-blue-500">{isSignUp ? 'Have an account?' : 'Need an account?'}</button>
        </div>
      </form>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
        </div>
        <form className="mt-6 space-y-6" onSubmit={handleAuth}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="email-full"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div className="relative">
              <input
                id="password-full"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full pr-16 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button type="button" tabIndex={-1} onClick={() => setShowPassword(s => !s)} className="text-xs text-gray-500 hover:text-gray-700">{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </div>
          </div>

          {message && (
            <div className={`text-sm text-center ${/fail|error/i.test(message) ? 'text-red-600' : 'text-green-600'}`}>{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex"
          >
            {loading ? 'Loading...' : (isSignUp ? 'Create account' : 'Sign in')}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-gray-50 text-gray-400 text-sm">or</span>
            </div>
          </div>

          {GoogleButton}

          <div className="mt-3 flex items-center justify-between text-xs">
            {!isSignUp && (
              <button type="button" onClick={handleForgotPassword} disabled={resetting} className="text-gray-500 hover:text-gray-700">{resetting ? 'Sending…' : 'Forgot password?'}</button>
            )}
            <button type="button" onClick={() => setIsSignUp(s => !s)} className="ml-auto text-blue-600 hover:text-blue-500">
              {isSignUp ? 'Have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}