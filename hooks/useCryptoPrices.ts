import { useState, useEffect, useCallback, useRef } from 'react';
import { CryptoPricesResponse, CryptoPrice, PriceHistory } from '@/types/crypto';

const WS_URL = 'wss://api.wallex.ir/ws';
const WALLEX_API_BASE = 'https://api.wallex.ir';

const HTTP_URL = `${WALLEX_API_BASE}/hector/web/v1/markets`;
const MAX_HISTORY_POINTS = 100; // Keep last 100 data points
const RECONNECT_INTERVAL = 5000; // 5 seconds
const HTTP_POLL_INTERVAL = 300000; // 5 minutes for occasional sync (was 10 seconds)
const SYMBOLS = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT'];

export const useCryptoPrices = () => {
  const [prices, setPrices] = useState<CryptoPricesResponse | null>(null);
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceHistory[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wallexApiKeyRef = useRef<string | undefined>();

  const fetchPricesHTTP = useCallback(async () => {
    try {
      console.log('Fetching prices via HTTP fallback from:', HTTP_URL);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (wallexApiKeyRef.current) {
        headers['x-api-key'] = wallexApiKeyRef.current;
      }

      const response = await fetch(HTTP_URL, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 0) {
          throw new Error('CORS error: Unable to access Wallex API. Please check your browser settings or try using a different browser.');
        }
        throw new Error(`HTTP fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('HTTP response:', data);

      // Parse Wallex HTTP API response
      // The response should contain market data
      if (data && Array.isArray(data)) {
        setPrices((prevPrices) => {
          const currentPrices = prevPrices?.prices || {};
          const newPrices = { ...currentPrices };

          data.forEach((market: any) => {
            // Try different field names for symbol
            const symbol = market.symbol?.replace('USDT', '') ||
                          market.coin?.replace('USDT', '') ||
                          market.name?.replace('USDT', '');
            // Try different field names for price
            const price = market.price || market.lastPrice || market.close;

            if (symbol && SYMBOLS.includes(symbol) && price) {
              newPrices[symbol] = {
                symbol,
                price: parseFloat(price),
                timestamp: Date.now(),
              };
            }
          });

          console.log('Updated prices via HTTP:', newPrices);
          return {
            prices: newPrices,
            serverTime: Date.now(),
          };
        });
      } else if (data.result && Array.isArray(data.result)) {
        // Alternative response format
        setPrices((prevPrices) => {
          const currentPrices = prevPrices?.prices || {};
          const newPrices = { ...currentPrices };

          data.result.forEach((market: any) => {
            const symbol = market.symbol?.replace('USDT', '') || market.coin?.replace('USDT', '');
            const price = market.price || market.lastPrice || market.close;

            if (symbol && SYMBOLS.includes(symbol) && price) {
              newPrices[symbol] = {
                symbol,
                price: parseFloat(price),
                timestamp: Date.now(),
              };
            }
          });

          console.log('Updated prices via HTTP:', newPrices);
          return {
            prices: newPrices,
            serverTime: Date.now(),
          };
        });
      }
    } catch (err) {
      console.error('HTTP fallback failed:', err);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      console.log('Attempting to connect to WebSocket:', WS_URL);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to Wallex WebSocket');
        setIsConnected(true);
        setError(null);
        setIsLoading(false);

        // Send subscribe message
        ws.send(JSON.stringify(["subscribe", { "channel": "all@price" }]));
        console.log('Sent subscribe message for all@price');
      };

      ws.onmessage = (event) => {
        try {
          console.log('Received WebSocket message:', event.data);
          const message = JSON.parse(event.data);

          // Wallex WebSocket response format: [channel, data]
          // Example: ["all@price", { "symbol": "PEPEUSDT", "price": "0.00001136", "24h_ch": 1.15 }]

          if (Array.isArray(message) && message.length >= 2) {
            const [channel, data] = message;
            console.log('Parsed message:', { channel, data });

            // Handle single price update
            if (channel === "all@price" && data.symbol && data.price) {
              const symbol = data.symbol.replace('USDT', ''); // Remove USDT suffix
              console.log('Processing symbol:', symbol, 'price:', data.price);

              if (SYMBOLS.includes(symbol)) {
                setPrices((prevPrices) => {
                  const currentPrices = prevPrices?.prices || {};
                  const newPrices = { ...currentPrices };

                  newPrices[symbol] = {
                    symbol,
                    price: parseFloat(data.price),
                    timestamp: Date.now(),
                  };

                  console.log('Updated prices:', newPrices);
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
            // Handle batch updates (if sent as array)
            else if (channel === "all@price" && Array.isArray(data)) {
              console.log('Processing batch update:', data);
              data.forEach((item: any) => {
                if (item.symbol && item.price) {
                  const symbol = item.symbol.replace('USDT', '');
                  if (SYMBOLS.includes(symbol)) {
                    setPrices((prevPrices) => {
                      const currentPrices = prevPrices?.prices || {};
                      const newPrices = { ...currentPrices };

                      newPrices[symbol] = {
                        symbol,
                        price: parseFloat(item.price),
                        timestamp: Date.now(),
                      };

                      return {
                        prices: newPrices,
                        serverTime: Date.now(),
                      };
                    });

                    setPriceHistory((prev) => {
                      const updated = { ...prev };

                      if (!updated[symbol]) {
                        updated[symbol] = [];
                      }

                      updated[symbol] = [
                        ...updated[symbol],
                        {
                          timestamp: Date.now(),
                          price: parseFloat(item.price),
                        },
                      ].slice(-MAX_HISTORY_POINTS);

                      return updated;
                    });
                  }
                }
              });
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        // Attempt to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, RECONNECT_INTERVAL);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setIsLoading(false);
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError('Failed to connect to WebSocket');
      setIsLoading(false);
    }
  }, []);

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

  // Single initial HTTP call for data loading
  useEffect(() => {
    fetchPricesHTTP();
  }, []); // Empty dependency array - runs only once

  // WebSocket connection management
  useEffect(() => {
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  // Initialize with empty prices immediately
  useEffect(() => {
    if (!prices) {
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
    }
  }, [prices]);

  const updateWallexApiKey = useCallback((apiKey: string | undefined) => {
    wallexApiKeyRef.current = apiKey;
  }, []);

  return { prices, priceHistory, isLoading, error, isConnected, updateWallexApiKey };
};