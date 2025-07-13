-- EMERGENCY FIX - Simple User Setup
-- Run this FIRST in your Supabase SQL Editor

-- ============================================================================
-- MINIMAL WORKING SETUP
-- ============================================================================

-- Create user_profiles table (simple version)
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS but with permissive policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow everything for now (we'll tighten later)
CREATE POLICY "Allow all operations" ON public.user_profiles
    FOR ALL USING (true) WITH CHECK (true);

-- Create index
CREATE INDEX user_profiles_user_id_idx ON public.user_profiles(user_id);

-- ============================================================================
-- STORAGE SETUP
-- ============================================================================

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars', 
    'avatars', 
    true, 
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Storage policies (permissive for now)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated update" ON storage.objects;
CREATE POLICY "Authenticated update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;
CREATE POLICY "Authenticated delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');

-- ============================================================================
-- TEST THE SETUP
-- ============================================================================

-- Test insert
INSERT INTO public.user_profiles (user_id, username, full_name)
VALUES (gen_random_uuid(), 'testuser', 'Test User')
ON CONFLICT (user_id) DO NOTHING;

-- Verify table exists and is accessible
SELECT 
    'SUCCESS: user_profiles table ready' as status,
    count(*) as test_records
FROM public.user_profiles;

-- Verify storage bucket
SELECT 
    'SUCCESS: Storage bucket ready' as status,
    name,
    public
FROM storage.buckets 
WHERE id = 'avatars';

SELECT 'EMERGENCY SETUP COMPLETE! ✅' as message;
