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
    loadSettings(); // Load saved settings
    setupKeyboardShortcuts();
});

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Number keys for tab switching
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '6') {
            e.preventDefault();
            const tabs = ['dashboard', 'users', 'chats', 'messages', 'announcements', 'settings'];
            const tabIndex = parseInt(e.key) - 1;
            if (tabs[tabIndex]) {
                showTab(tabs[tabIndex]);
            }
        }
        
        // Escape key to close modals
        if (e.key === 'Escape') {
            closeAnnouncementModal();
            closeUserModal();
        }
        
        // Ctrl/Cmd + E for export (when on appropriate tab)
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            if (currentTab === 'chats') {
                exportChatHistory();
            } else if (currentTab === 'users') {
                exportUserData();
            }
        }
    });
}

// Authentication and Authorization
async function checkAdminAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        console.log('Current user:', user);
        console.log('Auth error:', error);
        
        if (error || !user) {
            console.log('No user found, redirecting to admin login');
            window.location.href = '/admin-login.html';
            return;
        }

        console.log('User ID:', user.id);

        // Get user profile with role from database
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('username, full_name, avatar_url, role, email')
            .eq('user_id', user.id)
            .single();

        console.log('Profile query result:', { profile, profileError });

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            alert('Error loading user profile. Please try again.');
            window.location.href = '/admin-login.html';
            return;
        }

        console.log('User profile:', profile);
        console.log('User role:', profile?.role);

        // Check if user has admin or super_admin role
        const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
        
        console.log('Is admin?', isAdmin);

        if (!isAdmin) {
            console.log('User does not have admin privileges, redirecting to admin login');
            // Sign out the user and redirect to admin login
            await supabase.auth.signOut();
            alert('Access denied. You do not have administrative privileges.');
            window.location.href = '/admin-login.html';
            return;
        }

        currentUser = { ...user, profile };
        
        // Display admin info
        const adminName = profile?.username || profile?.full_name || user.user_metadata?.full_name || profile?.email || user.email;
        document.getElementById('adminName').textContent = adminName;
        
        // Load user avatar if available
        if (profile?.avatar_url) {
            document.getElementById('adminAvatar').src = profile.avatar_url;
        }
        
        console.log('Admin authenticated successfully:', { role: profile.role, email: profile.email });
        
    } catch (error) {
        console.error('Admin auth error:', error);
        window.location.href = '/admin-login.html';
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
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        const activityHtml = recentMessages?.map(message => `
            <div class="activity-item">
                <img src="${message.avatar_url || '/default-avatar.svg'}" alt="User" class="activity-avatar">
                <div class="activity-content">
                    <span class="activity-user">${message.user_name || message.user_email || 'Unknown User'}</span>
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
        
        // Get users from auth.users and join with user_profiles
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
            // Fallback to user_profiles only if admin access fails
            console.warn('Admin access not available, loading user_profiles only:', authError);
            const { data: users, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            allUsers = users || [];
            displayUsers(allUsers);
            hideLoading();
            return;
        }
        
        // Combine auth users with profile data
        const userIds = authUsers.users.map(u => u.id);
        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('*')
            .in('user_id', userIds);
        
        // Merge auth data with profile data
        const combinedUsers = authUsers.users.map(authUser => {
            const profile = profiles?.find(p => p.user_id === authUser.id) || {};
            return {
                ...profile,
                id: authUser.id,
                user_id: authUser.id,
                email: authUser.email,
                created_at: profile.created_at || authUser.created_at,
                last_sign_in_at: authUser.last_sign_in_at
            };
        });
        
        allUsers = combinedUsers;
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
            <td>${user.username || user.full_name || 'No username'}</td>
            <td>${user.email || 'No email'}</td>
            <td>
                <span class="status-badge ${getStatusClass(user)}">
                    ${getStatusText(user)}
                </span>
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>${user.last_seen || user.last_active_at ? formatDate(user.last_seen || user.last_active_at) : 'Never'}</td>
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
        console.log('Loading chat messages...');
        
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) {
            console.error('Supabase error loading chat messages:', error);
            throw error;
        }
        
        console.log('Chat messages loaded:', messages?.length || 0);
        allMessages = messages || [];
        displayChatMessages(allMessages);
        hideLoading();
        
    } catch (error) {
        console.error('Error loading chat messages:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        showMessage(`Error loading chat messages: ${errorMessage}`, 'error');
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
            <img src="${message.avatar_url || '/default-avatar.svg'}" alt="User" class="message-avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="message-user">${message.user_name || message.user_email || 'Unknown User'}</span>
                    <span class="message-time">${formatDate(message.created_at)}</span>
                    <div class="message-actions">
                        <button onclick="deleteMessage('${message.id}')" class="btn-action delete" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="message-text">${message.message}</div>
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
                user_email: currentUser.email,
                user_name: 'Admin',
                message: content,
                avatar_url: currentUser.user_metadata?.avatar_url || '/default-avatar.svg',
                created_at: new Date().toISOString()
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

async function deleteMessage(messageId, messageType = 'global') {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
        const table = messageType === 'private' ? 'private_messages' : 'chat_messages';
        
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', messageId);
        
        if (error) throw error;
        
        showMessage('Message deleted', 'success');
        
        // Reload appropriate tab
        if (currentTab === 'chats') {
            loadChatMessages();
        } else if (currentTab === 'messages') {
            loadMessages();
        }
        
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
        showLoading();
        
        const { data: announcements, error } = await supabase
            .from('announcements')
            .select(`
                *,
                user_profiles:created_by (username)
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error loading announcements:', error);
            // If table doesn't exist, show placeholder
            displayAnnouncementsPlaceholder();
        } else {
            displayAnnouncements(announcements || []);
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading announcements:', error);
        displayAnnouncementsPlaceholder();
        hideLoading();
    }
}

