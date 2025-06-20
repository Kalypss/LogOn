/**
 * Service JWT pour LogOn
 * Gestion sécurisée des tokens d'authentification
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
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret';
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Génère une paire de tokens (access + refresh)
   */
  static generateTokens(payload: TokenPayload): AuthTokens {
    try {
      const accessToken = jwt.sign(
        payload,
        this.ACCESS_TOKEN_SECRET,
        { 
          expiresIn: this.ACCESS_TOKEN_EXPIRY,
          issuer: 'logon-server',
          audience: 'logon-client'
        }
      );

      const refreshToken = jwt.sign(
        { userId: payload.userId },
        this.REFRESH_TOKEN_SECRET,
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
      logger.error('❌ Erreur génération tokens:', error);
      throw new Error('Erreur lors de la génération des tokens');
    }
  }

  /**
   * Vérifie et décode un access token
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(
        token,
        this.ACCESS_TOKEN_SECRET,
        {
          issuer: 'logon-server',
          audience: 'logon-client'
        }
      ) as TokenPayload;

      return decoded;
    } catch (error) {
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
    try {
      const decoded = jwt.verify(
        token,
        this.REFRESH_TOKEN_SECRET,
        {
          issuer: 'logon-server',
          audience: 'logon-client'
        }
      ) as { userId: string };

      return decoded;
    } catch (error) {
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
   * Extrait le token du header Authorization
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
