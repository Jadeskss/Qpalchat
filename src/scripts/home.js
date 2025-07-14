// Supabase configuration
// Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://gmabjefdlwlowsdnazcr.supabase.co';
const SUPABASE_ANON_KEY = 'YeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWJqZWZkbHdsb3dzZG5hemNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTAwNTIsImV4cCI6MjA2Nzk4NjA1Mn0.4ugve6E1yVR07dCuCLRPOHubHi8LRJULuCE3kI4jKMY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Prevent multiple redirections
let isRedirecting = false;

// Check authentication state and redirect if not logged in
async function checkAuth() {
    if (isRedirecting) return null;
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Auth check error:', error);
            isRedirecting = true;
            window.location.href = 'index.html';
            return null;
        }
        
        if (!user) {
            console.log('No user found, redirecting to login');
            isRedirecting = true;
            window.location.href = 'index.html';
            return null;
        }
        
        if (!user.email_confirmed_at) {
            console.log('User not confirmed, redirecting to login');
            isRedirecting = true;
            window.location.href = 'index.html';
            return null;
        }
        
        console.log('User authenticated and confirmed');
        return user;
    } catch (error) {
        console.error('Error in checkAuth:', error);
        isRedirecting = true;
        window.location.href = 'index.html';
        return null;
    }
}

// Sign out function
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error.message);
        alert('Error signing out. Please try again.');
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format time for display
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) {
        return 'Just now';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
        return formatDate(dateString);
    }
}

// Get authentication provider display name
function getAuthProvider(user) {
    if (user.app_metadata?.provider) {
        const provider = user.app_metadata.provider;
        switch (provider) {
            case 'google':
                return 'Google';
            case 'facebook':
                return 'Facebook';
            case 'email':
                return 'Email';
            default:
                return provider.charAt(0).toUpperCase() + provider.slice(1);
        }
    }
    return 'Email';
}

// Get user's initials for avatar
function getUserInitials(name, email) {
    if (name) {
        const nameParts = name.split(' ');
        if (nameParts.length >= 2) {
            return nameParts[0][0].toUpperCase() + nameParts[1][0].toUpperCase();
        }
        return nameParts[0][0].toUpperCase();
    }
    
    if (email) {
        return email[0].toUpperCase();
    }
    
    return 'U';
}

// Load and display user data
async function loadUserData() {
    try {
        const user = await checkAuth();
        if (!user) return;

        // Get enhanced user profile with stats from database
        const profileWithStats = await getUserProfileWithStats(user.id);
        
        // Extract user information (fallback to auth.users data if profile not found)
        const displayName = profileWithStats?.profile?.full_name || 
                           user.user_metadata?.full_name || 
                           user.user_metadata?.name || 
                           user.email?.split('@')[0] || 
                           'User';
        
        const email = user.email || 'No email provided';
        const authProvider = getAuthProvider(user);
        const initials = getUserInitials(displayName, email);
        
        // Update navbar user info
        document.getElementById('userName').textContent = displayName;
        document.getElementById('userInitial').textContent = initials;
        
        // Update welcome section
        document.getElementById('displayName').textContent = displayName;
        
        // Update profile card
        document.getElementById('profileName').textContent = displayName;
        document.getElementById('profileEmail').textContent = email;
        document.getElementById('profileInitial').textContent = initials;
        document.getElementById('authProvider').textContent = `${authProvider} Authentication`;
        
        // Update profile stats with enhanced database data
        if (profileWithStats) {
            document.getElementById('accountCreated').textContent = formatDate(profileWithStats.profile.created_at);
            document.getElementById('lastLogin').textContent = formatTime(profileWithStats.stats.last_login || profileWithStats.profile.created_at);
            
            // Show total login count if available
            const loginCount = profileWithStats.stats.login_count;
            if (loginCount > 0) {
                document.getElementById('authMethod').textContent = `${getAuthMethodText(user)} (${loginCount} logins)`;
            } else {
                document.getElementById('authMethod').textContent = getAuthMethodText(user);
            }
        } else {
            // Fallback to basic auth.users data
            document.getElementById('accountCreated').textContent = formatDate(user.created_at);
            document.getElementById('lastLogin').textContent = formatTime(user.last_sign_in_at || user.created_at);
            document.getElementById('authMethod').textContent = getAuthMethodText(user);
        }
        
        // Load user activity log
        await loadUserActivity(user.id);
        
        // Load login history
        await loadLoginHistory(user.id);
        
    } catch (error) {
        console.error('Error loading user data:', error);
        alert('Error loading user data. Please refresh the page.');
    }
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Home page - Auth state changed:', event);
    
    if (isRedirecting) return;
    
    if (event === 'SIGNED_OUT') {
        console.log('User signed out, redirecting to login');
        isRedirecting = true;
        window.location.href = 'index.html';
    } else if (event === 'SIGNED_IN' && session) {
        console.log('User signed in on home page');
        // User is already on home page, no need to redirect
        if (!session.user.email_confirmed_at) {
            console.log('User not confirmed, redirecting to login');
            isRedirecting = true;
            window.location.href = 'index.html';
        }
    }
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
});

// Make signOut function available globally
window.signOut = signOut;

// =====================================================
// Enhanced Database Functions
// =====================================================

// Get authentication method text
function getAuthMethodText(user) {
    if (user.app_metadata?.provider) {
        switch (user.app_metadata.provider) {
            case 'google':
                return 'Google OAuth';
            case 'facebook':
                return 'Facebook OAuth';
            default:
                return 'Social OAuth';
        }
    }
    return 'Email/Password';
}

// Get user profile with statistics from database
async function getUserProfileWithStats(userId) {
    try {
        const { data, error } = await supabase.rpc('get_user_profile_with_stats', {
            p_user_id: userId
        });

        if (error) {
            console.error('Error getting user profile with stats:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error in getUserProfileWithStats:', error);
        return null;
    }
}

// Load and display user activity log
async function loadUserActivity(userId, limit = 10) {
    try {
        const { data, error } = await supabase
            .from('user_activity_log')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error loading user activity:', error);
            return;
        }

        // You can add UI to display this activity log
        console.log('Recent user activity:', data);
        
    } catch (error) {
        console.error('Error in loadUserActivity:', error);
    }
}

// Load login history
async function loadLoginHistory(userId, limit = 10) {
    try {
        const { data, error } = await supabase
            .from('auth_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('login_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error loading login history:', error);
            return;
        }

        // You can add UI to display this login history
        console.log('Recent login history:', data);
        
    } catch (error) {
        console.error('Error in loadLoginHistory:', error);
    }
}

// Update user profile
async function updateUserProfile(userId, updates) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            console.error('Error updating user profile:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in updateUserProfile:', error);
        return false;
    }
}

// Get user preferences
async function getUserPreferences(userId) {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('preferences')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error getting user preferences:', error);
            return null;
        }

        return data?.preferences || {};
    } catch (error) {
        console.error('Error in getUserPreferences:', error);
        return null;
    }
}

// Update user preferences
async function updateUserPreferences(userId, preferences) {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: userId,
                preferences: preferences,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error updating user preferences:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in updateUserPreferences:', error);
        return false;
    }
}
