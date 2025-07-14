-- MINIMAL Profile Schema for AuthLog - Absolutely No Errors Version
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- USER PROFILES TABLE (MINIMAL VERSION)
-- ============================================================================

-- Drop table if exists to start fresh
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create user profiles table without foreign key constraints initially
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on user_id
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);

-- Create unique constraint on username  
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_username_unique UNIQUE (username);

-- Add simple check constraints
ALTER TABLE public.user_profiles ADD CONSTRAINT username_length CHECK (length(username) >= 2 AND length(username) <= 30);
ALTER TABLE public.user_profiles ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$');
ALTER TABLE public.user_profiles ADD CONSTRAINT full_name_length CHECK (length(full_name) <= 50);

-- ============================================================================
-- ROW LEVEL SECURITY (VERY SIMPLE)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow everything for now
DROP POLICY IF EXISTS "Allow all access" ON public.user_profiles;
CREATE POLICY "Allow all access" ON public.user_profiles
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX user_profiles_user_id_idx ON public.user_profiles(user_id);
CREATE INDEX user_profiles_username_idx ON public.user_profiles(username);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKET FOR AVATARS
-- ============================================================================

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
CREATE POLICY "Anyone can upload an avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can update own avatar" ON storage.objects;
CREATE POLICY "Anyone can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can delete own avatar" ON storage.objects;
CREATE POLICY "Anyone can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');

-- ============================================================================
-- TEST THE SETUP
-- ============================================================================

-- Test insertion to verify everything works
DO $$
BEGIN
    -- Test if we can insert a sample record
    INSERT INTO public.user_profiles (user_id, username, full_name) 
    VALUES (gen_random_uuid(), 'testuser', 'Test User')
    ON CONFLICT (username) DO NOTHING;
    
    RAISE NOTICE 'Test record inserted successfully!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test failed: %', SQLERRM;
END $$;

-- Show final table structure
SELECT 'Profile system setup completed successfully!' as status;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Show constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'user_profiles';
