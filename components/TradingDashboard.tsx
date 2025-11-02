import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Portfolio, AIDecision } from '@/types/trading';
import { OrderBook as OrderBookType } from '@/types/exchange';
import { CryptoPricesResponse } from '@/types/crypto';
import { TrendingUp, TrendingDown, Activity, RotateCcw, FileText, Loader2, Brain } from 'lucide-react';
import OrderBook from './OrderBook';

interface TradingDashboardProps {
  portfolio: Portfolio;
  decisions: AIDecision[];
  aiReports: Array<{
    timestamp: number;
    symbol: string;
    analysis: string;
    chainOfThought: string;
    decision: string;
    confidence: number;
  }>;
  orderBook?: OrderBookType | null;
  selectedSymbol?: string;
  prices?: CryptoPricesResponse | null;
  isEnabled: boolean;
  isAnalyzing: boolean;
  onToggle: (enabled: boolean) => void;
  onReset: () => void;
}

const TradingDashboard = ({
  portfolio,
  decisions,
  aiReports,
  orderBook,
  selectedSymbol,
  prices,
  isEnabled,
  isAnalyzing,
  onToggle,
  onReset
}: TradingDashboardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 persian-slide-up" dir="rtl">
      {/* Left Column - Portfolio & Positions */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        {/* Portfolio Overview */}
        <Card className="persian-card">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">پرتفوی معاملاتی</h3>
                  <p className="text-sm text-gray-600 persian-spacing">نمای کلی دارایی‌ها و عملکرد</p>
                </div>
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={onToggle}
                    className="switch data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-green-600"
                  />
                  <span className="text-sm font-medium">
                    {isEnabled ? 'ربات فعال' : 'ربات غیرفعال'}
                  </span>
                </div>
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">در حال تحلیل...</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReset}
                  className="hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 ml-2" />
                  ریست
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200/50">
                <div className="text-lg sm:text-2xl font-bold text-blue-700   mb-1">
                  ${formatCurrency(portfolio.totalValue)}
                </div>
                <p className="text-xs sm:text-sm text-blue-600 font-medium">ارزش کل</p>
                <div className="w-full bg-blue-200 rounded-full h-1 mt-2">
                  <div className="bg-blue-600 h-1 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200/50">
                <div className="text-lg sm:text-2xl font-bold text-green-700   mb-1">
                  ${formatCurrency(portfolio.cash)}
                </div>
                <p className="text-xs sm:text-sm text-green-600 font-medium">موجودی نقد</p>
                <div className="w-full bg-green-200 rounded-full h-1 mt-2">
                  <div className="bg-green-600 h-1 rounded-full" style={{ width: `${(portfolio.cash / portfolio.totalValue) * 100}%` }}></div>
                </div>
              </div>
              <div className={`text-center p-3 sm:p-4 rounded-2xl border ${portfolio.totalReturn >= 0
                  ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200/50'
                  : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200/50'
                }`}>
                <div className={`text-lg sm:text-2xl font-bold   mb-1 ${portfolio.totalReturn >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                  {formatPercent(portfolio.totalReturn)}
                </div>
                <p className={`text-xs sm:text-sm font-medium ${portfolio.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  بازدهی کل
                </p>
                <div className={`w-full rounded-full h-1 mt-2 ${portfolio.totalReturn >= 0 ? 'bg-green-200' : 'bg-red-200'
                  }`}>
                  <div className={`h-1 rounded-full ${portfolio.totalReturn >= 0 ? 'bg-green-600' : 'bg-red-600'
                    }`} style={{ width: `${Math.min(Math.abs(portfolio.totalReturn), 100)}%` }}></div>
                </div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200/50">
                <div className="text-lg sm:text-2xl font-bold text-purple-700   mb-1">
                  {portfolio.positions.length}
                </div>
                <p className="text-xs sm:text-sm text-purple-600 font-medium">پوزیشن فعال</p>
                <div className="flex justify-center gap-1 mt-2">
                  {Array.from({ length: Math.min(portfolio.positions.length, 3) }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full"></div>
                  ))}
                  {portfolio.positions.length > 3 && (
                    <div className="text-xs text-purple-600 font-medium">
                      +{portfolio.positions.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Positions */}
        {portfolio.positions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-right">پوزیشن‌های باز</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {portfolio.positions.map((position, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="text-right">
                        <p className="font-bold">{position.symbol}</p>
                        <p className="text-xs text-muted-foreground">
                          {position.quantity} @ ${formatCurrency(position.entryPrice)}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className={`font-bold text-sm ${position.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${formatCurrency(position.unrealizedPnl)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${formatCurrency(position.currentPrice)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Recent Trades */}
        {portfolio.trades.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-right">معاملات اخیر</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {portfolio.trades.slice(0, 10).map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {trade.type === 'BUY' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <div className="text-right">
                          <p className="font-bold text-sm">{trade.symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {trade.quantity} @ ${formatCurrency(trade.price)}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">
                          {new Date(trade.timestamp).toLocaleTimeString('fa-IR')}
                        </p>
                        <p className="text-xs">
                          اطمینان: {(trade.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - AI Analysis & Reports */}
      <div className="space-y-6">
        {/* Current AI Decisions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-right">سیگنال‌های هوش مصنوعی</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {decisions.map((decision, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-2 text-right">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{decision.symbol}</span>
                      <Badge
                        variant={
                          decision.action === 'BUY' ? 'default' :
                            decision.action === 'SELL' ? 'destructive' :
                              'secondary'
                        }
                        className="text-xs"
                      >
                        {decision.action === 'BUY' ? 'خرید' : decision.action === 'SELL' ? 'فروش' : 'نگهداری'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{decision.reasoning}</p>
                    <p className="text-xs font-medium text-right">
                      اطمینان: {(decision.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Order Book */}
        {selectedSymbol && (
          <OrderBook
            orderBook={orderBook}
            symbol={selectedSymbol}
            currentPrice={prices?.prices[selectedSymbol]?.price}
          />
        )}

        {/* AI Chain of Thought Reports */}
        <Card className="mt-4 persian-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-right">
              <Brain className="w-4 h-4" />
              گزارش‌های تحلیل هوش مصنوعی
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {aiReports.map((report, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-2 text-right">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{report.symbol}</span>
                      <Badge variant="outline" className="text-xs">
                        {report.decision === 'BUY' ? 'خرید' : report.decision === 'SELL' ? 'فروش' : 'نگهداری'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground text-right">فرآیند تفکر:</p>
                      <p className="text-xs text-muted-foreground leading-relaxed text-right">
                        {report.chainOfThought}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.timestamp).toLocaleString('fa-IR')}
                      </p>
                      <p className="text-xs font-medium">
                        اطمینان: {(report.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TradingDashboard;