/**
 * Middleware de monitoring et métriques pour LogOn
 * Collecte des données de performance et de sécurité
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Interface pour les métriques de requête
 */
interface RequestMetrics {
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  contentLength: number;
  userAgent: string;
  ip: string;
  userId?: string;
  requestId: string;
}

/**
 * Compteurs globaux pour les métriques
 */
let requestCounter = 0;
let errorCounter = 0;
const requestMetrics: RequestMetrics[] = [];
const MAX_METRICS_HISTORY = 10000; // Limite pour éviter les fuites mémoire

/**
 * Génère un ID unique pour chaque requête
 */
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Middleware principal de monitoring
 */
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Attacher l'ID de requête à l'objet request
  (req as any).requestId = requestId;
  
  // Incrémenter le compteur de requêtes
  requestCounter++;
  
  // Logger le début de la requête
  logger.debug('📥 Requête entrante:', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Capturer la fin de la requête
  const originalSend = res.send;
  res.send = function(data: any) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Collecter les métriques
    const metrics: RequestMetrics = {
      timestamp: new Date(startTime),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      contentLength: data ? Buffer.byteLength(data, 'utf8') : 0,
      userAgent: req.get('User-Agent') || 'unknown',
      ip: req.ip || 'unknown',
      userId: (req as any).user?.id,
      requestId
    };
    
    // Stocker les métriques (avec rotation)
    requestMetrics.push(metrics);
    if (requestMetrics.length > MAX_METRICS_HISTORY) {
      requestMetrics.shift(); // Supprimer la plus ancienne
    }
    
    // Logger selon le niveau de gravité
    if (res.statusCode >= 500) {
      errorCounter++;
      logger.error('📤 Réponse erreur:', {
        requestId,
        statusCode: res.statusCode,
        responseTime,
        path: req.path
      });
    } else if (res.statusCode >= 400) {
      logger.warn('📤 Réponse client error:', {
        requestId,
        statusCode: res.statusCode,
        responseTime,
        path: req.path
      });
    } else {
      logger.debug('📤 Réponse succès:', {
        requestId,
        statusCode: res.statusCode,
        responseTime,
        path: req.path
      });
    }
    
    // Alertes pour les requêtes lentes
    if (responseTime > 5000) { // > 5 secondes
      logger.warn('🐌 Requête lente détectée:', {
        requestId,
        responseTime,
        path: req.path,
        method: req.method
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Collecte des métriques système
 */
export const getSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024) // MB
    },
    requests: {
      total: requestCounter,
      errors: errorCounter,
      successRate: requestCounter > 0 ? ((requestCounter - errorCounter) / requestCounter * 100).toFixed(2) : '100'
    }
  };
};

/**
 * Statistiques des performances
 */
export const getPerformanceStats = () => {
  if (requestMetrics.length === 0) {
    return null;
  }
  
  const responseTimes = requestMetrics.map(m => m.responseTime);
  const sortedTimes = responseTimes.sort((a, b) => a - b);
  
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  
  return {
    totalRequests: requestMetrics.length,
    averageResponseTime: Math.round(avg),
    medianResponseTime: median,
    p95ResponseTime: p95,
    p99ResponseTime: p99,
    slowRequests: requestMetrics.filter(m => m.responseTime > 1000).length,
    errorRate: (errorCounter / requestCounter * 100).toFixed(2) + '%'
  };
};

/**
 * Top des endpoints les plus utilisés
 */
export const getTopEndpoints = (limit: number = 10) => {
  const pathCounts: { [key: string]: number } = {};
  
  requestMetrics.forEach(metric => {
    const key = `${metric.method} ${metric.path}`;
    pathCounts[key] = (pathCounts[key] || 0) + 1;
  });
  
  return Object.entries(pathCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([endpoint, count]) => ({ endpoint, count }));
};

/**
 * Métriques de sécurité
 */
export const getSecurityMetrics = () => {
  const recentMetrics = requestMetrics.filter(
    m => Date.now() - m.timestamp.getTime() < 3600000 // Dernière heure
  );
  
  const suspiciousIPs = new Set();
  const userAgents = new Set();
  let authAttempts = 0;
  
  recentMetrics.forEach(metric => {
    if (metric.statusCode === 401 || metric.statusCode === 403) {
      suspiciousIPs.add(metric.ip);
      if (metric.path.includes('auth')) {
        authAttempts++;
      }
    }
    userAgents.add(metric.userAgent);
  });
  
  return {
    suspiciousIPs: Array.from(suspiciousIPs),
    uniqueUserAgents: userAgents.size,
    failedAuthAttempts: authAttempts,
    requestsLastHour: recentMetrics.length
  };
};

/**
 * Nettoyage périodique des métriques anciennes
 */
export const cleanupOldMetrics = () => {
  const oneHourAgo = Date.now() - 3600000; // 1 heure
  
  const initialLength = requestMetrics.length;
  let index = 0;
  
  while (index < requestMetrics.length) {
    if (requestMetrics[index].timestamp.getTime() < oneHourAgo) {
      requestMetrics.splice(index, 1);
    } else {
      index++;
    }
  }
  
  const cleanedCount = initialLength - requestMetrics.length;
  if (cleanedCount > 0) {
    logger.debug(`🧹 Nettoyé ${cleanedCount} métriques anciennes`);
  }
};

/**
 * Middleware pour mesurer les opérations de base de données
 */
export const dbMetricsMiddleware = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Mesurer le temps d'exécution
    const originalJson = res.json;
    res.json = function(data: any) {
      const duration = Date.now() - startTime;
      
      logger.debug('🗄️ Opération DB:', {
        operation,
        duration,
        requestId: (req as any).requestId
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};
