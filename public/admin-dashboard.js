// Admin Dashboard JavaScript
// Supabase configuration
const SUPABASE_URL = 'https://gmabjefdlwlowsdnazcr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYWJqZWZkbHdsb3dzZG5hemNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTAwNTIsImV4cCI6MjA2Nzk4NjA1Mn0.4ugve6E1yVR07dCuCLRPOHubHi8LRJULuCE3kI4jKMY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin user IDs (add your admin user IDs here)
const ADMIN_USER_IDS = [
    // Add admin user IDs here, for example:
    // 'admin-user-id-1',
    // 'admin-user-id-2'
];

let currentUser = null;
let allUsers = [];
let allMessages = [];
let currentTab = 'dashboard';

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth();
    await loadDashboardData();
    setupRealtimeSubscriptions();
});

// Authentication and Authorization
async function checkAdminAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        console.log('Current user:', user);
        console.log('Auth error:', error);
        
        if (error || !user) {
            console.log('No user found, redirecting to login');
            window.location.href = '/';
            return;
        }

        console.log('User ID:', user.id);

        // Get user profile with role from database
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('username, avatar_url, role, email')
            .eq('user_id', user.id)
            .single();

        console.log('Profile query result:', { profile, profileError });

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            alert('Error loading user profile. Please try again.');
            window.location.href = '/';
            return;
        }

        console.log('User profile:', profile);
        console.log('User role:', profile?.role);

        // Check if user has admin or super_admin role
        const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
        
        console.log('Is admin?', isAdmin);

        if (!isAdmin) {
            alert(`Access denied. Your role is: ${profile?.role || 'undefined'}. Admin privileges required.`);
            window.location.href = '/home';
            return;
        }

        currentUser = { ...user, profile };
        
        // Display admin info
        const adminName = profile?.username || user.user_metadata?.full_name || profile?.email || user.email;
        document.getElementById('adminName').textContent = adminName;
        
        // Load user avatar if available
        if (profile?.avatar_url) {
            document.getElementById('adminAvatar').src = profile.avatar_url;
        }
        
        console.log('Admin authenticated successfully:', { role: profile.role, email: profile.email });
        
    } catch (error) {
        console.error('Admin auth error:', error);
        window.location.href = '/';
    }
}

// Tab Navigation
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
    
    currentTab = tabName;
    
    // Load tab-specific data
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsers();
            break;
        case 'chats':
            loadChatMessages();
            break;
        case 'messages':
            loadMessages();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
    }
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        showLoading();
        
        // Load statistics
        await Promise.all([
            loadUserStats(),
            loadMessageStats(),
            loadRecentActivity()
        ]);
        
        hideLoading();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showMessage('Error loading dashboard data', 'error');
        hideLoading();
    }
}

