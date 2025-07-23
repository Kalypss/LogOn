/**
 * Service JWT pour LogOn
 * Gestion sécurisée des tokens d'authentification avec protection anti-concurrence
 */

import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export class JWTService {
  // Cache des secrets pour éviter les race conditions
  private static _accessSecret: string | null = null;
  private static _refreshSecret: string | null = null;

  // Getters avec cache et validation
  private static get ACCESS_TOKEN_SECRET(): string {
    if (!this._accessSecret) {
      // @ts-ignore
      const secret = process.env.JWT_SECRET || 'default_access_secret_dev_only_very_long_string_for_security';
      if (!secret || typeof secret !== 'string' || secret.length < 10) {
        throw new Error('JWT_SECRET invalide ou manquant');
      }
      this._accessSecret = secret;
    }
    return this._accessSecret;
  }

  private static get REFRESH_TOKEN_SECRET(): string {
    if (!this._refreshSecret) {
      // @ts-ignore
      const secret = process.env.JWT_SECRET || 'default_refresh_secret_dev_only_very_long_string_for_security';  
      if (!secret || typeof secret !== 'string' || secret.length < 10) {
        throw new Error('JWT_SECRET invalide ou manquant');
      }
      this._refreshSecret = secret;
    }
    return this._refreshSecret;
  }

  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Validation stricte des paramètres avant JWT operations
   */
  private static validateJWTInputs(token: unknown, secret: unknown, operation: string): { token: string; secret: string } {
    // Validation token
    if (token === null || token === undefined) {
      throw new Error(`Token ${operation}: valeur null/undefined`);
    }
    if (typeof token !== 'string') {
      throw new Error(`Token ${operation}: type ${typeof token} au lieu de string`);
    }
    if (token.trim().length === 0) {
      throw new Error(`Token ${operation}: chaîne vide`);
    }

    // Validation secret
    if (secret === null || secret === undefined) {
      throw new Error(`Secret ${operation}: valeur null/undefined`);
    }
    if (typeof secret !== 'string') {
      throw new Error(`Secret ${operation}: type ${typeof secret} au lieu de string`);
    }
    if (secret.length < 10) {
      throw new Error(`Secret ${operation}: trop court (${secret.length} caractères)`);
    }

    return { token: token.trim(), secret };
  }

  /**
   * Génère une paire de tokens (access + refresh)
   */
  static generateTokens(payload: TokenPayload): AuthTokens {
    try {
      // Validation payload
      if (!payload || typeof payload !== 'object') {
        throw new Error('Payload invalide');
      }
      if (!payload.userId || !payload.email) {
        throw new Error('userId et email requis dans le payload');
      }

      // Clonage du payload pour éviter les mutations
      const safePayload = {
        userId: String(payload.userId),
        email: String(payload.email)
      };

      const accessSecret = this.ACCESS_TOKEN_SECRET;
      const refreshSecret = this.REFRESH_TOKEN_SECRET;

      const accessToken = jwt.sign(
        safePayload,
        accessSecret,
        { 
          expiresIn: this.ACCESS_TOKEN_EXPIRY,
          issuer: 'logon-server',
          audience: 'logon-client'
        }
      );

      const refreshToken = jwt.sign(
        { userId: safePayload.userId },
        refreshSecret,
        { 
          expiresIn: this.REFRESH_TOKEN_EXPIRY,
          issuer: 'logon-server',
          audience: 'logon-client'
        }
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes en secondes
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('❌ Erreur génération tokens:', {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        payloadProvided: !!payload
      });
      throw new Error('Erreur lors de la génération des tokens');
    }
  }

  /**
   * Vérifie et décode un access token avec protection anti-concurrence
   */
  static verifyAccessToken(token: string): TokenPayload {
    const requestId = `jwt_verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      logger.debug(`🔍 [${requestId}] JWT verify début:`, {
        tokenType: typeof token,
        tokenLength: token ? token.length : 0,
        tokenStart: token ? token.substring(0, 10) + '...' : 'undefined'
      });

      // Récupération isolée du secret pour éviter race condition
      const secret = this.ACCESS_TOKEN_SECRET;
      
      // Validation stricte avec isolation
      const validated = this.validateJWTInputs(token, secret, 'verification');
      
      logger.debug(`🔍 [${requestId}] Inputs validés, appel jwt.verify`);

      const decoded = jwt.verify(
        validated.token,
        validated.secret,
        {
          issuer: 'logon-server',
          audience: 'logon-client'
        }
      ) as TokenPayload;

      logger.debug(`🔍 [${requestId}] JWT verify succès`);
      return decoded;

    } catch (error) {
      logger.error(`❌ [${requestId}] Erreur JWT verification:`, {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        errorType: error?.constructor?.name || 'Unknown',
        tokenProvided: !!token,
        tokenType: typeof token
      });

      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expiré');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Token invalide');
      }
      throw new Error('Erreur de vérification du token');
    }
  }

  /**
   * Vérifie et décode un refresh token
   */
  static verifyRefreshToken(token: string): { userId: string } {
    const requestId = `refresh_verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Récupération isolée du secret
      const secret = this.REFRESH_TOKEN_SECRET;
      
      // Validation stricte
      const validated = this.validateJWTInputs(token, secret, 'refresh verification');

      const decoded = jwt.verify(
        validated.token,
        validated.secret,
        {
          issuer: 'logon-server',
          audience: 'logon-client'
        }
      ) as { userId: string };

      return decoded;
    } catch (error) {
      logger.error(`❌ [${requestId}] Erreur refresh token verification:`, {
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });

      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expiré');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Refresh token invalide');
      }
      throw new Error('Erreur de vérification du refresh token');
    }
  }

  /**
   * Génère un nouveau access token depuis un refresh token
   */
  static async refreshAccessToken(refreshToken: string, userPayload: TokenPayload): Promise<AuthTokens> {
    try {
      // Vérifier le refresh token
      const decoded = this.verifyRefreshToken(refreshToken);
      
      if (decoded.userId !== userPayload.userId) {
        throw new Error('Refresh token invalide pour cet utilisateur');
      }

      // Générer nouveaux tokens
      return this.generateTokens(userPayload);
    } catch (error) {
      logger.error('❌ Erreur refresh token:', error);
      throw error;
    }
  }

  /**
   * Extrait le token du header Authorization avec validation renforcée
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    try {
      // Validation stricte du header
      if (authHeader === null || authHeader === undefined) {
        return null;
      }
      
      if (typeof authHeader !== 'string') {
        logger.warn('⚠️ Authorization header type invalide:', { type: typeof authHeader });
        return null;
      }
      
      const trimmedHeader = authHeader.trim();
      if (trimmedHeader.length === 0) {
        return null;
      }
      
      if (!trimmedHeader.startsWith('Bearer ')) {
        return null;
      }
      
      const token = trimmedHeader.substring(7).trim();
      
      // Validation basique du format JWT
      if (token.length === 0) {
        return null;
      }
      
      // Un JWT valide doit avoir 3 parties séparées par des points
      const parts = token.split('.');
      if (parts.length !== 3) {
        logger.warn('⚠️ Format token JWT invalide:', { partsCount: parts.length });
        return null;
      }
      
      return token;
    } catch (error) {
      logger.error('❌ Erreur extraction token:', {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        headerProvided: !!authHeader
      });
      return null;
    }
  }
}
