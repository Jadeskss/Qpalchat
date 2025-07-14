# Google OAuth Setup Guide for QpalChat

## 🚀 **Complete Google Login Implementation**

### 📋 **Step 1: Google Cloud Console Setup**

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select a project**
3. **Configure OAuth Consent Screen FIRST:**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Fill out the consent screen form:
     - **App name:** QpalChat
     - **User support email:** Your email
     - **Developer contact email:** Your email
     - **App domain:** https://qpalchat.vercel.app (optional)
   - Save and continue through all steps
4. **Enable Google+ API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" and enable it
5. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Set **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     https://your-domain.vercel.app
     https://qpalchat.vercel.app
     ```
   - Set **Authorized redirect URIs:**
     ```
     https://gmabjefdlwlowsdnazcr.supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**

### 🔧 **Step 2: Supabase Configuration**

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Navigate to your project** (`gmabjefdlwlowsdnazcr`)
3. **Go to Authentication → Providers**
4. **Enable Google Provider:**
   - Toggle "Google" to ON
   - Enter your **Google Client ID**
   - Enter your **Google Client Secret**
   - Save configuration

### 💻 **Step 3: Code Implementation (Already Done!)**

Your `auth-simple.js` already has the correct implementation:

```javascript
// Google Sign In Function
async function signInWithGoogle() {
    try {
        console.log('Google login clicked');
        showLoading();
        clearMessages();

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/home.html`
            }
        });

        if (error) {
            console.error('Google OAuth error:', error);
            throw error;
        }

        console.log('Google OAuth initiated');
    } catch (error) {
        console.error('Google sign in error:', error);
        showError(error.message || 'Failed to sign in with Google');
    } finally {
        hideLoading();
    }
}
```

### 🌐 **Step 4: HTML Implementation (Already Done!)**

Your `index.html` already has the Google button:

```html
<button class="social-btn google" onclick="signInWithGoogle()">
    <svg width="18" height="18" viewBox="0 0 24 24">
        <!-- Google icon SVG -->
    </svg>
    Continue with Google
</button>
```

### 🔄 **Step 5: Authentication Flow**

1. **User clicks "Continue with Google"**
2. **Redirects to Google OAuth consent screen**
3. **User grants permissions**
4. **Google redirects back to Supabase**
5. **Supabase processes the authentication**
6. **User is redirected to `/home.html`**
7. **User profile is automatically created in Supabase**

### 🛠️ **Step 6: Environment Variables (Optional)**

For enhanced security, you can use environment variables:

```javascript
// In production, consider using environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
```

### 🔍 **Step 7: Testing the Implementation**

1. **Local Testing:**
   - Serve your site locally
   - Click "Continue with Google"
   - Should redirect to Google OAuth

2. **Production Testing:**
   - Deploy to Vercel
   - Test Google login on live site
   - Verify redirect to home page

### ⚠️ **Common Issues & Solutions**

**❌ "OAuth client not found"**
- Check Client ID is correctly entered in Supabase
- Verify redirect URI matches exactly

**❌ "Redirect URI mismatch"** 
- Add your domain to authorized origins in Google Console
- Include both http://localhost:3000 and your production URL

**❌ "Access blocked"**
- Make sure Google+ API is enabled
- Check OAuth consent screen is configured

### ✅ **Verification Checklist**

- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] OAuth 2.0 credentials created
- [ ] Authorized origins set (localhost + production)
- [ ] Redirect URI set to Supabase callback
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret entered in Supabase
- [ ] Code implementation verified
- [ ] Local testing successful
- [ ] Production testing successful

### 🎯 **What Happens After Login**

1. **User object available** in Supabase Auth
2. **Profile automatically created** in `user_profiles` table
3. **Session established** for the user
4. **Can access protected pages** (home, chat, messages, profile)

Your Google OAuth implementation is **already complete**! You just need to configure the Google Cloud Console and Supabase settings following the steps above. 🎉
