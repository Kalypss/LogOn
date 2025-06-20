/**
 * 🔐 LogOn Password Manager - TOTP Backend Implementation
 * 
 * Server-side TOTP (Time-based One-Time Password) implementation
 * Compatible with Google Authenticator and other TOTP apps
 */

import crypto from 'crypto'

/**
 * Generate TOTP code for current time
 */
export function generateTOTPCode(secret: string, timeStep: number = 30): string {
  const time = Math.floor(Date.now() / 1000 / timeStep)
  return generateHOTPCode(secret, time)
}

/**
 * Generate HOTP code (HMAC-based One-Time Password)
 */
export function generateHOTPCode(secret: string, counter: number): string {
  // Decode base32 secret
  const secretBytes = base32Decode(secret)
  
  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  counterBuffer.writeUInt32BE(counter & 0xffffffff, 4)
  
  // Generate HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secretBytes)
  hmac.update(counterBuffer)
  const hmacResult = hmac.digest()
  
  // Dynamic truncation (RFC 4226)
  const offset = hmacResult[hmacResult.length - 1] & 0x0f
  const code = (
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff)
  ) % 1000000
  
  // Pad with zeros to ensure 6 digits
  return code.toString().padStart(6, '0')
}

/**
 * Verify TOTP code with time tolerance
 */
export function verifyTOTPCode(
  secret: string, 
  code: string, 
  tolerance: number = 1,
  timeStep: number = 30
): boolean {
  const currentTime = Math.floor(Date.now() / 1000 / timeStep)
  
  // Check current time and tolerance window
  for (let i = -tolerance; i <= tolerance; i++) {
    const timeToCheck = currentTime + i
    const expectedCode = generateHOTPCode(secret, timeToCheck)
    
    if (expectedCode === code) {
      return true
    }
  }
  
  return false
}

/**
 * Generate secure TOTP secret (32 bytes)
 */
export function generateTOTPSecret(): string {
  const secret = crypto.randomBytes(32)
  return base32Encode(secret)
}

/**
 * Generate QR code URL for TOTP setup
 */
export function generateQRCodeURL(
  secret: string,
  accountName: string,
  issuer: string = 'LogOn Password Manager'
): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  })
  
  return `otpauth://totp/${label}?${params.toString()}`
}

/**
 * Base32 encoding (RFC 4648)
 */
function base32Encode(bytes: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let result = ''
  let bits = 0
  let value = 0
  
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31]
  }
  
  // Add padding
  while (result.length % 8 !== 0) {
    result += '='
  }
  
  return result
}

/**
 * Base32 decoding (RFC 4648)
 */
function base32Decode(encoded: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const cleanInput = encoded.toUpperCase().replace(/=/g, '')
  
  let bits = 0
  let value = 0
  const output: number[] = []
  
  for (const char of cleanInput) {
    const index = alphabet.indexOf(char)
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`)
    }
    
    value = (value << 5) | index
    bits += 5
    
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  
  return Buffer.from(output)
}
