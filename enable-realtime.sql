-- Alternative realtime setup for Supabase
-- Run this AFTER running the main chat-schema.sql

-- Enable realtime on the tables directly
BEGIN;

-- Add tables to realtime publication
ALTER publication supabase_realtime ADD TABLE public.chat_messages;
ALTER publication supabase_realtime ADD TABLE public.chat_online_users;

-- If the above doesn't work, try this alternative method:
-- Enable realtime replication
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_online_users REPLICA IDENTITY FULL;

COMMIT;

-- Test if realtime is working
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