function displayAnnouncements(announcements) {
    const container = document.getElementById('announcementsList');
    
    if (!announcements.length) {
        container.innerHTML = `
            <div class="announcement-item">
                <div class="announcement-header">
                    <h4>No announcements yet</h4>
                    <span class="announcement-date">Create your first announcement!</span>
                </div>
                <p>Use the "New Announcement" button to create system-wide announcements for all users.</p>
                <span class="announcement-priority info">Info</span>
            </div>
        `;
        return;
    }
    
    container.innerHTML = announcements.map(announcement => `
        <div class="announcement-item">
            <div class="announcement-header">
                <h4>${announcement.title}</h4>
                <span class="announcement-date">${formatDate(announcement.created_at)}</span>
                <div class="announcement-actions">
                    <button onclick="editAnnouncement('${announcement.id}')" class="btn-action view" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteAnnouncement('${announcement.id}')" class="btn-action delete" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p>${announcement.content}</p>
            <div class="announcement-footer">
                <span class="announcement-priority ${announcement.priority}">${announcement.priority}</span>
                <span class="announcement-author">By: ${announcement.user_profiles?.username || 'Admin'}</span>
                ${announcement.expires_at ? `<span class="announcement-expires">Expires: ${formatDate(announcement.expires_at)}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function displayAnnouncementsPlaceholder() {
    const container = document.getElementById('announcementsList');
    container.innerHTML = `
        <div class="announcement-item">
            <div class="announcement-header">
                <h4>Welcome to QpalChat Admin!</h4>
                <span class="announcement-date">${formatDate(new Date())}</span>
            </div>
            <p>Welcome to the QpalChat admin dashboard. You can manage users, monitor chats, and make announcements from here.</p>
            <span class="announcement-priority info">Info</span>
        </div>
        <div class="announcement-item">
            <div class="announcement-header">
                <h4>System Status</h4>
                <span class="announcement-date">${formatDate(new Date())}</span>
            </div>
            <p>All systems are operational. Chat service is running smoothly.</p>
            <span class="announcement-priority info">Info</span>
        </div>
    `;
}

function showAnnouncementModal() {
    document.getElementById('announcementModal').style.display = 'block';
    // Clear form
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementMessage').value = '';
    document.getElementById('announcementPriority').value = 'info';
    document.getElementById('sendNotification').checked = false;
}

function closeAnnouncementModal() {
    document.getElementById('announcementModal').style.display = 'none';
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
        const { error } = await supabase
            .from('announcements')
            .insert([{
                title: title,
                content: message,
                priority: priority,
                created_by: currentUser.id,
                is_active: true
            }]);
        
        if (error) throw error;
        
        showMessage('Announcement created successfully', 'success');
        closeAnnouncementModal();
        loadAnnouncements();
        
        // If send notification is checked, you could implement push notifications here
        if (sendNotification) {
            console.log('Push notification would be sent here');
        }
        
    } catch (error) {
        console.error('Error creating announcement:', error);
        showMessage('Error creating announcement: ' + error.message, 'error');
    }
}

async function deleteAnnouncement(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', announcementId);
        
        if (error) throw error;
        
        showMessage('Announcement deleted successfully', 'success');
        loadAnnouncements();
        
    } catch (error) {
        console.error('Error deleting announcement:', error);
        showMessage('Error deleting announcement', 'error');
    }
}