async function loadUserStats() {
    try {
        // Total users
        const { count: totalUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
        
        document.getElementById('totalUsers').textContent = totalUsers || 0;
        
        // Online users (last seen within 15 minutes)
        const { count: onlineUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('last_seen', new Date(Date.now() - 15 * 60 * 1000).toISOString());
        
        document.getElementById('onlineUsers').textContent = onlineUsers || 0;
        
        // Banned users
        const { count: bannedUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('is_banned', true);
        
        document.getElementById('bannedUsers').textContent = bannedUsers || 0;
        
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

async function loadMessageStats() {
    try {
        // Total messages from global chat
        const { count: totalMessages } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true });
        
        document.getElementById('totalMessages').textContent = totalMessages || 0;
        
    } catch (error) {
        console.error('Error loading message stats:', error);
    }
}

async function loadRecentActivity() {
    try {
        const { data: recentMessages } = await supabase
            .from('chat_messages')
            .select(`
                *,
                user_profiles:user_id (username, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(10);
        
        const activityHtml = recentMessages?.map(message => `
            <div class="activity-item">
                <img src="${message.user_profiles?.avatar_url || '/default-avatar.svg'}" alt="User" class="activity-avatar">
                <div class="activity-content">
                    <span class="activity-user">${message.user_profiles?.username || 'Unknown User'}</span>
                    <span class="activity-action">sent a message</span>
                    <span class="activity-time">${formatDate(message.created_at)}</span>
                </div>
            </div>
        `).join('') || '<p>No recent activity</p>';
        
        document.getElementById('recentActivity').innerHTML = activityHtml;
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// User Management Functions
async function loadUsers() {
    try {
        showLoading();
        
        const { data: users, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allUsers = users || [];
        displayUsers(allUsers);
        hideLoading();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Error loading users', 'error');
        hideLoading();
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="7">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <img src="${user.avatar_url || '/default-avatar.svg'}" alt="Avatar" class="user-avatar">
            </td>
            <td>${user.username || 'No username'}</td>
            <td>${user.email || 'No email'}</td>
            <td>
                <span class="status-badge ${getStatusClass(user)}">
                    ${getStatusText(user)}
                </span>
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>${user.last_seen ? formatDate(user.last_seen) : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="viewUser('${user.user_id}')" class="btn-action view" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="banUser('${user.user_id}')" class="btn-action ban" title="Ban">
                        <i class="fas fa-ban"></i>
                    </button>
                    <button onclick="deleteUser('${user.user_id}')" class="btn-action delete" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const filtered = allUsers.filter(user => 
        (user.username?.toLowerCase().includes(searchTerm)) ||
        (user.email?.toLowerCase().includes(searchTerm))
    );
    displayUsers(filtered);
}

function filterUsers() {
    const filter = document.getElementById('userFilter').value;
    let filtered = allUsers;
    
    switch(filter) {
        case 'online':
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            filtered = allUsers.filter(user => 
                user.last_seen && new Date(user.last_seen) > fifteenMinutesAgo
            );
            break;
        case 'banned':
            filtered = allUsers.filter(user => user.is_banned);
            break;
        case 'new':
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            filtered = allUsers.filter(user => 
                new Date(user.created_at) > sevenDaysAgo
            );
            break;
    }
    
    displayUsers(filtered);
}

// Chat Management Functions
async function loadChatMessages() {
    try {
        showLoading();
        
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select(`
                *,
                user_profiles:user_id (username, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        allMessages = messages || [];
        displayChatMessages(allMessages);
        hideLoading();
        
    } catch (error) {
        console.error('Error loading chat messages:', error);
        showMessage('Error loading chat messages', 'error');
        hideLoading();
    }
}

function displayChatMessages(messages) {
    const container = document.getElementById('chatMessages');
    
    if (!messages.length) {
        container.innerHTML = '<p>No messages found</p>';
        return;
    }
    
    container.innerHTML = messages.map(message => `
        <div class="chat-message-item">
            <img src="${message.user_profiles?.avatar_url || '/default-avatar.svg'}" alt="User" class="message-avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="message-user">${message.user_profiles?.username || 'Unknown User'}</span>
                    <span class="message-time">${formatDate(message.created_at)}</span>
                    <div class="message-actions">
                        <button onclick="deleteMessage('${message.id}')" class="btn-action delete" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="message-text">${message.content}</div>
            </div>
        </div>
    `).join('');
}

async function sendAdminMessage() {
    const input = document.getElementById('adminMessageInput');
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                user_id: currentUser.id,
                content: content,
                username: 'ADMIN',
                avatar_url: document.getElementById('adminAvatar').src,
                is_admin: true
            }]);
        
        if (error) throw error;
        
        input.value = '';
        showMessage('Admin message sent', 'success');
        
        // Reload messages
        if (currentTab === 'chats') {
            loadChatMessages();
        }
        
    } catch (error) {
        console.error('Error sending admin message:', error);
        showMessage('Error sending message', 'error');
    }
}

function handleAdminMessage(event) {
    if (event.key === 'Enter') {
        sendAdminMessage();
    }
}

async function deleteMessage(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .eq('id', messageId);
        
        if (error) throw error;
        
        showMessage('Message deleted', 'success');
        loadChatMessages();
        
    } catch (error) {
        console.error('Error deleting message:', error);
        showMessage('Error deleting message', 'error');
    }
}

async function clearAllMessages() {
    if (!confirm('Are you sure you want to clear ALL messages? This action cannot be undone!')) return;
    
    try {
        const { error } = await supabase
            .from('chat_messages')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except non-existent ID
        
        if (error) throw error;
        
        showMessage('All messages cleared', 'success');
        loadChatMessages();
        
    } catch (error) {
        console.error('Error clearing messages:', error);
        showMessage('Error clearing messages', 'error');
    }
}

