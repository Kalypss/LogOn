/**
 * 🔐 LogOn Password Manager - Système de Logging Avancé
 * 
 * Logging coloré, structuré et lisible pour le développement
 * Formatage JSON pour la production avec audit de sécurité
 */

import winston from 'winston';

// Fix pour les types Node.js
declare const process: any;
declare const console: any;

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

// ================================================================================
// FONCTIONS DE FORMATAGE INTELLIGENT
// ================================================================================

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
  } else if (meta.type === 'http') {
    return formatHttpLog(meta);
  } else if (meta.type === 'database') {
    return formatDatabaseLog(meta);
  } else if (meta.type === 'startup') {
    return formatStartupLog(meta);
  } else if (meta.error) {
    return formatErrorLog(meta);
  }
  
  // Formatage générique pour les autres métadonnées
  for (const [key, value] of Object.entries(meta)) {
    if (key !== 'timestamp' && key !== 'context' && key !== 'type' && value !== undefined) {
      lines.push(`   📋 ${key}: ${formatValue(value)}`);
    }
  }
  
  return lines.join('\n');
}

// Formatage spécialisé pour les logs de démarrage
function formatStartupLog(meta: any): string {
  const lines = [];
  if (meta.version) lines.push(`   🔢 Version: ${meta.version}`);
  if (meta.env) lines.push(`   🌍 Environnement: ${meta.env}`);
  if (meta.port) lines.push(`   🚪 Port: ${meta.port}`);
  if (meta.database) lines.push(`   💾 Base de données: ${meta.database}`);
  return lines.join('\n');
}

// Formatage spécialisé pour les logs d'audit
function formatAuditLog(meta: any): string {
  const lines = [
    `   🔒 Action: ${meta.action}`,
    `   👤 User: ${meta.userId || 'Anonymous'}`,
  ];
  
  if (meta.ip) lines.push(`   🌐 IP: ${meta.ip}`);
  if (meta.userAgent) lines.push(`   🖥️  Client: ${meta.userAgent.substring(0, 50)}...`);
  if (meta.details) lines.push(`   📝 Détails: ${JSON.stringify(meta.details)}`);
  
  return lines.join('\n');
}

// Formatage spécialisé pour les logs de performance
function formatPerformanceLog(meta: any): string {
  const duration = meta.duration;
  const perfIcon = duration > 1000 ? '🐌' : duration > 500 ? '⏱️ ' : '⚡';
  
  return [
    `   ${perfIcon} Opération: ${meta.operation}`,
    `   ⏰ Durée: ${duration}ms ${duration > 1000 ? '(LENT!)' : ''}`,
    ...(meta.threshold ? [`   📊 Seuil: ${meta.threshold}`] : [])
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

// Formatage spécialisé pour les logs HTTP
function formatHttpLog(meta: any): string {
  const statusColor = getStatusColor(meta.statusCode);
  const methodColor = getMethodColor(meta.method);
  
  const lines = [
    `   ${methodColor}${meta.method || 'UNKNOWN'}\x1b[0m ${meta.url || 'unknown'}`,
  ];
  
  if (meta.statusCode) {
    lines.push(`   ${statusColor}${meta.statusCode}\x1b[0m ${getStatusText(meta.statusCode)}`);
  }
  
  if (meta.duration) {
    const durationColor = meta.duration > 1000 ? '\x1b[31m' : meta.duration > 500 ? '\x1b[33m' : '\x1b[32m';
    lines.push(`   ⏱️  ${durationColor}${meta.duration}ms\x1b[0m`);
  }
  
  if (meta.ip) lines.push(`   🌐 ${meta.ip}`);
  if (meta.requestId) lines.push(`   🆔 ${meta.requestId}`);
  
  return lines.join('\n');
}

// Formatage spécialisé pour les logs de base de données
function formatDatabaseLog(meta: any): string {
  const lines = [
    `   💾 Opération: ${meta.operation}`,
    `   ⏰ Durée: ${meta.duration}ms`,
  ];
  
  if (meta.query) lines.push(`   📝 Requête: ${meta.query}`);
  if (meta.params) lines.push(`   📋 Paramètres: ${meta.params}`);
  
  return lines.join('\n');
}

// Formatage spécialisé pour les erreurs
function formatErrorLog(meta: any): string {
  const error = meta.error;
  const lines = [];
  
  if (error.name) lines.push(`   🏷️  Type: ${error.name}`);
  if (error.message) lines.push(`   💬 Message: ${error.message}`);
  if (error.code) lines.push(`   🔢 Code: ${error.code}`);
  
  // Stack trace condensée
  if (error.stack) {
    const stackLines = error.stack.split('\n').slice(0, 3);
    lines.push(`   📚 Stack: ${stackLines[0]}`);
    if (stackLines[1]) lines.push(`          ${stackLines[1]}`);
  }
  
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
    return JSON.stringify(value);
  }
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '...';
  }
  return String(value);
}

