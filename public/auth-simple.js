// Simplified auth.js for testing - without database functions
// Supabase configuration
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
    // Don't check auth state on page load to prevent loops
    console.log('Skipping initial auth check to prevent loops');
}

// Check if user has completed profile setup
async function checkProfileSetup(userId) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('profile_setup_completed')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Error checking profile setup:', error);
            return false;
        }

        return data ? data.profile_setup_completed : false;
    } catch (error) {
        console.error('Error in checkProfileSetup:', error);
        return false;
    }
}

// Redirect user based on profile setup status
async function redirectAfterAuth(user) {
    try {
        const isSetupComplete = await checkProfileSetup(user.id);
        
        if (!isSetupComplete) {
            // New user needs to complete profile setup
            console.log('User needs to complete profile setup, redirecting...');
            window.location.href = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? '/public/profile-setup.html'
                : '/profile-setup';
        } else {
            // Existing user, go to home
            console.log('User profile complete, redirecting to home...');
            window.location.href = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? '/public/home.html'
                : '/home';
        }
    } catch (error) {
        console.error('Error in redirectAfterAuth:', error);
        // Fallback to home page
        window.location.href = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? '/public/home.html'
            : '/home';
    }
}

// Email/Password Sign Up
async function signUp(email, password, fullName) {
    try {
        console.log('Starting sign up process...');
        showLoading();
        clearMessages();

        // First try to sign up
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? window.location.origin + '/public/home.html'
                    : window.location.origin + '/home'
            }
        });

        console.log('Sign up response:', { data, error });

        if (error) {
            // Handle specific errors
            if (error.message.includes('already registered')) {
                throw new Error('This email is already registered. Please try logging in instead.');
            }
            throw error;
        }

        if (data.user) {
            if (data.user.email_confirmed_at) {
                // Email is already confirmed (auto-confirm is enabled)
                showSuccess('Account created successfully! Setting up your profile...');
                setTimeout(async () => {
                    await redirectAfterAuth(data.user);
                }, 1500);
            } else {
                // Email confirmation required
                showSuccess('Account created! Please check your email and click the confirmation link to complete registration.');
            }
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError(error.message || 'Failed to create account. Please try again.');
    } finally {
        hideLoading();
    }
}

// Email/Password Sign In - SIMPLIFIED
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

        // Check profile setup and redirect accordingly
        if (data.user.email_confirmed_at) {
            console.log('User is confirmed, checking profile setup...');
            showSuccess('Signed in successfully! Redirecting...');
            
            setTimeout(async () => {
                await redirectAfterAuth(data.user);
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

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                    ? `${window.location.origin}/public/home.html`
                    : `${window.location.origin}/home`
            }
        });

        if (error) {
            console.error('Google OAuth error:', error);
            throw error;
        }

        console.log('Google OAuth initiated');
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

        // Check if we're on localhost and show helpful message
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Running on localhost - make sure Facebook app domains are configured');
        }

        console.log('Attempting Facebook OAuth...');
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
                redirectTo: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? `${window.location.origin}/public/home.html`
                    : `${window.location.origin}/home`,
                scopes: 'email'
            }
        });

        if (error) {
            console.error('Facebook OAuth error:', error);
            if (error.message.includes('domain')) {
                showError('Facebook domain not configured. Please add your domain to Facebook App settings.');
            } else {
                showError(`Facebook login failed: ${error.message}`);
            }
            hideLoading();
            return;
        }

        console.log('Facebook OAuth initiated successfully');
        // OAuth will handle redirect automatically
    } catch (error) {
        console.error('Facebook login error:', error);
        if (error.message.includes('domain')) {
            showError('Facebook domain configuration error. Check console for details.');
        } else {
            showError(`Facebook login failed: ${error.message}`);
        }
        hideLoading();
    }
}

// Form event listeners
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    console.log('Login form submitted:', email);
    
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

// Simplified auth state listener - NO AUTO REDIRECTS
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    // Don't auto-redirect to prevent loops
    // Only log the state change for debugging
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded - NO auto auth check to prevent loops');
    // Don't call checkAuthState() to prevent loops
});

// Make functions available globally
window.showTab = showTab;
window.signInWithGoogle = signInWithGoogle;
window.signInWithFacebook = signInWithFacebook;
