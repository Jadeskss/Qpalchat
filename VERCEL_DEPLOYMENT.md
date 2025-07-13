# 🚀 Vercel + GitHub Deployment Guide

## Quick Deployment Steps

### 1. **Push to GitHub**
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. **Deploy to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your `Qpalchat` repository
5. Click "Deploy"

### 3. **Update Supabase URLs**
After deployment, update your Supabase settings:

1. **Site URL**: `https://your-app-name.vercel.app`
2. **Redirect URLs**: Add `https://your-app-name.vercel.app/**`

## 📁 Required Files (Already Created)

- ✅ `package.json` - Node.js configuration
- ✅ `vercel.json` - Vercel deployment settings
- ✅ `README.md` - Project documentation

## 🔧 Post-Deployment Checklist

### Update Supabase Configuration:
1. **Authentication > URL Configuration**:
   - Site URL: `https://your-vercel-domain.vercel.app`
   - Redirect URLs: `https://your-vercel-domain.vercel.app/**`

2. **Run Database Setup**:
   - Execute `production-setup.sql` in Supabase SQL Editor

3. **Test Your Deployment**:
   - Visit `https://your-vercel-domain.vercel.app/diagnostic.html`
   - Run all tests to verify functionality

## 🌐 Your Deployed URLs

After deployment, you'll have:
- **Main App**: `https://your-app.vercel.app`
- **Login**: `https://your-app.vercel.app/index.html`
- **Chat**: `https://your-app.vercel.app/chat.html`
- **Profile**: `https://your-app.vercel.app/profile.html`
- **Diagnostic**: `https://your-app.vercel.app/diagnostic.html`

## ⚡ Automatic Deployments

Vercel will automatically deploy when you:
- Push to main branch
- Make pull requests
- Update any files in the repository

## 🔍 Troubleshooting

### Common Issues:
1. **Authentication not working**: Update Site URL in Supabase
2. **Chat not loading**: Run `production-setup.sql`
3. **Profile pictures not uploading**: Check storage bucket setup

### Debug Steps:
1. Check Vercel deployment logs
2. Use browser developer tools
3. Run diagnostic tool after deployment

Your QpalChat app is now ready for production! 🎉
