-- Add missing columns to user_profiles table for profile setup
-- Run this in your Supabase SQL Editor

-- Add the bio column if it doesn't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add the profile_setup_completed column if it doesn't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS profile_setup_completed BOOLEAN DEFAULT FALSE;

-- Add updated_at column if it doesn't exist (should already exist from schema)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Add constraint for bio length
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS bio_length;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT bio_length CHECK (length(bio) <= 500);

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing users to have profile_setup_completed = true 
-- (assuming existing users have already set up their profiles)
UPDATE public.user_profiles 
SET profile_setup_completed = TRUE 
WHERE profile_setup_completed IS NULL OR profile_setup_completed = FALSE;

-- Add comments for documentation
COMMENT ON COLUMN public.user_profiles.bio 
IS 'User biography or description (max 500 characters)';

COMMENT ON COLUMN public.user_profiles.profile_setup_completed 
IS 'Indicates whether the user has completed the initial profile setup wizard';
