#!/usr/bin/env node

/**
 * VAPID Key Generator for Priority Compass
 * 
 * This script generates VAPID keys needed for web push notifications
 * using Node.js built-in crypto module.
 * 
 * Usage:
 *   node scripts/generate-vapid-keys.js
 * 
 * Add the output to your .env file:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public-key>
 *   VAPID_PRIVATE_KEY=<private-key>
 */

const crypto = require('crypto');

function generateVapidKeys() {
  // Generate a new ECDH key pair
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  
  // Get the raw keys
  const publicKey = ecdh.getPublicKey();
  const privateKey = ecdh.getPrivateKey();
  
  // Convert to base64url encoding (URL-safe base64)
  const publicKeyBase64 = publicKey
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const privateKeyBase64 = privateKey
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

function generateRandomSecret(length = 32) {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Main
const vapidKeys = generateVapidKeys();
const cronSecret = generateRandomSecret();

console.log('\n🎉 VAPID Keys Generated!\n');
console.log('Add these to your .env file:\n');
console.log('─'.repeat(50));
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('─'.repeat(50));
console.log('\nAlso set a subject (your contact email):');
console.log('VAPID_SUBJECT=mailto:support@prioritycompass.app\n');
console.log('For Supabase Edge Functions (cron authentication):');
console.log('─'.repeat(50));
console.log(`CRON_SECRET=${cronSecret}`);
console.log('─'.repeat(50));
console.log('\n');