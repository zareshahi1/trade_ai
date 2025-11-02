-- Create trading_bots table for background trading
CREATE TABLE trading_bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strategy JSONB NOT NULL,
  ai_config JSONB NOT NULL,
  initial_balance DECIMAL(20,8) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  last_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, name)
);

-- Create trading_sessions table for bot execution tracking
CREATE TABLE trading_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID NOT NULL REFERENCES trading_bots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'stopped')) DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  performance_data JSONB
);

-- Create trading_decisions table for AI decisions
CREATE TABLE trading_decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES trading_sessions(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES trading_bots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  action TEXT CHECK (action IN ('buy', 'sell', 'hold')) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  reasoning TEXT,
  price DECIMAL(20,8) NOT NULL,
  quantity DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create portfolio_snapshots table for tracking portfolio state
CREATE TABLE portfolio_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES trading_sessions(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES trading_bots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL, -- Full portfolio state
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for all trading tables
ALTER TABLE trading_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trading_bots
CREATE POLICY "Users can view their own trading bots" ON trading_bots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading bots" ON trading_bots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading bots" ON trading_bots
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading bots" ON trading_bots
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trading_sessions
CREATE POLICY "Users can view their own trading sessions" ON trading_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading sessions" ON trading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading sessions" ON trading_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for trading_decisions
CREATE POLICY "Users can view their own trading decisions" ON trading_decisions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trading decisions" ON trading_decisions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading decisions" ON trading_decisions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for portfolio_snapshots
CREATE POLICY "Users can view their own portfolio snapshots" ON portfolio_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolio snapshots" ON portfolio_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger for trading_bots
CREATE TRIGGER update_trading_bots_updated_at
  BEFORE UPDATE ON trading_bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();