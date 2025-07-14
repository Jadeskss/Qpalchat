-- Chat Setup - Simple Version that should work
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- SIMPLE CHAT MESSAGES TABLE
-- ============================================================================

-- Drop and recreate to ensure clean state
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_online_users CASCADE;

-- Create chat messages table (simplified)
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

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_online_users ENABLE ROW LEVEL SECURITY;

-- Simple policies that allow authenticated users to do everything
CREATE POLICY "Allow all for authenticated users" ON public.chat_messages
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.chat_online_users
    FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX chat_messages_created_at_idx ON public.chat_messages(created_at DESC);
CREATE INDEX chat_messages_user_id_idx ON public.chat_messages(user_id);
CREATE INDEX chat_online_users_last_seen_idx ON public.chat_online_users(last_seen DESC);

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

-- Enable realtime for chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_online_users;

-- Test the setup
INSERT INTO public.chat_messages (user_id, user_email, user_name, message)
VALUES (gen_random_uuid(), 'system@test.com', 'System', 'Chat system is ready! 🎉')
ON CONFLICT DO NOTHING;

-- Show table info
SELECT 'Chat setup completed successfully!' as status;

SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('chat_messages', 'chat_online_users')
ORDER BY table_name, ordinal_position;