// User Actions
async function banUser(userId) {
    if (!confirm('Are you sure you want to ban this user?')) return;
    
    try {
        const { error } = await supabase
            .from('user_profiles')
            .update({ is_banned: true })
            .eq('user_id', userId);
        
        if (error) throw error;
        
        showMessage('User banned successfully', 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error banning user:', error);
        showMessage('Error banning user', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone!')) return;
    
    try {
        const { error } = await supabase
            .from('user_profiles')
            .delete()
            .eq('user_id', userId);
        
        if (error) throw error;
        
        showMessage('User deleted successfully', 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showMessage('Error deleting user', 'error');
    }
}

// Announcements
async function loadAnnouncements() {
    try {
        // You would load announcements from a dedicated table
        // For now, we'll show a placeholder
        const container = document.getElementById('announcementsList');
        container.innerHTML = `
            <div class="announcement-item">
                <div class="announcement-header">
                    <h4>Welcome to QpalChat!</h4>
                    <span class="announcement-date">${formatDate(new Date())}</span>
                </div>
                <p>Welcome to the QpalChat admin dashboard. You can manage users, monitor chats, and make announcements from here.</p>
                <span class="announcement-priority info">Info</span>
            </div>
        `;
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

function showAnnouncementModal() {
    document.getElementById('announcementModal').style.display = 'block';
}

function closeAnnouncementModal() {
    document.getElementById('announcementModal').style.display = 'none';
    // Clear form
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementMessage').value = '';
    document.getElementById('announcementPriority').value = 'info';
    document.getElementById('sendNotification').checked = false;
}

async function createAnnouncement() {
    const title = document.getElementById('announcementTitle').value.trim();
    const message = document.getElementById('announcementMessage').value.trim();
    const priority = document.getElementById('announcementPriority').value;
    const sendNotification = document.getElementById('sendNotification').checked;
    
    if (!title || !message) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    try {
        // You would implement announcement creation here
        // For example, insert into an announcements table
        
        showMessage('Announcement created successfully', 'success');
        closeAnnouncementModal();
        loadAnnouncements();
        
    } catch (error) {
        console.error('Error creating announcement:', error);
        showMessage('Error creating announcement', 'error');
    }
}

// Real-time subscriptions
function setupRealtimeSubscriptions() {
    // Subscribe to chat messages
    supabase
        .channel('admin-chat-monitor')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'chat_messages' },
            (payload) => {
                if (currentTab === 'chats') {
                    loadChatMessages();
                }
                if (currentTab === 'dashboard') {
                    loadDashboardData();
                }
            }
        )
        .subscribe();
    
    // Subscribe to user profile changes
    supabase
        .channel('admin-user-monitor')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'user_profiles' },
            (payload) => {
                if (currentTab === 'users') {
                    loadUsers();
                }
                if (currentTab === 'dashboard') {
                    loadUserStats();
                }
            }
        )
        .subscribe();
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function getStatusClass(user) {
    if (user.is_banned) return 'banned';
    
    if (!user.last_seen) return 'offline';
    
    const lastActive = new Date(user.last_seen);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    return lastActive > fifteenMinutesAgo ? 'online' : 'offline';
}

function getStatusText(user) {
    if (user.is_banned) return 'Banned';
    
    if (!user.last_seen) return 'Offline';
    
    const lastActive = new Date(user.last_seen);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    return lastActive > fifteenMinutesAgo ? 'Online' : 'Offline';
}

function showLoading() {
    document.getElementById('adminLoading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('adminLoading').style.display = 'none';
}

function showMessage(message, type = 'info') {
    const messageEl = document.getElementById('adminMessage');
    messageEl.textContent = message;
    messageEl.className = `admin-message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// Settings
function saveSettings() {
    // You would implement settings saving here
    showMessage('Settings saved successfully', 'success');
}

// Export functionality
function exportChatHistory() {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Username,Message,Date\n"
        + allMessages.map(msg => 
            `"${msg.user_profiles?.username || 'Unknown'}","${msg.content}","${msg.created_at}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "chat_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Logout
async function adminSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
        try {
            await supabase.auth.signOut();
            window.location.href = '/';
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }
}
