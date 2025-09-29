/**
 * Configuration management for OAuth service
 */

/**
 * Get configuration based on environment
 * @returns {Object} Configuration object
 */
export const getConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Base configuration
  const config = {
    // GitHub OAuth credentials
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || process.env.GH_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET || process.env.GH_CLIENT_SECRET,
      scope: 'repo,user'
    },
    
    // OAuth service API configuration
    api: {
      baseUrl: process.env.OAUTH_API_URL || (
        isProduction ? 'https://api.rbios.net' : 'http://localhost:3000'
      ),
      callbackPath: '/oauth/callback'
    },
    
    // Project-specific configurations
    projects: {
      create: {
        name: 'create',
        frontendUrl: isProduction ? 'https://create.rbios.net' : 'http://localhost:5173'
      },
      prompts: {
        name: 'prompts',
        frontendUrl: isProduction ? 'https://prompts.rbios.net' : 'http://localhost:5174'
      }
    },
    
    // CORS allowed origins (computed from projects)
    allowedOrigins: [],
    
    // Security settings
    security: {
      stateLength: 16,
      cookieMaxAge: 600, // 10 minutes
      tokenValidation: true
    }
  };
  
  // Compute allowed origins from projects
  config.allowedOrigins = Object.values(config.projects)
    .map(project => project.frontendUrl)
    .concat(process.env.ADDITIONAL_ORIGINS?.split(',') || [])
    .filter(Boolean);
  
  // Add localhost variations for development
  if (!isProduction) {
    config.allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:5174'
    );
  }
  
  return config;
};

/**
 * Validate required configuration
 * @returns {Object} Validation result
 */
export const validateConfig = () => {
  const config = getConfig();
  const errors = [];
  
  if (!config.github.clientId) {
    errors.push('Missing GitHub Client ID');
  }
  
  if (!config.github.clientSecret) {
    errors.push('Missing GitHub Client Secret');
  }
  
  if (config.allowedOrigins.length === 0) {
    errors.push('No allowed origins configured');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get OAuth redirect URI for current environment
 * @param {string} project - Optional project identifier
 * @returns {string} OAuth callback URL
 */
export const getOAuthCallbackUrl = (project = null) => {
  const config = getConfig();
  const baseUrl = config.api.baseUrl;
  const callbackPath = config.api.callbackPath;
  
  if (project) {
    return `${baseUrl}${callbackPath}?project=${project}`;
  }
  
  return `${baseUrl}${callbackPath}`;
};