/**
 * Middleware de gestion des erreurs centralisée pour LogOn
 * Gestion uniforme des erreurs avec logging et réponses sécurisées
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Types d'erreurs personnalisées
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erreurs d'authentification
 */
export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(message, 401, 'AUTH_ERROR', details);
  }
}

/**
 * Erreurs d'autorisation
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', details?: any) {
    super(message, 403, 'FORBIDDEN_ERROR', details);
  }
}

/**
 * Erreurs de validation
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Erreurs de ressource non trouvée
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND_ERROR', details);
  }
}

/**
 * Erreurs de conflit (données déjà existantes)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

/**
 * Erreurs de rate limiting
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
  }
}

/**
 * Erreurs cryptographiques
 */
export class CryptoError extends AppError {
  constructor(message: string = 'Cryptographic operation failed', details?: any) {
    super(message, 500, 'CRYPTO_ERROR', details);
  }
}

/**
 * Formatter les erreurs pour la réponse client
 */
const formatErrorResponse = (error: AppError | Error, req: Request) => {
  const isOperational = error instanceof AppError && error.isOperational;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Réponse de base
  const response: any = {
    error: isOperational ? (error as AppError).code || 'UNKNOWN_ERROR' : 'INTERNAL_SERVER_ERROR',
    message: isOperational ? error.message : 'Une erreur interne est survenue',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  // Ajouter les détails en développement
  if (isDevelopment) {
    response.stack = error.stack;
    if (error instanceof AppError && error.details) {
      response.details = error.details;
    }
  }

  // Ajouter l'ID de requête si disponible
  if ((req as any).requestId) {
    response.requestId = (req as any).requestId;
  }

  return response;
};

/**
 * Middleware principal de gestion des erreurs
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Ne pas traiter si les headers sont déjà envoyés
  if (res.headersSent) {
    return next(error);
  }

  // Déterminer le status code
  let statusCode = 500;
  if (error instanceof AppError) {
    statusCode = error.statusCode;
  }

  // Logger l'erreur selon sa gravité
  const logContext = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    requestId: (req as any).requestId,
    stack: error.stack
  };

  if (statusCode >= 500) {
    logger.error('❌ Erreur serveur:', { error: error.message, ...logContext });
  } else if (statusCode >= 400) {
    logger.warn('⚠️ Erreur client:', { error: error.message, ...logContext });
  }

  // Formatter et envoyer la réponse
  const errorResponse = formatErrorResponse(error, req);
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware pour capturer les erreurs 404
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Wrapper pour les fonctions async pour capturer automatiquement les erreurs
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware pour valider les requêtes
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // TODO: Implémenter la validation avec Joi ou Zod
      next();
    } catch (error) {
      next(new ValidationError('Données de requête invalides', error));
    }
  };
};

/**
 * Gestion des erreurs non capturées
 */
export const setupGlobalErrorHandlers = () => {
  // Gestion des exceptions non capturées
  process.on('uncaughtException', (error: Error) => {
    logger.error('💥 Exception non capturée:', {
      error: error.message,
      stack: error.stack
    });
    
    // Redémarrer l'application en cas d'erreur critique
    process.exit(1);
  });

  // Gestion des promesses rejetées non gérées
  process.on('unhandledRejection', (reason: any) => {
    logger.error('💥 Promesse rejetée non gérée:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: 'Promise rejected'
    });
    
    // En développement, on continue mais on log l'erreur
    // En production, on redémarre pour éviter un état instable
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('⚠️ Continuer en mode développement - corriger l\'erreur ci-dessus');
    }
  });

  // Gestion des signaux de fermeture propre
  const gracefulShutdown = (signal: string) => {
    logger.info(`📢 Signal ${signal} reçu, arrêt gracieux...`);
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};
