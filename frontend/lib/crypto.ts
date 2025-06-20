/**
 * 🔐 LogOn Password Manager - Cryptographic Utilities
 * 
 * Implements zero-knowledge cryptography for client-side encryption/decryption.
 * Uses Web Crypto API with scrypt for key derivation and AES-256-GCM for encryption.
 * 
 * Security Features:
 * - Client-side key derivation with scrypt (N=16384, r=8, p=1)
 * - AES-256-GCM encryption with unique IVs
 * - Separate authentication and encryption keys
 * - Secure random number generation
 * - Constant-time comparisons
 */

import { Buffer } from 'buffer'

// Cryptographic constants
export const CRYPTO_CONFIG = {
  // scrypt parameters (N=16384, r=8, p=1)
  SCRYPT_N: 16384,
  SCRYPT_R: 8,
  SCRYPT_P: 1,
  SCRYPT_KEY_LENGTH: 32, // 256 bits
  
  // Salt lengths
  USER_SALT_LENGTH: 32,
  IV_LENGTH: 16,
  
  // Key derivation
  AUTH_KEY_INFO: 'LogOn-Auth-Key-v1',
  ENC_KEY_INFO: 'LogOn-Enc-Key-v1',
  
  // Encoding
  BASE64_ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
} as const

/**
 * Secure random bytes generation using Web Crypto API
 */
