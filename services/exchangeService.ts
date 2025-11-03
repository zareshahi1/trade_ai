import { ExchangeConfig, ExchangeBalance, ExchangeOrder, ExchangePosition, OrderBook } from '@/types/exchange';

export class ExchangeService {
  private config: ExchangeConfig;
  private baseUrl: string = '';

  constructor(config: ExchangeConfig) {
    this.config = config;
    this.setBaseUrl();
  }

  private setBaseUrl() {
    if (this.config.mode === 'demo') {
      // در حالت دمو از API واقعی استفاده نمی‌کنیم
      return;
    }

    // Check if we're in development (using Vite proxy) or production
    const isDevelopment = process.env.NODE_ENV === 'development';

    switch (this.config.type) {
      case 'binance':
        this.baseUrl = this.config.credentials?.testnet
          ? 'https://testnet.binance.vision/api'
          : 'https://api.binance.com/api';
        break;
      case 'bybit':
        this.baseUrl = this.config.credentials?.testnet
          ? 'https://api-testnet.bybit.com'
          : 'https://api.bybit.com';
        break;
      case 'okx':
        this.baseUrl = this.config.credentials?.testnet
          ? 'https://www.okx.com'
          : 'https://www.okx.com';
        break;
      case 'kucoin':
        this.baseUrl = this.config.credentials?.testnet
          ? 'https://openapi-sandbox.kucoin.com'
          : 'https://api.kucoin.com';
        break;
      case 'wallex':
        // Use proxy in development, direct API in production with CORS handling
        this.baseUrl = isDevelopment ? '/api/wallex' : 'https://api.wallex.ir';
        break;
    }
  }

