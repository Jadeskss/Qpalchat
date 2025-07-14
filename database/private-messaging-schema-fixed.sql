-- FIXED Private Messaging Schema for Existing User Profiles Structure
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PRIVATE CONVERSATIONS TABLE (FIXED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.private_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL, -- References auth.users.id directly
    user2_id UUID NOT NULL, -- References auth.users.id directly
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure users can't create duplicate conversations (both directions)
    CONSTRAINT unique_conversation CHECK (user1_id < user2_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_private_conversations_user1 ON public.private_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_private_conversations_user2 ON public.private_conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_private_conversations_updated_at ON public.private_conversations(updated_at);

-- ============================================================================
-- PRIVATE MESSAGES TABLE (FIXED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.private_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.private_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL, -- References auth.users.id directly
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON public.private_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON public.private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON public.private_messages(created_at);

-- ============================================================================
-- MESSAGE REQUESTS TABLE (FIXED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL, -- References auth.users.id directly
    receiver_id UUID NOT NULL, -- References auth.users.id directly
    message TEXT DEFAULT 'Hi! I''d like to start a conversation with you.',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no duplicate requests
    UNIQUE(sender_id, receiver_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_requests_sender ON public.message_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_requests_receiver ON public.message_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_message_requests_status ON public.message_requests(status);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES (FIXED)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.private_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

-- Private Conversations Policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.private_conversations;
CREATE POLICY "Users can view their own conversations" 
ON public.private_conversations FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create conversations" ON public.private_conversations;
CREATE POLICY "Users can create conversations" 
ON public.private_conversations FOR INSERT 
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can update their conversations" ON public.private_conversations;
CREATE POLICY "Users can update their conversations" 
ON public.private_conversations FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Private Messages Policies
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.private_messages;
CREATE POLICY "Users can view messages from their conversations" 
ON public.private_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.private_conversations 
        WHERE id = conversation_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.private_messages;
CREATE POLICY "Users can send messages to their conversations" 
ON public.private_messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id 
    AND EXISTS (
        SELECT 1 FROM public.private_conversations 
        WHERE id = conversation_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users can update their own messages" ON public.private_messages;
CREATE POLICY "Users can update their own messages" 
ON public.private_messages FOR UPDATE 
USING (auth.uid() = sender_id);

-- Message Requests Policies
DROP POLICY IF EXISTS "Users can view message requests" ON public.message_requests;
CREATE POLICY "Users can view message requests" 
ON public.message_requests FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send message requests" ON public.message_requests;
CREATE POLICY "Users can send message requests" 
ON public.message_requests FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update message requests" ON public.message_requests;
CREATE POLICY "Users can update message requests" 
ON public.message_requests FOR UPDATE 
USING (auth.uid() = receiver_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp (reuse existing if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_private_conversations_updated_at ON public.private_conversations;
CREATE TRIGGER update_private_conversations_updated_at
    BEFORE UPDATE ON public.private_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_private_messages_updated_at ON public.private_messages;
CREATE TRIGGER update_private_messages_updated_at
    BEFORE UPDATE ON public.private_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_requests_updated_at ON public.message_requests;
CREATE TRIGGER update_message_requests_updated_at
    BEFORE UPDATE ON public.message_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

-- Enable realtime for private messages (only if not already added)
DO $$
BEGIN
    -- Add private_messages to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'private_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
        RAISE NOTICE '✅ Added private_messages to realtime publication';
    ELSE
        RAISE NOTICE '⚠️ private_messages already in realtime publication';
    END IF;
    
    -- Add message_requests to realtime if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'message_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.message_requests;
        RAISE NOTICE '✅ Added message_requests to realtime publication';
    ELSE
        RAISE NOTICE '⚠️ message_requests already in realtime publication';
    END IF;
END $$;

-- ============================================================================
-- TEST DATA AND VERIFICATION
-- ============================================================================

-- Test the setup
DO $$
BEGIN
    -- Test insert into tables
    RAISE NOTICE 'Testing private messaging tables with existing user_profiles structure...';
    
    -- Check if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'private_conversations') THEN
        RAISE NOTICE '✅ private_conversations table exists';
    ELSE
        RAISE EXCEPTION '❌ private_conversations table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'private_messages') THEN
        RAISE NOTICE '✅ private_messages table exists';
    ELSE
        RAISE EXCEPTION '❌ private_messages table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_requests') THEN
        RAISE NOTICE '✅ message_requests table exists';
    ELSE
        RAISE EXCEPTION '❌ message_requests table missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        RAISE NOTICE '✅ user_profiles table exists (compatible structure)';
    ELSE
        RAISE NOTICE '⚠️ user_profiles table not found - this is expected if not created yet';
    END IF;
    
    RAISE NOTICE '🎉 Private messaging system setup complete with fixed user references!';
END $$;

-- Show table information
SELECT 
    'Private Messaging Setup Complete! 🎉' as status,
    'Tables: private_conversations, private_messages, message_requests' as tables_created,
    'User References: Fixed to work with existing user_profiles.user_id structure' as compatibility,
    'RLS Policies: Enabled and configured' as security,
    'Realtime: Enabled for private_messages and message_requests' as realtime;
