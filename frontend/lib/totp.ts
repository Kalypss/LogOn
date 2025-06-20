/**
 * 🔐 LogOn Password Manager - Two-Factor Authentication Utilities
 * 
 * Implements TOTP (Time-based One-Time Password) for 2FA
 * Based on RFC 6238 specification
 */

import { getRandomBytes, arrayBufferToBase64, base64ToArrayBuffer } from '~/lib/crypto'

/**
 * Generate secure TOTP secret (32 bytes)
 */
export function generateTOTPSecret(): string {
  const secret = getRandomBytes(32)
  return base32Encode(secret)
}

/**
 * Generate TOTP code for current time
 */
export async function generateTOTPCode(secret: string, timeStep: number = 30): Promise<string> {
  const time = Math.floor(Date.now() / 1000 / timeStep)
  return await generateHOTPCode(secret, time)
}

/**
 * Generate HOTP code (HMAC-based One-Time Password)
 */
export async function generateHOTPCode(secret: string, counter: number): Promise<string> {
  // Decode base32 secret
  const secretBytes = base32Decode(secret)
  
  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = new ArrayBuffer(8)
  const counterView = new DataView(counterBuffer)
  counterView.setUint32(4, counter, false) // Big-endian
  
  // Import secret as HMAC key
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )
  
  // Generate HMAC
  const hmacBuffer = await crypto.subtle.sign('HMAC', key, counterBuffer)
  const hmacBytes = new Uint8Array(hmacBuffer)
  
  // Dynamic truncation (RFC 4226)
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f
  const code = (
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff)
  ) % 1000000
  
  // Pad with zeros to ensure 6 digits
  return code.toString().padStart(6, '0')
}

/**
 * Verify TOTP code with time tolerance
 */
export async function verifyTOTPCode(
  secret: string, 
  code: string, 
  tolerance: number = 1,
  timeStep: number = 30
): Promise<boolean> {
  const currentTime = Math.floor(Date.now() / 1000 / timeStep)
  
  // Check current time and tolerance window
  for (let i = -tolerance; i <= tolerance; i++) {
    const timeToCheck = currentTime + i
    const expectedCode = await generateHOTPCode(secret, timeToCheck)
    
    if (expectedCode === code) {
      return true
    }
  }
  
  return false
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
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  
  for (let i = 0; i < count; i++) {
    const bytes = getRandomBytes(4)
    const code = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    codes.push(code)
  }
  
  return codes
}

/**
 * Base32 encoding (RFC 4648)
 */
function base32Encode(bytes: Uint8Array): string {
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
function base32Decode(encoded: string): Uint8Array {
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
  
  return new Uint8Array(output)
}

/**
 * Format TOTP secret for display (groups of 4 characters)
 */
export function formatTOTPSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Validate TOTP code format
 */
export function isValidTOTPCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

/**
 * Get remaining time for current TOTP period
 */
export function getTOTPTimeRemaining(timeStep: number = 30): number {
  const currentTime = Math.floor(Date.now() / 1000)
  return timeStep - (currentTime % timeStep)
}

/**
 * Get TOTP progress (0-1) for current period
 */
export function getTOTPProgress(timeStep: number = 30): number {
  const remaining = getTOTPTimeRemaining(timeStep)
  return (timeStep - remaining) / timeStep
}
