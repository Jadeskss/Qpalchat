# Google OAuth Quick Start & Troubleshooting

## 🚀 **Quick Setup (5 Minutes)**

### 1. **Google Cloud Console** (2 minutes)
```
1. Go to console.cloud.google.com
2. Create project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Set redirect URI: https://gmabjefdlwlowsdnazcr.supabase.co/auth/v1/callback
5. Copy Client ID & Secret
```

### 2. **Supabase Dashboard** (2 minutes)
```
1. Go to supabase.com/dashboard
2. Project → Authentication → Providers
3. Enable Google → Enter Client ID & Secret
4. Save configuration
```

### 3. **Test Implementation** (1 minute)
```
1. Click "Continue with Google" button
2. Should redirect to Google OAuth
3. After approval, redirects to /home.html
```

## 🔧 **Your Code is Already Ready!**

Your `auth-simple.js` has the perfect implementation:

```javascript
async function signInWithGoogle() {
    try {
        showLoading();
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/home.html`
            }
        });
        if (error) throw error;
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}
```

## ⚡ **Common Issues & Quick Fixes**

### ❌ **"OAuth client not found"**
**Fix:** Double-check Client ID in Supabase matches Google Console

### ❌ **"Redirect URI mismatch"**
**Fix:** Add these to Google Console authorized origins:
```
http://localhost:3000
https://qpalchat.vercel.app
```

### ❌ **"Access blocked: This app's request is invalid"**
**Fix:** Enable Google+ API in Google Cloud Console

### ❌ **Button clicks but nothing happens**
**Fix:** Check browser console for errors

## 🔍 **Testing Commands**

### **Test in Browser Console:**
```javascript
// Test Supabase connection
console.log(supabase);

// Test Google OAuth manually
supabase.auth.signInWithOAuth({ provider: 'google' });
```

### **Check Authentication State:**
```javascript
// Check current user
supabase.auth.getUser().then(console.log);

// Listen for auth changes
supabase.auth.onAuthStateChange(console.log);
```

## 📋 **Configuration Checklist**

- [ ] **Google Cloud:** Project created
- [ ] **Google Cloud:** Google+ API enabled  
- [ ] **Google Cloud:** OAuth 2.0 credentials created
- [ ] **Google Cloud:** Redirect URI set to Supabase callback
- [ ] **Supabase:** Google provider enabled
- [ ] **Supabase:** Client ID entered
- [ ] **Supabase:** Client Secret entered
- [ ] **Code:** Button clicks trigger `signInWithGoogle()`
- [ ] **Testing:** Local testing works
- [ ] **Production:** Live site testing works

## 🎯 **Expected Flow**

1. **Click** "Continue with Google"
2. **Redirect** to Google OAuth consent
3. **User approves** permissions
4. **Redirect back** to your app
5. **Automatically redirects** to `/home.html`
6. **User is logged in** and can access all features

Your implementation is **100% ready**! Just need the Google Cloud + Supabase configuration. 🎉
