-- First, add required columns to user_profiles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'role'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'is_banned'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN is_banned BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'last_seen'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add email column to user_profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN email TEXT;
    END IF;
END $$;

-- Create announcements table for admin system
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'info' CHECK (priority IN ('info', 'warning', 'urgent')),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Create RLS policies for announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all authenticated users to view active announcements" ON announcements;
DROP POLICY IF EXISTS "Allow admin users to manage announcements" ON announcements;

-- Allow all authenticated users to read active announcements
CREATE POLICY "Allow all authenticated users to view active announcements" ON announcements
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Only allow admin users to manage announcements
CREATE POLICY "Allow admin users to manage announcements" ON announcements
    FOR ALL TO authenticated
    USING (
        auth.uid() IN (
            SELECT user_id FROM user_profiles 
            WHERE role = 'admin' OR role = 'super_admin'
        )
    );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_announcements_updated_at();

-- Create user_bans table for ban management
CREATE TABLE IF NOT EXISTS user_bans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    banned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_permanent BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS for user_bans
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow admin users to manage bans" ON user_bans;

-- Only allow admin users to manage bans
CREATE POLICY "Allow admin users to manage bans" ON user_bans
    FOR ALL TO authenticated
    USING (
        auth.uid() IN (
            SELECT user_id FROM user_profiles 
            WHERE role = 'admin' OR role = 'super_admin'
        )
    );

-- Create function to update last_seen automatically
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_profiles 
    SET last_seen = NOW() 
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to update last_seen when user is active
DROP TRIGGER IF EXISTS update_last_seen_on_message ON chat_messages;
CREATE TRIGGER update_last_seen_on_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_seen();

DROP TRIGGER IF EXISTS update_last_seen_on_private_message ON private_messages;
CREATE TRIGGER update_last_seen_on_private_message
    AFTER INSERT ON private_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_seen();

-- Set default role for all existing users
UPDATE user_profiles SET role = 'user' WHERE role IS NULL;

-- Set super admin user
UPDATE user_profiles SET role = 'super_admin' WHERE user_id = 'eccee6e4-8806-46ce-8f7d-abb1b343195a';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON user_profiles(last_seen);
