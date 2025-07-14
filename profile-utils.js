// Shared profile utilities for AuthLog
// Use this in home.js, chat.js, and profile.js for consistent user data

// Get user profile data with fallbacks
async function getUserProfileData(supabase, user) {
    if (!user) return null;
    
    try {
        // Try to get profile from user_profiles table
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
        if (profile && !error) {
            return {
                id: user.id,
                email: user.email,
                displayName: profile.full_name || profile.username || getUserDisplayName(user),
                username: profile.username,
                fullName: profile.full_name,
                avatarUrl: profile.avatar_url,
                authProvider: getAuthProvider(user),
                createdAt: user.created_at,
                hasProfile: true
            };
        }
    } catch (profileError) {
        console.log('Profile not found, using auth data');
    }
    
    // Fallback to auth metadata
    return {
        id: user.id,
        email: user.email,
        displayName: getUserDisplayName(user),
        username: null,
        fullName: user.user_metadata?.full_name,
        avatarUrl: null,
        authProvider: getAuthProvider(user),
        createdAt: user.created_at,
        hasProfile: false
    };
}

// Get display name from auth metadata
function getUserDisplayName(user) {
    return user.user_metadata?.full_name || 
           user.user_metadata?.name || 
           user.email?.split('@')[0] || 
           'User';
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

// Update avatar display (works for any avatar element)
function updateAvatarDisplay(avatarContainer, avatarUrl, displayName, email) {
    if (avatarUrl) {
        avatarContainer.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
        const initials = getUserInitials(displayName, email);
        avatarContainer.innerHTML = `<span>${initials}</span>`;
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

// Refresh user data event (for cross-page updates)
function triggerUserDataRefresh() {
    // Dispatch custom event that other pages can listen to
    window.dispatchEvent(new CustomEvent('userDataUpdated'));
}

// Listen for user data updates (use in home.js)
function listenForUserDataUpdates(callback) {
    window.addEventListener('userDataUpdated', callback);
}
