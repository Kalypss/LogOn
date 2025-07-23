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
/**
 * Middleware d'authentification obligatoire avec protection anti-concurrence
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || `req_auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.debug(`🔍 [${requestId}] requireAuth début`);
    
    const authHeader = req.headers.authorization;
    logger.debug(`🔍 [${requestId}] Header reçu:`, {
      hasHeader: !!authHeader,
      headerType: typeof authHeader,
      headerLength: authHeader ? authHeader.length : 0
    });

    // Extraction isolée du token
    let token: string | null = null;
    try {
      token = JWTService.extractTokenFromHeader(authHeader);
    } catch (extractError) {
      logger.error(`❌ [${requestId}] Erreur extraction token:`, {
        error: extractError instanceof Error ? extractError.message : 'Erreur inconnue'
      });
      throw new AuthError('Erreur lors de l\'extraction du token');
    }

    logger.debug(`🔍 [${requestId}] Token extrait:`, {
      hasToken: !!token,
      tokenType: typeof token,
      tokenLength: token ? token.length : 0
    });

    if (!token) {
      throw new AuthError('Token d\'authentification requis');
    }

    // Vérification isolée du token avec protection d'erreur
    let payload: TokenPayload;
    try {
      logger.debug(`🔍 [${requestId}] Début vérification JWT`);
      payload = JWTService.verifyAccessToken(token);
      logger.debug(`🔍 [${requestId}] JWT vérifié avec succès`);
    } catch (jwtError) {
      logger.warn(`🔒 [${requestId}] Token JWT invalide:`, {
        error: jwtError instanceof Error ? jwtError.message : 'Erreur inconnue',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      throw new AuthError('Token invalide');
    }

    // Vérification utilisateur en base
    let userResult;
    try {
      userResult = await db.query(
        'SELECT id, email, is_active FROM users WHERE id = $1',
        [payload.userId]
      );
    } catch (dbError) {
      logger.error(`❌ [${requestId}] Erreur base de données:`, {
        error: dbError instanceof Error ? dbError.message : 'Erreur inconnue'
      });
      throw new AuthError('Erreur lors de la vérification utilisateur');
    }

    if (userResult.rows.length === 0) {
      throw new AuthError('Utilisateur non trouvé');
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      throw new AuthError('Compte désactivé');
    }

    // Ajouter l'utilisateur à la requête (isolation complète)
    req.user = Object.freeze({
      id: String(user.id),
      email: String(user.email),
      payload: Object.freeze({ ...payload })
    });
    req.userId = String(user.id);
    req.userEmail = String(user.email);

    logger.debug(`🔍 [${requestId}] Authentification réussie`);
    next();

  } catch (error) {
    logger.warn(`🔒 [${requestId}] Accès non autorisé:`, { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      path: req.path,
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
      message: 'Erreur d\'authentification'
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

    // Vérifier le token avec gestion d'erreur robuste
    let payload: TokenPayload;
    try {
      payload = JWTService.verifyAccessToken(token);
    } catch (jwtError) {
      logger.debug('🔍 Auth optionnelle - token invalide:', {
        error: jwtError instanceof Error ? jwtError.message : 'Erreur inconnue'
      });
      return next(); // Token invalide, continuer sans utilisateur
    }

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
    logger.debug('🔍 Auth optionnelle échouée:', {
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
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
