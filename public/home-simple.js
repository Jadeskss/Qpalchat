// Simplified home.js to prevent loops
// Supabase configuration
const SUPABASE_URL = 'https://gmabjefdlwlowsdnazcr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWJqZWZkbHdsb3dzZG5hemNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTAwNTIsImV4cCI6MjA2Nzk4NjA1Mn0.4ugve6E1yVR07dCuCLRPOHubHi8LRJULuCE3kI4jKMY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check authentication state - SIMPLE VERSION
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Auth check error:', error);
            return null;
        }
        
        if (!user) {
            console.log('No user found, redirecting to login');
            window.location.href = 'index.html';
            return null;
        }
        
        console.log('User authenticated:', user.email);
        
        // Check if user has completed profile setup
        await checkProfileSetupStatus(user);
        
        return user;
    } catch (error) {
        console.error('Error in checkAuth:', error);
        window.location.href = 'index.html';
        return null;
    }
}

// Check if user needs to complete profile setup
async function checkProfileSetupStatus(user) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('profile_setup_completed')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error checking profile setup:', error);
            return;
        }

        const isSetupComplete = data ? data.profile_setup_completed : false;
        
        if (!isSetupComplete) {
            console.log('User needs to complete profile setup, redirecting...');
            window.location.href = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? '/public/profile-setup.html'
                : '/profile-setup';
        }
    } catch (error) {
        console.error('Error in checkProfileSetupStatus:', error);
        // Continue to home page on error
    }
}

// Sign out function
async function signOut() {
    try {
        console.log('Signing out...');
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        console.log('Signed out successfully');
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

// Load and display user data with profile integration
async function loadUserData() {
    try {
        const user = await checkAuth();
        if (!user) return;

        // Get comprehensive user profile data
        const profileData = await getUserProfileData(supabase, user);
        
        // Update navbar user info
        document.getElementById('userName').textContent = profileData.displayName;
        
        // Update avatars
        const userAvatarEl = document.getElementById('userAvatar');
        const profileAvatarEl = document.getElementById('profileAvatar');
        
        updateAvatarDisplay(userAvatarEl, profileData.avatarUrl, profileData.displayName, profileData.email);
        updateAvatarDisplay(profileAvatarEl, profileData.avatarUrl, profileData.displayName, profileData.email);
        
        // Update welcome section
        document.getElementById('displayName').textContent = profileData.displayName;
        
        // Update profile card
        document.getElementById('profileName').textContent = profileData.displayName;
        document.getElementById('profileEmail').textContent = profileData.email;
        document.getElementById('authProvider').textContent = `${profileData.authProvider} Authentication`;
        
        // Update profile stats - simple version
        document.getElementById('accountCreated').textContent = formatDate(profileData.createdAt);
        document.getElementById('lastLogin').textContent = formatTime(user.last_sign_in_at || profileData.createdAt);
        document.getElementById('authMethod').textContent = getAuthMethodText(user);
        
        // Listen for profile updates
        listenForUserDataUpdates(() => {
            console.log('User data updated, refreshing...');
            loadUserData();
        });
        
    } catch (error) {
        console.error('Error loading user data:', error);
        alert('Error loading user data. Please refresh the page.');
    }
}

// NO auth state listener to prevent loops
// Just handle sign out manually

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Home page loaded');
    loadUserData();
});

// Make signOut function available globally
window.signOut = signOut;
