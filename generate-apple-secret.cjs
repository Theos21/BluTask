#!/usr/bin/env node
/**
 * Generates the Apple Sign In client_secret JWT required by Supabase.
 * Run: node generate-apple-secret.js
 *
 * Docs: https://supabase.com/docs/guides/auth/social-login/auth-apple#generate-a-client_secret
 */

const fs   = require('fs')
const path = require('path')
const jwt  = require('jsonwebtoken')

// ── Configuration ─────────────────────────────────────────────────────────────
// Fill in your values, then run the script. Never commit this file with a real key path.

const TEAM_ID      = '9FXRBZ9H3L'
const SERVICE_ID   = '9FXRBZ9H3L.com.blutask.app.service'
const KEY_ID       = process.env.APPLE_KEY_ID || ''          // e.g. 'AB12CD34EF'
const KEY_PATH     = process.env.APPLE_KEY_PATH
                     || path.join(process.env.HOME || process.env.USERPROFILE || '', 'Downloads', `AuthKey_${KEY_ID}.p8`)

// Apple allows a maximum of 6 months (180 days)
const EXPIRES_IN_SECONDS = 15552000   // 180 days

// ── Validation ────────────────────────────────────────────────────────────────
if (!KEY_ID) {
  console.error('Error: set APPLE_KEY_ID env var or hardcode KEY_ID in the script.')
  console.error('  Example: APPLE_KEY_ID=AB12CD34EF node generate-apple-secret.js')
  process.exit(1)
}

if (!fs.existsSync(KEY_PATH)) {
  console.error(`Error: private key not found at:\n  ${KEY_PATH}`)
  console.error('Set APPLE_KEY_PATH env var to the correct location.')
  process.exit(1)
}

// ── Generate JWT ──────────────────────────────────────────────────────────────
const privateKey = fs.readFileSync(KEY_PATH, 'utf8')
const now        = Math.floor(Date.now() / 1000)

const payload = {
  iss: TEAM_ID,
  iat: now,
  exp: now + EXPIRES_IN_SECONDS,
  aud: 'https://appleid.apple.com',
  sub: SERVICE_ID,
}

const token = jwt.sign(payload, privateKey, {
  algorithm: 'ES256',
  header: { alg: 'ES256', kid: KEY_ID },
})

// ── Output ────────────────────────────────────────────────────────────────────
const expiresDate = new Date((now + EXPIRES_IN_SECONDS) * 1000).toISOString().split('T')[0]

console.log('\n─────────────────────────────────────────────────────────')
console.log('Apple client_secret JWT')
console.log(`  Key ID:     ${KEY_ID}`)
console.log(`  Team ID:    ${TEAM_ID}`)
console.log(`  Service ID: ${SERVICE_ID}`)
console.log(`  Expires:    ${expiresDate} (180 days)`)
console.log('─────────────────────────────────────────────────────────')
console.log('\nPaste this into Supabase → Auth → Providers → Apple → Secret key:\n')
console.log(token)
console.log()
