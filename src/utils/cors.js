/**
 * CORS utility functions for OAuth service
 */

import { getConfig } from '../config/index.js';

/**
 * Get CORS headers based on request origin
 * @param {Object} event - Lambda event object
 * @returns {Object} CORS headers
 */
export const getCorsHeaders = (event) => {
  const config = getConfig();
  const origin = event.headers?.origin || event.headers?.Origin || '';
  
  // Check if origin is in allowed list
  const isAllowedOrigin = config.allowedOrigins.includes(origin);
  const corsOrigin = isAllowedOrigin ? origin : config.allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
};

/**
 * Handle CORS preflight requests
 * @param {Object} headers - CORS headers
 * @returns {Object} Lambda response for OPTIONS request
 */
export const handlePreflight = (headers) => {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'OK' })
  };
};

/**
 * Validate request origin
 * @param {string} origin - Request origin
 * @returns {boolean} True if origin is allowed
 */
export const isValidOrigin = (origin) => {
  const config = getConfig();
  return config.allowedOrigins.includes(origin);
};

/**
 * Get frontend origin from project parameter
 * @param {string} project - Project identifier
 * @returns {string} Frontend origin URL
 */
export const getFrontendOrigin = (project) => {
  const config = getConfig();
  const projectConfig = config.projects[project];
  
  if (!projectConfig) {
    console.warn(`Unknown project: ${project}, using default`);
    return config.projects.create.frontendUrl;
  }
  
  return projectConfig.frontendUrl;
};