  async getBalances(): Promise<ExchangeBalance[]> {
    if (this.config.mode === 'demo') {
      // در حالت دمو، موجودی مجازی برمی‌گردانیم
      return [
        { asset: 'USDT', free: 10000, locked: 0, total: 10000 },
        { asset: 'BTC', free: 0, locked: 0, total: 0 },
        { asset: 'ETH', free: 0, locked: 0, total: 0 },
      ];
    }

    if (this.config.type === 'wallex') {
      if (!this.config.wallexApiKey) {
        throw new Error('کلید API والکس تنظیم نشده است');
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': this.config.wallexApiKey,
        };

        // For sub-account (trade credit), add client-id header
        if (this.config.credentials?.apiKey && this.config.credentials.apiKey !== this.config.wallexApiKey) {
          // This indicates we're using a sub-account
          // In a real implementation, you'd need to get the sub-account-client-id
          // For now, we'll assume main account
        }

        // Try different possible endpoints for balances
        let response;
        let data;

        // Try main account wallet endpoint
        try {
          response = await fetch(`${this.baseUrl}/v1/account/wallet`, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            // Try alternative endpoint
            response = await fetch(`${this.baseUrl}/v1/account/balances`, {
              method: 'GET',
              headers,
            });
          }

          if (!response.ok) {
            if (response.status === 0) {
              throw new Error('CORS error: Unable to access Wallex API. This may be due to browser security restrictions. Please try using the app in development mode or check if your browser blocks cross-origin requests.');
            }
            throw new Error(`Wallex API error: ${response.status} ${response.statusText}`);
          }

          data = await response.json();

          if (!data.success) {
            throw new Error(`Wallex API error: ${data.message}`);
          }
        } catch (apiError) {
          console.warn('Primary balance endpoint failed, trying fallback:', apiError);
          // For now, return mock data if API fails
          return [
            { asset: 'USDT', free: 10000, locked: 0, total: 10000 },
            { asset: 'BTC', free: 0, locked: 0, total: 0 },
            { asset: 'ETH', free: 0, locked: 0, total: 0 },
          ];
        }

        // Transform Wallex balance response to our format
        const balances: ExchangeBalance[] = [];
        if (data.result) {
          // Handle different possible response formats
          const balanceData = data.result.balances || data.result.wallet || data.result;

          if (Array.isArray(balanceData)) {
            balanceData.forEach((balance: any) => {
              balances.push({
                asset: balance.asset || balance.symbol,
                free: parseFloat(balance.free || balance.available || '0'),
                locked: parseFloat(balance.locked || balance.frozen || '0'),
                total: parseFloat(balance.total || '0'),
              });
            });
          } else if (typeof balanceData === 'object') {
            Object.entries(balanceData).forEach(([asset, balance]: [string, any]) => {
              balances.push({
                asset,
                free: parseFloat(balance.free || balance.available || '0'),
                locked: parseFloat(balance.locked || balance.frozen || '0'),
                total: parseFloat(balance.total || '0'),
              });
            });
          }
        }

        return balances;
      } catch (error) {
        console.error('Error fetching Wallex balances:', error);
        throw new Error(`خطا در دریافت موجودی والکس: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // For other exchanges, throw error as they're not implemented
    throw new Error(`صرافی ${this.config.type} هنوز پیاده‌سازی نشده است`);
  }

  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price?: number,
    type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT' = 'MARKET',
    stopPrice?: number
  ): Promise<ExchangeOrder> {
    if (this.config.mode === 'demo') {
      // در حالت دمو، سفارش مجازی ایجاد می‌کنیم
      return {
        orderId: `DEMO_${Date.now()}`,
        symbol,
        side,
        type,
        quantity,
        price,
        stopPrice,
        status: 'FILLED',
        timestamp: Date.now(),
      };
    }

    if (this.config.type === 'wallex') {
      if (!this.config.wallexApiKey) {
        throw new Error('کلید API والکس تنظیم نشده است');
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': this.config.wallexApiKey,
        };

        // For sub-account (trade credit), add client-id header
        if (this.config.credentials?.apiKey && this.config.credentials.apiKey !== this.config.wallexApiKey) {
          // This indicates we're using a sub-account
          // In a real implementation, you'd need to get the sub-account-client-id
          // For now, we'll assume main account
        }

        const orderData: any = {
          symbol: symbol.toUpperCase(),
          side: side.toUpperCase(),
          type: type === 'MARKET' || type === 'LIMIT' ? type : 'LIMIT', // Wallex may not support all types directly
          quantity: quantity.toString(),
          ...(price && { price: price.toString() }),
          ...(stopPrice && { stopPrice: stopPrice.toString() }),
        };

        // Handle conditional orders
        if (type === 'STOP_LOSS' || type === 'STOP_LOSS_LIMIT') {
          orderData.type = 'STOP_LOSS_LIMIT';
          orderData.stopPrice = stopPrice?.toString();
        } else if (type === 'TAKE_PROFIT' || type === 'TAKE_PROFIT_LIMIT') {
          orderData.type = 'TAKE_PROFIT_LIMIT';
          orderData.stopPrice = stopPrice?.toString();
        }

        const response = await fetch(`${this.baseUrl}/v1/account/orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          if (response.status === 0) {
            throw new Error('CORS error: Unable to access Wallex API. This may be due to browser security restrictions. Please try using the app in development mode or check if your browser blocks cross-origin requests.');
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Wallex API error: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(`Wallex API error: ${data.message}`);
        }

        // Transform Wallex order response to our format
        const result = data.result;
        return {
          orderId: result.clientOrderId || result.orderId,
          symbol: result.symbol,
          side: result.side,
          type: result.type,
          quantity: parseFloat(result.origQty),
          price: result.price ? parseFloat(result.price) : undefined,
          stopPrice: result.stopPrice ? parseFloat(result.stopPrice) : undefined,
          status: result.status,
          timestamp: new Date(result.created_at || result.transactTime).getTime(),
        };
      } catch (error) {
        console.error('Error placing Wallex order:', error);
        throw new Error(`خطا در ثبت سفارش والکس: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // For other exchanges, throw error as they're not implemented
    throw new Error(`صرافی ${this.config.type} هنوز پیاده‌سازی نشده است`);
  }

  async getPositions(): Promise<ExchangePosition[]> {
    if (this.config.mode === 'demo') {
      return [];
    }

    if (this.config.type === 'wallex') {
      // For spot trading, positions are not applicable
      // This would be used for margin/futures trading
      return [];
    }

    // For other exchanges, throw error as they're not implemented
    throw new Error(`صرافی ${this.config.type} هنوز پیاده‌سازی نشده است`);
  }

  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    if (this.config.mode === 'demo') {
      // Return mock order book data
      const basePrice = 50000; // Mock BTC price
      const bids: any[] = [];
      const asks: any[] = [];
      let bidTotal = 0;
      let askTotal = 0;

      for (let i = 0; i < limit; i++) {
        const bidPrice = basePrice - (i + 1) * 10;
        const bidQuantity = Math.random() * 2 + 0.1;
        bidTotal += bidQuantity;
        bids.push({ price: bidPrice, quantity: bidQuantity, total: bidTotal });

        const askPrice = basePrice + (i + 1) * 10;
        const askQuantity = Math.random() * 2 + 0.1;
        askTotal += askQuantity;
        asks.push({ price: askPrice, quantity: askQuantity, total: askTotal });
      }

      return { bids, asks, lastUpdate: Date.now() };
    }

    if (this.config.type === 'wallex') {
      try {
        const response = await fetch(`${this.baseUrl}/v1/markets/orderbook?symbol=${symbol.toUpperCase()}&limit=${limit}`, {
          method: 'GET',
        });

        if (!response.ok) {
          if (response.status === 0) {
            throw new Error('CORS error: Unable to access Wallex API. This may be due to browser security restrictions.');
          }
          throw new Error(`Wallex API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(`Wallex API error: ${data.message}`);
        }

        // Transform Wallex order book response
        const bids: any[] = [];
        const asks: any[] = [];
        let bidTotal = 0;
        let askTotal = 0;

        if (data.result) {
          const orderBookData = data.result;

          // Process bids
          if (orderBookData.bids && Array.isArray(orderBookData.bids)) {
            orderBookData.bids.slice(0, limit).forEach((bid: any) => {
              const quantity = parseFloat(bid[1]);
              bidTotal += quantity;
              bids.push({
                price: parseFloat(bid[0]),
                quantity,
                total: bidTotal
              });
            });
          }

          // Process asks
          if (orderBookData.asks && Array.isArray(orderBookData.asks)) {
            orderBookData.asks.slice(0, limit).forEach((ask: any) => {
              const quantity = parseFloat(ask[1]);
              askTotal += quantity;
              asks.push({
                price: parseFloat(ask[0]),
                quantity,
                total: askTotal
              });
            });
          }
        }

        return { bids, asks, lastUpdate: Date.now() };
      } catch (error) {
        console.error('Error fetching Wallex order book:', error);
        throw new Error(`خطا در دریافت سفارشات باز والکس: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // For other exchanges, throw error as they're not implemented
    throw new Error(`صرافی ${this.config.type} هنوز پیاده‌سازی نشده است`);
  }

  async getOpenOrders(symbol?: string): Promise<ExchangeOrder[]> {
    if (this.config.mode === 'demo') {
      return [];
    }

    if (this.config.type === 'wallex') {
      if (!this.config.wallexApiKey) {
        throw new Error('کلید API والکس تنظیم نشده است');
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': this.config.wallexApiKey,
        };

        const url = symbol
          ? `${this.baseUrl}/v1/account/orders?symbol=${symbol.toUpperCase()}`
          : `${this.baseUrl}/v1/account/orders`;

        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          if (response.status === 0) {
            throw new Error('CORS error: Unable to access Wallex API. This may be due to browser security restrictions. Please try using the app in development mode or check if your browser blocks cross-origin requests.');
          }
          throw new Error(`Wallex API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(`Wallex API error: ${data.message}`);
        }

        // Transform Wallex orders response to our format
        const orders: ExchangeOrder[] = [];
        if (data.result && Array.isArray(data.result)) {
          data.result.forEach((order: any) => {
            orders.push({
              orderId: order.clientOrderId || order.orderId,
              symbol: order.symbol,
              side: order.side,
              type: order.type,
              quantity: parseFloat(order.origQty),
              price: order.price ? parseFloat(order.price) : undefined,
              stopPrice: order.stopPrice ? parseFloat(order.stopPrice) : undefined,
              status: order.status,
              timestamp: new Date(order.created_at || order.transactTime).getTime(),
            });
          });
        }

        return orders;
      } catch (error) {
        console.error('Error fetching Wallex open orders:', error);
        throw new Error(`خطا در دریافت سفارشات باز والکس: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // For other exchanges, throw error as they're not implemented
    throw new Error(`صرافی ${this.config.type} هنوز پیاده‌سازی نشده است`);
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (this.config.mode === 'demo') {
      return true;
    }

    if (this.config.type === 'wallex') {
      if (!this.config.wallexApiKey) {
        throw new Error('کلید API والکس تنظیم نشده است');
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': this.config.wallexApiKey,
        };

        // For sub-account (trade credit), add client-id header
        if (this.config.credentials?.apiKey && this.config.credentials.apiKey !== this.config.wallexApiKey) {
          // This indicates we're using a sub-account
          // In a real implementation, you'd need to get the sub-account-client-id
        }

        const response = await fetch(`${this.baseUrl}/v1/account/orders/${orderId}`, {
          method: 'DELETE',
          headers,
        });

        if (!response.ok) {
          if (response.status === 0) {
            throw new Error('CORS error: Unable to access Wallex API. This may be due to browser security restrictions. Please try using the app in development mode or check if your browser blocks cross-origin requests.');
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Wallex API error: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(`Wallex API error: ${data.message}`);
        }

        return true;
      } catch (error) {
        console.error('Error canceling Wallex order:', error);
        throw new Error(`خطا در لغو سفارش والکس: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // For other exchanges, throw error as they're not implemented
    throw new Error(`صرافی ${this.config.type} هنوز پیاده‌سازی نشده است`);
  }

  isDemo(): boolean {
    return this.config.mode === 'demo';
  }

  getExchangeName(): string {
    const names = {
      binance: 'بایننس',
      bybit: 'بای‌بیت',
      okx: 'او‌کی‌ایکس',
      kucoin: 'کوکوین',
      wallex: 'والکس',
    };
    return names[this.config.type];
  }
}