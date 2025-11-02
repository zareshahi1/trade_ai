import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()

  console.log('🔐 ProtectedRoute:', { loading, hasUser: !!user, userEmail: user?.email })

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('⏳ Showing loading spinner...')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">در حال بررسی احراز هویت...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('🚪 No user found, redirecting to login...')
    return <Navigate to="/login" replace />
  }

  console.log('✅ User authenticated, rendering protected content')
  // Render the protected content
  return <>{children}</>
}

export default ProtectedRoute