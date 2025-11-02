import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { TradingBotService } from '@/services/tradingBotService'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { botId, userId } = await request.json()

    if (!botId || !userId) {
      return NextResponse.json({ error: 'Missing botId or userId' }, { status: 400 })
    }

    // Verify user owns the bot
    const { data: bot, error: botError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', botId)
      .eq('user_id', userId)
      .single()

    if (botError || !bot) {
      return NextResponse.json({ error: 'Bot not found or access denied' }, { status: 404 })
    }

    // Check if bot is already running
    const { data: activeSession } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('bot_id', botId)
      .eq('status', 'running')
      .single()

    if (activeSession) {
      return NextResponse.json({ error: 'Bot is already running' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
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

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      message: 'Trading bot started successfully'
    })

  } catch (error) {
    console.error('Start trading bot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}