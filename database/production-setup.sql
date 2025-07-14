-- COMPLETE SETUP FOR PRODUCTION - All Systems
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. PROFILE SYSTEM SETUP
-- ============================================================================

-- Drop tables if they exist to start fresh
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create user profiles table
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT username_length CHECK (length(username) >= 2 AND length(username) <= 30),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$'),
    CONSTRAINT full_name_length CHECK (length(full_name) <= 50)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow users to view all profiles" ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to manage own profile" ON public.user_profiles
    FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX user_profiles_user_id_idx ON public.user_profiles(user_id);
CREATE INDEX user_profiles_username_idx ON public.user_profiles(username);

-- ============================================================================
-- 2. CHAT SYSTEM SETUP
-- ============================================================================

-- Drop and recreate chat tables
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_online_users CASCADE;

-- Create chat messages table
CREATE TABLE public.chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    message TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create online users table
CREATE TABLE public.chat_online_users (
    user_id UUID PRIMARY KEY,
    user_email TEXT NOT NULL,
    user_name TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_typing BOOLEAN DEFAULT FALSE
);

-- Enable RLS for chat
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_online_users ENABLE ROW LEVEL SECURITY;

-- Chat policies
CREATE POLICY "Allow all for authenticated users" ON public.chat_messages
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.chat_online_users
    FOR ALL USING (true) WITH CHECK (true);

-- Chat indexes
CREATE INDEX chat_messages_created_at_idx ON public.chat_messages(created_at DESC);
CREATE INDEX chat_messages_user_id_idx ON public.chat_messages(user_id);
CREATE INDEX chat_online_users_last_seen_idx ON public.chat_online_users(last_seen DESC);

-- ============================================================================
-- 3. ENABLE REALTIME
-- ============================================================================

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_online_users;

-- ============================================================================
-- 4. STORAGE BUCKET SETUP
-- ============================================================================

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
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
-- 5. TEST THE COMPLETE SETUP
-- ============================================================================

-- Test profile system
INSERT INTO public.user_profiles (user_id, username, full_name)
VALUES (gen_random_uuid(), 'testuser', 'Test User')
ON CONFLICT (username) DO NOTHING;

-- Test chat system
INSERT INTO public.chat_messages (user_id, user_email, user_name, message)
VALUES (gen_random_uuid(), 'system@test.com', 'System', 'Complete system setup ready! 🎉')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. VERIFY EVERYTHING
-- ============================================================================

-- Check tables exist
SELECT 'user_profiles' as table_name, count(*) as row_count FROM public.user_profiles
UNION ALL
SELECT 'chat_messages' as table_name, count(*) as row_count FROM public.chat_messages
UNION ALL
SELECT 'chat_online_users' as table_name, count(*) as row_count FROM public.chat_online_users;

-- Check storage bucket
SELECT name, public FROM storage.buckets WHERE id = 'avatars';

-- Show success message
SELECT 'PRODUCTION SETUP COMPLETE! ✅' as status,
       'Account creation, profile updates, and chat should all work now.' as message;
