// Messages.js - Private messaging functionality
// Supabase configuration
const SUPABASE_URL = 'https://gmabjefdlwlowsdnazcr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWJqZWZkbHdsb3dzZG5hemNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTAwNTIsImV4cCI6MjA2Nzk4NjA1Mn0.4ugve6E1yVR07dCuCLRPOHubHi8LRJULuCE3kI4jKMY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentUser = null;
let activeConversation = null;
let messagesSubscription = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadUserProfile();
    await loadConversations();
    await loadUsers();
    await loadMessageRequests();
});

// Authentication check
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting session:', error);
            setTimeout(() => window.location.href = 'index.html', 2000);
            return null;
        }
        
        if (!session || !session.user) {
            console.log('No session found, redirecting to login');
            window.location.href = 'index.html';
            return null;
        }
        
        currentUser = session.user;
        console.log('User authenticated:', currentUser.email);
        return currentUser;
    } catch (error) {
        console.error('Error in checkAuth:', error);
        window.location.href = 'index.html';
        return null;
    }
}

// Load user profile
async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const profile = await getUserProfile(currentUser.id);
        
        if (profile) {
            document.getElementById('userName').textContent = profile.username || profile.full_name || currentUser.email.split('@')[0];
            document.getElementById('userInitial').textContent = (profile.username || profile.full_name || currentUser.email)[0].toUpperCase();
            
            if (profile.avatar_url) {
                const avatarEl = document.getElementById('userAvatar');
                avatarEl.style.backgroundImage = `url(${profile.avatar_url})`;
                avatarEl.style.backgroundSize = 'cover';
                avatarEl.style.backgroundPosition = 'center';
                document.getElementById('userInitial').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Tab switching
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'requests') {
        loadMessageRequests();
    }
}

// Load conversations
async function loadConversations() {
    if (!currentUser) {
        console.error('No current user found');
        return;
    }
    
    try {
        console.log('Loading conversations for user:', currentUser.id);
        
        // Get conversations without foreign key relationships
        const { data: conversations, error } = await supabase
            .from('private_conversations')
            .select('*')
            .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
            .eq('status', 'active')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Conversations query error:', error);
            document.getElementById('conversationsList').innerHTML = `
                <div class="error-state">
                    <p>Error loading conversations:</p>
                    <p><small>${error.message}</small></p>
                    <p><small>Error Code: ${error.code || 'Unknown'}</small></p>
                    ${error.code === '42P01' ? '<p><strong>Table does not exist! Run the SQL schema first.</strong></p>' : ''}
                    <button onclick="loadConversations()">Try Again</button>
                </div>
            `;
            return;
        }

        console.log('Conversations loaded:', conversations);
        
        if (!conversations || conversations.length === 0) {
            document.getElementById('conversationsList').innerHTML = `
                <div class="empty-state">
                    <p>No conversations yet</p>
                    <p class="empty-subtitle">Start a new conversation to get started</p>
                </div>
            `;
            return;
        }

        // Get user profiles for each conversation
        const conversationsList = document.getElementById('conversationsList');
        const conversationPromises = conversations.map(async (conv) => {
            const otherUserId = conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id;
            
            // Get other user's profile with better error handling
            let userProfile = null;
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('user_id, username, full_name, avatar_url')
                    .eq('user_id', otherUserId)
                    .single();
                
                if (profileError) {
                    console.warn('Profile lookup error for user', otherUserId, ':', profileError);
                } else {
                    userProfile = profile;
                }
            } catch (profileErr) {
                console.warn('Profile fetch failed for user', otherUserId, ':', profileErr);
            }
            
            // Create display name with better fallbacks
            let displayName = 'User';
            let avatarUrl = null;
            
            if (userProfile) {
                displayName = userProfile.username || userProfile.full_name || 'User';
                avatarUrl = userProfile.avatar_url;
            } else {
                // Use a portion of the user ID as fallback
                displayName = `User ${otherUserId.substring(0, 6)}`;
            }
            
            console.log('Conversation with user:', otherUserId, 'Display name:', displayName);
            
            return `
                <div class="conversation-item" onclick="openConversation('${conv.id}', '${otherUserId}', '${displayName}')">
                    <div class="conversation-avatar">
                        ${avatarUrl ? 
                            `<img src="${avatarUrl}" alt="${displayName}">` : 
                            `<span>${displayName[0].toUpperCase()}</span>`
                        }
                    </div>
                    <div class="conversation-info">
                        <h4>${displayName}</h4>
                        <p class="last-message">Click to start messaging</p>
                        <span class="timestamp">${formatMessageTime(conv.updated_at)}</span>
                    </div>
                </div>
            `;
        });

        const conversationElements = await Promise.all(conversationPromises);
        conversationsList.innerHTML = conversationElements.join('');

    } catch (error) {
        console.error('Error loading conversations:', error);
        document.getElementById('conversationsList').innerHTML = `
            <div class="error-state">
                <p>Error loading conversations:</p>
                <p><small>${error.message}</small></p>
                <button onclick="loadConversations()">Try Again</button>
            </div>
        `;
    }
}