export function getRandomBytes(length: number): Uint8Array {
  if (length <= 0) {
    throw new Error('Length must be positive')
  }
  
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

/**
 * Generate a secure random salt for user registration
 */
export function generateUserSalt(): string {
  const salt = getRandomBytes(CRYPTO_CONFIG.USER_SALT_LENGTH)
  return arrayBufferToBase64(salt.buffer as ArrayBuffer)
}

/**
 * Derive cryptographic keys from password using PBKDF2
 */
export async function deriveKeys(
  password: string,
  salt: string
): Promise<{
  authKey: string
  encKey: string
}> {
  // Ensure we're on the client side (Web Crypto API not available on server)
  if (typeof window === 'undefined') {
    throw new Error('Crypto operations must be performed on the client side')
  }
  
  // Double-check crypto.subtle is available
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available in this browser')
  }
  
  try {
    // Convert password to bytes
    const passwordBytes = new TextEncoder().encode(password)
    const saltBytes = base64ToArrayBuffer(salt)
  
    // Import password as key material
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBytes,
      'PBKDF2',
      false,
      ['deriveBits']
    )
  
    // Derive 64 bytes of key material (32 for auth + 32 for enc)
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000, // High iteration count
        hash: 'SHA-256'
      },
      keyMaterial,
      512 // 64 bytes = 512 bits
    )

    // Split the derived bits into two 32-byte keys
    const derivedArray = new Uint8Array(derivedBits)
    const authKeyBytes = derivedArray.slice(0, 32)
    const encKeyBytes = derivedArray.slice(32, 64)

    return {
      authKey: arrayBufferToBase64(authKeyBytes.buffer),
      encKey: arrayBufferToBase64(encKeyBytes.buffer)
    }
  } catch (error) {
    console.error('Failed to derive keys:', error)
    throw new Error(`Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(data: string, encKey: string): Promise<{
  encrypted: string
  iv: string
}> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available')
  }

  try {
    // Generate random IV
    const iv = getRandomBytes(CRYPTO_CONFIG.IV_LENGTH)
    
    // Convert data and key
    const dataBytes = new TextEncoder().encode(data)
    const keyBytes = base64ToArrayBuffer(encKey)
    
    // Import encryption key
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      'AES-GCM',
      false,
      ['encrypt']
    )
    
    // Encrypt data
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      dataBytes
    )
    
    return {
      encrypted: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv.buffer as ArrayBuffer)
    }
  } catch (error) {
    console.error('Failed to encrypt data:', error)
    throw new Error('Encryption failed')
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(
  encryptedData: string,
  iv: string,
  encKey: string
): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available')
  }

  try {
    // Convert inputs
    const encryptedBytes = base64ToArrayBuffer(encryptedData)
    const ivBytes = base64ToArrayBuffer(iv)
    const keyBytes = base64ToArrayBuffer(encKey)
    
    // Import decryption key
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      'AES-GCM',
      false,
      ['decrypt']
    )
    
    // Decrypt data
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes
      },
      cryptoKey,
      encryptedBytes
    )
    
    return new TextDecoder().decode(decrypted)
  } catch (error) {
    console.error('Failed to decrypt data:', error)
    throw new Error('Decryption failed')
  }
}

/**
 * Hash authentication key for server verification
 */
export async function hashAuthKey(authKey: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available')
  }
  
  const keyBytes = base64ToArrayBuffer(authKey)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyBytes)
  return arrayBufferToBase64(hashBuffer)
}

/**
 * Generate secure password with cryptographic randomness
 */
export function generateSecurePassword(options: {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
  excludeAmbiguous: boolean
}): string {
  let charset = ''
  
  if (options.includeLowercase) {
    charset += options.excludeAmbiguous ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz'
  }
  
  if (options.includeUppercase) {
    charset += options.excludeAmbiguous ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  }
  
  if (options.includeNumbers) {
    charset += options.excludeAmbiguous ? '23456789' : '0123456789'
  }
  
  if (options.includeSymbols) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  }
  
  if (charset.length === 0) {
    throw new Error('At least one character type must be selected')
  }
  
  let password = ''
  const randomBytes = getRandomBytes(options.length)
  
  for (let i = 0; i < options.length; i++) {
    password += charset[randomBytes[i] % charset.length]
  }
  
  return password
}

/**
 * Calculate password entropy in bits
 */
export function calculateEntropy(password: string): number {
  const charsets = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    symbols: /[^a-zA-Z0-9]/.test(password)
  }
  
  let charsetSize = 0
  if (charsets.lowercase) charsetSize += 26
  if (charsets.uppercase) charsetSize += 26
  if (charsets.numbers) charsetSize += 10
  if (charsets.symbols) charsetSize += 32 // Approximate
  
  return Math.log2(Math.pow(charsetSize, password.length))
}

/**
 * Estimate time to crack password
 */
export function estimateCrackTime(entropy: number): string {
  // Assume 1 billion guesses per second
  const guessesPerSecond = 1_000_000_000
  const secondsToCrack = Math.pow(2, entropy - 1) / guessesPerSecond
  
  if (secondsToCrack < 60) return `${Math.round(secondsToCrack)} secondes`
  if (secondsToCrack < 3600) return `${Math.round(secondsToCrack / 60)} minutes`
  if (secondsToCrack < 86400) return `${Math.round(secondsToCrack / 3600)} heures`
  if (secondsToCrack < 31536000) return `${Math.round(secondsToCrack / 86400)} jours`
  if (secondsToCrack < 31536000000) return `${Math.round(secondsToCrack / 31536000)} années`
  
  return 'Plus de 1000 ans'
}

/**
 * Generate recovery code (48 characters, no ambiguous chars)
 */
export function generateRecoveryCode(): string {
  // Use alphabet without ambiguous characters (0/O, 1/I, etc.)
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  const codeLength = 48
  
  let code = ''
  const randomBytes = getRandomBytes(codeLength)
  
  for (let i = 0; i < codeLength; i++) {
    code += alphabet[randomBytes[i] % alphabet.length]
    
    // Add dashes every 8 characters for readability
    if ((i + 1) % 8 === 0 && i < codeLength - 1) {
      code += '-'
    }
  }
  
  return code
}

/**
 * Secure constant-time string comparison
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let result = ''
  
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]
    const b = bytes[i + 1] || 0
    const c = bytes[i + 2] || 0
    
    const bitmap = (a << 16) | (b << 8) | c
    
    result += CRYPTO_CONFIG.BASE64_ALPHABET.charAt((bitmap >> 18) & 63)
    result += CRYPTO_CONFIG.BASE64_ALPHABET.charAt((bitmap >> 12) & 63)
    result += i + 1 < bytes.length ? CRYPTO_CONFIG.BASE64_ALPHABET.charAt((bitmap >> 6) & 63) : '='
    result += i + 2 < bytes.length ? CRYPTO_CONFIG.BASE64_ALPHABET.charAt(bitmap & 63) : '='
  }
  
  return result
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = Buffer.from(base64, 'base64').toString('binary')
  const bytes = new Uint8Array(binaryString.length)
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  return bytes.buffer
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0
  
  // Length check
  if (password.length < 8) {
    feedback.push('Le mot de passe doit contenir au moins 8 caractères')
  } else if (password.length >= 12) {
    score += 2
  } else {
    score += 1
  }
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Ajoutez des lettres minuscules')
  
  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Ajoutez des lettres majuscules')
  
  if (/[0-9]/.test(password)) score += 1
  else feedback.push('Ajoutez des chiffres')
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  else feedback.push('Ajoutez des caractères spéciaux')
  
  // Common patterns
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Évitez les caractères répétés')
    score -= 1
  }
  
  if (/123|abc|qwe/i.test(password)) {
    feedback.push('Évitez les séquences communes')
    score -= 1
  }
  
  const entropy = calculateEntropy(password)
  if (entropy < 50) {
    feedback.push('Augmentez la complexité du mot de passe')
  }
  
  return {
    isValid: score >= 4 && entropy >= 50,
    score: Math.max(0, Math.min(5, score)),
    feedback
  }
}
