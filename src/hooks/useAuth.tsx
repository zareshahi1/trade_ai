import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, auth } from '@/lib/supabase'
import { vercelStore, UserApiKeys } from '@/services/vercelStore'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
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
  const [apiKeys, setApiKeys] = useState<UserApiKeys | null>(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadUserApiKeys(session.user.id)
        }
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await loadUserApiKeys(session.user.id)
        } else {
          setApiKeys(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUserApiKeys = async (userId: string) => {
    try {
      const keys = await vercelStore.getUserApiKeys(userId)
      setApiKeys(keys)
    } catch (error) {
      console.error('Error loading API keys:', error)
      setApiKeys(null)
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    const { error } = await auth.signInWithGoogle()
    if (error) {
      console.error('Error signing in with Google:', error)
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
    setUser(null)
    setSession(null)
    setApiKeys(null)
    setLoading(false)
  }

  const updateApiKeys = async (keys: UserApiKeys): Promise<boolean> => {
    if (!user) return false

    const success = await vercelStore.setUserApiKeys(user.id, keys)
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