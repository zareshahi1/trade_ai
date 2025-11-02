import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { PortfolioManager } from './portfolioManager'
import { TechnicalIndicators } from './technicalIndicators'
import { AIService, AIConfig } from './aiService'
import { TradingStrategy } from '@/types/trading'
import { ExchangeService } from './exchangeService'

export interface TradingBot {
  id: string
  user_id: string
  name: string
  strategy: TradingStrategy
  ai_config: AIConfig
  initial_balance: number
  is_active: boolean
}

export class TradingBotService {
  private supabase: SupabaseClient
  private sessionId: string
  private bot: TradingBot
  private userId: string
  private portfolioManager: PortfolioManager
  private isRunning = false
  private analysisInterval?: NodeJS.Timeout

  constructor(supabase: SupabaseClient, sessionId: string, bot: TradingBot, userId: string) {
    this.supabase = supabase
    this.sessionId = sessionId
    this.bot = bot
    this.userId = userId
    this.portfolioManager = new PortfolioManager(bot.strategy, bot.initial_balance)
  }

  async start() {
    if (this.isRunning) {
      throw new Error('Bot is already running')
    }

    this.isRunning = true
    console.log(`🤖 Starting trading bot: ${this.bot.name} for user: ${this.userId}`)

    // Save initial portfolio snapshot
    await this.savePortfolioSnapshot()

    // Start analysis loop
    this.analysisInterval = setInterval(async () => {
      try {
        await this.analyzeAndTrade()
      } catch (error) {
        console.error('Analysis error:', error)
        await this.handleError(error)
      }
    }, 60000) // Analyze every minute

    // Keep the process alive
    process.on('SIGTERM', () => this.stop())
    process.on('SIGINT', () => this.stop())
  }

  async stop() {
    if (!this.isRunning) return

    console.log(`🛑 Stopping trading bot: ${this.bot.name}`)
    this.isRunning = false

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
    }

    // Update session status
    await this.supabase
      .from('trading_sessions')
      .update({
        status: 'stopped',
        completed_at: new Date().toISOString(),
        performance_data: {
          finalPortfolio: this.portfolioManager.getPortfolio(),
          totalReturn: this.portfolioManager.getPortfolio().totalReturn,
          winRate: this.calculateWinRate()
        }
      })
      .eq('id', this.sessionId)

