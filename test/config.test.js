/**
 * Configuration tests
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { getConfig, validateConfig } from '../src/config/index.js';

test('getConfig returns valid configuration', () => {
  const config = getConfig();

  assert.ok(config.github, 'Should have github config');
  assert.ok(config.projects, 'Should have projects config');
  assert.ok(config.allowedOrigins, 'Should have allowedOrigins');
  assert.ok(Array.isArray(config.allowedOrigins), 'allowedOrigins should be array');
});

test('validateConfig identifies missing credentials', () => {
  // Save original env vars
  const originalClientId = process.env.GITHUB_CLIENT_ID;
  const originalClientSecret = process.env.GITHUB_CLIENT_SECRET;

  // Clear env vars
  delete process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_SECRET;

  const validation = validateConfig();

  assert.strictEqual(validation.valid, false, 'Should be invalid without credentials');
  assert.ok(validation.errors.length > 0, 'Should have errors');

  // Restore env vars
  if (originalClientId) process.env.GITHUB_CLIENT_ID = originalClientId;
  if (originalClientSecret) process.env.GITHUB_CLIENT_SECRET = originalClientSecret;
});

test('projects configuration includes create and prompts', () => {
  const config = getConfig();

  assert.ok(config.projects.create, 'Should have create project');
  assert.ok(config.projects.prompts, 'Should have prompts project');
  assert.strictEqual(config.projects.create.name, 'create');
  assert.strictEqual(config.projects.prompts.name, 'prompts');
});