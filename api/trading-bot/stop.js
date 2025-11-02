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

    // Find active session
    const { data: session } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('bot_id', botId)
      .eq('status', 'running')
      .single()

    if (!session) {
      return res.status(400).json({ error: 'No active session found' })
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

    res.status(200).json({
      success: true,
      message: 'Trading bot stopped successfully'
    })

  } catch (error) {
    console.error('Stop trading bot error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}