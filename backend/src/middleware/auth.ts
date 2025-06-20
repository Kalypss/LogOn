/**
 * Middleware d'authentification JWT pour LogOn
 * Vérification et validation des tokens d'accès
 */

import { Request, Response, NextFunction } from 'express';
import { JWTService, TokenPayload } from '../services/JWTService';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { AuthError } from './errorHandler';

// Extension de l'interface Request pour inclure l'utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        payload: TokenPayload;
      };
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Middleware d'authentification obligatoire
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthError('Token d\'authentification requis');
    }

    // Vérifier le token
    const payload = JWTService.verifyAccessToken(token);

    // Vérifier que l'utilisateur existe toujours
    const userResult = await db.query(
      'SELECT id, email, is_active FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      throw new AuthError('Utilisateur non trouvé');
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      throw new AuthError('Compte désactivé');
    }

    // Ajouter l'utilisateur à la requête (compatibilité)
    req.user = {
      id: user.id,
      email: user.email,
      payload
    };
    req.userId = user.id;
    req.userEmail = user.email;

    next();
  } catch (error) {
    logger.warn('🔒 Tentative d\'accès non autorisé:', { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });

    if (error instanceof AuthError) {
      return res.status(401).json({
        success: false,
        error: 'Non autorisé',
        message: error.message
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Non autorisé',
      message: 'Token invalide'
    });
  }
};

/**
 * Middleware d'authentification optionnelle
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (!token) {
      return next(); // Pas de token, continuer sans utilisateur
    }

    // Vérifier le token
    const payload = JWTService.verifyAccessToken(token);

    // Vérifier que l'utilisateur existe
    const userResult = await db.query(
      'SELECT id, email, is_active FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
      const user = userResult.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        payload
      };
      req.userId = user.id;
      req.userEmail = user.email;
    }

    next();
  } catch (error) {
    // En cas d'erreur avec l'auth optionnelle, continuer sans utilisateur
    logger.debug('🔍 Auth optionnelle échouée:', error);
    next();
  }
};

/**
 * Utilitaire pour extraire l'ID utilisateur de la requête
 */
export const getUserId = (req: Request): string => {
  if (!req.user) {
    throw new AuthError('Utilisateur non authentifié');
  }
  return req.user.id;
};

/**
 * Utilitaire pour extraire l'email utilisateur de la requête
 */
export const getUserEmail = (req: Request): string => {
  if (!req.user) {
    throw new AuthError('Utilisateur non authentifié');
  }
  return req.user.email;
};

// Alias pour compatibilité avec l'ancien code
export const authenticateJWT = requireAuth;
export const authenticateToken = requireAuth;
