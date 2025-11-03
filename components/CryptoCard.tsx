import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { CryptoPrice } from '@/types/crypto';
import { toPersianNumbers } from '@/lib/utils';

interface CryptoCardProps {
  crypto: CryptoPrice;
  previousPrice?: number;
}

const CryptoCard = ({ crypto, previousPrice }: CryptoCardProps) => {
  const priceChange = previousPrice ? crypto.price - previousPrice : 0;
  const priceChangePercent = previousPrice ? ((priceChange / previousPrice) * 100) : 0;
  const isPositive = priceChange >= 0;

  const isTMN = crypto.symbol.endsWith('TMN');

  const formatPrice = (price: number) => {
    let formatted: string;
    if (price < 1) {
      formatted = price.toFixed(6);
    } else if (price < 100) {
      formatted = price.toFixed(2);
    } else {
      formatted = price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    if (isTMN) {
      return toPersianNumbers(formatted) + ' تومان';
    } else {
      return '$' + formatted;
    }
  };

  const isLoading = crypto.price === 0;

  return (
    <Card className="persian-card hover:scale-105 transition-all duration-300 group cursor-pointer" dir="rtl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${isPositive
                ? 'bg-gradient-to-br from-green-400 to-green-600 group-hover:from-green-500 group-hover:to-green-700'
                : 'bg-gradient-to-br from-red-400 to-red-600 group-hover:from-red-500 group-hover:to-red-700'
              }`}>
              <span className="text-white font-bold text-lg">
                {crypto.symbol.slice(0, 2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">{crypto.symbol}</span>
              <div className="text-sm text-gray-600 persian-spacing">ارز دیجیتال</div>
            </div>
          </div>
          {previousPrice && !isLoading && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-md transition-all duration-200 ${isPositive
                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
               <span className="text-sm font-bold  ">
                 {isPositive ? '+' : ''}{isTMN ? toPersianNumbers(priceChangePercent.toFixed(2)) : priceChangePercent.toFixed(2)}%
               </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-right">
          <div className="text-center">
            <div className="text-4xl font-bold   mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                formatPrice(crypto.price)
              )}
            </div>
            {previousPrice && !isLoading && (
              <div className={`text-lg font-medium   ${isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                {isPositive ? '+' : ''}{formatPrice(Math.abs(priceChange))}
                <span className="text-sm mr-2 text-gray-600">تغییر</span>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">۲۴ ساعت</div>
               <div className={`text-sm font-bold   ${isPositive ? 'text-green-600' : 'text-red-600'
                 }`}>
                 {isPositive ? '+' : ''}{isTMN ? toPersianNumbers(priceChangePercent.toFixed(2)) : priceChangePercent.toFixed(2)}%
               </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">وضعیت</div>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isPositive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPositive ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                {isPositive ? 'صعودی' : 'نزولی'}
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <div className="text-xs text-gray-500 persian-spacing">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  اتصال به سرور...
                </span>
              ) : (
                `به‌روزرسانی: ${new Date(crypto.timestamp).toLocaleTimeString('fa-IR')}`
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CryptoCard;