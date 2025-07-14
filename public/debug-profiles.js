// Debug User Profiles - Paste this in browser console on messages page

console.log('=== DEBUGGING USER PROFILES ===');

// Check current user profile
supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!session) {
        console.error('No session found');
        return;
    }
    
    const currentUserId = session.user.id;
    console.log('Current user ID:', currentUserId);
    
    // Check current user's profile
    console.log('\n--- Current User Profile ---');
    const { data: currentProfile, error: currentError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUserId)
        .single();
    
    if (currentError) {
        console.error('Current user profile error:', currentError);
    } else {
        console.log('Current user profile:', currentProfile);
    }
    
    // Check all user profiles
    console.log('\n--- All User Profiles ---');
    const { data: allProfiles, error: allError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(10);
    
    if (allError) {
        console.error('All profiles error:', allError);
    } else {
        console.log('All profiles found:', allProfiles.length);
        allProfiles.forEach(profile => {
            console.log('Profile:', {
                user_id: profile.user_id,
                username: profile.username,
                full_name: profile.full_name,
                email: profile.email
            });
        });
    }
    
    // Check conversations
    console.log('\n--- Conversations Debug ---');
    const { data: conversations, error: convError } = await supabase
        .from('private_conversations')
        .select('*')
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);
    
    if (convError) {
        console.error('Conversations error:', convError);
    } else {
        console.log('Conversations found:', conversations.length);
        conversations.forEach(conv => {
            const otherUserId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;
            console.log('Conversation with user ID:', otherUserId);
        });
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
});
