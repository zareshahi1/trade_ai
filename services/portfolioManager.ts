import { Portfolio, Position, Trade, AIDecision, TradingStrategy } from '@/types/trading';

export class PortfolioManager {
  private portfolio: Portfolio;
  private initialCash: number;
  private strategy: TradingStrategy;
  private trailingStops: Map<string, number> = new Map();

  constructor(strategy?: TradingStrategy, initialBalance?: number) {
    this.initialCash = initialBalance || 10000;

    this.portfolio = {
      cash: this.initialCash,
      totalValue: this.initialCash,
      positions: [],
      trades: [],
      totalReturn: 0,
    };

    this.strategy = strategy || {
      name: 'متعادل',
      riskPerTrade: 2,
      maxPositions: 5,
      minConfidence: 0.65,
      useTrailingStop: true,
      trailingStopPercent: 3,
      useDCA: true,
      dcaLevels: 2,
      useScalping: false,
      scalpingTargetPercent: 0,
      useMarketTiming: true,
      avoidWeekends: false,
      maxLeverage: 10,
      diversification: true,
    };
  }

  loadFromStorage() {
    const savedPortfolio = localStorage.getItem('trading-portfolio');
    const savedInitialCash = localStorage.getItem('trading-initial-cash');

    if (savedPortfolio && savedInitialCash) {
      this.portfolio = JSON.parse(savedPortfolio);
      this.initialCash = Number(savedInitialCash);
    }
  }

  setInitialBalance(balance: number) {
    this.initialCash = balance;
    this.saveInitialCash();
  }

  getInitialBalance(): number {
    return this.initialCash;
  }

  setStrategy(strategy: TradingStrategy) {
    this.strategy = strategy;
  }

  getPortfolio(): Portfolio {
    return { ...this.portfolio };
  }

  canOpenPosition(decision: AIDecision): boolean {
    // بررسی حداکثر تعداد پوزیشن
    if (this.portfolio.positions.length >= this.strategy.maxPositions) {
      return false;
    }

    // بررسی حداقل اطمینان
    if (decision.confidence < this.strategy.minConfidence) {
      return false;
    }

    // بررسی تنوع‌بخشی
    if (this.strategy.diversification) {
      const existingPosition = this.portfolio.positions.find(p => p.symbol === decision.symbol);
      if (existingPosition) {
        return false; // یک پوزیشن از این ارز داریم
      }
    }

    // بررسی زمان‌بندی بازار
    if (this.strategy.useMarketTiming && this.strategy.avoidWeekends) {
      const now = new Date();
      const day = now.getDay();
      if (day === 0 || day === 6) {
        return false; // آخر هفته
      }
    }

    return true;
  }

  calculatePositionSize(decision: AIDecision, currentPrice: number): number {
    const riskAmount = this.portfolio.cash * (this.strategy.riskPerTrade / 100);
    const quantity = (riskAmount / currentPrice);
    return Math.floor(quantity * 100) / 100;
  }

