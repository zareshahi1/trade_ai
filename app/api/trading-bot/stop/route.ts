import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

    // Find active session
    const { data: session } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('bot_id', botId)
      .eq('status', 'running')
      .single()

    if (!session) {
      return NextResponse.json({ error: 'No active session found' }, { status: 400 })
    }

    // Update session status
    await supabase
      .from('trading_sessions')
      .update({
        status: 'stopped',
        completed_at: new Date().toISOString()
      })
      .eq('id', session.id)

    // Update bot status
    await supabase
      .from('trading_bots')
      .update({ is_active: false })
      .eq('id', botId)

    return NextResponse.json({
      success: true,
      message: 'Trading bot stopped successfully'
    })

  } catch (error) {
    console.error('Stop trading bot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}