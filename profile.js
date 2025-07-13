// Profile management functionality with Supabase
const SUPABASE_URL = 'https://gmabjefdlwlowsdnazcr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWJqZWZkbHdsb3dzZG5hemNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTAwNTIsImV4cCI6MjA2Nzk4NjA1Mn0.4ugve6E1yVR07dCuCLRPOHubHi8LRJULuCE3kI4jKMY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let profilePictureFile = null;

// DOM Elements
const profileForm = document.getElementById('profileForm');
const usernameInput = document.getElementById('username');
const fullNameInput = document.getElementById('fullName');
const profilePictureInput = document.getElementById('profilePicture');
const avatarInitial = document.getElementById('avatarInitial');
const avatarImage = document.getElementById('avatarImage');
const removeBtn = document.getElementById('removeBtn');
const saveButton = document.getElementById('saveButton');
const saveText = document.getElementById('saveText');
const saveSpinner = document.getElementById('saveSpinner');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');

// Current info elements
const currentEmail = document.getElementById('currentEmail');
const currentUsername = document.getElementById('currentUsername');
const memberSince = document.getElementById('memberSince');

// Initialize profile page
async function initializeProfile() {
    try {
        console.log('🚀 Initializing profile page...');
        
        // Check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Session error:', sessionError);
            showError('Authentication error. Please log in again.');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }

        if (!session) {
            console.log('No session found, redirecting to login');
            window.location.href = 'index.html';
            return;
        }

        currentUser = session.user;
        console.log('✅ User authenticated:', currentUser.email);

        // Create profile table if needed
        await createProfileTable();
        
        // Load current profile data
        await loadCurrentProfile();
        
        console.log('✅ Profile page initialized');
        
    } catch (error) {
        console.error('❌ Error initializing profile:', error);
        showError('Failed to load profile. Please refresh the page.');
    }
}

// Load current profile (simplified - table should already exist)
async function loadCurrentProfile() {
    try {
        console.log('� Loading current profile...');
        
        // Show current user info from auth
        currentEmail.textContent = currentUser.email || 'No email';
        memberSince.textContent = formatDate(currentUser.created_at);
        
        // Try to load profile data from user_profiles table
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
            
        if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile load error:', profileError);
        }
        
        if (profile) {
            console.log('✅ Profile found:', profile);
            currentUsername.textContent = profile.username || 'Not set';
            usernameInput.value = profile.username || '';
            fullNameInput.value = profile.full_name || '';
            
            // Set avatar
            if (profile.avatar_url) {
                avatarImage.src = profile.avatar_url;
                avatarImage.style.display = 'block';
                avatarInitial.style.display = 'none';
            } else {
                setAvatarInitial();
            }
        } else {
            console.log('📝 No profile found, showing defaults');
            currentUsername.textContent = 'Not set';
            setAvatarInitial();
        }
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        showError('Failed to load profile data');
    }
}

// Simple profile table check
async function createProfileTable() {
    try {
        console.log('🔧 Checking profile table...');
        
        // Just try to query the table to see if it exists
        const { data, error } = await supabase
            .from('user_profiles')
            .select('id')
            .limit(1);
            
        if (error) {
            console.error('Profile table not found. Please run the profile-schema-minimal.sql in Supabase SQL Editor first.');
            showError('Profile table not found. Please set up the database first.');
            return false;
        }
        
        console.log('✅ Profile table exists');
        return true;
        
    } catch (error) {
        console.error('❌ Error checking profile table:', error);
        showError('Database connection error');
        return false;
    }
}

// Load current profile data
async function loadCurrentProfile() {
    try {
        console.log('📥 Loading current profile...');
        
        // Display current user info
        currentEmail.textContent = currentUser.email;
        
        const createdAt = new Date(currentUser.created_at);
        memberSince.textContent = createdAt.toLocaleDateString();

        // Try to load profile from database
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            console.log('Profile load note:', error.message);
        }

        // Set default values
        let username = '';
        let fullName = '';
        let avatarUrl = '';

        if (profile) {
            // Use profile data
            username = profile.username || '';
            fullName = profile.full_name || '';
            avatarUrl = profile.avatar_url || '';
        } else {
            // Use auth metadata as fallback
            username = currentUser.user_metadata?.name || 
                      currentUser.user_metadata?.full_name || 
                      currentUser.email?.split('@')[0] || '';
            fullName = currentUser.user_metadata?.full_name || '';
        }

        // Update form fields
        usernameInput.value = username;
        fullNameInput.value = fullName;
        currentUsername.textContent = username || 'Not set';

        // Update avatar display
        updateAvatarDisplay(username, avatarUrl);
        
        console.log('✅ Profile loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        showError('Failed to load profile data.');
    }
}