// ================================================================================
// FORMATS WINSTON
// ================================================================================

// Format amélioré pour le développement avec structure claire
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }: any) => {
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

// Format pour la production avec JSON structuré
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ================================================================================
// CONFIGURATION WINSTON
// ================================================================================

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
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: productionFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: productionFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  );
}

// Création de l'instance logger principale
export const logger = winston.createLogger({
  levels: logLevels,
  transports,
  exitOnError: false,
});

// ================================================================================
// CLASSE UTILITAIRE POUR LES LOGS STRUCTURÉS ET CONTEXTUELS
// ================================================================================

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

  // ============================================================================
  // MÉTHODES DE LOGGING SPÉCIALISÉES
  // ============================================================================

  /**
   * 🚀 Log de démarrage avec bannière
   */
  startup(message: string, details: any = {}) {
    this.log('info', `🚀 ${message}`, { type: 'startup', ...details });
  }

  /**
   * ⚡ Log de performance avec seuils visuels
   */
  performance(operation: string, duration: number, meta: any = {}) {
    this.log('info', `Performance: ${operation}`, {
      type: 'performance',
      operation,
      duration,
      threshold: duration > 1000 ? 'slow' : 'normal',
      ...meta,
    });
  }

  /**
   * 🔒 Log d'audit de sécurité
   */
  audit(action: string, userId?: string, details: any = {}) {
    this.log('info', `Audit: ${action}`, {
      type: 'audit',
      action,
      userId: userId || 'anonymous',
      ...details,
    });
  }

  /**
   * 🛡️ Log de sécurité avec niveaux
   */
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any = {}) {
    const level = severity === 'critical' ? 'error' : 'warn';
    this.log(level, `Security: ${event}`, {
      type: 'security',
      event,
      severity,
      ...details,
    });
  }

  /**
   * 📡 Log de requête HTTP
   */
  httpRequest(req: any, type: 'incoming' | 'outgoing' = 'incoming') {
    const method = req.method?.toUpperCase() || 'UNKNOWN';
    const url = req.url || req.path || 'unknown';
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    
    this.log('debug', `${type === 'incoming' ? 'Requête entrante' : 'Requête sortante'}`, {
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
   * 📈 Log de base de données
   */
  database(operation: string, duration: number, query?: string, params?: any[]) {
    this.log('debug', `DB: ${operation}`, {
      type: 'database',
      operation,
      duration,
      query: query ? `${query.substring(0, 100)}${query.length > 100 ? '...' : ''}` : undefined,
      params: params ? `${params.length} parameters` : undefined,
    });
  }

  /**
   * 👤 Log d'authentification
   */
  auth(event: string, userId?: string, success: boolean = true, details: any = {}) {
    const level = success ? 'info' : 'warn';
    this.log(level, `Auth: ${event}`, {
      type: 'auth',
      event,
      userId: userId || 'anonymous',
      success,
      ...details,
    });
  }

  // ============================================================================
  // MÉTHODES STANDARD
  // ============================================================================

  error(message: string, error?: Error, meta: any = {}) {
    this.log('error', message, {
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
    this.log('warn', message, meta);
  }

  info(message: string, meta: any = {}) {
    this.log('info', message, meta);
  }

  debug(message: string, meta: any = {}) {
    this.log('debug', message, meta);
  }

  success(message: string, meta: any = {}) {
    this.log('info', `✅ ${message}`, { type: 'success', ...meta });
  }
}

// ================================================================================
// INSTANCES ET MIDDLEWARE
// ================================================================================

// Instance par défaut pour l'application
export const appLogger = new StructuredLogger('LogOn');

// Middleware pour logger les requêtes HTTP amélioré
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const reqLogger = new StructuredLogger('HTTP');

  // Générer un ID unique pour la requête
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Log de la requête entrante
  reqLogger.httpRequest(req, 'incoming');

  // Override de res.end pour logger la réponse
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    const duration = Date.now() - start;
    
    reqLogger.info('Réponse envoyée', {
      type: 'http',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.connection?.remoteAddress,
      requestId: req.requestId,
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

// Fonction utilitaire pour nettoyer les données sensibles
export const sanitizeForLog = (data: any): any => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'authorization',
    'cookie', 'session', 'private', 'salt', 'hash', 'authHash'
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