// Load message requests
async function loadMessageRequests() {
    if (!currentUser) {
        console.error('No current user found');
        return;
    }
    
    try {
        console.log('Loading message requests for user:', currentUser.id);
        
        // Get message requests without foreign key relationships
        const { data: requests, error } = await supabase
            .from('message_requests')
            .select('*')
            .eq('receiver_id', currentUser.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Message requests query error:', error);
            document.getElementById('requestsList').innerHTML = `
                <div class="error-state">
                    <p>Error loading requests:</p>
                    <p><small>${error.message}</small></p>
                    <p><small>Error Code: ${error.code || 'Unknown'}</small></p>
                    ${error.code === '42P01' ? '<p><strong>Table does not exist! Run the SQL schema first.</strong></p>' : ''}
                    <button onclick="loadMessageRequests()">Try Again</button>
                </div>
            `;
            return;
        }

        console.log('Message requests loaded:', requests);
        const requestsList = document.getElementById('requestsList');
        const requestCount = document.getElementById('requestCount');
        
        if (!requests || requests.length === 0) {
            requestsList.innerHTML = '<div class="empty-state"><p>No message requests</p></div>';
            requestCount.style.display = 'none';
            return;
        }

        // Update request count
        requestCount.textContent = requests.length;
        requestCount.style.display = 'inline';

        // Get sender profiles for each request
        const requestPromises = requests.map(async (request) => {
            // Get sender's profile with better error handling
            let senderProfile = null;
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('user_id, username, full_name, avatar_url')
                    .eq('user_id', request.sender_id)
                    .single();
                
                if (profileError) {
                    console.warn('Sender profile lookup error for user', request.sender_id, ':', profileError);
                } else {
                    senderProfile = profile;
                }
            } catch (profileErr) {
                console.warn('Sender profile fetch failed for user', request.sender_id, ':', profileErr);
            }
            
            // Create display name with better fallbacks
            let displayName = 'User';
            let avatarUrl = null;
            
            if (senderProfile) {
                displayName = senderProfile.username || senderProfile.full_name || 'User';
                avatarUrl = senderProfile.avatar_url;
            } else {
                // Use a portion of the user ID as fallback
                displayName = `User ${request.sender_id.substring(0, 6)}`;
            }
            
            console.log('Message request from user:', request.sender_id, 'Display name:', displayName);
            
            return `
                <div class="request-item">
                    <div class="request-avatar">
                        ${avatarUrl ? 
                            `<img src="${avatarUrl}" alt="${displayName}">` : 
                            `<span>${displayName[0].toUpperCase()}</span>`
                        }
                    </div>
                    <div class="request-info">
                        <h4>${displayName}</h4>
                        <p class="request-message">${request.message || 'Wants to send you a message'}</p>
                        <div class="request-actions">
                            <button class="accept-btn" onclick="acceptMessageRequest('${request.id}', '${request.sender_id}')">Accept</button>
                            <button class="decline-btn" onclick="declineMessageRequest('${request.id}')">Decline</button>
                        </div>
                    </div>
                    <span class="timestamp">${formatMessageTime(request.created_at)}</span>
                </div>
            `;
        });

        const requestElements = await Promise.all(requestPromises);
        requestsList.innerHTML = requestElements.join('');

    } catch (error) {
        console.error('Error loading message requests:', error);
        document.getElementById('requestsList').innerHTML = `
            <div class="error-state">
                <p>Error loading requests:</p>
                <p><small>${error.message}</small></p>
                <button onclick="loadMessageRequests()">Try Again</button>
            </div>
        `;
    }
}

