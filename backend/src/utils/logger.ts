/**
 * Configuration et utilitaires de logging pour LogOn
 * Winston avec formatage JSON pour la production et console pour le développement
 */

import winston from 'winston';

// Configuration des niveaux de log
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Configuration des couleurs pour la console
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

// Format pour le développement avec couleurs et émojis
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const emoji = getEmojiForLevel(level);
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${emoji} ${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Format pour la production avec JSON structuré
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Fonction pour obtenir l'émoji selon le niveau
function getEmojiForLevel(level: string): string {
  const emojiMap: Record<string, string> = {
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    debug: '🔍',
  };
  
  // Nettoie le niveau des codes couleur ANSI
  const cleanLevel = level.replace(/\x1b\[[0-9;]*m/g, '');
  return emojiMap[cleanLevel] || '📝';
}

// Configuration des transports
const transports: winston.transport[] = [];

// Transport console
transports.push(
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  })
);

// Transport fichier pour la production
if (process.env.NODE_ENV === 'production') {
  // Logs d'erreur
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: productionFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  // Logs généraux
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: productionFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  );

  // Logs d'audit séparés
  transports.push(
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(({ timestamp, message, ...meta }) => {
          // Filtrer seulement les logs d'audit
          if (meta.type === 'audit') {
            return JSON.stringify({ timestamp, message, ...meta });
          }
          return '';
        })
      ),
      maxsize: 52428800, // 50MB pour les audits
      maxFiles: 20,
    })
  );
}

// Création de l'instance logger
export const logger = winston.createLogger({
  levels: logLevels,
  transports,
  exitOnError: false,
  // Gestion des exceptions non capturées
  exceptionHandlers: process.env.NODE_ENV === 'production' ? [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ] : [],
  // Gestion des rejections de promesses
  rejectionHandlers: process.env.NODE_ENV === 'production' ? [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ] : [],
});

// Classe utilitaire pour les logs structurés
export class StructuredLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: string, message: string, meta: any = {}) {
    logger.log(level, message, {
      context: this.context,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  error(message: string, error?: Error, meta: any = {}) {
    this.log('error', message, {
      ...meta,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  warn(message: string, meta: any = {}) {
    this.log('warn', message, meta);
  }

  info(message: string, meta: any = {}) {
    this.log('info', message, meta);
  }

  debug(message: string, meta: any = {}) {
    this.log('debug', message, meta);
  }

  // Log spécialisé pour l'audit de sécurité
  audit(action: string, userId?: string, details: any = {}) {
    this.log('info', `Audit: ${action}`, {
      type: 'audit',
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  // Log pour les métriques de performance
  performance(operation: string, duration: number, meta: any = {}) {
    this.log('info', `Performance: ${operation}`, {
      type: 'performance',
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  // Log pour les tentatives de sécurité suspectes
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any = {}) {
    const level = severity === 'critical' ? 'error' : 'warn';
    this.log(level, `Security: ${event}`, {
      type: 'security',
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}

// Instance par défaut pour l'application
export const appLogger = new StructuredLogger('LogOn');

// Middleware pour logger les requêtes HTTP
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const reqLogger = new StructuredLogger('HTTP');

  // Log de la requête entrante
  reqLogger.info('Requête entrante', {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  });

  // Override de res.end pour logger la réponse
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    const duration = Date.now() - start;
    
    reqLogger.info('Réponse envoyée', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.connection.remoteAddress,
    });

    // Log performance si la requête est lente
    if (duration > 1000) {
      reqLogger.performance('Requête lente détectée', duration, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
      });
    }

    originalEnd.call(res, chunk, encoding);
  };

  next();
};

// Fonction utilitaire pour nettoyer les données sensibles des logs
export const sanitizeForLog = (data: any): any => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'authorization',
    'cookie', 'session', 'private', 'salt', 'hash'
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Nettoyage récursif pour les objets imbriqués
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  }

  return sanitized;
};
