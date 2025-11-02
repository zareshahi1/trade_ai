import { useState, useEffect, useCallback } from 'react';
import { CryptoPricesResponse, PriceHistory } from '@/types/crypto';

const API_URL = 'https://api.binance.com/api/v3/ticker/price';
const FETCH_INTERVAL = 5000; // 5 seconds
const MAX_HISTORY_POINTS = 100; // Keep last 100 data points
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'];

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<CryptoPricesResponse | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceHistory[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    const symbolsParam = SYMBOLS.map(s => `"${s}"`).join(',');
    const response = await fetch(`${API_URL}?symbols=[${symbolsParam}]`);
    if (!response.ok) {
      throw new Error('Failed to fetch crypto prices');
    }
    const data = await response.json();

    // Transform Binance response to expected format
    const prices: { [key: string]: CryptoPrice } = {};
    data.forEach((item: any) => {
      const symbol = item.symbol.replace('USDT', ''); // Remove USDT suffix
      prices[symbol] = {
        symbol,
        price: parseFloat(item.price),
        timestamp: Date.now(),
      };
    });

    const transformedData: CryptoPricesResponse = {
      prices,
      serverTime: Date.now(),
    };

    return transformedData;
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updatePrices = async () => {
      const data = await fetchPrices();
      setPrices(data);
      setIsLoading(false);
      setError(null);

      // Update price history for each crypto
      setPriceHistory((prev) => {
        const updated = { ...prev };
        
        Object.entries(data.prices).forEach(([symbol, priceData]) => {
          if (!updated[symbol]) {
            updated[symbol] = [];
          }
          
          updated[symbol] = [
            ...updated[symbol],
            {
              timestamp: priceData.timestamp,
              price: priceData.price,
            },
          ].slice(-MAX_HISTORY_POINTS); // Keep only last MAX_HISTORY_POINTS
        });
        
        return updated;
      });
    };

    // Initial fetch
    updatePrices().catch((err) => {
      setError(err.message);
      setIsLoading(false);
    });

    // Set up interval for live updates
    intervalId = setInterval(() => {
      updatePrices().catch((err) => {
        setError(err.message);
      });
    }, FETCH_INTERVAL);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchPrices]);

  return { prices, priceHistory, isLoading, error };
};