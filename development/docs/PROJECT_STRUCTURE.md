# Project Structure

This document outlines the organized file structure of the QpalChat authentication and messaging system.

## Directory Organization

```
authlog/
├── src/                          # Source code
│   ├── pages/                    # HTML pages
│   │   ├── index.html           # Login/signup page
│   │   ├── home.html            # User dashboard
│   │   ├── chat.html            # Global chat room
│   │   ├── messages.html        # Private messaging
│   │   ├── profile.html         # Profile management
│   │   └── *.html               # Other pages
│   ├── scripts/                 # JavaScript files
│   │   ├── auth-simple.js       # Authentication logic
│   │   ├── home-simple.js       # Dashboard functionality
│   │   ├── chat.js              # Real-time chat
│   │   ├── messages.js          # Private messaging
│   │   ├── profile.js           # Profile management
│   │   ├── profile-utils.js     # Shared profile utilities
│   │   └── *.js                 # Other scripts
│   └── styles/                  # CSS stylesheets
│       └── styles.css           # Main stylesheet
├── database/                     # SQL scripts
│   ├── chat-schema.sql          # Chat system schema
│   ├── private-messaging-simple.sql # Private messaging schema
│   ├── profile-schema-simple.sql # User profiles schema
│   ├── emergency-setup.sql      # Emergency database fixes
│   └── *.sql                    # Other database scripts
├── docs/                        # Documentation
│   ├── README.md                # Main documentation
│   ├── SETUP_GUIDE.md          # Setup instructions
│   ├── DEPLOYMENT_TROUBLESHOOTING.md # Deployment help
│   ├── PRIVATE_MESSAGING_SETUP.md # Messaging setup
│   └── *.md                     # Other documentation
├── tests/                       # Test files
│   ├── debug-messages.js        # Message debugging
│   ├── debug-profiles.js        # Profile debugging
│   └── debug-*.js               # Other debug scripts
├── config/                      # Configuration files
│   ├── vercel.json              # Vercel deployment config
│   └── package.json             # Node.js package config
├── .git/                        # Git repository
├── .vscode/                     # VS Code settings
└── .gitignore                   # Git ignore rules
```

## File Purpose Categories

### Pages (`src/pages/`)
- **index.html**: Login and signup interface with Supabase authentication
- **home.html**: User dashboard with navigation to features
- **chat.html**: Real-time global chat with professional UI
- **messages.html**: Private messaging with message requests
- **profile.html**: Profile management with avatar upload

### Scripts (`src/scripts/`)
- **auth-simple.js**: Authentication logic for login/signup
- **home-simple.js**: Dashboard functionality and navigation
- **chat.js**: Real-time chat with Supabase subscriptions
- **messages.js**: Private messaging with conversation management
- **profile.js**: Profile editing and avatar management
- **profile-utils.js**: Shared utilities for profile data

### Database (`database/`)
- **Chat system**: Global chat messages and real-time functionality
- **Private messaging**: Direct messages, conversations, and requests
- **User profiles**: Profile data, avatars, and user information
- **Emergency scripts**: Database fixes and maintenance

### Documentation (`docs/`)
- **Setup guides**: Installation and configuration instructions
- **Deployment help**: Production deployment troubleshooting
- **Feature documentation**: Private messaging and authentication guides

### Tests (`tests/`)
- **Debug scripts**: Database debugging and testing utilities
- **Diagnostic tools**: Connection testing and data validation

### Configuration (`config/`)
- **vercel.json**: Deployment configuration with clean URLs
- **package.json**: Project dependencies and metadata

## URL Routing

The application uses clean URLs without file extensions:
- `/` → Login page (`src/pages/index.html`)
- `/home` → Dashboard (`src/pages/home.html`)
- `/chat` → Global chat (`src/pages/chat.html`)
- `/messages` → Private messaging (`src/pages/messages.html`)
- `/profile` → Profile management (`src/pages/profile.html`)

## Development Workflow

1. **Pages**: Edit HTML files in `src/pages/`
2. **Logic**: Update JavaScript files in `src/scripts/`
3. **Styles**: Modify CSS in `src/styles/`
4. **Database**: Update schemas in `database/`
5. **Documentation**: Update guides in `docs/`
6. **Testing**: Use debug scripts in `tests/`

## Deployment

The project is configured for Vercel deployment with:
- Static file serving for all assets
- Clean URL routing without extensions
- Automatic builds from the organized structure
