-- Chat system database schema for Supabase
-- Run these commands in your Supabase SQL Editor

-- ============================================================================
-- CHAT MESSAGES TABLE
-- ============================================================================

-- Create chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    message TEXT NOT NULL CHECK (length(message) <= 500),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_messages
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chat_messages;
CREATE POLICY "Enable read access for all users" ON public.chat_messages
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.chat_messages;
CREATE POLICY "Enable insert for authenticated users only" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for message owners" ON public.chat_messages;
CREATE POLICY "Enable update for message owners" ON public.chat_messages
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for message owners" ON public.chat_messages;
CREATE POLICY "Enable delete for message owners" ON public.chat_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages(user_id);

-- ============================================================================
-- ONLINE USERS TABLE
-- ============================================================================

-- Create online users table for presence tracking
CREATE TABLE IF NOT EXISTS public.chat_online_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    is_typing BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE public.chat_online_users ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_online_users
DROP POLICY IF EXISTS "Enable read access for online users" ON public.chat_online_users;
CREATE POLICY "Enable read access for online users" ON public.chat_online_users
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert and update for own status" ON public.chat_online_users;
CREATE POLICY "Enable insert and update for own status" ON public.chat_online_users
    FOR ALL USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS chat_online_users_last_seen_idx ON public.chat_online_users(last_seen DESC);

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

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_online_users_updated_at ON public.chat_online_users;
CREATE TRIGGER update_chat_online_users_updated_at
    BEFORE UPDATE ON public.chat_online_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up old messages (optional)
CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS void AS $$
BEGIN
    -- Delete messages older than 30 days
    DELETE FROM public.chat_messages 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ language 'plpgsql';

-- Function to clean up offline users
CREATE OR REPLACE FUNCTION public.cleanup_offline_users()
RETURNS void AS $$
BEGIN
    -- Remove users who haven't been seen in the last 10 minutes
    DELETE FROM public.chat_online_users 
    WHERE last_seen < NOW() - INTERVAL '10 minutes';
END;
$$ language 'plpgsql';

-- ============================================================================
-- REALTIME SETUP
-- ============================================================================

-- Enable realtime for chat_messages table
ALTER publication supabase_realtime ADD TABLE public.chat_messages;

-- Enable realtime for chat_online_users table
ALTER publication supabase_realtime ADD TABLE public.chat_online_users;

-- ============================================================================
-- INITIAL DATA AND TESTING
-- ============================================================================

-- Insert a welcome message (optional)
-- INSERT INTO public.chat_messages (user_id, user_email, user_name, message)
-- VALUES (
--     '00000000-0000-0000-0000-000000000000',
--     'system@authlog.com',
--     'System',
--     '🎉 Welcome to the Global Chat! Start chatting with users around the world!'
-- );

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
1. Copy and paste this entire script into your Supabase SQL Editor
2. Run the script to create all tables, policies, and functions
3. Make sure Realtime is enabled for both tables in the Supabase dashboard:
   - Go to Database > Replication
   - Enable replication for 'chat_messages' and 'chat_online_users' tables
4. The chat system will now work with real-time messaging!

Features included:
- Real-time messaging
- User presence tracking
- Typing indicators
- Message history
- Automatic cleanup functions
- Row Level Security for data protection
- Optimized indexes for performance
*/
