/**
 * OAuth Callback Handler
 * Handles the GitHub OAuth callback and exchanges code for access token
 */

import { extractStateFromCookies } from '../utils/cookies.js';
import { getCorsHeaders, getFrontendOrigin } from '../utils/cors.js';
import { getConfig, validateConfig } from '../config/index.js';

/**
 * Generate HTML that posts the access token to the parent window
 * @param {string} accessToken - GitHub access token
 * @param {string} frontendOrigin - Frontend origin to post message to
 * @returns {string} HTML content
 */
const generatePostMessageHTML = (accessToken, frontendOrigin) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth Success</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          text-align: center;
          background: white;
          padding: 2rem;
          border-radius: 10px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .success-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 1rem;
          fill: #10b981;
        }
        h1 {
          color: #1f2937;
          margin: 0 0 0.5rem;
        }
        p {
          color: #6b7280;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <svg class="success-icon" viewBox="0 0 24 24">
          <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h1>Authentication Successful!</h1>
        <p>You can now close this window.</p>
      </div>
      <script>
        // Post the access token to the parent window
        if (window.opener) {
          window.opener.postMessage({
            source: 'oauth',
            access_token: '${accessToken}'
          }, '${frontendOrigin}');
        }
        
        // Auto-close after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      </script>
    </body>
    </html>
  `;
};

/**
 * Generate error HTML
 * @param {string} error - Error message
 * @returns {string} HTML content
 */
const generateErrorHTML = (error) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: #f3f4f6;
        }
        .container {
          text-align: center;
          background: white;
          padding: 2rem;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .error-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 1rem;
          fill: #ef4444;
        }
        h1 {
          color: #1f2937;
          margin: 0 0 0.5rem;
        }
        p {
          color: #6b7280;
          margin: 0 0 1rem;
        }
        button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
        }
        button:hover {
          background: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <svg class="error-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h1>Authentication Failed</h1>
        <p>${error}</p>
        <button onclick="window.close()">Close Window</button>
      </div>
    </body>
    </html>
  `;
};

/**
 * Lambda handler for OAuth callback
 */
export const handler = async (event) => {
  console.log('OAuth callback request received', {
    path: event.path,
    queryParams: Object.keys(event.queryStringParameters || {}),
    hasCookies: !!event.headers?.cookie
  });
  
  // Validate configuration
  const configValidation = validateConfig();
  if (!configValidation.valid) {
    console.error('Configuration validation failed:', configValidation.errors);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: generateErrorHTML('Server configuration error')
    };
  }
  
  const corsHeaders = getCorsHeaders(event);
  
  try {
    const config = getConfig();
    const { code, state, error } = event.queryStringParameters || {};
    
    // Handle GitHub OAuth errors
    if (error) {
      console.error('GitHub OAuth error:', error);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        body: generateErrorHTML(`GitHub error: ${error}`)
      };
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required parameters', { hasCode: !!code, hasState: !!state });
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        body: generateErrorHTML('Missing authorization code or state')
      };
    }
    
    // Extract and validate state from cookies
    const storedState = extractStateFromCookies(event);
    if (!storedState || storedState !== state) {
      console.error('State validation failed', { 
        storedState: storedState ? storedState.substring(0, 8) + '...' : null,
        providedState: state.substring(0, 8) + '...'
      });
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        body: generateErrorHTML('Invalid state parameter - possible CSRF attack')
      };
    }
    
    // Extract project from state (format: "state:project")
    const [, project = 'create'] = state.split(':');
    const frontendOrigin = getFrontendOrigin(project);
    
    console.log('Exchanging code for token', {
      project,
      frontendOrigin,
      codeLength: code.length
    });
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code,
        redirect_uri: config.api.baseUrl + config.api.callbackPath
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('Token exchange error:', tokenData);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        body: generateErrorHTML(`Failed to obtain access token: ${tokenData.error_description || tokenData.error}`)
      };
    }
    
    if (!tokenData.access_token) {
      console.error('No access token in response:', Object.keys(tokenData));
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        body: generateErrorHTML('No access token received from GitHub')
      };
    }
    
    console.log('Token exchange successful', {
      tokenType: tokenData.token_type,
      scope: tokenData.scope
    });
    
    // Return HTML that posts token to parent window
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      },
      body: generatePostMessageHTML(tokenData.access_token, frontendOrigin)
    };
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      body: generateErrorHTML('Internal server error')
    };
  }
};