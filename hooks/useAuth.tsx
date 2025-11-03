import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, auth } from '@/lib/supabase'
import { supabaseStore, UserApiKeys } from '@/services/supabaseStore'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isSigningIn: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  apiKeys: UserApiKeys | null
  updateApiKeys: (keys: UserApiKeys) => Promise<boolean>
  hasApiKey: (key: keyof UserApiKeys) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [apiKeys, setApiKeys] = useState<UserApiKeys | null>(null)

  useEffect(() => {
    let isMounted = true

    // Get initial session
    const getInitialSession = async () => {
      console.log('🔄 Starting initial session check...')
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('📋 Session check result:', { hasSession: !!session, hasError: !!error })

        if (error) {
          console.error('❌ Error getting session:', error)
        } else {
          if (isMounted) {
            setSession(session)
            setUser(session?.user ?? null)
            console.log('✅ Session loaded:', session?.user?.email)

            if (session?.user) {
              // Load API keys asynchronously without blocking loading state
              loadUserApiKeys(session.user.id).catch(error => {
                console.error('❌ Error loading API keys:', error)
              })
            }
          }
        }
      } catch (error) {
        console.error('💥 Unexpected error getting session:', error)
      } finally {
        console.log('🏁 Setting loading to false')
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        if (isMounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setIsSigningIn(false) // Reset signing in state

          if (session?.user) {
            // Load API keys asynchronously without blocking loading state
            loadUserApiKeys(session.user.id).catch(error => {
              console.error('Error loading API keys:', error)
            })
          } else {
            setApiKeys(null)
          }

          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Fallback: ensure loading is set to false after 15 seconds max
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading timeout reached, forcing loading to false')
        setLoading(false)
      }
    }, 15000)

    return () => clearTimeout(timeout)
  }, [loading])

  const loadUserApiKeys = async (userId: string) => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API key loading timeout')), 10000)
      })

      const keys = await Promise.race([
        supabaseStore.getUserApiKeys(userId),
        timeoutPromise
      ]) as UserApiKeys | null

      setApiKeys(keys)
    } catch (error) {
      console.error('Error loading API keys:', error)
      setApiKeys(null)
    }
  }

  const signInWithGoogle = async () => {
    setIsSigningIn(true)
    const { error } = await auth.signInWithGoogle()
    if (error) {
      console.error('Error signing in with Google:', error)
      setIsSigningIn(false)
    }
    // Note: isSigningIn will be reset by auth state change on success
  }

  const signOut = async () => {
    const { error } = await auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
    // Auth state change will handle setting user/session to null
  }

  const updateApiKeys = async (keys: UserApiKeys): Promise<boolean> => {
    if (!user) return false

    const success = await supabaseStore.setUserApiKeys(user.id, keys)
    if (success) {
      setApiKeys(keys)
    }
    return success
  }

  const hasApiKey = (key: keyof UserApiKeys): boolean => {
    if (!apiKeys) return false
    const value = apiKeys[key]
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).every(v => v && v.trim() !== '')
    }
    return !!(value && value.toString().trim())
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    isSigningIn,
    signInWithGoogle,
    signOut,
    apiKeys,
    updateApiKeys,
    hasApiKey
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}