// Profile Setup JavaScript
const SUPABASE_URL = 'https://gmabjefdlwlowsdnazcr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWJqZWZkbHdsb3dzZG5hemNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTAwNTIsImV4cCI6MjA2Nzk4NjA1Mn0.4ugve6E1yVR07dCuCLRPOHubHi8LRJULuCE3kI4jKMY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Setup state
let currentStepNum = 1;
let profileData = {
    displayName: '',
    bio: '',
    avatarFile: null,
    avatarUrl: '',
    notifications: true,
    publicProfile: true
};

// UI Elements
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const progressFill = document.getElementById('progressFill');
const currentStep = document.getElementById('currentStep');
const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');

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

// Step navigation
function updateProgress() {
    const progress = (currentStepNum / 3) * 100;
    progressFill.style.width = progress + '%';
    currentStep.textContent = currentStepNum;
}

function showStep(stepNum) {
    // Hide all steps
    document.querySelectorAll('.setup-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show current step
    document.getElementById(`step${stepNum}`).classList.add('active');
    
    currentStepNum = stepNum;
    updateProgress();
    clearMessages();
}

function nextStep() {
    if (currentStepNum < 3) {
        showStep(currentStepNum + 1);
    }
}

function prevStep() {
    if (currentStepNum > 1) {
        showStep(currentStepNum - 1);
    }
}

// Avatar handling
function setupAvatarUpload() {
    const avatarContainer = document.querySelector('.avatar-preview');
    
    avatarContainer.addEventListener('click', () => {
        avatarInput.click();
    });
    
    avatarInput.addEventListener('change', handleAvatarChange);
}

function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
        showError('Please select a valid image file');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showError('Image must be less than 5MB');
        return;
    }
    
    // Store file and preview
    profileData.avatarFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        avatarPreview.src = e.target.result;
        document.getElementById('uploadBtn').textContent = 'Next Step';
    };
    reader.readAsDataURL(file);
}

// Upload avatar to Supabase Storage
async function uploadAvatar(userId) {
    if (!profileData.avatarFile) return null;
    
    try {
        const fileExt = profileData.avatarFile.name.split('.').pop();
        const fileName = `${userId}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(fileName, profileData.avatarFile, {
                upsert: true
            });
        
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
        
        return publicUrl;
    } catch (error) {
        console.error('Avatar upload error:', error);
        return null;
    }
}

// Save profile to database
async function saveProfile(userId) {
    try {
        // Upload avatar if exists
        let avatarUrl = null;
        if (profileData.avatarFile) {
            avatarUrl = await uploadAvatar(userId);
        }
        
        // Prepare profile data to match database schema
        const profileUpdateData = {
            user_id: userId,
            username: profileData.displayName,
            full_name: profileData.displayName, // Use displayName as full_name
            bio: profileData.bio,
            avatar_url: avatarUrl,
            profile_setup_completed: true
        };
        
        // Update or insert profile
        const { data, error } = await supabase
            .from('user_profiles')
            .upsert(profileUpdateData)
            .select();
        
        if (error) throw error;
        
        return data[0];
    } catch (error) {
        console.error('Profile save error:', error);
        throw error;
    }
}

// Complete setup process
async function completeSetup() {
    try {
        showLoading();
        clearMessages();
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            throw new Error('User not authenticated');
        }
        
        // Save profile data
        await saveProfile(user.id);
        
        showSuccess('Profile setup complete! Redirecting to your dashboard...');
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? '/public/home.html'
                : '/home';
        }, 2000);
        
    } catch (error) {
        console.error('Setup completion error:', error);
        showError(error.message || 'Failed to complete setup. Please try again.');
    } finally {
        hideLoading();
    }
}

// Form handlers
function setupForms() {
    // Basic info form
    document.getElementById('basicInfoForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const displayName = document.getElementById('displayName').value.trim();
        const bio = document.getElementById('bio').value.trim();
        
        if (!displayName) {
            showError('Please enter a display name');
            return;
        }
        
        if (displayName.length < 2) {
            showError('Display name must be at least 2 characters');
            return;
        }
        
        profileData.displayName = displayName;
        profileData.bio = bio;
        
        nextStep();
    });
}

// Check if user needs profile setup
async function checkProfileStatus() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            // Not authenticated, redirect to login
            window.location.href = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? '/public/index.html'
                : '/';
            return;
        }
        
        // Check if profile already completed
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('profile_completed, username')
            .eq('user_id', user.id)
            .single();
        
        if (profile && profile.profile_completed) {
            // Profile already completed, redirect to home
            window.location.href = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? '/public/home.html'
                : '/home';
            return;
        }
        
        // Pre-fill display name if available
        const displayNameInput = document.getElementById('displayName');
        if (user.user_metadata?.full_name) {
            displayNameInput.value = user.user_metadata.full_name;
        } else if (profile?.username) {
            displayNameInput.value = profile.username;
        }
        
    } catch (error) {
        console.error('Profile status check error:', error);
        showError('Error checking profile status');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupAvatarUpload();
    setupForms();
    setupCharacterCounter();
    updateProgress();
    checkProfileStatus();
});

// Setup character counter for bio field
function setupCharacterCounter() {
    const bioField = document.getElementById('bio');
    const counter = bioField.parentNode.querySelector('small');
    
    if (bioField && counter) {
        bioField.addEventListener('input', () => {
            const length = bioField.value.length;
            counter.textContent = `${length}/500 characters`;
            
            if (length > 450) {
                counter.style.color = '#ff6b6b';
            } else {
                counter.style.color = '#666';
            }
        });
    }
}

// Make functions global
window.nextStep = nextStep;
window.prevStep = prevStep;
window.completeSetup = completeSetup;
