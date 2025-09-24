-- Options Premium Calculator Database Schema
-- Run this in your Supabase SQL editor

-- Note: Supabase manages JWT secrets automatically, no need to set them manually

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Zerodha integration fields
    zerodha_user_id VARCHAR(50),
    zerodha_user_name VARCHAR(255),
    zerodha_access_token TEXT, -- Encrypted
    zerodha_refresh_token TEXT, -- Encrypted
    zerodha_connected_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_zerodha_user_id_key UNIQUE (zerodha_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_zerodha_user_id ON public.users(zerodha_user_id) WHERE zerodha_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- Create user preferences table (for future enhancements)
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Preferences JSON
    preferences JSONB DEFAULT '{}',
    
    -- Index
    CONSTRAINT user_preferences_user_id_key UNIQUE (user_id)
);

-- Create option strategies table (for future enhancements)
CREATE TABLE IF NOT EXISTS public.option_strategies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Strategy details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    strategy_type VARCHAR(50) NOT NULL, -- 'put_selling', 'call_selling', 'covered_call', etc.
    instruments JSONB NOT NULL, -- Array of instruments
    is_active BOOLEAN DEFAULT true,
    
    -- Performance tracking
    total_premium_earned DECIMAL(15,2) DEFAULT 0,
    total_realized_pnl DECIMAL(15,2) DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0
);

-- Create indexes for option strategies
CREATE INDEX IF NOT EXISTS idx_option_strategies_user_id ON public.option_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_option_strategies_created_at ON public.option_strategies(created_at);
CREATE INDEX IF NOT EXISTS idx_option_strategies_is_active ON public.option_strategies(is_active) WHERE is_active = true;

-- Create trades table (for future enhancements)
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES public.option_strategies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Trade details
    instrument VARCHAR(100) NOT NULL,
    trade_type VARCHAR(20) NOT NULL, -- 'BUY', 'SELL'
    option_type VARCHAR(10), -- 'CE', 'PE'
    quantity INTEGER NOT NULL,
    strike_price DECIMAL(10,2),
    expiry_date DATE,
    
    -- Price details
    entry_price DECIMAL(10,2) NOT NULL,
    exit_price DECIMAL(10,2),
    current_price DECIMAL(10,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'OPEN', -- 'OPEN', 'CLOSED', 'EXPIRED'
    
    -- P&L
    realized_pnl DECIMAL(15,2),
    unrealized_pnl DECIMAL(15,2),
    
    -- Zerodha order details
    zerodha_order_id VARCHAR(50),
    zerodha_trade_id VARCHAR(50)
);

-- Create indexes for trades
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_strategy_id ON public.trades(strategy_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_expiry_date ON public.trades(expiry_date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Note: These policies assume integration with Supabase Auth
-- For custom authentication, you may need to adjust these policies

-- Users can only see their own data (assuming email matches auth.email())
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.email() = email);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.email() = email);

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.email() = email);

-- User preferences policies
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = user_preferences.user_id 
            AND users.email = auth.email()
        )
    );

-- Option strategies policies  
CREATE POLICY "Users can manage own strategies" ON public.option_strategies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = option_strategies.user_id 
            AND users.email = auth.email()
        )
    );

-- Trades policies
CREATE POLICY "Users can manage own trades" ON public.trades
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = trades.user_id 
            AND users.email = auth.email()
        )
    );

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_option_strategies_updated_at
    BEFORE UPDATE ON public.option_strategies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert some sample data (optional, for testing)
-- Note: Replace with actual hashed password in production
-- INSERT INTO public.users (email, password, name) VALUES 
-- ('test@example.com', '$2a$12$hashedpasswordhere', 'Test User');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Create a function to get user stats (for dashboard)
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_strategies', COALESCE(strategy_count.count, 0),
        'active_strategies', COALESCE(active_strategy_count.count, 0),
        'total_trades', COALESCE(trade_count.count, 0),
        'open_trades', COALESCE(open_trade_count.count, 0),
        'total_premium_earned', COALESCE(premium_stats.total_premium, 0),
        'total_realized_pnl', COALESCE(pnl_stats.total_pnl, 0),
        'zerodha_connected', CASE WHEN user_info.zerodha_user_id IS NOT NULL THEN true ELSE false END
    ) INTO stats
    FROM public.users user_info
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM public.option_strategies
        WHERE user_id = user_uuid
        GROUP BY user_id
    ) strategy_count ON user_info.id = strategy_count.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM public.option_strategies
        WHERE user_id = user_uuid AND is_active = true
        GROUP BY user_id
    ) active_strategy_count ON user_info.id = active_strategy_count.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM public.trades
        WHERE user_id = user_uuid
        GROUP BY user_id
    ) trade_count ON user_info.id = trade_count.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM public.trades
        WHERE user_id = user_uuid AND status = 'OPEN'
        GROUP BY user_id
    ) open_trade_count ON user_info.id = open_trade_count.user_id
    LEFT JOIN (
        SELECT user_id, SUM(total_premium_earned) as total_premium
        FROM public.option_strategies
        WHERE user_id = user_uuid
        GROUP BY user_id
    ) premium_stats ON user_info.id = premium_stats.user_id
    LEFT JOIN (
        SELECT user_id, SUM(realized_pnl) as total_pnl
        FROM public.trades
        WHERE user_id = user_uuid AND realized_pnl IS NOT NULL
        GROUP BY user_id
    ) pnl_stats ON user_info.id = pnl_stats.user_id
    WHERE user_info.id = user_uuid;

    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE public.users IS 'Main users table with authentication and Zerodha integration';
COMMENT ON TABLE public.user_preferences IS 'User-specific preferences and settings';
COMMENT ON TABLE public.option_strategies IS 'User-defined option trading strategies';
COMMENT ON TABLE public.trades IS 'Individual trades and their details';

COMMENT ON COLUMN public.users.zerodha_access_token IS 'Encrypted Zerodha access token';
COMMENT ON COLUMN public.users.zerodha_refresh_token IS 'Encrypted Zerodha refresh token';

COMMENT ON FUNCTION get_user_stats(UUID) IS 'Returns comprehensive user statistics for dashboard';
