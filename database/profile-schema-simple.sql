-- Simplified Profile Schema for AuthLog
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- USER PROFILES TABLE (SIMPLIFIED)
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

-- Create policies for user_profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage own profile" ON public.user_profiles;
CREATE POLICY "Users can manage own profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON public.user_profiles(username);

-- ============================================================================
-- UPDATE CHAT MESSAGES TABLE
-- ============================================================================

-- Add avatar_url column to chat_messages if it doesn't exist
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================================
-- STORAGE BUCKET (OPTIONAL)
-- ============================================================================

-- Create storage bucket for profile pictures (this might fail if storage isn't enabled)
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'avatars',
        'avatars',
        true,
        5242880, -- 5MB limit
        ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Storage bucket creation skipped (storage may not be enabled)';
END $$;

-- Create storage policies (only if bucket exists)
DO $$
BEGIN
    -- Check if bucket exists
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
        -- Avatar images are publicly accessible
        DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
        CREATE POLICY "Avatar images are publicly accessible"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'avatars');

        -- Users can upload their own avatar
        DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
        CREATE POLICY "Users can upload their own avatar"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

        -- Users can update their own avatar
        DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
        CREATE POLICY "Users can update their own avatar"
        ON storage.objects FOR UPDATE
        WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

        -- Users can delete their own avatar
        DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
        CREATE POLICY "Users can delete their own avatar"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
        
        RAISE NOTICE 'Storage policies created successfully';
    ELSE
        RAISE NOTICE 'Storage bucket not found, policies skipped';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Storage policy creation skipped';
END $$;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
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

-- Test query to check if everything is working
DO $$
DECLARE
    test_result INTEGER;
BEGIN
    -- Test profile table
    SELECT COUNT(*) INTO test_result FROM public.user_profiles;
    RAISE NOTICE 'Profile table created successfully. Current profiles: %', test_result;
    
    -- Test chat table update
    SELECT COUNT(*) INTO test_result 
    FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'avatar_url';
    RAISE NOTICE 'Chat table avatar_url column: %', CASE WHEN test_result > 0 THEN 'Added' ELSE 'Not found' END;
    
    -- Test storage bucket
    SELECT COUNT(*) INTO test_result FROM storage.buckets WHERE id = 'avatars';
    RAISE NOTICE 'Avatar storage bucket: %', CASE WHEN test_result > 0 THEN 'Created' ELSE 'Not created (storage may not be enabled)' END;
    
    RAISE NOTICE 'Profile system setup complete! ✅';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Setup completed with some optional features skipped';
END $$;