    // Update bot status
    await this.supabase
      .from('trading_bots')
      .update({ is_active: false })
      .eq('id', this.bot.id)
  }

  private async analyzeAndTrade() {
    if (!this.isRunning) return

    try {
      // Get current prices from Wallex (free API)
      const prices = await this.getCurrentPrices()
      if (!prices) return

      // Get user's API keys for actual trading
      const apiKeys = await this.getUserApiKeys()
      if (!apiKeys) return

      const symbols = Object.keys(prices)
      const aiService = new AIService(this.bot.ai_config)

      for (const symbol of symbols) {
        const price = prices[symbol]
        const priceHistory = await this.getPriceHistory(symbol)

        if (priceHistory.length < 50) continue // Need enough history

        // Calculate technical indicators
        const indicators = this.calculateIndicators(priceHistory)

        // Get AI analysis
        const analysis = await aiService.analyzeMarket(
          symbol,
          price,
          indicators,
          this.portfolioManager.getPortfolio().positions,
          this.portfolioManager.getPortfolio().totalValue,
          this.portfolioManager.getPortfolio().cash
        )

        // Make trading decision
        if (analysis.decision !== 'HOLD' && analysis.confidence > 0.7) {
          await this.executeTrade(symbol, analysis, price, apiKeys);
        }

        // Save decision to database
        await this.saveDecision(symbol, analysis, price)
      }

      // Save portfolio snapshot
      await this.savePortfolioSnapshot()

    } catch (error) {
      console.error('Analysis and trade error:', error)
      throw error
    }
  }

  private async getCurrentPrices(): Promise<Record<string, number> | null> {
    try {
      const response = await fetch('https://api.wallex.ir/v1/markets')
      const data = await response.json()

      const prices: Record<string, number> = {}
      for (const market of data.result || []) {
        if (market.symbol?.endsWith('TMN')) {
          const symbol = market.symbol.replace('TMN', 'USDT')
          prices[symbol] = parseFloat(market.price)
        }
      }

      return prices
    } catch (error) {
      console.error('Error fetching prices:', error)
      return null
    }
  }

  private async getPriceHistory(symbol: string): Promise<number[]> {
    try {
      // Get 1-hour candles for the last 50 hours
      const response = await fetch(`https://api.wallex.ir/v1/udf/history?symbol=${symbol}&resolution=60&from=${Math.floor(Date.now() / 1000) - 50 * 3600}&to=${Math.floor(Date.now() / 1000)}`)
      const data = await response.json()

      return data.c || []
    } catch (error) {
      console.error(`Error fetching history for ${symbol}:`, error)
      return []
    }
  }

  private calculateIndicators(priceHistory: number[]) {
    const rsi7 = TechnicalIndicators.calculateRSI(priceHistory, 7)
    const rsi14 = TechnicalIndicators.calculateRSI(priceHistory, 14)
    const ema20 = TechnicalIndicators.calculateEMA(priceHistory, 20)
    const macd = TechnicalIndicators.calculateMACD(priceHistory)

    return {
      rsi7,
      rsi14,
      ema20,
      macd: macd.macd,
      priceHistory,
      emaHistory: priceHistory.map((_, i) => i >= 19 ? TechnicalIndicators.calculateEMA(priceHistory.slice(0, i + 1), 20) : 0),
      macdHistory: priceHistory.map((_, i) => i >= 25 ? TechnicalIndicators.calculateMACD(priceHistory.slice(0, i + 1)).macd : 0),
      rsiHistory: priceHistory.map((_, i) => i >= 6 ? TechnicalIndicators.calculateRSI(priceHistory.slice(0, i + 1), 7) : 0),
      multiTimeframe: TechnicalIndicators.calculateMultiTimeframeIndicators(priceHistory, 60)
    }
  }

  private async getUserApiKeys() {
    const { data, error } = await this.supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', this.userId)

    if (error) {
      console.error('Error fetching API keys:', error)
      return null
    }

    const keys: any = {}
    for (const key of data || []) {
      keys[key.exchange_type] = {
        apiKey: key.api_key,
        secretKey: key.api_secret,
        passphrase: key.passphrase,
        testnet: key.testnet
      }
    }

    return keys
  }

  private async executeTrade(symbol: string, analysis: any, price: number, apiKeys: any) {
    try {
      // Use the first available exchange (preferably Binance)
      const exchangeType = apiKeys.binance ? 'binance' : apiKeys.bybit ? 'bybit' : Object.keys(apiKeys)[0] as any
      if (!exchangeType) return

      const exchangeService = new ExchangeService({
        type: exchangeType,
        mode: 'live',
        credentials: apiKeys[exchangeType]
      })

      const quantity = this.calculatePositionSize(price, analysis.confidence)

      if (analysis.decision === 'BUY') {
        await exchangeService.placeOrder(symbol, 'BUY', quantity, price)
        this.portfolioManager.executeTrade({
          symbol,
          action: 'BUY',
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          stopLoss: analysis.stopLoss,
          takeProfit: analysis.takeProfit
        }, price, quantity)
      } else if (analysis.decision === 'SELL') {
        const position = this.portfolioManager.getPortfolio().positions.find(p => p.symbol === symbol)
        if (position) {
          await exchangeService.placeOrder(symbol, 'SELL', position.quantity, price)
          this.portfolioManager.executeTrade({
            symbol,
            action: 'SELL',
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            stopLoss: analysis.stopLoss,
            takeProfit: analysis.takeProfit
          }, price, position.quantity)
        }
      }

    } catch (error) {
      console.error('Trade execution error:', error)
    }
  }

  private calculatePositionSize(price: number, confidence: number): number {
    const portfolio = this.portfolioManager.getPortfolio()
    const riskAmount = portfolio.cash * 0.02 * confidence // 2% risk per trade, adjusted by confidence
    return riskAmount / price
  }

  private async saveDecision(symbol: string, analysis: any, price: number) {
    await this.supabase
      .from('trading_decisions')
      .insert({
        session_id: this.sessionId,
        bot_id: this.bot.id,
        user_id: this.userId,
        symbol,
        action: analysis.decision,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        price,
        stop_loss: analysis.stopLoss,
        take_profit: analysis.takeProfit
      })
  }

  private async savePortfolioSnapshot() {
    const portfolio = this.portfolioManager.getPortfolio()

    await this.supabase
      .from('portfolio_snapshots')
      .insert({
        session_id: this.sessionId,
        bot_id: this.bot.id,
        user_id: this.userId,
        snapshot: portfolio
      })
  }

  private calculateWinRate(): number {
    const portfolio = this.portfolioManager.getPortfolio()
    const winningTrades = portfolio.positions.filter(p => p.unrealizedPnl > 0).length
    const totalTrades = portfolio.positions.length
    return totalTrades > 0 ? winningTrades / totalTrades : 0
  }

  private async handleError(error: any) {
    await this.supabase
      .from('trading_sessions')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', this.sessionId)

    this.stop()
  }
}