  executeTrade(decision: AIDecision, currentPrice: number, quantity: number): Trade | null {
    if (decision.action === 'HOLD') return null;

    const trade: Trade = {
      id: Date.now().toString(),
      symbol: decision.symbol,
      type: decision.action,
      quantity,
      price: currentPrice,
      timestamp: Date.now(),
      reason: decision.reasoning,
      confidence: decision.confidence,
    };

    if (decision.action === 'BUY') {
      if (!this.canOpenPosition(decision)) {
        console.warn('نمی‌توان پوزیشن جدید باز کرد');
        return null;
      }

      const cost = quantity * currentPrice;
      if (cost > this.portfolio.cash) {
        console.warn('موجودی کافی نیست');
        return null;
      }

      this.portfolio.cash -= cost;
      
      const existingPosition = this.portfolio.positions.find(p => p.symbol === decision.symbol);
      if (existingPosition && this.strategy.useDCA) {
        // DCA - میانگین‌گیری هزینه
        const totalQuantity = existingPosition.quantity + quantity;
        const avgPrice = (existingPosition.entryPrice * existingPosition.quantity + currentPrice * quantity) / totalQuantity;
        existingPosition.quantity = totalQuantity;
        existingPosition.entryPrice = avgPrice;
        existingPosition.currentPrice = currentPrice;
        existingPosition.stopLoss = decision.stopLoss;
        existingPosition.takeProfit = decision.takeProfit;
      } else {
        // پوزیشن جدید
        const leverage = Math.min(
          this.strategy.maxLeverage,
          decision.confidence > 0.8 ? this.strategy.maxLeverage : Math.floor(this.strategy.maxLeverage / 2)
        );

        this.portfolio.positions.push({
          symbol: decision.symbol,
          quantity,
          entryPrice: currentPrice,
          currentPrice,
          leverage,
          unrealizedPnl: 0,
          entryTime: Date.now(),
          stopLoss: decision.stopLoss,
          takeProfit: decision.takeProfit,
        });

        // تنظیم حد ضرر متحرک
        if (this.strategy.useTrailingStop) {
          this.trailingStops.set(decision.symbol, currentPrice);
        }
      }
    } else if (decision.action === 'SELL') {
      const positionIndex = this.portfolio.positions.findIndex(p => p.symbol === decision.symbol);
      if (positionIndex === -1) {
        console.warn('پوزیشنی برای فروش وجود ندارد');
        return null;
      }

      const position = this.portfolio.positions[positionIndex];
      const sellQuantity = Math.min(quantity, position.quantity);
      const proceeds = sellQuantity * currentPrice;

      this.portfolio.cash += proceeds;
      position.quantity -= sellQuantity;

      if (position.quantity <= 0) {
        this.portfolio.positions.splice(positionIndex, 1);
        this.trailingStops.delete(decision.symbol);
      }

      trade.quantity = sellQuantity;
    }

    this.portfolio.trades.unshift(trade);
    this.savePortfolio();
    return trade;
  }

  updatePositions(prices: Record<string, number>): void {
    let totalPositionValue = 0;

    this.portfolio.positions.forEach(position => {
      const currentPrice = prices[position.symbol];
      if (currentPrice) {
        position.currentPrice = currentPrice;
        position.unrealizedPnl = (currentPrice - position.entryPrice) * position.quantity;
        totalPositionValue += currentPrice * position.quantity;

        // بررسی حد ضرر متحرک
        if (this.strategy.useTrailingStop) {
          const highestPrice = this.trailingStops.get(position.symbol) || position.entryPrice;
          if (currentPrice > highestPrice) {
            this.trailingStops.set(position.symbol, currentPrice);
            const newStopLoss = currentPrice * (1 - this.strategy.trailingStopPercent / 100);
            position.stopLoss = newStopLoss;
          }
        }

        // بررسی اسکالپینگ
        if (this.strategy.useScalping) {
          const profitPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
          if (profitPercent >= this.strategy.scalpingTargetPercent) {
            console.log(`هدف اسکالپینگ برای ${position.symbol} رسید - سود: ${profitPercent.toFixed(2)}%`);
          }
        }

        // بررسی حد ضرر و حد سود
        if (position.stopLoss && currentPrice <= position.stopLoss) {
          console.log(`حد ضرر برای ${position.symbol} فعال شد`);
        }
        if (position.takeProfit && currentPrice >= position.takeProfit) {
          console.log(`حد سود برای ${position.symbol} رسید`);
        }
      }
    });

    this.portfolio.totalValue = this.portfolio.cash + totalPositionValue;
    this.portfolio.totalReturn = ((this.portfolio.totalValue - this.initialCash) / this.initialCash) * 100;
    this.savePortfolio();
  }

  resetPortfolio(): void {
    this.portfolio = {
      cash: this.initialCash,
      totalValue: this.initialCash,
      positions: [],
      trades: [],
      totalReturn: 0,
    };
    this.trailingStops.clear();
    this.savePortfolio();
  }

  private savePortfolio(): void {
    localStorage.setItem('trading-portfolio', JSON.stringify(this.portfolio));
  }

