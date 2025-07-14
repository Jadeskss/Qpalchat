// Chat functionality with Supabase real-time
const SUPABASE_URL = 'https://gmabjefdlwlowsdnazcr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWJqZWZkbHdsb3dzZG5hemNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTAwNTIsImV4cCI6MjA2Nzk4NjA1Mn0.4ugve6E1yVR07dCuCLRPOHubHi8LRJULuCE3kI4jKMY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let messagesSubscription = null;
let typingTimeout = null;
let typingUsers = new Set();

// DOM Elements
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatForm = document.getElementById('chatForm');
const onlineCount = document.getElementById('onlineCount');
const typingIndicator = document.getElementById('typingIndicator');
const typingUsersSpan = document.getElementById('typingUsers');

// Initialize chat
async function initializeChat() {
    try {
        console.log('🚀 Initializing chat...');
        
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

        // Load and display user profile in header
        await loadUserProfileHeader();

        // Create tables if they don't exist
        await createChatTables();
        
        // Test if tables are working
        const tablesWorking = await testTablesDirectly();
        if (!tablesWorking) {
            return; // Stop initialization if tables aren't working
        }
        
        // Load existing messages
        await loadMessages();
        
        // Set up real-time subscription
        setupRealtimeSubscription();
        
        // Enable chat interface
        enableChatInterface();
        
        // Update online status
        await updateOnlineStatus(true);
        
        // Set up typing indicators
        setupTypingIndicators();
        
        hideLoading();
        
    } catch (error) {
        console.error('❌ Error initializing chat:', error);
        showError('Failed to initialize chat. Please refresh the page.');
    }
}

