import { useState, useEffect, useCallback, useRef } from 'react';
import { CryptoPricesResponse, CryptoPrice, PriceHistory } from '@/types/crypto';

const MAX_HISTORY_POINTS = 100;
const POLL_INTERVAL = 5000; // 5 seconds
const SYMBOLS = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'XRP', 'LTC', 'DOGE', 'AVAX', 'MATIC', 'LINK', 'UNI', 'ALGO', 'VET'];

export const useCryptoPrices = (isAuthenticated: boolean = true) => {
  const [prices, setPrices] = useState<CryptoPricesResponse | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceHistory[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrices = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/crypto-prices');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPrices(data);
      setError(null);
      setIsLoading(false);

      // Update price history
      if (data.prices) {
        setPriceHistory((prev) => {
          const updated = { ...prev };
          data.prices.forEach((priceData: CryptoPrice) => {
            const symbol = priceData.symbol;
            if (!updated[symbol]) {
              updated[symbol] = [];
            }
            updated[symbol] = [
              ...updated[symbol],
              {
                timestamp: priceData.timestamp,
                price: priceData.price,
              },
            ].slice(-MAX_HISTORY_POINTS);
          });
          return updated;
        });
      }
    } catch (err) {
      setError('Failed to fetch prices');
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initialize with empty prices
  useEffect(() => {
    const initialPrices: { [key: string]: CryptoPrice } = {};
    SYMBOLS.forEach(symbol => {
      initialPrices[symbol] = {
        symbol,
        price: 0,
        timestamp: Date.now(),
      };
    });

    setPrices({
      prices: initialPrices,
      serverTime: Date.now(),
    });
  }, []);

  // Polling effect
  useEffect(() => {
    if (isAuthenticated) {
      fetchPrices();
      pollTimeoutRef.current = setInterval(fetchPrices, POLL_INTERVAL);
    } else {
      if (pollTimeoutRef.current) {
        clearInterval(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    }

    return () => {
      if (pollTimeoutRef.current) {
        clearInterval(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [fetchPrices, isAuthenticated]);

  return { prices, priceHistory, isLoading, error, isConnected: true };
};