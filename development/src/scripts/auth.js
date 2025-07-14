// Supabase configuration
// Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://gmabjefdlwlowsdnazcr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWJqZWZkbHdsb3dzZG5hemNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTAwNTIsImV4cCI6MjA2Nzk4NjA1Mn0.4ugve6E1yVR07dCuCLRPOHubHi8LRJULuCE3kI4jKMY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Prevent multiple redirections
let isRedirecting = false;

// UI Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// Tab switching functionality
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    forms.forEach(form => form.classList.remove('active'));
    
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-form`).classList.add('active');
    
    clearMessages();
}

// Utility functions
function showLoading() {
    loading.style.display = 'block';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

function clearMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

// Check if user is already logged in
async function checkAuthState() {
    if (isRedirecting) return;
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Auth check error:', error);
            return;
        }
        
        if (user && user.email_confirmed_at) {
            // Only redirect if user is confirmed
            console.log('User authenticated and confirmed, redirecting to home');
            isRedirecting = true;
            window.location.href = 'home.html';
        }
    } catch (error) {
        console.error('Error checking auth state:', error);
    }
}

// Email/Password Sign Up
async function signUp(email, password, fullName) {
    try {
        showLoading();
        clearMessages();

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });

        if (error) throw error;

        // Log the signup attempt
        if (data.user) {
            await logUserActivity(data.user.id, 'signup_attempt', 'User attempted to sign up');
        }

        if (data.user && !data.user.email_confirmed_at) {
            showSuccess('Please check your email and click the confirmation link to complete your registration.');
            hideLoading();
        } else if (data.user && data.user.email_confirmed_at) {
            // User is immediately confirmed (some setups do this)
            showSuccess('Account created successfully! Redirecting...');
            
            // Create auth session
            await createAuthSession(data.user.id, 'email');
            
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);
        }
    } catch (error) {
        showError(error.message);
        console.error('Signup error:', error);
        hideLoading();
    }
}

// Email/Password Sign In
async function signIn(email, password) {
    try {
        console.log('Starting sign in process...');
        showLoading();
        clearMessages();

        console.log('Attempting sign in with Supabase...');
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        console.log('Sign in response:', { data, error });

        if (error) {
            console.error('Sign in error:', error);
            throw error;
        }

        if (!data.user) {
            throw new Error('No user data returned');
        }

        console.log('User data:', data.user);
        console.log('Email confirmed:', data.user.email_confirmed_at);

        // Check if user is confirmed
        if (data.user.email_confirmed_at) {
            console.log('User is confirmed, proceeding...');
            
            // Try to create auth session
            try {
                await createAuthSession(data.user.id, 'email');
                console.log('Auth session created successfully');
            } catch (sessionError) {
                console.error('Session creation error:', sessionError);
                // Continue anyway as this is not critical
            }
            
            showSuccess('Signed in successfully! Redirecting...');
            
            setTimeout(() => {
                console.log('Redirecting to home page...');
                window.location.href = 'home.html';
            }, 1000);
        } else {
            console.log('User not confirmed');
            showError('Please check your email and click the confirmation link before signing in.');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        showError(error.message || 'Sign in failed. Please try again.');
    } finally {
        hideLoading();
    }
}

// Google Sign In
async function signInWithGoogle() {
    try {
        console.log('Google login clicked');
        showLoading();
        clearMessages();

        console.log('Attempting Google OAuth with Supabase...');
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/home.html`
            }
        });

        console.log('Google OAuth response:', { data, error });

        if (error) {
            console.error('Google OAuth error:', error);
            throw error;
        }

        console.log('Google OAuth successful, should redirect...');
        // OAuth redirects automatically, no manual redirect needed
    } catch (error) {
        console.error('Google login error:', error);
        showError(`Google login failed: ${error.message}`);
        hideLoading();
    }
}

// Facebook Sign In
async function signInWithFacebook() {
    try {
        console.log('Facebook login clicked');
        showLoading();
        clearMessages();

        console.log('Attempting Facebook OAuth with Supabase...');
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: `${window.location.origin}/home.html`
            }
        });

        console.log('Facebook OAuth response:', { data, error });

        if (error) {
            console.error('Facebook OAuth error:', error);
            throw error;
        }

        console.log('Facebook OAuth successful, should redirect...');
        // OAuth redirects automatically, no manual redirect needed
    } catch (error) {
        console.error('Facebook login error:', error);
        showError(`Facebook login failed: ${error.message}`);
        hideLoading();
    }
}

// Form event listeners
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    await signIn(email, password);
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!fullName || !email || !password || !confirmPassword) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }
    
    await signUp(email, password, fullName);
});

// Listen for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth state changed:', event);
    
    if (isRedirecting) {
        console.log('Already redirecting, ignoring state change');
        return;
    }
    
    if (event === 'SIGNED_IN' && session) {
        console.log('User signed in via auth state change');
        // Only handle OAuth redirects here, not manual login
        if (session.user.app_metadata?.provider && session.user.app_metadata.provider !== 'email') {
            console.log('OAuth sign in detected');
            if (session.user.email_confirmed_at) {
                console.log('OAuth user confirmed, redirecting...');
                isRedirecting = true;
                
                try {
                    await createAuthSession(session.user.id, session.user.app_metadata.provider);
                } catch (error) {
                    console.error('Session creation error:', error);
                }
                
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 500);
            }
        }
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        isRedirecting = false;
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
});

// Make functions available globally
window.showTab = showTab;
window.signInWithGoogle = signInWithGoogle;
window.signInWithFacebook = signInWithFacebook;

// =====================================================
// Database Utility Functions
// =====================================================

// Create authentication session in database
async function createAuthSession(userId, provider) {
    try {
        console.log('Creating auth session for user:', userId, 'provider:', provider);
        
        // Get user's IP and user agent info
        const userAgent = navigator.userAgent;
        const deviceInfo = {
            platform: navigator.platform,
            language: navigator.language,
            screen: {
                width: screen.width,
                height: screen.height
            }
        };

        const { data, error } = await supabase.rpc('create_auth_session', {
            p_user_id: userId,
            p_provider: provider,
            p_user_agent: userAgent,
            p_device_info: deviceInfo
        });

        if (error) {
            console.error('Error creating auth session:', error);
            // Don't throw error - this is not critical for login
        } else {
            console.log('Auth session created successfully:', data);
        }
    } catch (error) {
        console.error('Error in createAuthSession:', error);
        // Don't throw error - this is not critical for login
    }
}

// Log user activity
async function logUserActivity(userId, activityType, description = null, metadata = null) {
    try {
        const { data, error } = await supabase.rpc('log_user_activity', {
            p_user_id: userId,
            p_activity_type: activityType,
            p_description: description,
            p_metadata: metadata
        });

        if (error) {
            console.error('Error logging user activity:', error);
        }
    } catch (error) {
        console.error('Error in logUserActivity:', error);
    }
}

// Get user profile with statistics
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