function editAnnouncement(announcementId) {
    // For now, just show edit option
    showMessage('Edit functionality coming soon', 'info');
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

// Enhanced Settings functionality
function saveSettings() {
    try {
        const settings = {
            enableGlobalChat: document.getElementById('enableGlobalChat').checked,
            enablePrivateMessages: document.getElementById('enablePrivateMessages').checked,
            rateLimit: document.getElementById('rateLimit').value,
            requireEmailVerification: document.getElementById('requireEmailVerification').checked,
            allowGuestUsers: document.getElementById('allowGuestUsers').checked,
            enableModerationMode: document.getElementById('enableModerationMode').checked,
            autoBanThreshold: document.getElementById('autoBanThreshold').value
        };
        
        // Save to localStorage for now (in production, you'd save to database)
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        
        showMessage('Settings saved successfully', 'success');
        
        console.log('Settings saved:', settings);
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showMessage('Error saving settings', 'error');
    }
}

function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('adminSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            document.getElementById('enableGlobalChat').checked = settings.enableGlobalChat !== false;
            document.getElementById('enablePrivateMessages').checked = settings.enablePrivateMessages !== false;
            document.getElementById('rateLimit').value = settings.rateLimit || 10;
            document.getElementById('requireEmailVerification').checked = settings.requireEmailVerification !== false;
            document.getElementById('allowGuestUsers').checked = settings.allowGuestUsers || false;
            document.getElementById('enableModerationMode').checked = settings.enableModerationMode || false;
            document.getElementById('autoBanThreshold').value = settings.autoBanThreshold || 5;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Bulk user actions
async function bulkBanUsers(userIds) {
    if (!confirm(`Are you sure you want to ban ${userIds.length} users?`)) return;
    
    try {
        const { error } = await supabase
            .from('user_profiles')
            .update({ is_banned: true })
            .in('user_id', userIds);
        
        if (error) throw error;
        
        showMessage(`${userIds.length} users banned successfully`, 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error banning users:', error);
        showMessage('Error banning users', 'error');
    }
}

async function bulkDeleteUsers(userIds) {
    if (!confirm(`Are you sure you want to delete ${userIds.length} users? This cannot be undone!`)) return;
    
    try {
        const { error } = await supabase
            .from('user_profiles')
            .delete()
            .in('user_id', userIds);
        
        if (error) throw error;
        
        showMessage(`${userIds.length} users deleted successfully`, 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error deleting users:', error);
        showMessage('Error deleting users', 'error');
    }
}

// Enhanced export functionality
function exportChatHistory() {
    try {
        if (!allMessages.length) {
            showMessage('No messages to export', 'info');
            return;
        }
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Date,Time,Username,Message,Type\n"
            + allMessages.map(msg => {
                const date = new Date(msg.created_at);
                const username = msg.user_profiles?.username || 'Unknown User';
                const message = `"${msg.content.replace(/"/g, '""')}"`;
                return `${date.toLocaleDateString()},${date.toLocaleTimeString()},"${username}",${message},"Global Chat"`;
            }).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `chat_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('Chat history exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting chat history:', error);
        showMessage('Error exporting chat history', 'error');
    }
}

function exportUserData() {
    try {
        if (!allUsers.length) {
            showMessage('No users to export', 'info');
            return;
        }
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + "User ID,Username,Email,Role,Status,Joined Date,Last Seen\n"
            + allUsers.map(user => {
                const status = user.is_banned ? 'Banned' : 'Active';
                const lastSeen = user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Never';
                return `"${user.user_id}","${user.username || ''}","${user.email || ''}","${user.role || 'user'}","${status}","${new Date(user.created_at).toLocaleString()}","${lastSeen}"`;
            }).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `users_data_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('User data exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting user data:', error);
        showMessage('Error exporting user data', 'error');
    }
}

// Logout
async function adminSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
        try {
            // Log the admin logout activity
            if (currentUser) {
                await logAdminActivity(currentUser.id, 'admin_logout', {
                    timestamp: new Date().toISOString()
                });
            }
            
            await supabase.auth.signOut();
            window.location.href = '/admin-login.html';
        } catch (error) {
            console.error('Error signing out:', error);
            // Still redirect even if logging fails
            window.location.href = '/admin-login.html';
        }
    }
}

// Missing functions for admin dashboard

// Admin activity logging function
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
        }
    } catch (error) {
        console.warn('Error logging admin activity:', error);
    }
}

