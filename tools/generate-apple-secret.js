/**
 * Apple Sign In — client secret JWT generator
 *
 * Usage:
 *   node tools/generate-apple-secret.js <path-to-AuthKey.p8> <key-id>
 *
 * Example:
 *   node tools/generate-apple-secret.js "C:\Users\samer\Downloads\AuthKey_AB12CD34EF.p8" AB12CD34EF
 *
 * The Key ID is the 10-character identifier shown next to the key in:
 *   developer.apple.com → Certificates, IDs & Profiles → Keys
 *   It is also the filename suffix: AuthKey_<KEY_ID>.p8
 */

import { createSign } from 'crypto'
import { readFileSync } from 'fs'

// ── Fixed values (your Apple developer account) ───────────────────────────────
const TEAM_ID     = '9FXRBZ9H3L'
const SERVICES_ID = '9FXRBZ9H3L.com.blutask.app.service'
const AUDIENCE    = 'https://appleid.apple.com'

// ── Read args ─────────────────────────────────────────────────────────────────
const [,, p8Path, keyId] = process.argv

if (!p8Path || !keyId) {
  console.error('\nUsage: node tools/generate-apple-secret.js <path-to-AuthKey.p8> <key-id>\n')
  console.error('  <path-to-AuthKey.p8>  Full path to the .p8 file downloaded from Apple Developer Portal')
  console.error('  <key-id>              10-character Key ID (also the filename suffix: AuthKey_XXXXXXXXXX.p8)\n')
  process.exit(1)
}

// ── Load private key ──────────────────────────────────────────────────────────
let privateKey
try {
  privateKey = readFileSync(p8Path, 'utf8').trim()
} catch (err) {
  console.error(`\nCould not read .p8 file: ${err.message}\n`)
  process.exit(1)
}

if (!privateKey.includes('BEGIN PRIVATE KEY') && !privateKey.includes('BEGIN EC PRIVATE KEY')) {
  console.error('\n.p8 file does not look like a valid PEM private key.\n')
  process.exit(1)
}

// ── Build JWT manually with ES256 (no external deps) ─────────────────────────
// Apple requires ES256 with the kid in the header.
const now = Math.floor(Date.now() / 1000)
const exp = now + 15_777_000  // 6 months — Apple's maximum allowed

const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url')
const payload = Buffer.from(JSON.stringify({
  iss: TEAM_ID,
  iat: now,
  exp,
  aud: AUDIENCE,
  sub: SERVICES_ID,
})).toString('base64url')

const signingInput = `${header}.${payload}`

const sign = createSign('SHA256')
sign.update(signingInput)
sign.end()

// Node's createSign with an EC key produces DER-encoded signature; Apple needs raw r||s
const derSig = sign.sign(privateKey)
const rawSig = derToRaw(derSig)
const signature = rawSig.toString('base64url')

const jwt = `${signingInput}.${signature}`

// ── Output ────────────────────────────────────────────────────────────────────
const expiresAt = new Date(exp * 1000)

console.log('\n' + '─'.repeat(72))
console.log('Apple Sign In Client Secret JWT')
console.log('─'.repeat(72))
console.log('\n' + jwt + '\n')
console.log('─'.repeat(72))
console.log(`Team ID:     ${TEAM_ID}`)
console.log(`Key ID:      ${keyId}`)
console.log(`Services ID: ${SERVICES_ID}`)
console.log(`Issued:      ${new Date(now * 1000).toISOString()}`)
console.log(`Expires:     ${expiresAt.toISOString()}  (~6 months)`)
console.log('─'.repeat(72))
console.log('\nPaste this JWT into:')
console.log('  Supabase Dashboard → Authentication → Providers → Apple → Secret Key\n')
console.log('Reminder: regenerate before', expiresAt.toLocaleDateString(), 'or Apple Sign In will stop working.\n')

// ── DER → raw r||s conversion ─────────────────────────────────────────────────
// Node.js returns DER-encoded ECDSA signature; JWT spec requires raw 64-byte r||s.
function derToRaw(der) {
  // DER structure: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  let offset = 2  // skip 0x30 and total length
  if (der[1] & 0x80) offset += der[1] & 0x7f  // long-form length

  // Parse r
  offset++  // skip 0x02
  const rLen = der[offset++]
  const r = der.slice(offset, offset + rLen)
  offset += rLen

  // Parse s
  offset++  // skip 0x02
  const sLen = der[offset++]
  const s = der.slice(offset, offset + sLen)

  // Pad or trim to 32 bytes each (handles leading 0x00 padding from DER)
  const pad = (buf) => {
    if (buf.length === 32) return buf
    if (buf.length < 32)  return Buffer.concat([Buffer.alloc(32 - buf.length), buf])
    return buf.slice(buf.length - 32)  // trim leading 0x00 byte
  }

  return Buffer.concat([pad(r), pad(s)])
}
