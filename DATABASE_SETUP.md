# 🗄️ Supabase Database Setup Instructions

This guide will help you set up the complete database schema for your AuthLog application.

## 📋 What the Schema Includes

### **Tables Created:**
- 🔧 **`user_profiles`** - Extended user information beyond auth.users
- 📊 **`auth_sessions`** - Track login sessions and authentication history
- 📝 **`user_activity_log`** - Log all user activities for analytics
- 🔐 **`password_reset_tokens`** - Custom password reset functionality
- ✅ **`account_verification`** - Email/phone verification tracking
- ⚙️ **`user_preferences`** - Store user application preferences

### **Features Included:**
- 🛡️ **Row Level Security (RLS)** - Data protection policies
- 🔍 **Optimized Indexes** - Fast database queries
- 🔄 **Automatic Triggers** - Auto-create profiles on signup
- 📈 **Analytics Views** - User dashboard and activity views
- 🧹 **Cleanup Functions** - Maintenance and data archiving

## 🚀 Setup Steps

### **Step 1: Open Supabase SQL Editor**
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**

### **Step 2: Execute the Schema**
1. Copy the entire content from `supabase-schema.sql`
2. Paste it into the SQL Editor
3. Click **"Run"** to execute the script
4. Wait for completion (should show success messages)

### **Step 3: Verify Installation**
Check that these tables were created in **Table Editor**:
- ✅ user_profiles
- ✅ auth_sessions  
- ✅ user_activity_log
- ✅ password_reset_tokens
- ✅ account_verification
- ✅ user_preferences

### **Step 4: Test the Setup**
The schema will automatically:
- Create a user profile when someone signs up
- Log authentication activities
- Track login sessions
- Enable security policies

## 🔧 How It Works with Your App

### **Automatic Profile Creation**
When a user signs up via your app, the database will automatically:
```sql
-- This happens automatically when user signs up
INSERT INTO user_profiles (id, full_name) 
VALUES (new_user_id, 'User Name');
```

### **Session Tracking**
Each login will create a session record:
```sql
-- Tracks login method, IP, device info
INSERT INTO auth_sessions (user_id, provider, ip_address)
VALUES (user_id, 'google', '192.168.1.1');
```

### **Activity Logging**
All user actions are logged:
```sql
-- Logs activities like login, profile updates
INSERT INTO user_activity_log (user_id, activity_type)
VALUES (user_id, 'login');
```

## 📊 Useful Queries

### **Get User Profile with Stats:**
```sql
SELECT * FROM get_user_profile_with_stats('user-uuid-here');
```

### **View User Dashboard:**
```sql
SELECT * FROM user_dashboard WHERE id = 'user-uuid-here';
```

### **Recent Activity:**
```sql
SELECT * FROM recent_user_activity 
WHERE user_id = 'user-uuid-here' 
ORDER BY created_at DESC 
LIMIT 10;
```

### **Login History:**
```sql
SELECT provider, login_at, ip_address 
FROM auth_sessions 
WHERE user_id = 'user-uuid-here' 
ORDER BY login_at DESC;
```

## 🛡️ Security Features

### **Row Level Security (RLS)**
- Users can only access their own data
- Automatic data isolation per user
- Secure by default

### **Data Protection**
- All sensitive operations logged
- IP address and device tracking
- Session management

### **Privacy Compliance**
- Data retention policies
- User consent tracking
- Cleanup functions for old data

## 🔄 Maintenance

### **Clean Up Expired Tokens:**
```sql
SELECT cleanup_expired_tokens();
```

### **Archive Old Logs:**
```sql
SELECT archive_old_activity_logs();
```

## 🎯 Next Steps

After running the schema:

1. **Test Signup** - Create a new account and check if profile is created
2. **Test Login** - Sign in and verify session tracking
3. **View Data** - Check the Table Editor to see your data
4. **Update Frontend** - Use the enhanced JavaScript functions

## 🔧 Troubleshooting

### **If You Get Permission Errors:**
1. Make sure you're running as the `postgres` user
2. Check that RLS policies are correct
3. Verify your user has proper permissions

### **If Tables Don't Appear:**
1. Refresh the Table Editor page
2. Check the SQL Editor for error messages
3. Re-run the schema script

### **If Functions Don't Work:**
1. Verify the functions were created in **Database → Functions**
2. Check function permissions
3. Test functions manually in SQL Editor

## 💡 Tips

- **Backup First**: Always backup before running schema changes
- **Test Environment**: Run in a test project first
- **Monitor Performance**: Check query performance with indexes
- **Security**: Review RLS policies for your use case

Your database is now ready for production use with comprehensive user management, activity tracking, and security features! 🎉