// Update avatar display
function updateAvatarDisplay(username, avatarUrl) {
    if (avatarUrl) {
        // Show image
        avatarImage.src = avatarUrl;
        avatarImage.style.display = 'block';
        avatarInitial.style.display = 'none';
        removeBtn.style.display = 'inline-flex';
    } else {
        // Show initial
        const initial = (username || currentUser.email || 'U').charAt(0).toUpperCase();
        avatarInitial.textContent = initial;
        avatarInitial.style.display = 'flex';
        avatarImage.style.display = 'none';
        removeBtn.style.display = 'none';
    }
}

// Handle profile picture selection
profilePictureInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showError('File size must be less than 5MB');
        return;
    }

    if (!file.type.startsWith('image/')) {
        showError('Please select a valid image file');
        return;
    }

    // Store file for upload
    profilePictureFile = file;

    // Preview image
    const reader = new FileReader();
    reader.onload = function(e) {
        avatarImage.src = e.target.result;
        avatarImage.style.display = 'block';
        avatarInitial.style.display = 'none';
        removeBtn.style.display = 'inline-flex';
    };
    reader.readAsDataURL(file);

    console.log('📷 Profile picture selected:', file.name);
});

// Remove profile picture
async function removePicture() {
    try {
        // Reset display
        const username = usernameInput.value;
        updateAvatarDisplay(username, '');
        
        // Clear file input
        profilePictureInput.value = '';
        profilePictureFile = null;
        
        console.log('🗑️ Profile picture removed');
        
    } catch (error) {
        console.error('❌ Error removing picture:', error);
    }
}

// Handle form submission
profileForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const username = usernameInput.value.trim();
    const fullName = fullNameInput.value.trim();
    
    if (!username) {
        showError('Username is required');
        return;
    }

    await saveProfile(username, fullName);
});

// Save profile to database
async function saveProfile(username, fullName) {
    try {
        console.log('💾 Saving profile...');
        setLoading(true);
        hideMessages();

        let avatarUrl = '';

        // Upload profile picture if selected
        if (profilePictureFile) {
            console.log('📤 Uploading profile picture...');
            avatarUrl = await uploadProfilePicture(profilePictureFile);
        } else if (avatarImage.style.display === 'none') {
            // User removed the picture
            avatarUrl = '';
        } else if (avatarImage.src && !avatarImage.src.startsWith('data:')) {
            // Keep existing picture
            avatarUrl = avatarImage.src;
        }

        // Check if username is already taken (by another user)
        const { data: existingUser, error: checkError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('username', username)
            .neq('user_id', currentUser.id)
            .single();

        if (existingUser) {
            throw new Error('Username is already taken. Please choose a different one.');
        }

        // Save profile data
        const profileData = {
            user_id: currentUser.id,
            username: username,
            full_name: fullName || null,
            avatar_url: avatarUrl || null
        };

        const { data, error } = await supabase
            .from('user_profiles')
            .upsert(profileData, { 
                onConflict: 'user_id',
                returning: 'minimal'
            });

        if (error) {
            throw error;
        }

        // Update auth metadata
        const { error: updateError } = await supabase.auth.updateUser({
            data: {
                name: username,
                full_name: fullName,
                avatar_url: avatarUrl
            }
        });

        if (updateError) {
            console.log('Note: Auth metadata update result:', updateError.message);
        }

        // Update current info display
        currentUsername.textContent = username;
        
        // Clear file selection
        profilePictureFile = null;
        profilePictureInput.value = '';

        showSuccess('Profile updated successfully! 🎉');
        console.log('✅ Profile saved successfully');
        
        // Trigger user data refresh for other pages (if function exists)
        if (typeof triggerUserDataRefresh === 'function') {
            triggerUserDataRefresh();
        }
        
    } catch (error) {
        console.error('❌ Error saving profile:', error);
        showError(error.message || 'Failed to save profile. Please try again.');
    } finally {
        setLoading(false);
    }
}

// Upload profile picture to Supabase Storage
async function uploadProfilePicture(file) {
    try {
        // Create a unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;

        console.log('📤 Uploading to storage...');

        // Try to upload to storage
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.log('Storage upload note:', error.message);
            // Fallback: convert to base64 and store in database
            return await convertToBase64(file);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        return urlData.publicUrl;
        
    } catch (error) {
        console.log('📝 Using fallback upload method');
        // Fallback to base64
        return await convertToBase64(file);
    }
}

// Convert image to base64 (fallback method)
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Utility functions
function setLoading(loading) {
    saveButton.disabled = loading;
    if (loading) {
        saveText.style.display = 'none';
        saveSpinner.style.display = 'block';
    } else {
        saveText.style.display = 'block';
        saveSpinner.style.display = 'none';
    }
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    setTimeout(hideMessages, 5000);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
}

function hideMessages() {
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
}

function goHome() {
    window.location.href = 'home.html';
}

// Initialize when page loads
window.addEventListener('load', initializeProfile);
