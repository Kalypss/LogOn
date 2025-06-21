/**
 * 🔐 LogOn Password Manager - Système de Logging Avancé
 * 
 * Logging coloré, structuré et lisible pour le développement
 * Formatage JSON pour la production avec audit de sécurité
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
  info: 'cyan',
  debug: 'gray',
};

winston.addColors(logColors);

// Format amélioré pour le développement avec structure claire
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: false }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    // Emojis et couleurs selon le niveau
    const levelInfo = getLevelInfo(level);
    
    // Construction du préfixe avec contexte
    const prefix = context ? `${levelInfo.emoji} ${timestamp} [${context}]` : `${levelInfo.emoji} ${timestamp}`;
    
    // Formatage du message principal
    let output = `${prefix} ${levelInfo.color}${message}\x1b[0m`;
    
    // Ajout des métadonnées de façon lisible
    if (Object.keys(meta).length > 0) {
      const formattedMeta = formatMetadata(meta);
      if (formattedMeta) {
        output += `\n${formattedMeta}`;
      }
    }
    
    return output;
  })
);

// Informations de style par niveau
function getLevelInfo(level: string): { emoji: string; color: string } {
  const levelMap: Record<string, { emoji: string; color: string }> = {
    error: { emoji: '❌', color: '\x1b[31m' },   // Rouge
    warn:  { emoji: '⚠️ ', color: '\x1b[33m' },  // Jaune
    info:  { emoji: 'ℹ️ ', color: '\x1b[36m' },  // Cyan
    debug: { emoji: '🔍', color: '\x1b[90m' },   // Gris
  };
  
  return levelMap[level] || { emoji: '📝', color: '\x1b[37m' };
}

// Formatage intelligent des métadonnées
function formatMetadata(meta: any): string {
  const lines: string[] = [];
  
  // Traitement spécial selon le type de log
  if (meta.type === 'audit') {
    return formatAuditLog(meta);
  } else if (meta.type === 'performance') {
    return formatPerformanceLog(meta);
  } else if (meta.type === 'security') {
    return formatSecurityLog(meta);
  } else if (meta.error) {
    return formatErrorLog(meta);
  } else if (meta.method && meta.url) {
    return formatHttpLog(meta);
  }
  
  // Formatage générique pour les autres métadonnées
  for (const [key, value] of Object.entries(meta)) {
    if (key !== 'timestamp' && value !== undefined) {
      lines.push(`   📋 ${key}: ${formatValue(value)}`);
    }
  }
  
  return lines.join('\n');
}

// Formatage spécialisé pour les logs d'audit
function formatAuditLog(meta: any): string {
  const lines = [
    `   🔒 Action: ${meta.action}`,
    `   👤 User ID: ${meta.userId || 'Anonymous'}`,
  ];
  
  if (meta.ip) lines.push(`   🌐 IP: ${meta.ip}`);
  if (meta.userAgent) lines.push(`   🖥️  Client: ${meta.userAgent.substring(0, 50)}...`);
  if (meta.details) lines.push(`   📝 Détails: ${JSON.stringify(meta.details)}`);
  
  return lines.join('\n');
}

// Formatage spécialisé pour les logs de performance
function formatPerformanceLog(meta: any): string {
  const duration = meta.duration;
  const perfIcon = duration > 1000 ? '🐌' : duration > 500 ? '⏱️' : '⚡';
  
  return [
    `   ${perfIcon} Opération: ${meta.operation}`,
    `   ⏰ Durée: ${duration}ms`,
    ...(meta.details ? [`   📊 Détails: ${JSON.stringify(meta.details)}`] : [])
  ].join('\n');
}

// Formatage spécialisé pour les logs de sécurité
function formatSecurityLog(meta: any): string {
  const severityIcons = {
    low: '🟢',
    medium: '🟡',
    high: '🟠', 
    critical: '🔴'
  };
  
  const icon = severityIcons[meta.severity as keyof typeof severityIcons] || '⚪';
  
  return [
    `   ${icon} Événement: ${meta.event}`,
    `   📈 Sévérité: ${meta.severity?.toUpperCase()}`,
    ...(meta.ip ? [`   🌐 IP: ${meta.ip}`] : []),
    ...(meta.details ? [`   🔍 Détails: ${JSON.stringify(meta.details)}`] : [])
  ].join('\n');
}

// Formatage spécialisé pour les erreurs
function formatErrorLog(meta: any): string {
  const error = meta.error;
  const lines = [];
  
  if (error.name) lines.push(`   🏷️  Type: ${error.name}`);
  if (error.message) lines.push(`   💬 Message: ${error.message}`);
  if (error.code) lines.push(`   🔢 Code: ${error.code}`);
  if (meta.operation) lines.push(`   ⚙️  Opération: ${meta.operation}`);
  
  // Stack trace en mode debug uniquement
  if (process.env.LOG_LEVEL === 'debug' && error.stack) {
    lines.push(`   📚 Stack: ${error.stack.split('\n').slice(0, 3).join('\n        ')}`);
  }
  
  return lines.join('\n');
}

// Formatage spécialisé pour les logs HTTP
function formatHttpLog(meta: any): string {
  const statusColor = getStatusColor(meta.statusCode);
  const methodColor = getMethodColor(meta.method);
  
  const lines = [
    `   ${methodColor}${meta.method}\x1b[0m ${meta.url}`,
  ];
  
  if (meta.statusCode) {
    lines.push(`   ${statusColor}${meta.statusCode}\x1b[0m ${getStatusText(meta.statusCode)}`);
  }
  
  if (meta.duration) {
    const durationColor = meta.duration > 1000 ? '\x1b[31m' : meta.duration > 500 ? '\x1b[33m' : '\x1b[32m';
    lines.push(`   ⏱️  ${durationColor}${meta.duration}ms\x1b[0m`);
  }
  
  if (meta.ip) lines.push(`   🌐 ${meta.ip}`);
  if (meta.userAgent) lines.push(`   🖥️  ${meta.userAgent.substring(0, 60)}...`);
  
  return lines.join('\n');
}

// Couleurs pour les codes de statut HTTP
function getStatusColor(status: number): string {
  if (status >= 500) return '\x1b[31m'; // Rouge
  if (status >= 400) return '\x1b[33m'; // Jaune
  if (status >= 300) return '\x1b[36m'; // Cyan
  if (status >= 200) return '\x1b[32m'; // Vert
  return '\x1b[37m'; // Blanc
}

// Couleurs pour les méthodes HTTP
function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: '\x1b[32m',    // Vert
    POST: '\x1b[34m',   // Bleu
    PUT: '\x1b[33m',    // Jaune
    DELETE: '\x1b[31m', // Rouge
    PATCH: '\x1b[35m',  // Magenta
  };
  return colors[method] || '\x1b[37m';
}

// Textes pour les codes de statut
function getStatusText(status: number): string {
  const texts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
  };
  return texts[status] || 'Unknown';
}

// Formatage intelligent des valeurs
function formatValue(value: any): string {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 0);
  }
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '...';
  }
// Format pour la production avec JSON structuré
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configuration des transports
const transports: winston.transport[] = [];

// Transport console avec format amélioré
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
        winston.format.printf(({ timestamp, message, ...meta }: any) => {
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

// Création de l'instance logger principale
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

// ================================================================================
// CLASSE UTILITAIRE POUR LES LOGS STRUCTURÉS ET CONTEXTUELS
// ================================================================================

export class StructuredLogger {
  private context: string;
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
  };

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

  // ============================================================================
  // MÉTHODES DE LOGGING AMÉLIORÉES AVEC CONTEXTE
  // ============================================================================

  /**
   * 🚀 Log de démarrage avec style
   */
  startup(message: string, details: any = {}) {
    console.log(`\n${this.colors.cyan}╔════════════════════════════════════════════════════════════════╗${this.colors.reset}`);
    console.log(`${this.colors.cyan}║${this.colors.bright}                    🔐 LOGON BACKEND                          ${this.colors.cyan}║${this.colors.reset}`);
    console.log(`${this.colors.cyan}╚════════════════════════════════════════════════════════════════╝${this.colors.reset}`);
    
    this.log('info', message, { type: 'startup', ...details });
  }

  /**
   * ⚡ Log de performance avec seuils visuels
   */
  performance(operation: string, duration: number, meta: any = {}) {
    let icon = '⚡';
    let color = this.colors.green;
    
    if (duration > 2000) {
      icon = '🐌';
      color = this.colors.red;
    } else if (duration > 1000) {
      icon = '⏱️ ';
      color = this.colors.yellow;
    } else if (duration > 500) {
      icon = '🏃';
      color = this.colors.yellow;
    }
    
    this.log('info', `${icon} ${operation}`, {
      type: 'performance',
      operation,
      duration,
      threshold: duration > 1000 ? 'slow' : 'normal',
      ...meta,
    });
  }

  /**
   * 🔒 Log d'audit de sécurité renforcé
   */
  audit(action: string, userId?: string, details: any = {}) {
    this.log('info', `🔒 ${action}`, {
      type: 'audit',
      action,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * 🛡️ Log de sécurité avec niveaux visuels
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any = {}) {
    const icons = {
      low: '🟢',
      medium: '🟡', 
      high: '🟠',
      critical: '🔴'
    };
    
    const level = severity === 'critical' ? 'error' : 'warn';
    this.log(level, `${icons[severity]} ${event}`, {
      type: 'security',
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * 📡 Log de requête HTTP enrichi
   */
  httpRequest(req: any, type: 'incoming' | 'outgoing' = 'incoming') {
    const method = req.method?.toUpperCase() || 'UNKNOWN';
    const url = req.url || req.path || 'unknown';
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    
    const arrow = type === 'incoming' ? '📥' : '📤';
    
    this.log('debug', `${arrow} ${method} ${url}`, {
      type: 'http',
      direction: type,
      method,
      url,
      ip,
      userAgent: req.get ? req.get('User-Agent') : undefined,
      requestId: req.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    });
  }

  /**
   * 📈 Log de base de données avec métriques
   */
  database(operation: string, duration: number, query?: string, params?: any[]) {
    let icon = '💾';
    if (duration > 1000) icon = '🐌';
    else if (duration > 100) icon = '⏳';
    else if (duration < 10) icon = '⚡';
    
    this.log('debug', `${icon} ${operation}`, {
      type: 'database',
      operation,
      duration,
      query: query ? `${query.substring(0, 100)}${query.length > 100 ? '...' : ''}` : undefined,
      params: params ? `${params.length} parameters` : undefined,
    });
  }

  /**
   * 🔐 Log de cryptographie avec niveau de sécurité
   */
  crypto(operation: string, success: boolean, details: any = {}) {
    const icon = success ? '🔐' : '💥';
    const level = success ? 'info' : 'error';
    
    this.log(level, `${icon} ${operation}`, {
      type: 'crypto',
      operation,
      success,
      ...details,
    });
  }

  /**
   * 👤 Log d'authentification avec contexte utilisateur
   */
  auth(event: string, userId?: string, success: boolean = true, details: any = {}) {
    const icon = success ? '✅' : '❌';
    const level = success ? 'info' : 'warn';
    
    this.log(level, `${icon} ${event}`, {
      type: 'auth',
      event,
      userId: userId || 'anonymous',
      success,
      ...details,
    });
  }

  // ============================================================================
  // MÉTHODES STANDARD AMÉLIORÉES
  // ============================================================================

  error(message: string, error?: Error, meta: any = {}) {
    this.log('error', `💥 ${message}`, {
      ...meta,
      error: error ? {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        stack: error.stack,
      } : undefined,
    });
  }

  warn(message: string, meta: any = {}) {
    this.log('warn', `⚠️  ${message}`, meta);
  }

  info(message: string, meta: any = {}) {
    this.log('info', `ℹ️  ${message}`, meta);
  }

  debug(message: string, meta: any = {}) {
    this.log('debug', `🔍 ${message}`, meta);
  }

  success(message: string, meta: any = {}) {
    this.log('info', `✅ ${message}`, { type: 'success', ...meta });
  }
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
