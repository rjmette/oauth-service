# OAuth Service

Shared OAuth service for rbios projects, providing centralized GitHub authentication.

## Overview

This service provides a single, reusable OAuth implementation that can be shared across multiple frontend applications. It handles the complete OAuth flow with GitHub, including CSRF protection, secure token exchange, and multi-origin support.

## Features

- 🔒 **Secure GitHub OAuth Flow** - Complete OAuth 2.0 implementation
- 🌐 **Multi-Origin Support** - Supports multiple frontend applications
- 🛡️ **CSRF Protection** - State parameter validation
- 🍪 **Secure Cookie Handling** - HttpOnly, Secure, SameSite cookies
- 📊 **Project Tracking** - Identifies source application
- ⚡ **Serverless Ready** - Designed for AWS Lambda deployment
- 🚀 **Local Development** - Express server for local testing

## Supported Projects

- **Create** - https://create.rbios.net
- **Prompts** - https://prompts.rbios.net

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your GitHub OAuth credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 3. Run Local Development Server

```bash
npm run dev
```

Server will start at http://localhost:3000

## API Endpoints

### `GET /oauth/login`

Initiates the OAuth flow by redirecting to GitHub.

**Query Parameters:**
- `project` (optional) - Project identifier (e.g., "create", "prompts")

**Example:**
```
http://localhost:3000/oauth/login?project=create
```

### `GET /oauth/callback`

Handles the OAuth callback from GitHub, exchanges code for access token.

**Query Parameters:**
- `code` - Authorization code from GitHub
- `state` - State parameter for CSRF validation

### `GET /health`

Health check endpoint.

## Frontend Integration

### 1. Update Login Component

```javascript
const OAUTH_SERVICE_URL = 'https://api.rbios.net';

const handleLogin = () => {
  const loginUrl = `${OAUTH_SERVICE_URL}/oauth/login?project=create`;
  const popup = window.open(loginUrl, 'github_oauth', 'width=600,height=700');
  
  window.addEventListener('message', (event) => {
    if (event.origin !== OAUTH_SERVICE_URL) return;
    
    const { source, access_token } = event.data;
    if (source === 'oauth' && access_token) {
      // Store token and proceed
      localStorage.setItem('github_token', access_token);
      popup?.close();
      window.location.href = '/';
    }
  });
};
```

### 2. Configure CORS

The service automatically handles CORS for configured origins. Add new origins in the configuration if needed.

## Deployment

### AWS Lambda Deployment

1. Build Lambda functions:
```bash
npm run build:lambda
```

2. Deploy to AWS:
```bash
npm run deploy:lambda
```

### Environment Variables for Production

Set these in AWS Lambda:
- `NODE_ENV=production`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `OAUTH_API_URL=https://api.rbios.net`

## Security Features

### CSRF Protection
- Random state parameter generated for each OAuth request
- State validated on callback to prevent CSRF attacks

### Cookie Security
- `HttpOnly` - Prevents JavaScript access
- `Secure` - HTTPS only in production
- `SameSite=Lax` - CSRF protection
- Short expiry (10 minutes)

### Origin Validation
- Strict origin checking for CORS
- PostMessage restricted to configured origins

## Project Structure

```
oauth-service/
├── src/
│   ├── handlers/         # Lambda function handlers
│   │   ├── oauth-login.js
│   │   └── oauth-callback.js
│   ├── utils/            # Utility modules
│   │   ├── cookies.js
│   │   └── cors.js
│   └── config/           # Configuration
│       └── index.js
├── local/                # Local development server
│   └── server.js
├── infrastructure/       # AWS infrastructure (CDK/SAM)
├── test/                # Test files
└── scripts/             # Build and deploy scripts
```

## Adding a New Project

To add support for a new project:

1. Update `src/config/index.js`:
```javascript
projects: {
  // ... existing projects
  newproject: {
    name: 'newproject',
    frontendUrl: isProduction 
      ? 'https://newproject.rbios.net' 
      : 'http://localhost:5175'
  }
}
```

2. Update frontend to use the OAuth service:
```javascript
const loginUrl = `${OAUTH_SERVICE_URL}/oauth/login?project=newproject`;
```

## Testing

### Unit Tests
```bash
npm test
```

### Manual Testing

1. Start local server: `npm run dev`
2. Open browser to test login URLs
3. Verify redirect to GitHub
4. Complete OAuth flow
5. Check console for token reception

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify origin is in allowed list
   - Check `ADDITIONAL_ORIGINS` env variable

2. **State Mismatch**
   - Check cookie settings
   - Verify domain configuration

3. **Token Not Received**
   - Check postMessage origin
   - Verify popup blocker settings

4. **Configuration Errors**
   - Run with `NODE_ENV=development` for detailed logs
   - Check CloudWatch logs in production

## Contributing

1. Create feature branch
2. Make changes
3. Test locally
4. Submit pull request

## License

MIT