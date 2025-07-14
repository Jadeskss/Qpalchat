// Debug script for messages page - Add this to browser console
console.log('=== DEBUGGING PRIVATE MESSAGING ===');

// Check if user is authenticated
supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
        console.error('❌ Auth Error:', error);
        return;
    }
    
    if (!session) {
        console.error('❌ No session found');
        return;
    }
    
    console.log('✅ User authenticated:', session.user.email);
    const userId = session.user.id;
    
    // Test 1: Check if messaging tables exist
    console.log('\n--- Testing Table Existence ---');
    
    // Test conversations table
    supabase.from('private_conversations').select('*').limit(1).then(({ data, error }) => {
        if (error) {
            console.error('❌ private_conversations table error:', error.message);
            if (error.code === '42P01') {
                console.error('🔴 Table does not exist! Run the SQL schema first.');
            }
        } else {
            console.log('✅ private_conversations table exists');
        }
    });
    
    // Test message requests table
    supabase.from('message_requests').select('*').limit(1).then(({ data, error }) => {
        if (error) {
            console.error('❌ message_requests table error:', error.message);
            if (error.code === '42P01') {
                console.error('🔴 Table does not exist! Run the SQL schema first.');
            }
        } else {
            console.log('✅ message_requests table exists');
        }
    });
    
    // Test private messages table
    supabase.from('private_messages').select('*').limit(1).then(({ data, error }) => {
        if (error) {
            console.error('❌ private_messages table error:', error.message);
            if (error.code === '42P01') {
                console.error('🔴 Table does not exist! Run the SQL schema first.');
            }
        } else {
            console.log('✅ private_messages table exists');
        }
    });
    
    // Test 2: Check user_profiles table
    console.log('\n--- Testing User Profiles ---');
    supabase.from('user_profiles').select('user_id, username, full_name').eq('user_id', userId).then(({ data, error }) => {
        if (error) {
            console.error('❌ user_profiles query error:', error);
        } else if (!data || data.length === 0) {
            console.error('❌ No user profile found for current user');
        } else {
            console.log('✅ User profile found:', data[0]);
        }
    });
    
    // Test 3: Check if there are any users in the system
    console.log('\n--- Testing Available Users ---');
    supabase.from('user_profiles').select('user_id, username, full_name').limit(5).then(({ data, error }) => {
        if (error) {
            console.error('❌ Error loading users:', error);
        } else {
            console.log(`✅ Found ${data.length} users in system:`, data);
        }
    });
    
    // Test 4: Check for existing conversations
    console.log('\n--- Testing Conversations ---');
    supabase.from('private_conversations')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .then(({ data, error }) => {
            if (error) {
                console.error('❌ Conversations query error:', error);
            } else {
                console.log(`✅ Found ${data.length} conversations for user`);
            }
        });
    
    // Test 5: Check for message requests
    console.log('\n--- Testing Message Requests ---');
    supabase.from('message_requests')
        .select('*')
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .then(({ data, error }) => {
            if (error) {
                console.error('❌ Message requests query error:', error);
            } else {
                console.log(`✅ Found ${data.length} pending message requests`);
            }
        });
    
    setTimeout(() => {
        console.log('\n=== DEBUG COMPLETE ===');
        console.log('If tables don\'t exist, copy and run private-messaging-schema-fixed.sql in Supabase SQL Editor');
    }, 2000);
});
