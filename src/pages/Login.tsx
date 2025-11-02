import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Shield, Zap, TrendingUp } from 'lucide-react'
import { MadeWithDyad } from '@/components/made-with-dyad'

const Login = () => {
  const { signInWithGoogle, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            ربات معاملاتی هوش مصنوعی
          </h1>
          <p className="text-gray-600 text-sm">
            پلتفرم پیشرفته معاملات خودکار ارزهای دیجیتال
          </p>
        </div>

        {/* Login Card */}
        <Card className="persian-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">ورود به حساب کاربری</CardTitle>
            <CardDescription>
              برای دسترسی به ربات معاملاتی، ابتدا وارد حساب خود شوید
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full persian-btn-primary text-lg py-6"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                  در حال ورود...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  ادامه با گوگل
                </>
              )}
            </Button>

            {/* Features */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 text-center">امکانات پلتفرم:</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>امنیت بالا</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span>سرعت بالا</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span>تحلیل پیشرفته</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Bot className="w-4 h-4 text-indigo-500" />
                  <span>هوش مصنوعی</span>
                </div>
              </div>
            </div>

            {/* Persian Quote */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic">
                "هوشمند کسی است که آینده را می‌بیند و برای آن آماده می‌شود"
              </p>
              <p className="text-xs text-gray-400 mt-1">- حکیم عمر خیام</p>
            </div>
          </CardContent>
        </Card>

        <MadeWithDyad />
      </div>
    </div>
  )
}

export default Login