// Load user profile for header display
async function loadUserProfileHeader() {
    try {
        if (!currentUser) return;
        
        // Get user profile data using the utility function
        const profileData = await getUserProfileData(supabase, currentUser);
        
        const userProfileHeader = document.getElementById('userProfileHeader');
        const userAvatarHeader = document.getElementById('userAvatarHeader');
        const userNameHeader = document.getElementById('userNameHeader');
        
        if (profileData) {
            // Update display name
            const displayName = profileData.displayName || profileData.username || 'User';
            userNameHeader.textContent = displayName;
            
            // Update avatar
            if (profileData.avatarUrl) {
                userAvatarHeader.innerHTML = `<img src="${profileData.avatarUrl}" alt="${displayName}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                userAvatarHeader.textContent = displayName[0].toUpperCase();
            }
            
            // Show the profile header
            userProfileHeader.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading user profile header:', error);
        // Show basic user info as fallback
        const userNameHeader = document.getElementById('userNameHeader');
        const userAvatarHeader = document.getElementById('userAvatarHeader');
        
        if (currentUser.email) {
            const displayName = currentUser.email.split('@')[0];
            userNameHeader.textContent = displayName;
            userAvatarHeader.textContent = displayName[0].toUpperCase();
            document.getElementById('userProfileHeader').style.display = 'flex';
        }
    }
}

// Create chat tables using RPC call
async function createChatTables() {
    try {
        console.log('🔧 Creating chat tables...');
        
        // Create messages table
        const { error: messagesError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id BIGSERIAL PRIMARY KEY,
                    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                    user_email TEXT NOT NULL,
                    user_name TEXT,
                    message TEXT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
                );

                -- Enable RLS
                ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

                -- Allow authenticated users to read all messages
                DROP POLICY IF EXISTS "Enable read access for all users" ON chat_messages;
                CREATE POLICY "Enable read access for all users" ON chat_messages
                    FOR SELECT USING (auth.role() = 'authenticated');

                -- Allow authenticated users to insert their own messages
                DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON chat_messages;
                CREATE POLICY "Enable insert for authenticated users only" ON chat_messages
                    FOR INSERT WITH CHECK (auth.uid() = user_id);

                -- Create index for performance
                CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);
            `
        });

        if (messagesError && !messagesError.message.includes('already exists')) {
            console.log('Messages table setup result:', messagesError);
        }

        // Create online users table
        const { error: onlineError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS chat_online_users (
                    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                    user_email TEXT NOT NULL,
                    user_name TEXT,
                    last_seen TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
                    is_typing BOOLEAN DEFAULT FALSE
                );

                -- Enable RLS
                ALTER TABLE chat_online_users ENABLE ROW LEVEL SECURITY;

                -- Allow all authenticated users to read online status
                DROP POLICY IF EXISTS "Enable read access for online users" ON chat_online_users;
                CREATE POLICY "Enable read access for online users" ON chat_online_users
                    FOR SELECT USING (auth.role() = 'authenticated');

                -- Allow users to update their own status
                DROP POLICY IF EXISTS "Enable insert and update for own status" ON chat_online_users;
                CREATE POLICY "Enable insert and update for own status" ON chat_online_users
                    FOR ALL USING (auth.uid() = user_id);
            `
        });

        if (onlineError && !onlineError.message.includes('already exists')) {
            console.log('Online users table setup result:', onlineError);
        }

        console.log('✅ Chat tables ready');
        
    } catch (error) {
        console.log('📝 Note: Tables may already exist or RPC not available, using fallback method');
        // Fallback: try to use the tables directly
        await testTablesDirectly();
    }
}

// Test if tables exist by trying to query them
async function testTablesDirectly() {
    try {
        console.log('🔍 Testing chat tables...');
        
        // Test chat_messages table
        const { data: messagesTest, error: messagesError } = await supabase
            .from('chat_messages')
            .select('id')
            .limit(1);
            
        if (messagesError) {
            console.error('❌ Chat messages table issue:', messagesError);
            showError('Chat messages table not found. Please run chat-setup-simple.sql first.');
            return false;
        }
        
        console.log('✅ Chat tables are accessible');
        return true;
        
    } catch (error) {
        console.error('❌ Error testing tables:', error);
        showError('Database connection error. Please check your connection.');
        return false;
    }
}

// Load existing messages
async function loadMessages() {
    try {
        console.log('📥 Loading messages...');
        
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) {
            console.error('❌ Could not load messages:', error);
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                showError('Chat table not found. Please run chat-setup-simple.sql in Supabase SQL Editor.');
            }
            return;
        }

        chatMessages.innerHTML = '';
        
        if (messages && messages.length > 0) {
            messages.forEach(message => displayMessage(message));
            scrollToBottom();
        }
        
        console.log(`✅ Loaded ${messages?.length || 0} messages`);
        
    } catch (error) {
        console.log('📝 Note: Messages loading handled gracefully');
    }
}

// Set up real-time subscription
function setupRealtimeSubscription() {
    try {
        console.log('🔄 Setting up real-time subscription...');
        
        // Clean up existing subscription
        if (messagesSubscription) {
            messagesSubscription.unsubscribe();
        }
        
        // Subscribe to new messages
        messagesSubscription = supabase
            .channel('chat_messages_channel')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages'
            }, (payload) => {
                console.log('📨 New message received via realtime:', payload.new);
                displayMessage(payload.new);
                scrollToBottom();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_messages'
            }, (payload) => {
                console.log('📝 Message updated via realtime:', payload.new);
                // Handle message updates if needed
            })
            .subscribe((status) => {
                console.log('🔄 Realtime subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time subscription active and ready!');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Real-time subscription error');
                    showError('Real-time connection failed. Messages may not update automatically.');
                } else if (status === 'TIMED_OUT') {
                    console.error('⏰ Real-time subscription timed out');
                    showError('Real-time connection timed out. Trying to reconnect...');
                    // Retry after delay
                    setTimeout(() => setupRealtimeSubscription(), 5000);
                }
            });
            
    } catch (error) {
        console.error('❌ Error setting up real-time subscription:', error);
        showError('Real-time setup failed. Chat will work but may not update automatically.');
    }
}

// Display a message in the chat
function displayMessage(message) {
    const messageElement = document.createElement('div');
    const isOwnMessage = message.user_id === currentUser?.id;
    
    messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
    
    // Get user display info - prioritize profile data
    const userName = message.user_name || message.user_email?.split('@')[0] || 'Anonymous';
    const userInitial = userName.charAt(0).toUpperCase();
    
    const timestamp = new Date(message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Check if user has avatar from profile
    const avatarContent = message.avatar_url ? 
        `<img src="${message.avatar_url}" alt="${userName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` :
        userInitial;
    
    messageElement.innerHTML = `
        <div class="message-avatar">${avatarContent}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">${escapeHtml(userName)}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-text">${escapeHtml(message.message)}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageElement);
}

// Send a message (with better error handling)
async function sendMessage(messageText) {
    if (!messageText.trim() || !currentUser) return;
    
    try {
        console.log('📤 Sending message...');
        
        // Get user profile info
        let userName = '';
        let avatarUrl = '';
        
        try {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('username, full_name, avatar_url')
                .eq('user_id', currentUser.id)
                .single();
                
            if (profile) {
                userName = profile.username || profile.full_name;
                avatarUrl = profile.avatar_url;
            }
        } catch (profileError) {
            console.log('Profile not found, using auth data');
        }
        
        // Fallback to auth metadata
        if (!userName) {
            userName = currentUser.user_metadata?.name || 
                      currentUser.user_metadata?.full_name || 
                      currentUser.email?.split('@')[0] || 
                      'Anonymous';
        }
        
        // Try to send message
        const messageData = {
            user_id: currentUser.id,
            user_email: currentUser.email,
            user_name: userName,
            message: messageText.trim(),
            avatar_url: avatarUrl || null
        };
        
        console.log('Sending message data:', messageData);
        
        const { data, error } = await supabase
            .from('chat_messages')
            .insert([messageData])
            .select();

        if (error) {
            console.error('❌ Error sending message:', error);
            
            // Check if it's a table not found error
            if (error.code === '42P01' || error.message.includes('does not exist')) {
                showError('Chat table not found. Please run the chat-setup-simple.sql file first.');
            } else if (error.code === '42501' || error.message.includes('permission')) {
                showError('Permission denied. Please check your RLS policies.');
            } else {
                showError(`Failed to send message: ${error.message}`);
            }
            return;
        }

        console.log('✅ Message sent successfully:', data);
        messageInput.value = '';
        
        // Stop typing indicator
        await updateTypingStatus(false);
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        showError('Failed to send message. Please try again.');
    }
}

// Set up typing indicators
function setupTypingIndicators() {
    messageInput.addEventListener('input', () => {
        updateTypingStatus(true);
        
        // Clear previous timeout
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        
        // Set new timeout to stop typing
        typingTimeout = setTimeout(() => {
            updateTypingStatus(false);
        }, 2000);
    });
}

// Update typing status
async function updateTypingStatus(isTyping) {
    try {
        const userName = currentUser.user_metadata?.name || 
                        currentUser.user_metadata?.full_name || 
                        currentUser.email?.split('@')[0] || 
                        'Anonymous';
        
        await supabase
            .from('chat_online_users')
            .upsert({
                user_id: currentUser.id,
                user_email: currentUser.email,
                user_name: userName,
                is_typing: isTyping,
                last_seen: new Date().toISOString()
            });
            
    } catch (error) {
        console.log('📝 Typing status updated');
    }
}

// Update online status
async function updateOnlineStatus(isOnline) {
    try {
        const userName = currentUser.user_metadata?.name || 
                        currentUser.user_metadata?.full_name || 
                        currentUser.email?.split('@')[0] || 
                        'Anonymous';
        
        if (isOnline) {
            await supabase
                .from('chat_online_users')
                .upsert({
                    user_id: currentUser.id,
                    user_email: currentUser.email,
                    user_name: userName,
                    last_seen: new Date().toISOString(),
                    is_typing: false
                });
        } else {
            await supabase
                .from('chat_online_users')
                .delete()
                .eq('user_id', currentUser.id);
        }
        
        // Update online count
        updateOnlineCount();
        
    } catch (error) {
        console.log('📝 Online status updated');
    }
}

// Update online count
async function updateOnlineCount() {
    try {
        const { data: onlineUsers, error } = await supabase
            .from('chat_online_users')
            .select('user_id')
            .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes
            
        if (!error && onlineUsers) {
            const count = onlineUsers.length;
            onlineCount.textContent = `${count} online`;
        }
    } catch (error) {
        onlineCount.textContent = '• online';
    }
}

// Enable chat interface
function enableChatInterface() {
    messageInput.disabled = false;
    sendButton.disabled = false;
    chatMessages.style.display = 'flex';
}

// Utility functions
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    hideLoading();
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function goHome() {
    window.location.href = 'home.html';
}

// Manual refresh function for fallback
async function refreshMessages() {
    console.log('🔄 Manually refreshing messages...');
    await loadMessages();
}

// Make refresh function available globally
window.refreshMessages = refreshMessages;

// Event listeners
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        sendMessage(message);
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (currentUser) {
        updateOnlineStatus(!document.hidden);
    }
});

// Cleanup function for real-time subscriptions
function cleanup() {
    if (messagesSubscription) {
        console.log('🧹 Cleaning up real-time subscription');
        messagesSubscription.unsubscribe();
        messagesSubscription = null;
    }
}

// Clean up on page unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

// Update online count periodically
setInterval(updateOnlineCount, 30000); // Every 30 seconds

// Initialize chat when page loads
window.addEventListener('load', initializeChat);
