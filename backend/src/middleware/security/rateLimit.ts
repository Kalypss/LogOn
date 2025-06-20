/**
 * Configuration du rate limiting pour LogOn
 * Protection contre les attaques par force brute et spam
 */

import { Request, Response } from 'express';

/**
 * Configuration des limites de taux par type d'endpoint
 */
export const rateLimitConfig = {
  // Rate limiting global pour toutes les requêtes
  global: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requêtes par fenêtre
    message: {
      error: 'Too many requests',
      message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip pour les health checks
      return req.path === '/health';
    },
    keyGenerator: (req: Request) => {
      // Utilise l'IP réelle même derrière un proxy
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  },

  // Rate limiting strict pour l'authentification
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5'), // 5 tentatives par fenêtre
    message: {
      error: 'Too many authentication attempts',
      message: 'Trop de tentatives de connexion, veuillez réessayer plus tard.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Ne compte que les échecs
    keyGenerator: (req: Request) => {
      // Combine IP + email pour un contrôle plus fin
      const email = req.body?.email || 'no-email';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `${ip}:${email}`;
    }
  },

  // Rate limiting pour les demandes de sel (salt)
  salt: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_SALT_REQUESTS || '10'), // 10 demandes par fenêtre
    message: {
      error: 'Too many salt requests',
      message: 'Trop de demandes de sel, veuillez réessayer plus tard.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const email = req.body?.email || req.query?.email || 'no-email';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `salt:${ip}:${email}`;
    }
  },

  // Rate limiting pour les opérations sensibles
  sensitive: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: 3, // Seulement 3 opérations sensibles par fenêtre
    message: {
      error: 'Too many sensitive operations',
      message: 'Trop d\'opérations sensibles effectuées, veuillez réessayer plus tard.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Utilise l'utilisateur authentifié si disponible
      const userId = (req as any).user?.id || 'anonymous';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `sensitive:${ip}:${userId}`;
    }
  }
};

/**
 * Middleware personnalisé pour le rate limiting avec logging
 */
export const createRateLimitMiddleware = (config: any) => {
  return (req: Request, res: Response, next: Function) => {
    // Log des tentatives de rate limiting
    if (res.headersSent) {
      return next();
    }

    // Continue avec le rate limiting standard
    next();
  };
};

/**
 * Configuration des stores pour les différents environnements
 */
export const getRateLimitStore = () => {
  // En production, utiliser Redis pour le rate limiting distribué
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    // TODO: Implémenter le store Redis pour le rate limiting
    return undefined; // Utilise le store mémoire par défaut pour le moment
  }
  
  // En développement, utilise le store mémoire
  return undefined;
};
