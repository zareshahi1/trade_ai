import { kv } from '@vercel/kv'

export interface UserApiKeys {
  openai?: string
  binance?: {
    apiKey: string
    secretKey: string
  }
  bybit?: {
    apiKey: string
    secretKey: string
  }
  okx?: {
    apiKey: string
    secretKey: string
    passphrase: string
  }
  kucoin?: {
    apiKey: string
    secretKey: string
    passphrase: string
  }
  wallex?: {
    apiKey: string
  }
}

export class VercelStoreService {
  private getUserKey(userId: string): string {
    return `user:${userId}:api-keys`
  }

  async getUserApiKeys(userId: string): Promise<UserApiKeys | null> {
    try {
      const keys = await kv.get<UserApiKeys>(this.getUserKey(userId))
      return keys
    } catch (error) {
      console.error('Error fetching API keys:', error)
      return null
    }
  }

  async setUserApiKeys(userId: string, apiKeys: UserApiKeys): Promise<boolean> {
    try {
      await kv.set(this.getUserKey(userId), apiKeys)
      return true
    } catch (error) {
      console.error('Error storing API keys:', error)
      return false
    }
  }

  async updateApiKey(userId: string, key: keyof UserApiKeys, value: any): Promise<boolean> {
    try {
      const currentKeys = await this.getUserApiKeys(userId) || {}
      const updatedKeys = { ...currentKeys, [key]: value }
      return await this.setUserApiKeys(userId, updatedKeys)
    } catch (error) {
      console.error('Error updating API key:', error)
      return false
    }
  }

  async deleteUserApiKeys(userId: string): Promise<boolean> {
    try {
      await kv.del(this.getUserKey(userId))
      return true
    } catch (error) {
      console.error('Error deleting API keys:', error)
      return false
    }
  }

  async hasApiKey(userId: string, key: keyof UserApiKeys): Promise<boolean> {
    try {
      const keys = await this.getUserApiKeys(userId)
      return keys ? key in keys && !!keys[key] : false
    } catch (error) {
      console.error('Error checking API key:', error)
      return false
    }
  }
}

export const vercelStore = new VercelStoreService()