// Load users for search
async function loadUsers() {
    if (!currentUser) {
        console.error('No current user found');
        return;
    }
    
    try {
        console.log('Loading users for search...');
        
        const { data: users, error } = await supabase
            .from('user_profiles')
            .select('user_id, username, full_name, avatar_url')
            .neq('user_id', currentUser.id)
            .limit(20);

        if (error) {
            console.error('Users query error:', error);
            document.getElementById('usersList').innerHTML = `
                <div class="error-state">
                    <p>Error loading users:</p>
                    <p><small>${error.message}</small></p>
                    <p><small>Error Code: ${error.code || 'Unknown'}</small></p>
                    ${error.code === '42P01' ? '<p><strong>Table does not exist! Check your user_profiles table.</strong></p>' : ''}
                    <button onclick="loadUsers()">Try Again</button>
                </div>
            `;
            return;
        }

        console.log('Users loaded:', users);
        const usersList = document.getElementById('usersList');
        
        if (!users || users.length === 0) {
            usersList.innerHTML = '<div class="empty-state"><p>No users found</p></div>';
            return;
        }

        usersList.innerHTML = users.map(user => {
            const displayName = user.username || user.full_name || 'Unknown User';
            
            return `
                <div class="user-item" onclick="startConversation('${user.user_id}', '${displayName}')">
                    <div class="user-avatar">
                        ${user.avatar_url ? 
                            `<img src="${user.avatar_url}" alt="${displayName}">` : 
                            `<span>${displayName[0].toUpperCase()}</span>`
                        }
                    </div>
                    <div class="user-info">
                        <h4>${displayName}</h4>
                    </div>
                    <button class="message-btn">Message</button>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersList').innerHTML = `
            <div class="error-state">
                <p>Error loading users:</p>
                <p><small>${error.message}</small></p>
                <button onclick="loadUsers()">Try Again</button>
            </div>
        `;
    }
}

// Search users
async function searchUsers() {
    const query = document.getElementById('userSearch').value.trim();
    
    if (!query) {
        loadUsers();
        return;
    }
    
    try {
        const { data: users, error } = await supabase
            .from('user_profiles')
            .select('user_id, username, full_name, avatar_url')
            .neq('user_id', currentUser.id)
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(10);

        if (error) {
            console.error('Search users query error:', error);
            throw error;
        }

        const usersList = document.getElementById('usersList');
        
        if (!users || users.length === 0) {
            usersList.innerHTML = '<div class="empty-state"><p>No users found</p></div>';
            return;
        }

        usersList.innerHTML = users.map(user => {
            const displayName = user.username || user.full_name || 'Unknown User';
            
            return `
                <div class="user-item" onclick="startConversation('${user.user_id}', '${displayName}')">
                    <div class="user-avatar">
                        ${user.avatar_url ? 
                            `<img src="${user.avatar_url}" alt="${displayName}">` : 
                            `<span>${displayName[0].toUpperCase()}</span>`
                        }
                    </div>
                    <div class="user-info">
                        <h4>${displayName}</h4>
                    </div>
                    <button class="message-btn">Message</button>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error searching users:', error);
    }
}

// Start conversation or send message request
async function startConversation(userId, displayName) {
    if (!currentUser) return;
    
    try {
        showMessage('Starting conversation...', 'info');
        
        // Ensure proper ordering for conversation lookup (smaller ID first)
        const user1Id = currentUser.id < userId ? currentUser.id : userId;
        const user2Id = currentUser.id < userId ? userId : currentUser.id;
        
        // Check if conversation already exists
        const { data: existingConv, error: convError } = await supabase
            .from('private_conversations')
            .select('*')
            .eq('user1_id', user1Id)
            .eq('user2_id', user2Id)
            .single();

        if (convError && convError.code !== 'PGRST116') {
            console.error('Conversation lookup error:', convError);
            throw convError;
        }

        if (existingConv) {
            // Open existing conversation
            openConversation(existingConv.id, userId, displayName);
            return;
        }

        // Check if there's a pending request
        const { data: existingRequest, error: requestError } = await supabase
            .from('message_requests')
            .select('*')
            .eq('sender_id', currentUser.id)
            .eq('receiver_id', userId)
            .eq('status', 'pending')
            .single();

        if (requestError && requestError.code !== 'PGRST116') {
            console.error('Request lookup error:', requestError);
            throw requestError;
        }

        if (existingRequest) {
            showMessage('Message request already sent', 'info');
            return;
        }

        // Send message request
        const { data: request, error: createError } = await supabase
            .from('message_requests')
            .insert({
                sender_id: currentUser.id,
                receiver_id: userId,
                message: `Hi! I'd like to start a conversation with you.`,
                status: 'pending'
            })
            .select()
            .single();

        if (createError) {
            console.error('Create request error:', createError);
            throw createError;
        }

        showMessage('Message request sent!', 'success');

    } catch (error) {
        console.error('Error starting conversation:', error);
        showMessage('Error starting conversation: ' + error.message, 'error');
    }
}

// Accept message request
async function acceptMessageRequest(requestId, senderId) {
    if (!currentUser) return;
    
    try {
        showMessage('Accepting request...', 'info');
        
        // Update request status
        const { error: updateError } = await supabase
            .from('message_requests')
            .update({ status: 'accepted' })
            .eq('id', requestId);

        if (updateError) {
            console.error('Update request error:', updateError);
            throw updateError;
        }

        // Create conversation with proper ordering (smaller ID first)
        const user1Id = senderId < currentUser.id ? senderId : currentUser.id;
        const user2Id = senderId < currentUser.id ? currentUser.id : senderId;

        const { data: conversation, error: convError } = await supabase
            .from('private_conversations')
            .insert({
                user1_id: user1Id,
                user2_id: user2Id,
                status: 'active'
            })
            .select()
            .single();

        if (convError) {
            console.error('Create conversation error:', convError);
            throw convError;
        }

        showMessage('Request accepted! Conversation started.', 'success');
        
        // Reload requests and conversations
        await loadMessageRequests();
        await loadConversations();
        
        // Switch to conversations tab
        showTab('conversations');

    } catch (error) {
        console.error('Error accepting request:', error);
        showMessage('Error accepting request: ' + error.message, 'error');
    }
}

// Decline message request
async function declineMessageRequest(requestId) {
    if (!currentUser) return;
    
    try {
        const { error } = await supabase
            .from('message_requests')
            .update({ status: 'declined' })
            .eq('id', requestId);

        if (error) throw error;

        showMessage('Request declined', 'info');
        await loadMessageRequests();

    } catch (error) {
        console.error('Error declining request:', error);
        showMessage('Error declining request', 'error');
    }
}

// Open conversation
async function openConversation(conversationId, otherUserId, displayName) {
    if (!currentUser) return;
    
    activeConversation = {
        id: conversationId,
        otherUserId: otherUserId,
        displayName: displayName
    };
    
    // Update UI
    document.querySelector('.chat-placeholder').style.display = 'none';
    document.getElementById('activeChat').style.display = 'flex';
    document.getElementById('chatUserName').textContent = displayName;
    
    // Load messages
    await loadMessages(conversationId);
    
    // Subscribe to new messages
    subscribeToMessages(conversationId);
}

// Load messages for conversation
async function loadMessages(conversationId) {
    try {
        // Get messages without foreign key relationships
        const { data: messages, error } = await supabase
            .from('private_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error loading messages:', error);
            throw error;
        }

        const messagesContainer = document.getElementById('messagesContainer');
        
        if (!messages || messages.length === 0) {
            messagesContainer.innerHTML = '<div class="no-messages">No messages yet. Start the conversation!</div>';
            return;
        }

        // Get sender profiles for each unique sender
        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        const senderProfiles = {};
        
        for (const senderId of senderIds) {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('user_id, username, full_name, avatar_url')
                .eq('user_id', senderId)
                .single();
            senderProfiles[senderId] = profile;
        }

        messagesContainer.innerHTML = messages.map(message => {
            const isOwnMessage = message.sender_id === currentUser.id;
            const sender = senderProfiles[message.sender_id];
            const displayName = sender?.username || sender?.full_name || 'Unknown User';
            
            return `
                <div class="message ${isOwnMessage ? 'own-message' : 'other-message'}">
                    ${!isOwnMessage ? `
                        <div class="message-avatar">
                            ${sender?.avatar_url ? 
                                `<img src="${sender.avatar_url}" alt="${displayName}">` : 
                                `<span>${displayName[0].toUpperCase()}</span>`
                            }
                        </div>
                    ` : ''}
                    <div class="message-content">
                        <div class="message-text">${message.content}</div>
                        <div class="message-time">${formatMessageTime(message.created_at)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (error) {
        console.error('Error loading messages:', error);
        document.getElementById('messagesContainer').innerHTML = '<div class="error-state">Error loading messages</div>';
    }
}

// Subscribe to new messages
function subscribeToMessages(conversationId) {
    // Unsubscribe from previous subscription
    if (messagesSubscription) {
        messagesSubscription.unsubscribe();
    }
    
    messagesSubscription = supabase
        .channel(`private_messages:${conversationId}`)
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'private_messages',
                filter: `conversation_id=eq.${conversationId}`
            }, 
            (payload) => {
                console.log('New message received:', payload);
                loadMessages(conversationId);
            }
        )
        .subscribe();
}

// Send message
async function sendMessage() {
    if (!activeConversation || !currentUser) return;
    
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    try {
        const { error } = await supabase
            .from('private_messages')
            .insert({
                conversation_id: activeConversation.id,
                sender_id: currentUser.id,
                content: content
            });

        if (error) throw error;

        messageInput.value = '';
        
        // Update conversation timestamp
        await supabase
            .from('private_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', activeConversation.id);

    } catch (error) {
        console.error('Error sending message:', error);
        showMessage('Error sending message', 'error');
    }
}

// Handle message input keypress
function handleMessageKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Close chat
function closeChat() {
    activeConversation = null;
    
    if (messagesSubscription) {
        messagesSubscription.unsubscribe();
        messagesSubscription = null;
    }
    
    document.querySelector('.chat-placeholder').style.display = 'flex';
    document.getElementById('activeChat').style.display = 'none';
}

// Modal functions
function showNewMessageModal() {
    document.getElementById('newMessageModal').style.display = 'flex';
}

function hideNewMessageModal() {
    document.getElementById('newMessageModal').style.display = 'none';
    document.getElementById('newMessageSearch').value = '';
    document.getElementById('newMessageResults').innerHTML = '';
}

// Search users for new message
async function searchUsersForNewMessage() {
    const query = document.getElementById('newMessageSearch').value.trim();
    
    if (!query) {
        document.getElementById('newMessageResults').innerHTML = '';
        return;
    }
    
    try {
        const { data: users, error } = await supabase
            .from('user_profiles')
            .select('id, username, full_name, avatar_url')
            .neq('user_id', currentUser.id)
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(5);

        if (error) throw error;

        const results = document.getElementById('newMessageResults');
        
        if (!users || users.length === 0) {
            results.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }

        results.innerHTML = users.map(user => {
            const displayName = user.username || user.full_name || 'Unknown User';
            
            return `
                <div class="search-result-item" onclick="selectUserForNewMessage('${user.id}', '${displayName}')">
                    <div class="result-avatar">
                        ${user.avatar_url ? 
                            `<img src="${user.avatar_url}" alt="${displayName}">` : 
                            `<span>${displayName[0].toUpperCase()}</span>`
                        }
                    </div>
                    <div class="result-info">
                        <h4>${displayName}</h4>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error searching users:', error);
    }
}

// Select user for new message
async function selectUserForNewMessage(userId, displayName) {
    hideNewMessageModal();
    await startConversation(userId, displayName);
}

// Utility functions
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays <= 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

function showMessage(text, type = 'info') {
    const banner = document.getElementById('messageBanner');
    banner.textContent = text;
    banner.className = `message-banner ${type}`;
    banner.style.display = 'block';
    
    setTimeout(() => {
        banner.style.display = 'none';
    }, 3000);
}

function goBack() {
    window.location.href = 'home.html';
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (messagesSubscription) {
        messagesSubscription.unsubscribe();
    }
});
