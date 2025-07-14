// Configuration file for Supabase
// Copy this to config.js and update with your actual values

const config = {
    // Replace with your Supabase project URL
    supabaseUrl: 'https://your-project-id.supabase.co',
    
    // Replace with your Supabase anon key
    supabaseAnonKey: 'your-supabase-anon-key',
    
    // Site configuration
    siteUrl: 'http://localhost:3000', // Change for production
    
    // OAuth redirect URLs
    redirectUrls: {
        development: 'http://localhost:3000/home.html',
        production: 'https://yourdomain.com/home.html'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else {
    window.config = config;
}
