# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a serverless OAuth service that provides centralized GitHub authentication for rbios projects. It's designed to be deployed as AWS Lambda functions while supporting local development with Express.js.

## Development Commands

### Local Development
```bash
npm run dev              # Start local Express server on port 3000
npm test                 # Run tests using Node.js built-in test runner
```

### Building and Deployment
```bash
npm run build            # Build Lambda functions (alias for build:lambda)
npm run build:lambda     # Build Lambda deployment packages
npm run deploy           # Build and deploy to AWS Lambda
npm run deploy:lambda    # Deploy to AWS Lambda only
```

### Testing OAuth Flow Locally
- Login (create project): http://localhost:3000/oauth/login?project=create
- Login (prompts project): http://localhost:3000/oauth/login?project=prompts
- Health check: http://localhost:3000/health

## Architecture

### Core Components

**Handlers (`src/handlers/`)**
- `oauth-login.js` - Initiates GitHub OAuth flow, generates CSRF state tokens
- `oauth-callback.js` - Processes GitHub callback, exchanges code for access token

**Utilities (`src/utils/`)**
- `cookies.js` - Secure cookie management with HttpOnly, Secure, SameSite
- `cors.js` - CORS header management for multi-origin support

**Configuration (`src/config/index.js`)**
- Environment-aware configuration management
- Project definitions with frontend URLs
- Security settings (state length, cookie expiry, etc.)

### Key Architectural Patterns

**Lambda/Express Dual Runtime**
- Handlers written as Lambda functions that work unchanged in both environments
- Local server (`local/server.js`) converts Express req/res to Lambda event/response format
- Enables identical behavior between local development and production

**State-Based CSRF Protection**
- OAuth state parameter format: `{randomState}:{projectId}`
- State stored in secure HttpOnly cookie for validation
- Prevents CSRF attacks and maintains project context

**Multi-Project Support**
- Single OAuth service supports multiple frontend applications
- Project identification through query parameters and state management
- Dynamic frontend URL resolution based on environment and project

## Environment Configuration

Required environment variables:
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret
- `NODE_ENV` - Set to 'production' for production environment
- `OAUTH_API_URL` - OAuth service base URL (auto-detected if not set)

Optional:
- `ADDITIONAL_ORIGINS` - Comma-separated list of additional CORS origins
- `PORT` - Local development server port (default: 3000)

## Adding New Projects

To support a new project:

1. Add project configuration in `src/config/index.js`:
```javascript
projects: {
  newproject: {
    name: 'newproject',
    frontendUrl: isProduction ? 'https://newproject.rbios.net' : 'http://localhost:5175'
  }
}
```

2. Frontend integration uses: `/oauth/login?project=newproject`

## Security Features

- **CSRF Protection**: Random state parameter validation
- **Secure Cookies**: HttpOnly, Secure (production), SameSite=Lax
- **Origin Validation**: Strict CORS enforcement
- **Token Exchange**: Server-side GitHub token exchange (client never sees client_secret)
- **PostMessage Security**: Origin-restricted postMessage for token delivery

## Test Strategy

- Unit tests use Node.js built-in test runner
- Manual testing via local server endpoints
- Integration testing through complete OAuth flow simulation