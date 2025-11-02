export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface MultiTimeframeIndicators {
  [timeframe: string]: {
    rsi7: number;
    rsi14: number;
    ema20: number;
    ema50: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    trend: 'bullish' | 'bearish' | 'sideways';
    strength: number; // 0-100
  };
}

export class TechnicalIndicators {
  // Calculate Simple Moving Average
  static calculateSMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0;
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  // Calculate Exponential Moving Average
  static calculateEMA(data: number[], period: number): number {
    if (data.length === 0) return 0;
    if (data.length < period) return this.calculateSMA(data, data.length);
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period);
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  // Calculate RSI
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);
    
    const avgGain = this.calculateSMA(gains.slice(-period), period);
    const avgLoss = this.calculateSMA(losses.slice(-period), period);
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // Calculate MACD
  static calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;

    // For signal line, we'd need MACD history, so simplified here
    const signal = macd * 0.9; // Simplified
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  // Resample price data to different timeframe
  static resampleToTimeframe(prices: number[], originalInterval: number, targetTimeframe: Timeframe): number[] {
    const intervals = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '4h': 240,
      '1d': 1440
    };

    const targetInterval = intervals[targetTimeframe];
    const compression = Math.floor(targetInterval / originalInterval);

    if (compression <= 1) return prices;

    const resampled: number[] = [];
    for (let i = 0; i < prices.length; i += compression) {
      const slice = prices.slice(i, i + compression);
      if (slice.length > 0) {
        // Use OHLC-like resampling: take first, max, min, last
        // For simplicity, we'll use the average of the period
        const avg = slice.reduce((sum, price) => sum + price, 0) / slice.length;
        resampled.push(avg);
      }
    }

    return resampled;
  }

  // Calculate indicators for multiple timeframes
  static calculateMultiTimeframeIndicators(
    priceHistory: number[],
    originalInterval: number = 1 // minutes
  ): MultiTimeframeIndicators {
    const timeframes: Timeframe[] = ['5m', '15m', '1h', '4h', '1d'];
    const result: MultiTimeframeIndicators = {};

    timeframes.forEach(timeframe => {
      const resampledPrices = this.resampleToTimeframe(priceHistory, originalInterval, timeframe);

      if (resampledPrices.length >= 50) { // Need enough data
        const rsi7 = this.calculateRSI(resampledPrices, 7);
        const rsi14 = this.calculateRSI(resampledPrices, 14);
        const ema20 = this.calculateEMA(resampledPrices, 20);
        const ema50 = this.calculateEMA(resampledPrices, 50);
        const macd = this.calculateMACD(resampledPrices);

        // Determine trend
        let trend: 'bullish' | 'bearish' | 'sideways' = 'sideways';
        if (ema20 > ema50 && resampledPrices[resampledPrices.length - 1] > ema20) {
          trend = 'bullish';
        } else if (ema20 < ema50 && resampledPrices[resampledPrices.length - 1] < ema20) {
          trend = 'bearish';
        }

        // Calculate trend strength (0-100)
        const priceChange = (resampledPrices[resampledPrices.length - 1] - resampledPrices[0]) / resampledPrices[0];
        const volatility = this.calculateVolatility(resampledPrices);
        const strength = Math.min(100, Math.max(0, (Math.abs(priceChange) / volatility) * 50));

        result[timeframe] = {
          rsi7,
          rsi14,
          ema20,
          ema50,
          macd: macd.macd,
          macdSignal: macd.signal,
          macdHistogram: macd.histogram,
          trend,
          strength
        };
      }
    });

    return result;
  }

  // Calculate volatility (standard deviation of returns)
  static calculateVolatility(prices: number[], period: number = 20): number {
    if (prices.length < period + 1) return 0;

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const recentReturns = returns.slice(-period);
    const mean = recentReturns.reduce((sum, ret) => sum + ret, 0) / recentReturns.length;
    const variance = recentReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / recentReturns.length;

    return Math.sqrt(variance);
  }

  // Calculate trend strength across timeframes
  static calculateTrendStrength(multiTimeframe: MultiTimeframeIndicators): {
    overallTrend: 'bullish' | 'bearish' | 'sideways';
    strength: number; // 0-100
    consensus: number; // percentage of timeframes agreeing
  } {
    const timeframes = Object.values(multiTimeframe);
    if (timeframes.length === 0) {
      return { overallTrend: 'sideways', strength: 0, consensus: 0 };
    }

    const bullishCount = timeframes.filter(tf => tf.trend === 'bullish').length;
    const bearishCount = timeframes.filter(tf => tf.trend === 'bearish').length;
    const totalTimeframes = timeframes.length;

    const consensus = Math.max(bullishCount, bearishCount) / totalTimeframes;
    const avgStrength = timeframes.reduce((sum, tf) => sum + tf.strength, 0) / totalTimeframes;

    let overallTrend: 'bullish' | 'bearish' | 'sideways' = 'sideways';
    if (bullishCount > bearishCount) {
      overallTrend = 'bullish';
    } else if (bearishCount > bullishCount) {
      overallTrend = 'bearish';
    }

    return {
      overallTrend,
      strength: avgStrength,
      consensus: consensus * 100
    };
  }
}