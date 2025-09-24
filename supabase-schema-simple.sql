-- Simple Options Premium Calculator Schema for Supabase
-- Run this in your Supabase SQL editor
-- This version focuses on current needs and Supabase compatibility

-- Create users table for additional user info
-- (Supabase auth.users handles basic authentication)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Zerodha integration fields
    zerodha_user_id VARCHAR(50),
    zerodha_user_name VARCHAR(255),
    zerodha_access_token TEXT, -- Store encrypted
    zerodha_refresh_token TEXT, -- Store encrypted  
    zerodha_connected_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional constraints
    CONSTRAINT user_profiles_email_key UNIQUE (email),
    CONSTRAINT user_profiles_zerodha_user_id_key UNIQUE (zerodha_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_zerodha_user_id ON public.user_profiles(zerodha_user_id) WHERE zerodha_user_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only access their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER handle_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Extended user profiles linked to Supabase auth.users';
COMMENT ON COLUMN public.user_profiles.zerodha_access_token IS 'Encrypted Zerodha access token';
COMMENT ON COLUMN public.user_profiles.zerodha_refresh_token IS 'Encrypted Zerodha refresh token';
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile when new user signs up';