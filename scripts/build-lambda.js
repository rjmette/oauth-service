#!/usr/bin/env node
/**
 * Build script for AWS Lambda deployment
 * Creates deployment packages for each handler
 */

import { readdir, mkdir, writeFile, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

async function createZip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`📦 Created ${outputPath} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function buildHandler(handlerName) {
  const distDir = join(projectRoot, 'dist');
  const tempDir = join(distDir, handlerName);

  await ensureDir(tempDir);

  // Copy handler file
  const handlerPath = join(projectRoot, 'src', 'handlers', `${handlerName}.js`);
  await copyFile(handlerPath, join(tempDir, `${handlerName}.js`));

  // Copy utils
  const utilsDir = join(tempDir, 'utils');
  await ensureDir(utilsDir);
  const utilFiles = await readdir(join(projectRoot, 'src', 'utils'));
  for (const file of utilFiles) {
    await copyFile(
      join(projectRoot, 'src', 'utils', file),
      join(utilsDir, file)
    );
  }

  // Copy config
  const configDir = join(tempDir, 'config');
  await ensureDir(configDir);
  await copyFile(
    join(projectRoot, 'src', 'config', 'index.js'),
    join(configDir, 'index.js')
  );

  // Create package.json for Lambda
  const lambdaPackage = {
    name: `oauth-service-${handlerName}`,
    version: '1.0.0',
    type: 'module',
    main: `${handlerName}.js`,
    dependencies: {
      'node-fetch': '^3.3.2'
    }
  };

  await writeFile(
    join(tempDir, 'package.json'),
    JSON.stringify(lambdaPackage, null, 2)
  );

  // Create zip file
  const zipPath = join(distDir, `${handlerName}.zip`);
  await createZip(tempDir, zipPath);

  return zipPath;
}

async function main() {
  console.log('🔨 Building Lambda deployment packages...');

  const distDir = join(projectRoot, 'dist');
  await ensureDir(distDir);

  try {
    // Build each handler
    await buildHandler('oauth-login');
    await buildHandler('oauth-callback');

    console.log('✅ Build complete!');
    console.log('Deployment packages created in dist/');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

main();