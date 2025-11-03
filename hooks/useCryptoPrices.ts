import { useState, useEffect, useCallback, useRef } from 'react';
import { CryptoPricesResponse, CryptoPrice, PriceHistory } from '@/types/crypto';

const WS_URL = 'wss://api.wallex.ir/ws';
const MAX_HISTORY_POINTS = 100;
const RECONNECT_INTERVAL = 5000; // 5 seconds
const SYMBOLS = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'XRP', 'LTC', 'DOGE', 'AVAX', 'MATIC', 'LINK', 'UNI', 'ALGO', 'VET'];

export const useCryptoPrices = (isAuthenticated: boolean = true) => {
  const [prices, setPrices] = useState<CryptoPricesResponse | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceHistory[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || !isAuthenticated) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        setIsLoading(false);

        // Send subscribe message
        ws.send(JSON.stringify(["subscribe", { "channel": "all@price" }]));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (Array.isArray(message) && message.length >= 2) {
            const [channel, data] = message;

            if (channel === "all@price" && data.symbol && data.price) {
              const symbol = data.symbol.replace('USDT', '');

              if (SYMBOLS.includes(symbol)) {
                setPrices((prevPrices) => {
                  const currentPrices = prevPrices?.prices || {};
                  const newPrices = { ...currentPrices };

                  newPrices[symbol] = {
                    symbol,
                    price: parseFloat(data.price),
                    timestamp: Date.now(),
                  };

                  return {
                    prices: newPrices,
                    serverTime: Date.now(),
                  };
                });

                // Update price history
                setPriceHistory((prev) => {
                  const updated = { ...prev };

                  if (!updated[symbol]) {
                    updated[symbol] = [];
                  }

                  updated[symbol] = [
                    ...updated[symbol],
                    {
                      timestamp: Date.now(),
                      price: parseFloat(data.price),
                    },
                  ].slice(-MAX_HISTORY_POINTS);

                  return updated;
                });
              }
            }
          }
        } catch (err) {
          // Silent
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        // Attempt to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, RECONNECT_INTERVAL);
      };

      ws.onerror = (error) => {
        setError('WebSocket connection error');
        setIsLoading(false);
      };

    } catch (err) {
      setError('Failed to connect to WebSocket');
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

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

  // WebSocket connection management
  useEffect(() => {
    if (isAuthenticated) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket, isAuthenticated]);

  return { prices, priceHistory, isLoading, error, isConnected };
};