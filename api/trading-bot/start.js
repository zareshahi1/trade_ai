import { createClient } from '@supabase/supabase-js'
import { TradingBotService } from '../../src/services/tradingBotService.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { botId, userId } = req.body

    if (!botId || !userId) {
      return res.status(400).json({ error: 'Missing botId or userId' })
    }

    // Verify user owns the bot
    const { data: bot, error: botError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', botId)
      .eq('user_id', userId)
      .single()

    if (botError || !bot) {
      return res.status(404).json({ error: 'Bot not found or access denied' })
    }

    // Check if bot is already running
    const { data: activeSession } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('bot_id', botId)
      .eq('status', 'running')
      .single()

    if (activeSession) {
      return res.status(400).json({ error: 'Bot is already running' })
    }

    // Create new trading session
    const { data: session, error: sessionError } = await supabase
      .from('trading_sessions')
      .insert({
        bot_id: botId,
        user_id: userId,
        status: 'running'
      })
      .select()
      .single()

    if (sessionError) {
      return res.status(500).json({ error: 'Failed to create session' })
    }

    // Update bot status
    await supabase
      .from('trading_bots')
      .update({
        is_active: true,
        last_run: new Date().toISOString()
      })
      .eq('id', botId)

    // Start the trading bot (this will run asynchronously)
    const tradingBot = new TradingBotService(supabase, session.id, bot, userId)
    tradingBot.start().catch(error => {
      console.error('Trading bot error:', error)
      // Update session status on error
      supabase
        .from('trading_sessions')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id)
    })

    res.status(200).json({
      success: true,
      sessionId: session.id,
      message: 'Trading bot started successfully'
    })

  } catch (error) {
    console.error('Start trading bot error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}