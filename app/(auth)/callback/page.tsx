'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { setSession } from '@/app/actions/auth'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    console.log('Auth callback page loaded, URL:', window.location.href)
    console.log('URL params:', new URLSearchParams(window.location.search).toString())

    let timeoutId: NodeJS.Timeout

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth callback state change:', event, session?.user?.email)

        if (event === 'SIGNED_IN' && session) {
          console.log('Auth successful:', session.user.email)

          // Set session cookies on server
          try {
            await setSession(session.access_token, session.refresh_token || '')
            console.log('Session cookies set')
          } catch (error) {
            console.error('Error setting session cookies:', error)
          }

          router.push('/')
        } else if (event === 'SIGNED_OUT' || !session) {
          router.push('/login')
        }
      }
    )

    // Fallback timeout in case auth state doesn't change
    timeoutId = setTimeout(() => {
      console.log('Auth callback timeout, checking session...')
      supabase.auth.getSession().then(async ({ data, error }) => {
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login')
        } else if (data.session) {
          // Set session cookies on server
          try {
            await setSession(data.session.access_token, data.session.refresh_token || '')
            console.log('Session cookies set')
          } catch (error) {
            console.error('Error setting session cookies:', error)
          }
          router.push('/')
        } else {
          router.push('/login')
        }
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">در حال ورود...</p>
      </div>
    </div>
  )
}