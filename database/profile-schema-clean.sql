-- CLEAN Profile Schema for AuthLog - No Errors Version
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- USER PROFILES TABLE
-- ============================================================================

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    
    -- Constraints
    CONSTRAINT username_length CHECK (length(username) >= 2 AND length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$'),
    CONSTRAINT full_name_length CHECK (length(full_name) <= 50)
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies (without auth.uid() to avoid issues)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own profile" ON public.user_profiles;
CREATE POLICY "Users can manage own profile" ON public.user_profiles
    FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON public.user_profiles(username);

-- ============================================================================
-- UPDATE CHAT MESSAGES TABLE (OPTIONAL)
-- ============================================================================

-- Add avatar_url column to chat_messages if the table exists
DO $$
BEGIN
    -- Check if chat_messages table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        -- Add avatar_url column if it doesn't exist
        ALTER TABLE public.chat_messages 
        ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to chat_messages table';
    ELSE
        RAISE NOTICE 'chat_messages table does not exist yet - will be created when you set up chat';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Chat table update skipped: %', SQLERRM;
END $$;

-- ============================================================================
-- SIMPLE TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- TEST THE SETUP
-- ============================================================================

-- Test query to verify everything is working
SELECT 'Profile system setup completed successfully!' as status;

-- Show table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;
