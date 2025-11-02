import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderBook as OrderBookType } from '@/types/exchange';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface OrderBookProps {
  orderBook: OrderBookType | null;
  symbol: string;
  currentPrice?: number;
}

const OrderBook = ({ orderBook, symbol, currentPrice }: OrderBookProps) => {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!orderBook) {
    return (
      <Card className="persian-card" dir="rtl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-right">
            <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">عمق بازار</h3>
              <p className="text-sm text-gray-600 persian-spacing">{symbol}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">در حال بارگذاری...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxBidTotal = Math.max(...orderBook.bids.map(b => b.total));
  const maxAskTotal = Math.max(...orderBook.asks.map(a => a.total));
  const maxTotal = Math.max(maxBidTotal, maxAskTotal);

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-right">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            عمق بازار - {symbol}
          </div>
          {currentPrice && (
            <Badge variant="outline" className="font-mono">
              ${formatPrice(currentPrice)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 gap-0 h-64">
          {/* Asks (Sell Orders) - Left side in RTL */}
          <div className="border-l border-gray-200">
            <div className="p-2 border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100">
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                <TrendingDown className="w-3 h-3" />
                پیشنهاد فروش
              </div>
            </div>
            <ScrollArea className="h-52">
              <div className="space-y-0">
                {orderBook.asks.map((ask, index) => {
                  const percentage = (ask.total / maxTotal) * 100;
                  return (
                    <div
                      key={index}
                      className="relative p-2 border-b border-red-100 hover:bg-red-50/30 transition-colors"
                    >
                      <div
                        className="absolute inset-0 bg-red-100/20"
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative flex justify-between items-center text-sm">
                        <div className="text-right">
                          <div className="font-mono text-muted-foreground">
                            ${formatNumber(ask.total)}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="font-mono text-red-700 font-medium">
                            ${formatPrice(ask.price)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(ask.quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Bids (Buy Orders) - Right side in RTL */}
          <div>
            <div className="p-2 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
              <div className="flex items-center gap-2 text-green-800 font-bold text-sm">
                <TrendingUp className="w-3 h-3" />
                پیشنهاد خرید
              </div>
            </div>
            <ScrollArea className="h-52">
              <div className="space-y-0">
                {orderBook.bids.map((bid, index) => {
                  const percentage = (bid.total / maxTotal) * 100;
                  return (
                    <div
                      key={index}
                      className="relative p-2 border-b border-green-100 hover:bg-green-50/30 transition-colors"
                    >
                      <div
                        className="absolute inset-0 bg-green-100/20"
                        style={{ width: `${percentage}%` }}
                      />
                      <div className="relative flex justify-between items-center text-sm">
                        <div className="text-right">
                          <div className="font-mono text-muted-foreground">
                            ${formatNumber(bid.total)}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="font-mono text-green-700 font-medium">
                            ${formatPrice(bid.price)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(bid.quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Spread Information */}
        {orderBook.bids.length > 0 && orderBook.asks.length > 0 && (
          <div className="p-2 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">آخرین بروزرسانی</div>
                <div className="text-sm font-medium text-gray-900 persian-spacing">
                  {new Date(orderBook.lastUpdate).toLocaleTimeString('fa-IR')}
                </div>
              </div>
              <div className="text-left">
                <div className="text-sm text-gray-600 mb-1">اسپرد فعلی</div>
                <div className="flex items-center gap-2 justify-end">
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${(orderBook.asks[0].price - orderBook.bids[0].price) / orderBook.bids[0].price * 100 < 0.1
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {((orderBook.asks[0].price - orderBook.bids[0].price) / orderBook.bids[0].price * 100).toFixed(3)}%
                  </span>
                  <span className="font-mono font-bold text-lg  ">
                    ${formatPrice(orderBook.asks[0].price - orderBook.bids[0].price)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderBook;