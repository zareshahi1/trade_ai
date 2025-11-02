import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Portfolio } from '@/types/trading';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Clock,
  BarChart3,
  Target,
  AlertCircle
} from 'lucide-react';

interface TradingReportsProps {
  portfolio: Portfolio;
  aiReports: Array<{
    timestamp: number;
    symbol: string;
    analysis: string;
    chainOfThought: string;
    decision: string;
    confidence: number;
  }>;
  riskMetrics?: {
    var95: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
  };
}

const TradingReports = ({ portfolio, aiReports, riskMetrics }: TradingReportsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Calculate statistics
  const totalTrades = portfolio.trades.length;
  const buyTrades = portfolio.trades.filter(t => t.type === 'BUY').length;
  const sellTrades = portfolio.trades.filter(t => t.type === 'SELL').length;
  const totalPnL = portfolio.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const winningTrades = portfolio.trades.filter(t => {
    if (t.type === 'SELL') {
      const buyTrade = portfolio.trades.find(bt =>
        bt.symbol === t.symbol &&
        bt.type === 'BUY' &&
        bt.timestamp < t.timestamp
      );
      if (buyTrade) {
        return t.price > buyTrade.price;
      }
    }
    return false;
  }).length;

  const winRate = sellTrades > 0 ? (winningTrades / sellTrades) * 100 : 0;

  // Group trades by symbol
  const tradesBySymbol = portfolio.trades.reduce((acc, trade) => {
    if (!acc[trade.symbol]) {
      acc[trade.symbol] = [];
    }
    acc[trade.symbol].push(trade);
    return acc;
  }, {} as Record<string, typeof portfolio.trades>);

  return (
    <div className="space-y-6 persian-fade-in" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="persian-card hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-3 text-right">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900">کل معاملات</div>
                <div className="text-xs text-gray-600">آمار کلی</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-3xl font-bold   text-blue-700 mb-2">{totalTrades}</div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span>{buyTrades}</span>
              </div>
              <div className="flex items-center gap-1 text-red-600">
                <TrendingDown className="w-3 h-3" />
                <span>{sellTrades}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="persian-card hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-3 text-right">
              <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900">نرخ موفقیت</div>
                <div className="text-xs text-gray-600">درصد برد</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-3xl font-bold   text-green-700 mb-2">
              {winRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              {winningTrades} معامله سودده از {sellTrades} فروش
            </div>
            <div className="w-full bg-green-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${winRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="persian-card hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-3 text-right">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900">سود/زیان</div>
                <div className="text-xs text-gray-600">P&L کل</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-right">
            <div className={`text-3xl font-bold   mb-2 ${totalPnL >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
              ${formatCurrency(totalPnL)}
            </div>
            <div className="text-sm text-gray-600">
              از پوزیشن‌های باز
            </div>
            <div className={`w-full rounded-full h-2 mt-2 ${totalPnL >= 0 ? 'bg-green-200' : 'bg-red-200'
              }`}>
              <div
                className={`h-2 rounded-full transition-all duration-500 ${totalPnL >= 0 ? 'bg-green-600' : 'bg-red-600'
                  }`}
                style={{ width: `${Math.min(Math.abs(totalPnL) / 1000 * 100, 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="persian-card hover:scale-105 transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-3 text-right">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-900">بازدهی کل</div>
                <div className="text-xs text-gray-600">عملکرد پرتفوی</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-right">
            <div className={`text-3xl font-bold   mb-2 ${portfolio.totalReturn >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
              {formatPercent(portfolio.totalReturn)}
            </div>
            <div className="text-sm text-gray-600">
              ارزش: ${formatCurrency(portfolio.totalValue)}
            </div>
            <div className={`w-full rounded-full h-2 mt-2 ${portfolio.totalReturn >= 0 ? 'bg-green-200' : 'bg-red-200'
              }`}>
              <div
                className={`h-2 rounded-full transition-all duration-500 ${portfolio.totalReturn >= 0 ? 'bg-green-600' : 'bg-red-600'
                  }`}
                style={{ width: `${Math.min(Math.abs(portfolio.totalReturn), 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Management Metrics */}
      {riskMetrics && (
        <Card className="persian-card">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-right">
              <div className="p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">معیارهای مدیریت ریسک</h3>
                <p className="text-sm text-gray-600 persian-spacing">ارزیابی ریسک و عملکرد</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200/50 hover:shadow-lg transition-all duration-300">
                <div className="text-3xl font-bold text-red-700   mb-2">
                  ${formatCurrency(riskMetrics.var95)}
                </div>
                <div className="text-sm font-medium text-red-600 mb-1">
                  VaR 95% (یک روزه)
                </div>
                <div className="text-xs text-gray-600 persian-spacing">
                  حداکثر زیان احتمالی
                </div>
                <div className="w-full bg-red-200 rounded-full h-1 mt-3">
                  <div className="bg-red-600 h-1 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className={`text-center p-6 rounded-2xl border hover:shadow-lg transition-all duration-300 ${riskMetrics.sharpeRatio >= 1
                  ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200/50'
                  : riskMetrics.sharpeRatio >= 0
                    ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200/50'
                    : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200/50'
                }`}>
                <div className={`text-3xl font-bold   mb-2 ${riskMetrics.sharpeRatio >= 1 ? 'text-green-700' :
                    riskMetrics.sharpeRatio >= 0 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                  {riskMetrics.sharpeRatio.toFixed(2)}
                </div>
                <div className={`text-sm font-medium mb-1 ${riskMetrics.sharpeRatio >= 1 ? 'text-green-600' :
                    riskMetrics.sharpeRatio >= 0 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  نسبت شارپ
                </div>
                <div className="text-xs text-gray-600 persian-spacing">
                  بازدهی به ازای ریسک
                </div>
                <div className={`w-full rounded-full h-1 mt-3 ${riskMetrics.sharpeRatio >= 1 ? 'bg-green-200' :
                    riskMetrics.sharpeRatio >= 0 ? 'bg-yellow-200' : 'bg-red-200'
                  }`}>
                  <div className={`h-1 rounded-full ${riskMetrics.sharpeRatio >= 1 ? 'bg-green-600' :
                      riskMetrics.sharpeRatio >= 0 ? 'bg-yellow-600' : 'bg-red-600'
                    }`} style={{ width: `${Math.min(Math.abs(riskMetrics.sharpeRatio) * 20, 100)}%` }}></div>
                </div>
              </div>

              <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200/50 hover:shadow-lg transition-all duration-300">
                <div className="text-3xl font-bold text-red-700   mb-2">
                  {riskMetrics.maxDrawdown.toFixed(2)}%
                </div>
                <div className="text-sm font-medium text-red-600 mb-1">
                  حداکثر افت
                </div>
                <div className="text-xs text-gray-600 persian-spacing">
                  بزرگترین کاهش ارزش
                </div>
                <div className="w-full bg-red-200 rounded-full h-1 mt-3">
                  <div className="bg-red-600 h-1 rounded-full" style={{ width: `${riskMetrics.maxDrawdown}%` }}></div>
                </div>
              </div>

              <div className={`text-center p-6 rounded-2xl border hover:shadow-lg transition-all duration-300 ${riskMetrics.winRate >= 50
                  ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200/50'
                  : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200/50'
                }`}>
                <div className={`text-3xl font-bold   mb-2 ${riskMetrics.winRate >= 50 ? 'text-green-700' : 'text-red-700'
                  }`}>
                  {riskMetrics.winRate.toFixed(1)}%
                </div>
                <div className={`text-sm font-medium mb-1 ${riskMetrics.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  نرخ برد
                </div>
                <div className="text-xs text-gray-600 persian-spacing">
                  معاملات موفق
                </div>
                <div className={`w-full rounded-full h-1 mt-3 ${riskMetrics.winRate >= 50 ? 'bg-green-200' : 'bg-red-200'
                  }`}>
                  <div className={`h-1 rounded-full ${riskMetrics.winRate >= 50 ? 'bg-green-600' : 'bg-red-600'
                    }`} style={{ width: `${riskMetrics.winRate}%` }}></div>
                </div>
              </div>

              <div className={`text-center p-6 rounded-2xl border hover:shadow-lg transition-all duration-300 ${riskMetrics.profitFactor >= 1.5
                  ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200/50'
                  : riskMetrics.profitFactor >= 1
                    ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200/50'
                    : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200/50'
                }`}>
                <div className={`text-3xl font-bold   mb-2 ${riskMetrics.profitFactor >= 1.5 ? 'text-green-700' :
                    riskMetrics.profitFactor >= 1 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                  {riskMetrics.profitFactor === Infinity ? '∞' : riskMetrics.profitFactor.toFixed(2)}
                </div>
                <div className={`text-sm font-medium mb-1 ${riskMetrics.profitFactor >= 1.5 ? 'text-green-600' :
                    riskMetrics.profitFactor >= 1 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                  فاکتور سود
                </div>
                <div className="text-xs text-gray-600 persian-spacing">
                  سود به ازای زیان
                </div>
                <div className={`w-full rounded-full h-1 mt-3 ${riskMetrics.profitFactor >= 1.5 ? 'bg-green-200' :
                    riskMetrics.profitFactor >= 1 ? 'bg-yellow-200' : 'bg-red-200'
                  }`}>
                  <div className={`h-1 rounded-full ${riskMetrics.profitFactor >= 1.5 ? 'bg-green-600' :
                      riskMetrics.profitFactor >= 1 ? 'bg-yellow-600' : 'bg-red-600'
                    }`} style={{ width: `${Math.min(riskMetrics.profitFactor * 20, 100)}%` }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trade History by Symbol */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-right">
              <Activity className="w-5 h-5" />
              تاریخچه معاملات به تفکیک ارز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {Object.entries(tradesBySymbol).map(([symbol, trades]) => (
                  <div key={symbol} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{symbol}</h3>
                      <Badge variant="outline">{trades.length} معامله</Badge>
                    </div>
                    <div className="space-y-2">
                      {trades.slice(0, 5).map((trade) => (
                        <div key={trade.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                          <div className="flex items-center gap-2">
                            {trade.type === 'BUY' ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <span className="font-medium">{trade.type === 'BUY' ? 'خرید' : 'فروش'}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${formatCurrency(trade.price)}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(trade.timestamp).toLocaleTimeString('fa-IR')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* AI Analysis Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-right">
              <Clock className="w-5 h-5" />
              تایم‌لاین تحلیل‌های هوش مصنوعی
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {aiReports.map((report, index) => (
                  <div key={index} className="border-r-4 border-blue-500 pr-4 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-right">
                        <h4 className="font-bold text-sm">{report.symbol}</h4>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(report.timestamp)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          report.decision === 'BUY' ? 'default' :
                            report.decision === 'SELL' ? 'destructive' :
                              'secondary'
                        }
                      >
                        {report.decision === 'BUY' ? 'خرید' : report.decision === 'SELL' ? 'فروش' : 'نگهداری'}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-right">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">تحلیل:</p>
                        <p className="text-sm">{report.analysis}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">فرآیند تفکر:</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {report.chainOfThought}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          اطمینان: {(report.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Current Positions Detail */}
      {portfolio.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-right">
              <BarChart3 className="w-5 h-5" />
              جزئیات پوزیشن‌های باز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolio.positions.map((position, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg">{position.symbol}</h3>
                    <Badge variant={position.unrealizedPnl >= 0 ? 'default' : 'destructive'}>
                      {position.unrealizedPnl >= 0 ? 'سودده' : 'زیان‌ده'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-right">
                      <p className="text-muted-foreground">مقدار</p>
                      <p className="font-medium">{position.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">قیمت ورود</p>
                      <p className="font-medium">${formatCurrency(position.entryPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">قیمت فعلی</p>
                      <p className="font-medium">${formatCurrency(position.currentPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">سود/زیان</p>
                      <p className={`font-bold ${position.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${formatCurrency(position.unrealizedPnl)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                    {position.stopLoss && (
                      <div className="text-right">
                        <p className="text-muted-foreground">حد ضرر</p>
                        <p className="font-medium text-red-600">${formatCurrency(position.stopLoss)}</p>
                      </div>
                    )}
                    {position.takeProfit && (
                      <div className="text-right">
                        <p className="text-muted-foreground">حد سود</p>
                        <p className="font-medium text-green-600">${formatCurrency(position.takeProfit)}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground text-right">
                    زمان ورود: {formatDate(position.entryTime)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TradingReports;