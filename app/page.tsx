'use client'

import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { useTradingBot } from '@/hooks/useTradingBot';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Loader2, Bot, Activity, Target, FileText, BarChart3, Brain, LogOut, User, Settings } from 'lucide-react';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { AIConfig } from '@/services/aiService';
import { TradingStrategy, DEFAULT_STRATEGIES } from '@/types/trading';
import { ExchangeConfig, OrderBook } from '@/types/exchange';
import { getPersianGreeting, formatPersianDateTime, toPersianNumbers } from '@/lib/utils';

// Lazy load heavy components for better performance
const CryptoCard = lazy(() => import('@/components/CryptoCard'));
const CryptoChart = lazy(() => import('@/components/CryptoChart'));
const TradingDashboard = lazy(() => import('@/components/TradingDashboard'));
const AIConfigPanel = lazy(() => import('@/components/AIConfigPanel'));
const ExchangeConfigPanel = lazy(() => import('@/components/ExchangeConfigPanel'));
const StrategySelector = lazy(() => import('@/components/StrategySelector'));
const TradingReports = lazy(() => import('@/components/TradingReports'));
const TradingBotManager = lazy(() => import('@/components/TradingBotManager'));

export default function Home() {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const [exchangeConfig, setExchangeConfig] = useState<ExchangeConfig>({
    type: 'wallex',
    mode: 'demo',
  });
  const { prices, priceHistory, isLoading, error, isConnected, updateWallexApiKey } = useCryptoPrices();
  const [isBotEnabled, setIsBotEnabled] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-3.5-turbo'
  });
  const [strategy, setStrategy] = useState<TradingStrategy>(DEFAULT_STRATEGIES.moderate);
  const [initialBalance, setInitialBalance] = useState<number>(10000);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const { portfolio, decisions, aiReports, isAnalyzing, resetPortfolio, getRiskMetrics } = useTradingBot(
    prices,
    priceHistory,
    isBotEnabled,
    aiConfig,
    strategy,
    initialBalance
  );

  // Load initial data from localStorage after mount
  useEffect(() => {
    const savedExchangeConfig = localStorage.getItem('trading-exchange-config');
    if (savedExchangeConfig) {
      try {
        setExchangeConfig(JSON.parse(savedExchangeConfig));
      } catch (error) {
        console.error('Error parsing saved exchange config:', error);
      }
    }

    const savedInitialCash = localStorage.getItem('trading-initial-cash');
    if (savedInitialCash) {
      setInitialBalance(Number(savedInitialCash));
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleBalanceChange = (newBalance: number) => {
    setInitialBalance(newBalance);
    localStorage.setItem('trading-initial-cash', newBalance.toString());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-xl text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const cryptoSymbols = prices ? Object.keys(prices.prices) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-2 sm:p-3 md:p-4 lg:p-6" dir="rtl">
      <div className="max-w-[1600px] mx-auto">
        {/* Compact Header */}
        <div className="mb-4 sm:mb-6 persian-fade-in">
          <div className="persian-card p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="text-right flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="text-sm text-gray-500 text-center sm:text-right">
                    {getPersianGreeting()}! 👋
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1 text-green-600">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      <span>آنلاین</span>
                    </div>
                    <span>بروزرسانی: {new Date().toLocaleTimeString('fa-IR')}</span>
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg shadow-md self-center sm:self-auto">
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <span className="text-center sm:text-right">ربات معاملاتی هوش مصنوعی</span>
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-gray-600 text-sm sm:text-base persian-spacing">معامله خودکار ارزهای دیجیتال با تحلیل پیشرفته هوش مصنوعی</p>
                  <div className="text-xs text-gray-500 italic text-center sm:text-right">
                    "صبوری کلید موفقیت است" - حکیم سعدی
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 lg:flex-col lg:gap-1 lg:items-end">
                <div className="text-center lg:text-right">
                  <div className="text-lg sm:text-xl font-bold text-gray-900">
                    ${formatCurrency(portfolio.totalValue)}
                  </div>
                  <div className="text-xs text-gray-600">ارزش پرتفوی</div>
                </div>
                <div className="flex gap-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${portfolio.totalReturn >= 0
                      ? 'persian-badge-success'
                      : 'persian-badge-danger'
                    }`}>
                    {portfolio.totalReturn >= 0 ? '+' : ''}{portfolio.totalReturn.toFixed(0)}%
                  </div>
                  <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {portfolio.positions.length} پوزیشن
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name} />
                        <AvatarFallback>
                          {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium text-right">
                          {user?.user_metadata?.full_name || 'کاربر'}
                        </p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground text-right">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => { signOut(); router.push('/login'); }} className="text-right">
                      <LogOut className="w-4 h-4 mr-2" />
                      خروج
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation */}
        <Tabs defaultValue="trading" className="space-y-4 sm:space-y-6">
          <div className="flex justify-center px-2 sm:px-0">
            <TabsList className="tabs-list flex flex-nowrap gap-2 w-full max-w-5xl bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-1 shadow-lg overflow-x-auto overflow-y-hidden min-h-[48px]">
              <TabsTrigger
                value="trading"
                className="tab-trigger rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>معاملات</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="exchange"
                className="tab-trigger rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>صرافی</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="strategy"
                className="tab-trigger rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>استراتژی</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="tab-trigger rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>گزارشات</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="market"
                className="tab-trigger rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>بازار</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="config"
                className="tab-trigger rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>تنظیمات AI</span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="bots"
                className="tab-trigger rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-200 text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>ربات‌ها</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="trading">
            <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
              <TradingDashboard
                portfolio={portfolio}
                decisions={decisions}
                aiReports={aiReports}
                orderBook={orderBook}
                selectedSymbol={selectedSymbol}
                prices={prices}
                isEnabled={isBotEnabled}
                isAnalyzing={isAnalyzing}
                onToggle={setIsBotEnabled}
                onReset={resetPortfolio}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="exchange">
            <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
              <ExchangeConfigPanel
                config={exchangeConfig}
                onChange={setExchangeConfig}
                initialBalance={initialBalance}
                onBalanceChange={handleBalanceChange}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="strategy">
            <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
              <StrategySelector strategy={strategy} onChange={setStrategy} />
            </Suspense>
          </TabsContent>

          <TabsContent value="reports">
            <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
              <TradingReports
                portfolio={portfolio}
                aiReports={aiReports}
                riskMetrics={getRiskMetrics()}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="market" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {prices && cryptoSymbols.map((symbol) => {
                const crypto = prices.prices[symbol];
                const history = priceHistory[symbol] || [];
                const previousPrice = history.length > 1 ? history[history.length - 2].price : undefined;

                return (
                  <Suspense key={symbol} fallback={<div className="h-32 bg-gray-100 rounded-lg animate-pulse" />}>
                    <CryptoCard
                      crypto={crypto}
                      previousPrice={previousPrice}
                    />
                  </Suspense>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {cryptoSymbols.map((symbol) => {
                const history = priceHistory[symbol] || [];
                if (history.length < 2) return null;

                return (
                  <Suspense key={symbol} fallback={<div className="h-64 bg-gray-100 rounded-lg animate-pulse" />}>
                    <CryptoChart
                      symbol={symbol}
                      data={history}
                    />
                  </Suspense>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="config">
            <div className="max-w-2xl">
              <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
                <AIConfigPanel config={aiConfig} onChange={setAiConfig} />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="bots">
            <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
              <TradingBotManager />
            </Suspense>
          </TabsContent>
        </Tabs>

        <MadeWithDyad />
      </div>
    </div>
  );
}