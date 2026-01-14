/**
 * Debug Environment Variables
 * Checks if .env file is loaded correctly
 */

const path = require('path');
const fs = require('fs');

console.log('═══════════════════════════════════════════════');
console.log('  🔍 ENVIRONMENT DEBUG');
console.log('═══════════════════════════════════════════════\n');

// Check current directory
console.log('Current Directory:', __dirname);
console.log('Parent Directory:', path.join(__dirname, '..'));

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
console.log('\n.env File Path:', envPath);
console.log('.env File Exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  console.log('✅ .env file found\n');

  // Try to read it (without showing sensitive data)
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  console.log('Environment Variables in .env:');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key] = trimmed.split('=');
      if (key) {
        console.log(`  - ${key.trim()}`);
      }
    }
  });
} else {
  console.log('❌ .env file NOT found');
  console.log('\nSearching for .env in other locations...\n');

  // Check alternative locations
  const alternatives = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '..', '.env'),
    '/var/www/fanova/.env',
    '/var/www/fanova/server/.env'
  ];

  alternatives.forEach(altPath => {
    console.log(`Checking: ${altPath}`);
    console.log(`  Exists: ${fs.existsSync(altPath)}`);
  });
}

// Try loading dotenv
console.log('\n═══════════════════════════════════════════════');
console.log('  LOADING DOTENV');
console.log('═══════════════════════════════════════════════\n');

require('dotenv').config({ path: envPath });

// Check if environment variables are loaded
console.log('Environment Variables After Loading:\n');

const keysToCheck = [
  'STRIPE_SECRET_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'NODE_ENV'
];

keysToCheck.forEach(key => {
  const value = process.env[key];
  if (value) {
    // Show first 10 characters only
    const preview = value.substring(0, 15) + '...';
    console.log(`  ✅ ${key}: ${preview}`);
  } else {
    console.log(`  ❌ ${key}: NOT SET`);
  }
});

console.log('\n═══════════════════════════════════════════════\n');
