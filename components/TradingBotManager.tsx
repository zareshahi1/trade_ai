import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Play, Square, Plus, Bot, Activity, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { TradingStrategy, DEFAULT_STRATEGIES } from '@/types/trading'
import { AIConfig } from '@/services/aiService'
import { toast } from 'sonner'

interface TradingBot {
  id: string
  name: string
  strategy: TradingStrategy
  ai_config: AIConfig
  initial_balance: number
  is_active: boolean
  last_run: string | null
  created_at: string
}

interface TradingSession {
  id: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  started_at: string
  completed_at: string | null
  performance_data: any
}

const TradingBotManager = () => {
  const { user } = useAuth()
  const [bots, setBots] = useState<TradingBot[]>([])
  const [sessions, setSessions] = useState<Record<string, TradingSession[]>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Create bot form state
  const [botName, setBotName] = useState('')
  const [selectedStrategy, setSelectedStrategy] = useState<TradingStrategy>(DEFAULT_STRATEGIES.moderate)
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-3.5-turbo'
  })
  const [initialBalance, setInitialBalance] = useState(10000)

  useEffect(() => {
    if (user) {
      loadBots()
    }
  }, [user])

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setBots(data || [])

      // Load sessions for each bot
      const sessionsData: Record<string, TradingSession[]> = {}
      for (const bot of data || []) {
        const { data: sessions } = await supabase
          .from('trading_sessions')
          .select('*')
          .eq('bot_id', bot.id)
          .order('started_at', { ascending: false })
          .limit(5)

        sessionsData[bot.id] = sessions || []
      }

      setSessions(sessionsData)
    } catch (error) {
      console.error('Error loading bots:', error)
      toast.error('خطا در بارگذاری ربات‌ها')
    } finally {
      setLoading(false)
    }
  }

  const createBot = async () => {
    if (!botName.trim()) {
      toast.error('نام ربات را وارد کنید')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/trading-bot/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: botName.trim(),
          strategy: selectedStrategy,
          aiConfig,
          initialBalance
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success('ربات معاملاتی ایجاد شد')
      setBotName('')
      loadBots()
    } catch (error: any) {
      console.error('Error creating bot:', error)
      toast.error(error.message || 'خطا در ایجاد ربات')
    } finally {
      setCreating(false)
    }
  }

  const startBot = async (botId: string) => {
    try {
      const response = await fetch('/api/trading-bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          userId: user?.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success('ربات معاملاتی شروع شد')
      loadBots()
    } catch (error: any) {
      console.error('Error starting bot:', error)
      toast.error(error.message || 'خطا در شروع ربات')
    }
  }

  const stopBot = async (botId: string) => {
    try {
      const response = await fetch('/api/trading-bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          userId: user?.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }

      toast.success('ربات معاملاتی متوقف شد')
      loadBots()
    } catch (error: any) {
      console.error('Error stopping bot:', error)
      toast.error(error.message || 'خطا در توقف ربات')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-100 text-green-800"><Activity className="w-3 h-3 mr-1" />در حال اجرا</Badge>
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />تکمیل شده</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />خطا</Badge>
      case 'stopped':
        return <Badge className="bg-gray-100 text-gray-800"><Square className="w-3 h-3 mr-1" />متوقف شده</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p>در حال بارگذاری ربات‌ها...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ربات‌های معاملاتی</h2>
          <p className="text-gray-600">مدیریت ربات‌های معاملاتی خودکار</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="persian-btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              ربات جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>ایجاد ربات معاملاتی جدید</DialogTitle>
              <DialogDescription>
                تنظیمات ربات معاملاتی خود را تعیین کنید
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="botName">نام ربات</Label>
                <Input
                  id="botName"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="مثال: ربات طلایی"
                />
              </div>

              <div>
                <Label>استراتژی معاملاتی</Label>
                <Select
                  value={selectedStrategy.name}
                  onValueChange={(value) => {
                    const strategy = Object.values(DEFAULT_STRATEGIES).find(s => s.name === value)
                    if (strategy) setSelectedStrategy(strategy)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DEFAULT_STRATEGIES).map((strategy) => (
                      <SelectItem key={strategy.name} value={strategy.name}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="initialBalance">موجودی اولیه (تومان)</Label>
                <Input
                  id="initialBalance"
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(Number(e.target.value))}
                  min="1000"
                  max="10000000"
                />
              </div>

              <div>
                <Label>پیکربندی هوش مصنوعی</Label>
                <Select
                  value={aiConfig.provider}
                  onValueChange={(value: any) => setAiConfig({ ...aiConfig, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="ollama">Ollama (محلی)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {aiConfig.provider === 'openai' && (
                <div>
                  <Label htmlFor="apiKey">کلید API OpenAI</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                    placeholder="sk-..."
                  />
                </div>
              )}

              <Button
                onClick={createBot}
                disabled={creating}
                className="w-full"
              >
                {creating ? 'در حال ایجاد...' : 'ایجاد ربات'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {bots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">هیچ ربات معاملاتی ندارید</h3>
            <p className="text-gray-600 text-center mb-4">
              ربات‌های معاملاتی شما به صورت خودکار و ۲۴ ساعته بازار را تحلیل کرده و معاملات را انجام می‌دهند
            </p>
            <Button onClick={() => {
              const element = document.querySelector('[data-state="open"]');
              if (element instanceof HTMLElement) {
                element.click();
              }
            }}>
              <Plus className="w-4 h-4 mr-2" />
              ایجاد اولین ربات
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot) => (
            <Card key={bot.id} className="persian-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{bot.name}</CardTitle>
                  {bot.is_active ? (
                    <Badge className="bg-green-100 text-green-800">
                      <Activity className="w-3 h-3 mr-1" />
                      فعال
                    </Badge>
                  ) : (
                    <Badge variant="secondary">غیرفعال</Badge>
                  )}
                </div>
                <CardDescription>
                  استراتژی: {bot.strategy.name} | موجودی: {bot.initial_balance.toLocaleString()} تومان
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>ایجاد شده: {new Date(bot.created_at).toLocaleDateString('fa-IR')}</p>
                  {bot.last_run && (
                    <p>آخرین اجرا: {new Date(bot.last_run).toLocaleDateString('fa-IR')}</p>
                  )}
                </div>

                {/* Recent Sessions */}
                {sessions[bot.id]?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">جلسات اخیر:</Label>
                    <div className="space-y-1">
                      {sessions[bot.id].slice(0, 3).map((session) => (
                        <div key={session.id} className="flex items-center justify-between text-xs">
                          <span>{new Date(session.started_at).toLocaleDateString('fa-IR')}</span>
                          {getStatusBadge(session.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {!bot.is_active ? (
                    <Button
                      onClick={() => startBot(bot.id)}
                      className="flex-1 persian-btn-success"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      شروع
                    </Button>
                  ) : (
                    <Button
                      onClick={() => stopBot(bot.id)}
                      variant="destructive"
                      className="flex-1"
                      size="sm"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      توقف
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-right">
          <strong>توجه:</strong> ربات‌های معاملاتی به صورت خودکار و بدون نظارت اجرا می‌شوند.
          لطفاً استراتژی‌ها را با دقت تنظیم کرده و ریسک‌های معاملاتی را در نظر بگیرید.
        </AlertDescription>
      </Alert>
    </div>
  )
}

export default TradingBotManager