  calculateVaR(confidenceLevel: number = 0.95, timeHorizon: number = 1): number {
    // Simplified VaR calculation using historical volatility
    // In a real implementation, this would use more sophisticated models
    const returns: number[] = [];

    // Calculate daily returns from trades
    for (let i = 1; i < this.portfolio.trades.length; i++) {
      const currentTrade = this.portfolio.trades[i];
      const previousTrade = this.portfolio.trades[i - 1];
      const returnPct = ((currentTrade.price - previousTrade.price) / previousTrade.price) * 100;
      returns.push(returnPct);
    }

    if (returns.length < 2) {
      // Not enough data, use conservative estimate
      return this.portfolio.totalValue * 0.05; // 5% VaR
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // VaR using normal distribution approximation
    // For 95% confidence, z-score is approximately 1.645
    const zScore = confidenceLevel === 0.95 ? 1.645 : confidenceLevel === 0.99 ? 2.326 : 1.96;
    const varAmount = this.portfolio.totalValue * (stdDev / 100) * zScore * Math.sqrt(timeHorizon);

    return Math.abs(varAmount);
  }

  calculateSharpeRatio(riskFreeRate: number = 0.02): number {
    if (this.portfolio.trades.length < 2) return 0;

    // Calculate portfolio returns
    const returns: number[] = [];
    for (let i = 1; i < this.portfolio.trades.length; i++) {
      const currentTrade = this.portfolio.trades[i];
      const previousTrade = this.portfolio.trades[i - 1];
      const returnPct = ((currentTrade.price - previousTrade.price) / previousTrade.price) * 100;
      returns.push(returnPct);
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Annualized Sharpe ratio (assuming daily returns)
    const annualizedReturn = avgReturn * 252; // 252 trading days
    const annualizedStdDev = stdDev * Math.sqrt(252);
    const annualizedRiskFreeRate = riskFreeRate * 252;

    return (annualizedReturn - annualizedRiskFreeRate) / annualizedStdDev;
  }

  calculateMaxDrawdown(): { maxDrawdown: number; peak: number; trough: number } {
    if (this.portfolio.trades.length < 2) {
      return { maxDrawdown: 0, peak: this.initialCash, trough: this.initialCash };
    }

    let peak = this.initialCash;
    let maxDrawdown = 0;
    let trough = this.initialCash;

    // Calculate portfolio value over time
    const portfolioValues: number[] = [this.initialCash];
    let currentValue = this.initialCash;

    this.portfolio.trades.forEach(trade => {
      if (trade.type === 'BUY') {
        currentValue -= trade.quantity * trade.price;
      } else {
        currentValue += trade.quantity * trade.price;
      }
      portfolioValues.push(currentValue);
    });

    // Calculate drawdown
    portfolioValues.forEach(value => {
      if (value > peak) {
        peak = value;
        trough = value;
      } else if (value < trough) {
        trough = value;
        const drawdown = (peak - trough) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    });

    return { maxDrawdown: maxDrawdown * 100, peak, trough };
  }

  getRiskMetrics(): {
    var95: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
  } {
    const winningTrades = this.portfolio.trades.filter(trade => {
      const position = this.portfolio.positions.find(p => p.symbol === trade.symbol);
      if (!position) return false;
      return trade.type === 'SELL' && trade.price > position.entryPrice;
    });

    const losingTrades = this.portfolio.trades.filter(trade => {
      const position = this.portfolio.positions.find(p => p.symbol === trade.symbol);
      if (!position) return false;
      return trade.type === 'SELL' && trade.price < position.entryPrice;
    });

    const winRate = this.portfolio.trades.length > 0
      ? (winningTrades.length / this.portfolio.trades.length) * 100
      : 0;

    const totalProfit = winningTrades.reduce((sum, trade) => {
      const position = this.portfolio.positions.find(p => p.symbol === trade.symbol);
      return sum + (position ? (trade.price - position.entryPrice) * trade.quantity : 0);
    }, 0);

    const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => {
      const position = this.portfolio.positions.find(p => p.symbol === trade.symbol);
      return sum + (position ? (trade.price - position.entryPrice) * trade.quantity : 0);
    }, 0));

    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    return {
      var95: this.calculateVaR(0.95),
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: this.calculateMaxDrawdown().maxDrawdown,
      winRate,
      profitFactor,
    };
  }

  private saveInitialCash(): void {
    localStorage.setItem('trading-initial-cash', this.initialCash.toString());
  }
}