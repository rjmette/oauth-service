/**
 * Cookie utility functions for OAuth service
 */

/**
 * Create a cookie header string for Lambda/API Gateway v2
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} options - Cookie options
 * @returns {string} Cookie header string
 */
export const createCookieHeader = (name, value, options = {}) => {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.secure) cookie += '; Secure';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  
  return cookie;
};

/**
 * Parse cookies from request headers
 * @param {Object} event - Lambda event object
 * @returns {Object} Parsed cookies as key-value pairs
 */
export const parseCookies = (event) => {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || '';
  const cookies = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
};

/**
 * Extract OAuth state from cookies
 * @param {Object} event - Lambda event object
 * @returns {string|null} OAuth state value or null
 */
export const extractStateFromCookies = (event) => {
  const cookies = parseCookies(event);
  return cookies.oauth_state || null;
};

/**
 * Get cookie options based on environment
 * @param {string} environment - Current environment (production, development)
 * @returns {Object} Cookie configuration options
 */
export const getCookieOptions = (environment = process.env.NODE_ENV) => {
  const isProduction = environment === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Lax', // Changed from 'None' to 'Lax' for better security
    maxAge: 600, // 10 minutes
    path: '/',
    // Remove domain restriction to work across subdomains
    domain: isProduction ? undefined : null
  };
};