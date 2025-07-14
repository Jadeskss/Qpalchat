// Admin Login JavaScript
// Supabase configuration
const SUPABASE_URL = 'https://gmabjefdlwlowsdnazcr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWJqZWZkbHdsb3dzZG5hemNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTAwNTIsImV4cCI6MjA2Nzk4NjA1Mn0.4ugve6E1yVR07dCuCLRPOHubHi8LRJULuCE3kI4jKMY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin login functionality
document.addEventListener('DOMContentLoaded', () => {
    checkExistingSession();
    setupLoginForm();
});

// Check if user is already logged in and has admin privileges
async function checkExistingSession() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            console.log('No existing session found');
            return;
        }

        console.log('Existing session found, checking admin status...');
        
        // Check if user has admin role
        const isAdmin = await verifyAdminRole(user.id);
        
        if (isAdmin) {
            console.log('User has admin privileges, redirecting...');
            redirectToAdminDashboard();
        } else {
            console.log('User does not have admin privileges');
            showError('Your account does not have administrative privileges.');
        }
        
    } catch (error) {
        console.error('Error checking existing session:', error);
    }
}

// Setup login form event listeners
function setupLoginForm() {
    const form = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('adminEmail');
    const passwordInput = document.getElementById('adminPassword');

    // Handle form submission
    form.addEventListener('submit', handleAdminLogin);

    // Handle Enter key press
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAdminLogin(e);
        }
    });

    // Clear error message when user starts typing
    emailInput.addEventListener('input', clearError);
    passwordInput.addEventListener('input', clearError);
}

// Handle admin login
async function handleAdminLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    // Validate inputs
    if (!email || !password) {
        showError('Please enter both email and password.');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    showLoading(true);
    clearError();

    try {
        console.log('Attempting admin login for:', email);
        
        // Sign in with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error('Authentication error:', error);
            
            // Handle specific error types
            if (error.message.includes('Invalid login credentials')) {
                showError('Invalid email or password. Please check your credentials.');
            } else if (error.message.includes('Email not confirmed')) {
                showError('Please verify your email address before logging in.');
            } else if (error.message.includes('Too many requests')) {
                showError('Too many login attempts. Please wait a moment and try again.');
            } else {
                showError(`Login failed: ${error.message}`);
            }
            
            showLoading(false);
            return;
        }

        console.log('Authentication successful, checking admin role...');
        
        // Verify admin role
        const isAdmin = await verifyAdminRole(data.user.id);
        
        if (!isAdmin) {
            console.log('User authenticated but lacks admin privileges');
            
            // Sign out the user since they don't have admin privileges
            await supabase.auth.signOut();
            
            showError('Access denied. Your account does not have administrative privileges.');
            showLoading(false);
            return;
        }

        console.log('Admin verification successful, redirecting...');
        
        // Log successful admin login
        await logAdminActivity(data.user.id, 'admin_login', {
            email: email,
            timestamp: new Date().toISOString(),
            ip_address: await getUserIP()
        });

        // Redirect to admin dashboard
        showLoading(false);
        redirectToAdminDashboard();

    } catch (error) {
        console.error('Unexpected error during admin login:', error);
        showError('An unexpected error occurred. Please try again.');
        showLoading(false);
    }
}

// Verify if user has admin role
async function verifyAdminRole(userId) {
    try {
        console.log('Verifying admin role for user:', userId);
        
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('role, username, full_name')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            return false;
        }

        console.log('User profile:', profile);
        console.log('User role:', profile?.role);

        // Check if user has admin or super_admin role
        const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
        
        console.log('Is admin?', isAdmin);
        
        return isAdmin;
        
    } catch (error) {
        console.error('Error verifying admin role:', error);
        return false;
    }
}

// Log admin activity for security auditing
async function logAdminActivity(userId, action, details = {}) {
    try {
        const { error } = await supabase
            .from('admin_logs')
            .insert([{
                user_id: userId,
                action: action,
                details: details,
                created_at: new Date().toISOString()
            }]);

        if (error) {
            console.warn('Failed to log admin activity:', error);
            // Don't throw error as this is not critical for login flow
        }
    } catch (error) {
        console.warn('Error logging admin activity:', error);
    }
}

// Get user IP address for logging
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.warn('Failed to get user IP:', error);
        return 'unknown';
    }
}

// Redirect to admin dashboard
function redirectToAdminDashboard() {
    // Add a small delay to show success feedback
    setTimeout(() => {
        window.location.href = '/admin-dashboard';
    }, 500);
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showLoading(show) {
    const loadingIndicator = document.getElementById('adminLoadingIndicator');
    const loginButton = document.getElementById('adminLoginButton');
    const form = document.getElementById('adminLoginForm');
    
    if (show) {
        loadingIndicator.style.display = 'flex';
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        form.style.opacity = '0.7';
    } else {
        loadingIndicator.style.display = 'none';
        loginButton.disabled = false;
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Access Admin Dashboard';
        form.style.opacity = '1';
    }
}

function showError(message) {
    const errorElement = document.getElementById('adminErrorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Scroll to top to ensure error is visible
    document.querySelector('.admin-login-card').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

function clearError() {
    const errorElement = document.getElementById('adminErrorMessage');
    errorElement.style.display = 'none';
}

// Security: Clear sensitive data on page unload
window.addEventListener('beforeunload', () => {
    // Clear password field
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput) {
        passwordInput.value = '';
    }
});

// Security: Detect and handle suspicious activity
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function handleFailedLogin() {
    loginAttempts++;
    
    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        showError(`Too many failed attempts. Please wait 15 minutes before trying again.`);
        
        // Disable the form temporarily
        const form = document.getElementById('adminLoginForm');
        form.style.pointerEvents = 'none';
        form.style.opacity = '0.5';
        
        // Re-enable after lockout time
        setTimeout(() => {
            form.style.pointerEvents = 'auto';
            form.style.opacity = '1';
            loginAttempts = 0;
            clearError();
        }, LOCKOUT_TIME);
        
        return true; // Indicates lockout
    }
    
    return false; // No lockout
}

// Enhanced error handling with attempt tracking
const originalHandleAdminLogin = handleAdminLogin;
handleAdminLogin = async function(event) {
    event.preventDefault();
    
    // Check if locked out
    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        showError('Account temporarily locked due to multiple failed attempts.');
        return;
    }
    
    try {
        await originalHandleAdminLogin.call(this, event);
        // Reset attempts on successful login
        loginAttempts = 0;
    } catch (error) {
        const isLockedOut = handleFailedLogin();
        if (!isLockedOut) {
            throw error; // Re-throw if not locked out
        }
    }
};

console.log('Admin login script loaded successfully');
