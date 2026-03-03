#!/usr/bin/env node

const crypto = require('crypto');

function generateSecret(length = 32) {
    return crypto.randomBytes(length).toString('base64url');
}

console.log('='.repeat(50));
console.log('Generated Secrets for .env');
console.log('='.repeat(50));
console.log('');
console.log('POSTGRES_PASSWORD=' + generateSecret(24));
console.log('REDIS_PASSWORD=' + generateSecret(24));
console.log('JWT_SECRET=' + generateSecret(32));
console.log('');
console.log('Copy these to your .env file');
console.log('='.repeat(50));