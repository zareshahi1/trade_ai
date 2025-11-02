'use server'

import { createClient } from '@/lib/supabase-server'

export async function setSession(accessToken: string, refreshToken: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  })

  if (error) {
    console.error('Error setting session:', error)
    throw error
  }

  return data
}