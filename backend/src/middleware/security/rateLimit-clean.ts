/**
 * Configuration du rate limiting pour LogOn
 * Protection contre les attaques par force brute et spam
 */

import { Request, Response } from 'express';
import { logger } from '../../utils/logger';

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

  // Rate limiting pour les endpoints d'authentification
  auth: {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '5'), // 5 tentatives par fenêtre
    message: {
      error: 'Too many authentication attempts',
      message: 'Trop de tentatives de connexion depuis cette IP. Veuillez réessayer plus tard.',
      retryAfter: Math.ceil(parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Ne compte que les tentatives échouées
    keyGenerator: (req: Request) => {
      // Rate limit par IP + email pour plus de granularité
      const email = req.body?.email;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return email ? `${ip}:${email}` : ip;
    }
  },

  // Rate limiting spécial pour /salt (plus restrictif)
  salt: {
    windowMs: parseInt(process.env.SALT_RATE_LIMIT_WINDOW_MS || '300000'), // 5 minutes
    max: parseInt(process.env.SALT_RATE_LIMIT_MAX_ATTEMPTS || '3'), // 3 tentatives max
    message: {
      error: 'Too many salt requests',
      message: 'Trop de demandes de sel depuis cette IP. Veuillez patienter.',
      retryAfter: Math.ceil(parseInt(process.env.SALT_RATE_LIMIT_WINDOW_MS || '300000') / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      return req.ip || req.connection.remoteAddress || 'unknown';
    }
  },

  // Rate limiting pour l'API générale
  api: {
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '30'), // 30 requêtes par minute
    message: {
      error: 'API rate limit exceeded',
      message: 'Limite de l\'API dépassée. Veuillez ralentir vos requêtes.',
      retryAfter: Math.ceil(parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000') / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
  }
};

/**
 * Interface pour le suivi des requêtes par IP pour saltRateLimiter
 */
interface RequestTracker {
  count: number;
  lastRequest: number;
  resetTime: number;
}

/**
 * Stockage en mémoire des compteurs de requêtes par IP
 */
const requestTrackers = new Map<string, RequestTracker>();
const MAX_CONCURRENT_REQUESTS = 5; // Maximum 5 requêtes simultanées par IP
const RATE_LIMIT_WINDOW = 60000; // Fenêtre de 1 minute

/**
 * Nettoyage manuel des anciens compteurs
 */
const cleanupOldTrackers = () => {
  const now = Date.now();
  const toDelete: string[] = [];
  
  for (const [ip, tracker] of requestTrackers.entries()) {
    if (now > tracker.resetTime + RATE_LIMIT_WINDOW) {
      toDelete.push(ip);
    }
  }
  
  for (const ip of toDelete) {
    requestTrackers.delete(ip);
  }
};

/**
 * Middleware de limitation des requêtes pour /api/auth/salt
 */
export const saltRateLimiter = (req: any, res: any, next: any) => {
  // Nettoyage périodique des anciens compteurs
  cleanupOldTrackers();
  
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Obtenir ou créer le tracker pour cette IP
  let tracker = requestTrackers.get(clientIP);
  
  if (!tracker) {
    // Nouveau client
    tracker = {
      count: 1,
      lastRequest: now,
      resetTime: now + RATE_LIMIT_WINDOW
    };
    requestTrackers.set(clientIP, tracker);
    
    logger.debug(`🚦 [RateLimit] Nouveau client: ${clientIP}`, {
      requestId: req.requestId,
      count: tracker.count
    });
    
    next();
    return;
  }
  
  // Réinitialiser le compteur si la fenêtre est expirée
  if (now > tracker.resetTime) {
    tracker.count = 1;
    tracker.lastRequest = now;
    tracker.resetTime = now + RATE_LIMIT_WINDOW;
    
    logger.debug(`🚦 [RateLimit] Fenêtre réinitialisée pour ${clientIP}`, {
      requestId: req.requestId,
      count: tracker.count
    });
    
    next();
    return;
  }
  
  // Vérifier si la limite est dépassée
  if (tracker.count >= MAX_CONCURRENT_REQUESTS) {
    logger.warn(`🚫 [RateLimit] Limite dépassée pour ${clientIP}`, {
      requestId: req.requestId,
      count: tracker.count,
      limit: MAX_CONCURRENT_REQUESTS,
      remainingTime: Math.ceil((tracker.resetTime - now) / 1000)
    });
    
    res.status(429).json({
      error: 'Trop de requêtes',
      message: 'Veuillez patienter avant de faire une nouvelle requête',
      retryAfter: Math.ceil((tracker.resetTime - now) / 1000)
    });
    return;
  }
  
  // Incrémenter le compteur et continuer
  tracker.count++;
  tracker.lastRequest = now;
  
  logger.debug(`🚦 [RateLimit] Requête autorisée pour ${clientIP}`, {
    requestId: req.requestId,
    count: tracker.count,
    limit: MAX_CONCURRENT_REQUESTS
  });
  
  next();
};

/**
 * Statistiques du rate limiter
 */
export const getRateLimitStats = () => {
  return {
    activeClients: requestTrackers.size,
    totalRequests: Array.from(requestTrackers.values()).reduce((sum, tracker) => sum + tracker.count, 0),
    maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW
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
