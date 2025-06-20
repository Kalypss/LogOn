/**
 * 🔐 LogOn Password Manager - Authentication Service
 * 
 * Handles user authentication with zero-knowledge architecture.
 * Manages user registration, login, session management, and 2FA.
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { createClient } from 'redis'
import { pool } from '../config/database'
import { logger } from '../utils/logger'
import type { User, DatabaseUser } from '../types/database'
import 'dotenv/config'

interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

interface RegisterData {
  email: string
  username: string
  authHash: string
  salt: string
  recoveryCode: string
  twoFactorEnabled: boolean
}

interface LoginData {
  identifier: string
  authHash: string
  twoFactorCode?: string
}

class AuthService {
  private redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  })

  constructor() {
    this.redis.connect().catch(console.error)
  }

  /**
   * Register new user with encrypted credentials
   */
  async register(userData: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Check if email or username already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username]
      )
      
      if (existingUser.rows.length > 0) {
        throw new Error('Email ou nom d\'utilisateur déjà utilisé')
      }
      
      // Hash the auth hash for additional security
      const hashedAuthHash = await bcrypt.hash(userData.authHash, 12)
      const hashedRecoveryCode = await bcrypt.hash(userData.recoveryCode, 12)
      
      // Insert new user
      const userResult = await client.query(
        `INSERT INTO users (
          email, username, auth_hash, salt, recovery_code_hash, 
          two_factor_enabled, created_at, last_login_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL, true) 
        RETURNING id, email, username, created_at, two_factor_enabled, is_active`,
        [
          userData.email,
          userData.username,
          hashedAuthHash,
          userData.salt,
          hashedRecoveryCode,
          userData.twoFactorEnabled
        ]
      )
      
      const user = userResult.rows[0]
      
      // Generate JWT tokens
      const tokens = await this.generateTokens(user.id)
      
      // Store refresh token in Redis
      await this.storeRefreshToken(user.id, tokens.refreshToken)
      
      await client.query('COMMIT')
      
      logger.info('User registered successfully', {
        userId: user.id,
        email: userData.email,
        username: userData.username
      })
      
      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at.toISOString(),
          twoFactorEnabled: user.two_factor_enabled,
          isActive: user.is_active
        },
        tokens
      }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('User registration failed', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        email: userData.email 
      })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Login user with credential verification
   */
  async login(loginData: LoginData): Promise<{ user: User; tokens: AuthTokens }> {
    const client = await pool.connect()
    
    try {
      // Find user by email or username
      const userResult = await client.query(
        `SELECT id, email, username, auth_hash, two_factor_enabled, 
                two_factor_secret, created_at, is_active 
         FROM users 
         WHERE (email = $1 OR username = $1) AND is_active = true`,
        [loginData.identifier]
      )
      
      if (userResult.rows.length === 0) {
        throw new Error('Identifiants invalides')
      }
      
      const user = userResult.rows[0]
      
      // Verify auth hash
      const isValidAuth = await bcrypt.compare(loginData.authHash, user.auth_hash)
      if (!isValidAuth) {
        // Log failed login attempt
        logger.warn('Failed login attempt', {
          identifier: loginData.identifier,
          userId: user.id,
          ip: 'request.ip' // This should be passed from the request
        })
        throw new Error('Identifiants invalides')
      }
      
      // Verify 2FA if enabled
      if (user.two_factor_enabled) {
        if (!loginData.twoFactorCode) {
          throw new Error('Code 2FA requis')
        }
        
        const isValid2FA = await this.verify2FACode(user.two_factor_secret, loginData.twoFactorCode)
        if (!isValid2FA) {
          logger.warn('Invalid 2FA code', {
            userId: user.id,
            identifier: loginData.identifier
          })
          throw new Error('Code 2FA invalide')
        }
      }
      
      // Update last login
      await client.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      )
      
      // Generate tokens
      const tokens = await this.generateTokens(user.id)
      
      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken)
      
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        username: user.username
      })
      
      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at.toISOString(),
          twoFactorEnabled: user.two_factor_enabled,
          isActive: user.is_active
        },
        tokens
      }
    } catch (error) {
      logger.error('Login failed', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        identifier: loginData.identifier 
      })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get user salt for key derivation
   */
  async getUserSalt(identifier: string): Promise<string> {
    const client = await pool.connect()
    
    try {
      const result = await client.query(
        'SELECT salt FROM users WHERE (email = $1 OR username = $1) AND is_active = true',
        [identifier]
      )
      
      if (result.rows.length === 0) {
        throw new Error('Utilisateur non trouvé')
      }
      
      return result.rows[0].salt
    } finally {
      client.release()
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any
      
      // Check if token exists in Redis
      const storedToken = await this.redis.get(`refresh_token:${decoded.userId}`)
      if (storedToken !== refreshToken) {
        throw new Error('Token de rafraîchissement invalide')
      }
      
      // Generate new tokens
      const tokens = await this.generateTokens(decoded.userId)
      
      // Store new refresh token and revoke old one
      await this.storeRefreshToken(decoded.userId, tokens.refreshToken)
      
      return tokens
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message })
      throw new Error('Token de rafraîchissement invalide')
    }
  }

  /**
   * Logout user and revoke tokens
   */
  async logout(userId: string): Promise<void> {
    try {
      // Remove refresh token from Redis
      await this.redis.del(`refresh_token:${userId}`)
      
      logger.info('User logged out', { userId })
    } catch (error) {
      logger.error('Logout failed', { error: error.message, userId })
    }
  }

  /**
   * Account recovery with recovery code
   */
  async recoverAccount(
    email: string,
    recoveryCode: string,
    newAuthHash: string,
    newSalt: string,
    newRecoveryCode: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Find user by email
      const userResult = await client.query(
        'SELECT id, email, username, recovery_code_hash, created_at FROM users WHERE email = $1 AND is_active = true',
        [email]
      )
      
      if (userResult.rows.length === 0) {
        throw new Error('Utilisateur non trouvé')
      }
      
      const user = userResult.rows[0]
      
      // Verify recovery code
      const isValidRecovery = await bcrypt.compare(recoveryCode, user.recovery_code_hash)
      if (!isValidRecovery) {
        logger.warn('Invalid recovery code attempt', { userId: user.id, email })
        throw new Error('Code de récupération invalide')
      }
      
      // Hash new credentials
      const hashedNewAuthHash = await bcrypt.hash(newAuthHash, 12)
      const hashedNewRecoveryCode = await bcrypt.hash(newRecoveryCode, 12)
      
      // Update user credentials
      await client.query(
        `UPDATE users SET 
         auth_hash = $1, salt = $2, recovery_code_hash = $3, 
         two_factor_enabled = false, two_factor_secret = NULL,
         last_login_at = NOW()
         WHERE id = $4`,
        [hashedNewAuthHash, newSalt, hashedNewRecoveryCode, user.id]
      )
      
      // Generate tokens
      const tokens = await this.generateTokens(user.id)
      
      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken)
      
      await client.query('COMMIT')
      
      logger.info('Account recovered successfully', {
        userId: user.id,
        email: user.email
      })
      
      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          createdAt: user.created_at.toISOString(),
          twoFactorEnabled: false,
          isActive: true
        },
        tokens
      }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Account recovery failed', { error: error.message, email })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(userId: string): Promise<AuthTokens> {
    const accessTokenExpiration = '15m'
    const refreshTokenExpiration = '7d'
    
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET!,
      { expiresIn: accessTokenExpiration }
    )
    
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: refreshTokenExpiration }
    )
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer'
    }
  }

  /**
   * Store refresh token in Redis with expiration
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.redis.setEx(
      `refresh_token:${userId}`,
      7 * 24 * 60 * 60, // 7 days
      refreshToken
    )
  }

  /**
   * Verify 2FA TOTP code
   */
  private async verify2FACode(secret: string, code: string): Promise<boolean> {
    // Import TOTP verification from lib
    const { verifyTOTPCode } = await import('../lib/totp')
    return await verifyTOTPCode(secret, code)
  }

  /**
   * Verify JWT token
   */
  verifyAccessToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type')
      }
      return { userId: decoded.userId }
    } catch (error) {
      throw new Error('Token invalide')
    }
  }
}

export const authService = new AuthService()
