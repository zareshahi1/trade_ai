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
    const { userId, name, strategy, aiConfig, initialBalance } = await request.json()

    if (!userId || !name || !strategy || !aiConfig || !initialBalance) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if bot name already exists for this user
    const { data: existingBot } = await supabase
      .from('trading_bots')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .single()

    if (existingBot) {
      return NextResponse.json({ error: 'Bot name already exists' }, { status: 400 })
    }

    // Create the trading bot
    const { data: bot, error } = await supabase
      .from('trading_bots')
      .insert({
        user_id: userId,
        name,
        strategy,
        ai_config: aiConfig,
        initial_balance: initialBalance
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      bot
    })

  } catch (error) {
    console.error('Create trading bot error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}