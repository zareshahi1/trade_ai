import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseStore } from '@/services/supabaseStore';

const WALLEX_API_BASE = 'https://api.wallex.ir';
const SYMBOLS = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'XRP', 'LTC', 'DOGE', 'AVAX', 'MATIC', 'LINK', 'UNI', 'ALGO', 'VET'];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      // Return default prices if not authenticated
      const defaultPrices = SYMBOLS.map(symbol => ({
        symbol,
        price: 0,
        timestamp: Date.now(),
      }));
      return NextResponse.json({
        prices: defaultPrices,
        serverTime: Date.now(),
      });
    }

    const apiKeys = await supabaseStore.getUserApiKeys(session.user.id);
    const wallexApiKey = apiKeys?.wallex?.apiKey;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; TradeAI/1.0)',
    };

    if (wallexApiKey) {
      headers['x-api-key'] = wallexApiKey;
    }

    const response = await fetch(`${WALLEX_API_BASE}/hector/web/v1/markets`, {
      headers,
    });

    if (!response.ok) {
      // Return default prices if API fails
      const defaultPrices = SYMBOLS.map(symbol => ({
        symbol,
        price: 0,
        timestamp: Date.now(),
      }));
      return NextResponse.json({
        prices: defaultPrices,
        serverTime: Date.now(),
      });
    }

    const data = await response.json();

    if (!data.success || !data.result || !data.result.markets) {
      // Return default if unexpected format
      const defaultPrices = SYMBOLS.map(symbol => ({
        symbol,
        price: 0,
        timestamp: Date.now(),
      }));
      return NextResponse.json({
        prices: defaultPrices,
        serverTime: Date.now(),
      });
    }

    const markets = data.result.markets;

    const filteredData = markets
      .filter((market: any) => {
        const symbol = market.symbol?.replace('USDT', '') ||
                       market.coin?.replace('USDT', '') ||
                       market.name?.replace('USDT', '');
        return symbol && SYMBOLS.includes(symbol);
      })
      .map((market: any) => {
        const symbol = market.symbol?.replace('USDT', '') ||
                       market.coin?.replace('USDT', '') ||
                       market.name?.replace('USDT', '');
        const price = market.price || market.lastPrice || market.close || 0;
        return {
          symbol,
          price: parseFloat(price) || 0,
          timestamp: Date.now(),
        };
      });

    // If no data, return defaults
    if (filteredData.length === 0) {
      const defaultPrices = SYMBOLS.map(symbol => ({
        symbol,
        price: 0,
        timestamp: Date.now(),
      }));
      return NextResponse.json({
        prices: defaultPrices,
        serverTime: Date.now(),
      });
    }

    return NextResponse.json({
      prices: filteredData,
      serverTime: Date.now(),
    });
  } catch (error) {
    // Return default prices on any error
    const defaultPrices = SYMBOLS.map(symbol => ({
      symbol,
      price: 0,
      timestamp: Date.now(),
    }));
    return NextResponse.json({
      prices: defaultPrices,
      serverTime: Date.now(),
    });
  }
}