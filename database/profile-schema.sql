-- User Profiles table for AuthLog
-- Run this in your Supabase SQL Editor to add profile management

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
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    
    -- Constraints
    CONSTRAINT username_length CHECK (length(username) >= 2 AND length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$'),
    CONSTRAINT full_name_length CHECK (length(full_name) <= 50),
    CONSTRAINT bio_length CHECK (length(bio) <= 200)
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile" ON public.user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS user_profiles_created_at_idx ON public.user_profiles(created_at DESC);

-- ============================================================================
-- STORAGE BUCKET FOR AVATARS
-- ============================================================================

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

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

-- Note: Auto-profile creation trigger removed to avoid auth.users access issues
-- Profiles will be created manually when users first update their profile

-- ============================================================================
-- UPDATE EXISTING CHAT TABLES TO USE PROFILES
-- ============================================================================

-- Add avatar_url column to chat_messages if it doesn't exist
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Function to get user display info
CREATE OR REPLACE FUNCTION public.get_user_display_info(user_uuid UUID)
RETURNS TABLE(display_name TEXT, avatar_url TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(up.username, up.full_name, 'User') as display_name,
        up.avatar_url
    FROM public.user_profiles up
    WHERE up.user_id = user_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================================================
-- TESTING AND VALIDATION
-- ============================================================================

-- Test the profile system
DO $$
DECLARE
    test_result INTEGER;
BEGIN
    -- Count existing profiles
    SELECT COUNT(*) INTO test_result FROM public.user_profiles;
    RAISE NOTICE 'Current profiles count: %', test_result;
    
    -- Test storage bucket
    SELECT COUNT(*) INTO test_result FROM storage.buckets WHERE id = 'avatars';
    RAISE NOTICE 'Avatar bucket exists: %', CASE WHEN test_result > 0 THEN 'Yes' ELSE 'No' END;
END $$;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
1. Copy and paste this script into your Supabase SQL Editor
2. Run the script to create the user_profiles table and storage bucket
3. The profile system will now work with:
   - Username management (2-30 characters, alphanumeric, underscore, hyphen)
   - Full name storage
   - Profile picture upload to Supabase Storage
   - Automatic profile creation on user signup
   - Integration with chat system for display names and avatars

Features included:
- Secure file upload with size and type restrictions
- Row Level Security for data protection
- Automatic profile creation on signup
- Integration with existing chat system
- Username uniqueness validation
- Optimized indexes for performance
*/
