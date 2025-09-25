import { createClient } from '@/lib/supabase'

export interface KiteToken {
  id?: string
  user_id: string
  access_token: string
  created_at?: string
  expires_at: string
}

export class TokenManager {
  private supabase = createClient()

  async saveToken(userId: string, accessToken: string): Promise<void> {
    // Calculate expiry time (next day at 6 AM IST)
    const now = new Date()
    const expiryDate = new Date(now)
    expiryDate.setDate(expiryDate.getDate() + 1)
    expiryDate.setHours(6, 0, 0, 0) // 6 AM next day
    
    const { error } = await this.supabase
      .from('user_kite_tokens')
      .upsert({
        user_id: userId,
        access_token: accessToken,
        expires_at: expiryDate.toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      throw new Error(`Failed to save token: ${error.message}`)
    }
  }

  async getValidToken(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('user_kite_tokens')
      .select('access_token, expires_at')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return null
    }

    // Check if token is still valid
    const expiryTime = new Date(data.expires_at)
    const now = new Date()

    if (now >= expiryTime) {
      // Token expired, delete it
      await this.deleteToken(userId)
      return null
    }

    return data.access_token
  }

  async deleteToken(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_kite_tokens')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to delete token:', error.message)
    }
  }

  async isTokenExpiringSoon(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_kite_tokens')
      .select('expires_at')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return true // Consider expired if not found
    }

    const expiryTime = new Date(data.expires_at)
    const now = new Date()
    const hoursUntilExpiry = (expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Return true if expiring within 1 hour
    return hoursUntilExpiry <= 1
  }
}