-- Admin Security Logs Table
-- Run this in your Supabase SQL Editor to create the admin activity logging table

-- ============================================================================
-- ADMIN LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_user_id ON public.admin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_logs (only admins can read/write)
DROP POLICY IF EXISTS "Admin logs read access" ON public.admin_logs;
CREATE POLICY "Admin logs read access" ON public.admin_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admin logs insert access" ON public.admin_logs;
CREATE POLICY "Admin logs insert access" ON public.admin_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- ADMIN SESSION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON public.admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_active ON public.admin_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_created_at ON public.admin_sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_sessions
DROP POLICY IF EXISTS "Admin sessions read access" ON public.admin_sessions;
CREATE POLICY "Admin sessions read access" ON public.admin_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admin sessions insert access" ON public.admin_sessions;
CREATE POLICY "Admin sessions insert access" ON public.admin_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admin sessions update access" ON public.admin_sessions;
CREATE POLICY "Admin sessions update access" ON public.admin_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- ============================================================================
-- SECURITY FUNCTIONS
-- ============================================================================

-- Function to automatically end admin sessions after inactivity
CREATE OR REPLACE FUNCTION auto_end_inactive_admin_sessions()
RETURNS void AS $$
BEGIN
    UPDATE public.admin_sessions 
    SET 
        session_end = NOW(),
        is_active = FALSE
    WHERE 
        is_active = TRUE 
        AND session_start < (NOW() - INTERVAL '8 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin activity with additional security context
CREATE OR REPLACE FUNCTION log_admin_activity(
    p_user_id UUID,
    p_action TEXT,
    p_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.admin_logs (
        user_id,
        action,
        details,
        created_at
    ) VALUES (
        p_user_id,
        p_action,
        p_details,
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECURITY TRIGGERS
-- ============================================================================

-- Trigger to automatically log admin dashboard access
CREATE OR REPLACE FUNCTION log_admin_dashboard_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when admin accesses sensitive tables
    IF TG_TABLE_NAME IN ('user_profiles', 'chat_messages', 'private_messages') THEN
        PERFORM log_admin_activity(
            auth.uid(),
            'table_access',
            jsonb_build_object(
                'table_name', TG_TABLE_NAME,
                'operation', TG_OP,
                'timestamp', NOW()
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for sensitive table access (optional - uncomment if needed)
-- DROP TRIGGER IF EXISTS audit_user_profiles_access ON public.user_profiles;
-- CREATE TRIGGER audit_user_profiles_access
--     AFTER SELECT ON public.user_profiles
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION log_admin_dashboard_access();

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up old logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_admin_logs()
RETURNS void AS $$
BEGIN
    -- Keep only last 90 days of logs
    DELETE FROM public.admin_logs 
    WHERE created_at < (NOW() - INTERVAL '90 days');
    
    -- Clean up old inactive sessions
    DELETE FROM public.admin_sessions 
    WHERE 
        is_active = FALSE 
        AND session_end < (NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_sessions TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.admin_logs IS 'Security audit log for admin activities';
COMMENT ON TABLE public.admin_sessions IS 'Active admin session tracking for security monitoring';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Admin security logging tables created successfully!';
    RAISE NOTICE 'Tables created: admin_logs, admin_sessions';
    RAISE NOTICE 'Security policies and functions are now active.';
END $$;
