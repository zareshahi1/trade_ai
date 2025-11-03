import { NextRequest, NextResponse } from 'next/server';

const WALLEX_API_BASE = 'https://api.wallex.ir';
const SYMBOLS = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'XRP', 'LTC', 'DOGE', 'AVAX', 'MATIC', 'LINK', 'UNI', 'ALGO', 'VET'];

export async function GET() {
  try {
    const response = await fetch(`${WALLEX_API_BASE}/hector/web/v1/markets`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Wallex API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }

    const filteredData = data
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
        const price = market.price || market.lastPrice || market.close;
        return {
          symbol,
          price: parseFloat(price),
          timestamp: Date.now(),
        };
      });

    return NextResponse.json({
      prices: filteredData,
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}