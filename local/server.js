/**
 * Local development server for OAuth service
 * Simulates Lambda functions locally
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

// Import handlers
import { handler as loginHandler } from '../src/handlers/oauth-login.js';
import { handler as callbackHandler } from '../src/handlers/oauth-callback.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins in development
app.use(cors({
  origin: true,
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

/**
 * Convert Express request to Lambda event format
 */
const expressToLambdaEvent = (req) => {
  return {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    queryStringParameters: req.query,
    body: req.body ? JSON.stringify(req.body) : null,
    requestContext: {
      http: {
        method: req.method
      }
    }
  };
};

/**
 * Convert Lambda response to Express response
 */
const lambdaToExpressResponse = (lambdaResponse, res) => {
  // Set status code
  res.status(lambdaResponse.statusCode || 200);
  
  // Set headers
  if (lambdaResponse.headers) {
    Object.entries(lambdaResponse.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }
  
  // Set cookies
  if (lambdaResponse.cookies && Array.isArray(lambdaResponse.cookies)) {
    lambdaResponse.cookies.forEach(cookie => {
      res.setHeader('Set-Cookie', cookie);
    });
  }
  
  // Send body
  res.send(lambdaResponse.body || '');
};

// OAuth endpoints
app.all('/oauth/login', async (req, res) => {
  console.log(`[${req.method}] /oauth/login`, req.query);
  const event = expressToLambdaEvent(req);
  const response = await loginHandler(event);
  lambdaToExpressResponse(response, res);
});

app.all('/oauth/callback', async (req, res) => {
  console.log(`[${req.method}] /oauth/callback`, req.query);
  const event = expressToLambdaEvent(req);
  const response = await callbackHandler(event);
  lambdaToExpressResponse(response, res);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'oauth-service',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'OAuth Service',
    version: '1.0.0',
    endpoints: [
      'GET /oauth/login - Initiate OAuth flow',
      'GET /oauth/callback - Handle OAuth callback',
      'GET /health - Health check'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║       OAuth Service - Local Dev       ║
╚════════════════════════════════════════╝

Server running at: http://localhost:${PORT}

Environment Variables:
- NODE_ENV: ${process.env.NODE_ENV || 'development'}
- GITHUB_CLIENT_ID: ${process.env.GITHUB_CLIENT_ID ? '✓ Set' : '✗ Not set'}
- GITHUB_CLIENT_SECRET: ${process.env.GITHUB_CLIENT_SECRET ? '✓ Set' : '✗ Not set'}

Test URLs:
- Login (create): http://localhost:${PORT}/oauth/login?project=create
- Login (prompts): http://localhost:${PORT}/oauth/login?project=prompts
- Health check: http://localhost:${PORT}/health
  `);
});