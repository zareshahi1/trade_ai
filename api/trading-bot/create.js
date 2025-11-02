import { createClient } from '@supabase/supabase-js'

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
    const { userId, name, strategy, aiConfig, initialBalance } = req.body

    if (!userId || !name || !strategy || !aiConfig || !initialBalance) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if bot name already exists for this user
    const { data: existingBot } = await supabase
      .from('trading_bots')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .single()

    if (existingBot) {
      return res.status(400).json({ error: 'Bot name already exists' })
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
      return res.status(500).json({ error: 'Failed to create bot' })
    }

    res.status(200).json({
      success: true,
      bot
    })

  } catch (error) {
    console.error('Create trading bot error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}