// Enhanced view user details function
async function viewUser(userId) {
    try {
        const { data: user, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        
        const modalBody = document.getElementById('userModalBody');
        modalBody.innerHTML = `
            <div class="user-detail-item">
                <span class="user-detail-label">User ID:</span>
                <span class="user-detail-value">${user.user_id}</span>
            </div>
            <div class="user-detail-item">
                <span class="user-detail-label">Username:</span>
                <span class="user-detail-value">${user.username || 'Not set'}</span>
            </div>
            <div class="user-detail-item">
                <span class="user-detail-label">Email:</span>
                <span class="user-detail-value">${user.email || 'Not set'}</span>
            </div>
            <div class="user-detail-item">
                <span class="user-detail-label">Role:</span>
                <span class="user-detail-value">${user.role || 'user'}</span>
            </div>
            <div class="user-detail-item">
                <span class="user-detail-label">Status:</span>
                <span class="user-detail-value">${user.is_banned ? 'Banned' : 'Active'}</span>
            </div>
            <div class="user-detail-item">
                <span class="user-detail-label">Joined:</span>
                <span class="user-detail-value">${formatDate(user.created_at)}</span>
            </div>
            <div class="user-detail-item">
                <span class="user-detail-label">Last Seen:</span>
                <span class="user-detail-value">${user.last_seen ? formatDate(user.last_seen) : 'Never'}</span>
            </div>
            <div class="user-detail-item">
                <span class="user-detail-label">Bio:</span>
                <span class="user-detail-value">${user.bio || 'No bio set'}</span>
            </div>
            ${user.avatar_url ? `
                <div class="user-detail-item">
                    <span class="user-detail-label">Avatar:</span>
                    <img src="${user.avatar_url}" alt="Avatar" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
                </div>
            ` : ''}
        `;
        
        document.getElementById('userModal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading user details:', error);
        showMessage('Error loading user details', 'error');
    }
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

// Chat filtering functions
function filterChats() {
    const filter = document.getElementById('chatFilter').value;
    // For now, just reload messages
    loadChatMessages();
}

function filterByDate() {
    const date = document.getElementById('chatDate').value;
    // For now, just reload messages
    loadChatMessages();
}

// Enhanced message search and filter functions
function searchMessages() {
    const searchTerm = document.getElementById('messageSearch').value.toLowerCase();
    
    if (currentTab === 'messages') {
        // Search in all messages (global + private)
        loadMessages().then(() => {
            const messageItems = document.querySelectorAll('.chat-message-item');
            messageItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            });
        });
    } else if (currentTab === 'chats') {
        // Search in chat messages
        const filtered = allMessages.filter(message => 
            message.content.toLowerCase().includes(searchTerm) ||
            (message.user_profiles?.username || '').toLowerCase().includes(searchTerm)
        );
        displayChatMessages(filtered);
    }
}

