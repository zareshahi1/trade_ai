import { supabase } from '@/lib/supabase'

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

export class SupabaseStoreService {
  async getUserApiKeys(userId: string): Promise<UserApiKeys | null> {
    try {
      // Fetch exchange API keys
      const { data: exchangeKeys, error: exchangeError } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', userId)

      if (exchangeError) {
        console.error('Error fetching exchange API keys:', exchangeError)
        return null
      }

      // Fetch OpenAI API key
      const { data: openaiKey, error: openaiError } = await supabase
        .from('openai_api_keys')
        .select('api_key')
        .eq('user_id', userId)
        .single()

      if (openaiError && openaiError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching OpenAI API key:', openaiError)
        return null
      }

      // Build the result object
      const result: UserApiKeys = {}

      // Add OpenAI key
      if (openaiKey) {
        result.openai = openaiKey.api_key
      }

      // Add exchange keys
      exchangeKeys?.forEach(key => {
        const exchangeData: any = {
          apiKey: key.api_key,
          secretKey: key.api_secret
        }

        if (key.passphrase) {
          exchangeData.passphrase = key.passphrase
        }

        if (key.testnet) {
          exchangeData.testnet = key.testnet
        }

        result[key.exchange_type as keyof UserApiKeys] = exchangeData
      })

      return result
    } catch (error) {
      console.error('Error fetching API keys:', error)
      return null
    }
  }

  async setUserApiKeys(userId: string, apiKeys: UserApiKeys): Promise<boolean> {
    try {
      // Handle OpenAI key
      if (apiKeys.openai !== undefined) {
        const { error } = await supabase
          .from('openai_api_keys')
          .upsert({
            user_id: userId,
            api_key: apiKeys.openai
          })

        if (error) {
          console.error('Error storing OpenAI API key:', error)
          return false
        }
      }

      // Handle exchange keys
      for (const [exchange, data] of Object.entries(apiKeys)) {
        if (exchange === 'openai' || !data) continue

        const exchangeData = data as any
        const { error } = await supabase
          .from('user_api_keys')
          .upsert({
            user_id: userId,
            exchange_type: exchange,
            api_key: exchangeData.apiKey,
            api_secret: exchangeData.secretKey,
            passphrase: exchangeData.passphrase,
            testnet: exchangeData.testnet || false
          })

        if (error) {
          console.error(`Error storing ${exchange} API key:`, error)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Error storing API keys:', error)
      return false
    }
  }

  async updateApiKey(userId: string, key: keyof UserApiKeys, value: any): Promise<boolean> {
    try {
      if (key === 'openai') {
        const { error } = await supabase
          .from('openai_api_keys')
          .upsert({
            user_id: userId,
            api_key: value
          })

        return !error
      } else {
        // Handle exchange keys
        const exchangeData = value as any
        const { error } = await supabase
          .from('user_api_keys')
          .upsert({
            user_id: userId,
            exchange_type: key,
            api_key: exchangeData.apiKey,
            api_secret: exchangeData.secretKey,
            passphrase: exchangeData.passphrase,
            testnet: exchangeData.testnet || false
          })

        return !error
      }
    } catch (error) {
      console.error('Error updating API key:', error)
      return false
    }
  }

  async deleteUserApiKeys(userId: string): Promise<boolean> {
    try {
      // Delete exchange keys
      const { error: exchangeError } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('user_id', userId)

      // Delete OpenAI key
      const { error: openaiError } = await supabase
        .from('openai_api_keys')
        .delete()
        .eq('user_id', userId)

      return !exchangeError && !openaiError
    } catch (error) {
      console.error('Error deleting API keys:', error)
      return false
    }
  }

  async hasApiKey(userId: string, key: keyof UserApiKeys): Promise<boolean> {
    try {
      if (key === 'openai') {
        const { data, error } = await supabase
          .from('openai_api_keys')
          .select('id')
          .eq('user_id', userId)
          .single()

        return !error && !!data
      } else {
        const { data, error } = await supabase
          .from('user_api_keys')
          .select('id')
          .eq('user_id', userId)
          .eq('exchange_type', key)
          .single()

        return !error && !!data
      }
    } catch (error) {
      console.error('Error checking API key:', error)
      return false
    }
  }

  async saveUserConfig(userId: string, key: string, value: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_configs')
        .upsert({
          user_id: userId,
          key,
          value: JSON.stringify(value)
        })

      return !error
    } catch (error) {
      console.error('Error saving user config:', error)
      return false
    }
  }

  async getUserConfig(userId: string, key: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('user_configs')
        .select('value')
        .eq('user_id', userId)
        .eq('key', key)
        .single()

      if (error || !data) return null

      return JSON.parse(data.value)
    } catch (error) {
      console.error('Error getting user config:', error)
      return null
    }
  }
}

export const supabaseStore = new SupabaseStoreService()