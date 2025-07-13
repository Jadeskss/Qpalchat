-- =====================================================
-- AuthLog Database Schema for Supabase
-- =====================================================
-- This script sets up the complete database structure for
-- the AuthLog authentication system with user profiles,
-- authentication tracking, and security policies.

-- =====================================================
-- 1. Enable Row Level Security (RLS) Extensions
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. User Profiles Table
-- =====================================================

-- Create user profiles table to extend Supabase auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    country TEXT,
    timezone TEXT,
    language TEXT DEFAULT 'en',
    theme_preference TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'auto')),
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deactivated')),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. Authentication Sessions Table
-- =====================================================

-- Track user authentication sessions and login history
CREATE TABLE IF NOT EXISTS public.auth_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT,
    provider TEXT NOT NULL, -- 'email', 'google', 'facebook', etc.
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    location_info JSONB,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. User Activity Log Table
-- =====================================================

-- Track user activities for analytics and security
CREATE TABLE IF NOT EXISTS public.user_activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'login', 'logout', 'profile_update', 'password_change', etc.
    activity_description TEXT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. Password Reset Tokens Table
-- =====================================================

-- Custom password reset functionality
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. Account Verification Table
-- =====================================================

-- Track email verification and other verification processes
CREATE TABLE IF NOT EXISTS public.account_verification (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL, -- 'email', 'phone', 'identity'
    verification_token TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. User Preferences Table
-- =====================================================

-- Store user application preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. Create Indexes for Performance
-- =====================================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_full_name ON public.user_profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_country ON public.user_profiles(country);
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_status ON public.user_profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active ON public.user_profiles(last_active_at);

-- Auth sessions indexes
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON public.auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_provider ON public.auth_sessions(provider);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_is_active ON public.auth_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_login_at ON public.auth_sessions(login_at);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity_log(created_at);

-- Password reset tokens indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- Account verification indexes
CREATE INDEX IF NOT EXISTS idx_account_verification_user_id ON public.account_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_account_verification_type ON public.account_verification(verification_type);
CREATE INDEX IF NOT EXISTS idx_account_verification_token ON public.account_verification(verification_token);

-- =====================================================
-- 9. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view their own profile" 
    ON public.user_profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.user_profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON public.user_profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Auth Sessions Policies
CREATE POLICY "Users can view their own sessions" 
    ON public.auth_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" 
    ON public.auth_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
    ON public.auth_sessions FOR UPDATE 
    USING (auth.uid() = user_id);

-- User Activity Log Policies
CREATE POLICY "Users can view their own activity" 
    ON public.user_activity_log FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Service can insert activity logs" 
    ON public.user_activity_log FOR INSERT 
    WITH CHECK (true); -- Allow service role to insert

-- Password Reset Tokens Policies
CREATE POLICY "Users can view their own reset tokens" 
    ON public.password_reset_tokens FOR SELECT 
    USING (auth.uid() = user_id);

-- Account Verification Policies
CREATE POLICY "Users can view their own verification records" 
    ON public.account_verification FOR SELECT 
    USING (auth.uid() = user_id);

-- User Preferences Policies
CREATE POLICY "Users can manage their own preferences" 
    ON public.user_preferences FOR ALL 
    USING (auth.uid() = user_id);

-- =====================================================
-- 10. Database Functions
-- =====================================================

-- Function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NOW(),
        NOW()
    );
    
    -- Log the registration activity
    INSERT INTO public.user_activity_log (user_id, activity_type, activity_description, created_at)
    VALUES (
        NEW.id,
        'registration',
        'User account created',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log user activity
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO public.user_activity_log (
        user_id, 
        activity_type, 
        activity_description, 
        metadata, 
        created_at
    )
    VALUES (
        p_user_id,
        p_activity_type,
        p_description,
        p_metadata,
        NOW()
    )
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create auth session
CREATE OR REPLACE FUNCTION public.create_auth_session(
    p_user_id UUID,
    p_provider TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    -- End any existing active sessions for this user
    UPDATE public.auth_sessions 
    SET is_active = false, logout_at = NOW()
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Create new session
    INSERT INTO public.auth_sessions (
        user_id,
        provider,
        ip_address,
        user_agent,
        device_info,
        login_at,
        is_active,
        created_at
    )
    VALUES (
        p_user_id,
        p_provider,
        p_ip_address,
        p_user_agent,
        p_device_info,
        NOW(),
        true,
        NOW()
    )
    RETURNING id INTO session_id;
    
    -- Update last active timestamp
    UPDATE public.user_profiles 
    SET last_active_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the login activity
    PERFORM public.log_user_activity(
        p_user_id,
        'login',
        'User logged in via ' || p_provider,
        jsonb_build_object(
            'provider', p_provider,
            'ip_address', p_ip_address,
            'user_agent', p_user_agent
        )
    );
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with stats
CREATE OR REPLACE FUNCTION public.get_user_profile_with_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    profile_data JSONB;
    login_count INTEGER;
    last_login TIMESTAMP WITH TIME ZONE;
    account_age_days INTEGER;
BEGIN
    -- Get basic profile data
    SELECT row_to_json(up.*) INTO profile_data
    FROM public.user_profiles up
    WHERE up.id = p_user_id;
    
    -- Get login statistics
    SELECT COUNT(*), MAX(login_at) INTO login_count, last_login
    FROM public.auth_sessions
    WHERE user_id = p_user_id;
    
    -- Calculate account age
    SELECT EXTRACT(DAY FROM NOW() - created_at) INTO account_age_days
    FROM public.user_profiles
    WHERE id = p_user_id;
    
    -- Combine all data
    RETURN jsonb_build_object(
        'profile', profile_data,
        'stats', jsonb_build_object(
            'login_count', COALESCE(login_count, 0),
            'last_login', last_login,
            'account_age_days', COALESCE(account_age_days, 0)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. Database Triggers
-- =====================================================

-- Trigger to create user profile when new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at on user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 12. Views for Common Queries
-- =====================================================

-- View for user dashboard data
CREATE OR REPLACE VIEW public.user_dashboard AS
SELECT 
    up.id,
    up.full_name,
    up.avatar_url,
    up.account_status,
    up.last_active_at,
    up.created_at as account_created,
    au.email,
    au.email_confirmed_at,
    au.last_sign_in_at,
    (
        SELECT COUNT(*) 
        FROM public.auth_sessions asess 
        WHERE asess.user_id = up.id
    ) as total_logins,
    (
        SELECT provider 
        FROM public.auth_sessions asess 
        WHERE asess.user_id = up.id 
        ORDER BY login_at DESC 
        LIMIT 1
    ) as last_login_provider
FROM public.user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;

-- View for recent user activity
CREATE OR REPLACE VIEW public.recent_user_activity AS
SELECT 
    ual.id,
    ual.user_id,
    up.full_name,
    ual.activity_type,
    ual.activity_description,
    ual.created_at
FROM public.user_activity_log ual
LEFT JOIN public.user_profiles up ON ual.user_id = up.id
ORDER BY ual.created_at DESC;

-- =====================================================
-- 13. Sample Data (Optional - for testing)
-- =====================================================

-- You can uncomment these to create sample data for testing
/*
-- Insert sample user preferences structure
INSERT INTO public.user_preferences (user_id, preferences) 
SELECT 
    id,
    jsonb_build_object(
        'theme', 'light',
        'language', 'en',
        'notifications', jsonb_build_object(
            'email', true,
            'push', true,
            'marketing', false
        ),
        'privacy', jsonb_build_object(
            'profile_visibility', 'public',
            'show_activity', true
        )
    )
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_preferences up 
    WHERE up.user_id = auth.users.id
);
*/

-- =====================================================
-- 14. Cleanup Functions (for maintenance)
-- =====================================================

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.password_reset_tokens
    WHERE expires_at < NOW() OR used_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM public.account_verification
    WHERE expires_at < NOW() AND verified_at IS NULL;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old activity logs (older than 1 year)
CREATE OR REPLACE FUNCTION public.archive_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    DELETE FROM public.user_activity_log
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 15. Grant Permissions
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to anon users for public access
GRANT USAGE ON SCHEMA public TO anon;

-- =====================================================
-- Script Execution Complete
-- =====================================================

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'AuthLog database schema setup completed successfully!';
    RAISE NOTICE 'Tables created: user_profiles, auth_sessions, user_activity_log, password_reset_tokens, account_verification, user_preferences';
    RAISE NOTICE 'Functions created: handle_new_user, create_auth_session, log_user_activity, get_user_profile_with_stats';
    RAISE NOTICE 'Views created: user_dashboard, recent_user_activity';
    RAISE NOTICE 'RLS policies enabled for all tables';
    RAISE NOTICE 'Ready for use with your AuthLog application!';
END $$;