function filterMessages() {
    const filter = document.getElementById('messageFilter').value;
    
    // For now, just reload messages
    // In a real implementation, you would filter by flagged/reported status
    loadMessages();
    
    if (filter !== 'all') {
        showMessage(`Filtering by ${filter} - feature coming soon`, 'info');
    }
}

// Enhanced statistics with real-time updates
async function updateStatistics() {
    try {
        // Update all statistics
        await Promise.all([
            loadUserStats(),
            loadMessageStats(),
            updateOnlineUsersCount()
        ]);
    } catch (error) {
        console.error('Error updating statistics:', error);
    }
}

async function updateOnlineUsersCount() {
    try {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        
        const { count: onlineUsers } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('last_seen', fifteenMinutesAgo);
        
        document.getElementById('onlineUsers').textContent = onlineUsers || 0;
        
    } catch (error) {
        console.error('Error updating online users count:', error);
    }
}

// Auto-refresh statistics every 30 seconds
setInterval(updateStatistics, 30000);

// Load Messages tab
async function loadMessages() {
    try {
        showLoading();
        console.log('Loading all messages...');
        
        // Load both global and private messages
        const [globalMessages, privateMessages] = await Promise.all([
            supabase
                .from('chat_messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50),
            
            supabase
                .from('private_messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)
        ]);
        
        console.log('Global messages:', globalMessages.data?.length || 0);
        console.log('Private messages:', privateMessages.data?.length || 0);
        
        if (globalMessages.error) {
            console.error('Error loading global messages:', globalMessages.error);
        }
        
        if (privateMessages.error) {
            console.error('Error loading private messages:', privateMessages.error);
        }
        
        const allMsgs = [
            ...(globalMessages.data || []).map(msg => ({...msg, type: 'global'})),
            ...(privateMessages.data || []).map(msg => ({...msg, type: 'private'}))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        console.log('Total messages combined:', allMsgs.length);
        displayMessages(allMsgs);
        hideLoading();
        
    } catch (error) {
        console.error('Error loading messages:', error);
        const errorMessage = error?.message || 'Unknown error occurred';
        showMessage(`Error loading messages: ${errorMessage}`, 'error');
        hideLoading();
    }
}

function displayMessages(messages) {
    const container = document.getElementById('messagesList');
    
    if (!messages.length) {
        container.innerHTML = '<p>No messages found</p>';
        return;
    }
    
    container.innerHTML = messages.map(message => `
        <div class="chat-message-item">
            <img src="${getMessageAvatar(message)}" alt="User" class="message-avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="message-user">${getMessageUsername(message)}</span>
                    <span class="message-type">${message.type === 'global' ? 'Global' : 'Private'}</span>
                    <span class="message-time">${formatDate(message.created_at)}</span>
                    <div class="message-actions">
                        <button onclick="deleteMessage('${message.id}', '${message.type}')" class="btn-action delete" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="message-text">${message.content || message.message || 'No content'}</div>
            </div>
        </div>
    `).join('');
}

function getMessageAvatar(message) {
    if (message.type === 'global') {
        return message.avatar_url || '/default-avatar.svg';
    } else {
        // For private messages, we'll need to handle this differently
        // since we don't have joined user profiles
        return '/default-avatar.svg';
    }
}

function getMessageUsername(message) {
    if (message.type === 'global') {
        return message.user_name || message.user_email || 'Unknown User';
    } else {
        // For private messages, show sender/receiver IDs for now
        return `Private: ${message.sender_id?.slice(0, 8)} → ${message.receiver_id?.slice(0, 8)}`;
    }
}
