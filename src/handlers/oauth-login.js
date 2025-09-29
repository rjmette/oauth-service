/**
 * OAuth Login Handler
 * Initiates the GitHub OAuth flow
 */

import crypto from 'crypto';
import { createCookieHeader, getCookieOptions } from '../utils/cookies.js';
import { getCorsHeaders, handlePreflight } from '../utils/cors.js';
import { getConfig, validateConfig, getOAuthCallbackUrl } from '../config/index.js';

/**
 * Lambda handler for OAuth login
 */
export const handler = async (event) => {
  console.log('OAuth login request received', {
    path: event.path,
    headers: Object.keys(event.headers || {}),
    queryParams: event.queryStringParameters
  });
  
  // Validate configuration
  const configValidation = validateConfig();
  if (!configValidation.valid) {
    console.error('Configuration validation failed:', configValidation.errors);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Server configuration error',
        details: configValidation.errors 
      })
    };
  }
  
  // Get CORS headers
  const corsHeaders = getCorsHeaders(event);
  
  // Handle preflight requests
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  if (httpMethod === 'OPTIONS') {
    return handlePreflight(corsHeaders);
  }
  
  // Only allow GET requests
  if (httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const config = getConfig();
    const { project = 'create' } = event.queryStringParameters || {};
    
    // Validate project parameter
    if (!config.projects[project]) {
      console.warn(`Unknown project: ${project}, using default`);
    }
    
    // Generate secure state parameter for CSRF protection
    const state = crypto.randomBytes(config.security.stateLength).toString('hex');
    
    // Include project in state for callback identification
    const stateWithProject = `${state}:${project}`;
    
    console.log('Generating OAuth URL', {
      project,
      stateLength: state.length,
      callbackUrl: getOAuthCallbackUrl()
    });
    
    // Build GitHub OAuth URL
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', config.github.clientId);
    githubAuthUrl.searchParams.set('redirect_uri', getOAuthCallbackUrl());
    githubAuthUrl.searchParams.set('scope', config.github.scope);
    githubAuthUrl.searchParams.set('state', stateWithProject);
    
    // Create secure state cookie
    const cookieOptions = getCookieOptions();
    const stateCookie = createCookieHeader('oauth_state', stateWithProject, cookieOptions);
    
    console.log('Redirecting to GitHub OAuth', {
      url: githubAuthUrl.toString().replace(/client_secret=[^&]+/, 'client_secret=***')
    });
    
    // Return redirect response with state cookie
    return {
      statusCode: 302,
      headers: {
        ...corsHeaders,
        'Location': githubAuthUrl.toString()
      },
      cookies: [stateCookie], // API Gateway V2 format
      body: ''
    };
    
  } catch (error) {
    console.error('OAuth login error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};