# AuthLog - Supabase Authentication System

A complete authentication system built with HTML, CSS, JavaScript, and Supabase that supports:
- Email/Password authentication
- Google OAuth
- Facebook OAuth
- User profile management
- Responsive design

## Features

- 🔐 **Multiple Authentication Methods**: Email/password, Google, and Facebook
- 🎨 **Modern UI**: Beautiful, responsive design with glass morphism effects
- 👤 **User Profiles**: Display user information and authentication details
- 🔄 **State Management**: Persistent authentication state
- 📱 **Mobile Friendly**: Fully responsive design
- ⚡ **Fast & Secure**: Built with Supabase for optimal performance

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new account
2. Create a new project
3. Go to Settings → API to find your project URL and anon key

### 2. Configure OAuth Providers

#### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins
6. In Supabase dashboard, go to Authentication → Providers → Google
7. Enable Google provider and add your Client ID and Client Secret

#### Facebook OAuth Setup:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure Valid OAuth Redirect URIs
5. In Supabase dashboard, go to Authentication → Providers → Facebook
6. Enable Facebook provider and add your App ID and App Secret

### 3. Update Configuration

1. Open `auth.js` and `home.js`
2. Replace the placeholder values:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
   
   With your actual Supabase project URL and anon key from the Supabase dashboard.

### 4. Configure Supabase Settings

1. In your Supabase dashboard, go to Authentication → Settings
2. Set Site URL to your domain (e.g., `http://localhost:3000` for local development)
3. Add redirect URLs:
   - `http://localhost:3000/home.html` (for local development)
   - `https://yourdomain.com/home.html` (for production)

### 5. Run the Application

#### For local development:
1. Install a simple HTTP server (if you don't have one):
   ```bash
   npm install -g http-server
   ```

2. Navigate to the project directory and start the server:
   ```bash
   http-server -p 3000
   ```

3. Open your browser and go to `http://localhost:3000`

#### For production:
1. Upload all files to your web hosting service
2. Update the Supabase configuration with your production URLs
3. Configure OAuth redirect URLs in both Supabase and OAuth providers

## File Structure

```
authlog/
├── index.html          # Login/Sign up page
├── home.html          # Dashboard/Home page after login
├── styles.css         # All styling
├── auth.js           # Authentication logic
├── home.js           # Home page logic
└── README.md         # This file
```

## Usage

### Login Page (`index.html`)
- Switch between Login and Sign Up tabs
- Enter email/password or use social login
- Form validation and error handling
- Loading states and success messages

### Home Page (`home.html`)
- Displays user information
- Shows authentication method used
- Account creation and last login dates
- Sign out functionality
- Feature cards for future functionality

## Customization

### Styling
- All styles are in `styles.css`
- Uses CSS custom properties for easy theming
- Glass morphism design with gradient backgrounds
- Fully responsive with CSS Grid and Flexbox

### Functionality
- Add more OAuth providers by configuring them in Supabase
- Extend user profiles with additional fields
- Add more features to the dashboard
- Implement password reset functionality

## Security Features

- 🔒 Secure authentication with Supabase
- 🛡️ CSRF protection built-in
- 🔐 JWT token-based sessions
- 🚫 Client-side route protection
- ✅ Email verification support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify your Supabase configuration
3. Ensure OAuth providers are properly configured
4. Check network connectivity

For additional help, refer to the [Supabase documentation](https://supabase.com/docs).
