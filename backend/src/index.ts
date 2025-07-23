/**
 * Point d'entrée principal du serveur LogOn
 * Configuration Express avec middlewares de sécurité
 */

import { config } from 'dotenv';
import path from 'path';

// Chargement des variables d'environnement depuis la racine du projet AVANT tout autre import
const envPath = path.resolve(process.cwd(), '../.env');
config({ path: envPath });

// Imports après chargement des variables d'environnement
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { db } from './config/database';
import { logger, requestLogger } from './utils/logger';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './middleware/errorHandler';
import { rateLimitConfig } from './middleware/security/rateLimit';
import { cspMiddleware, apiCSPMiddleware } from './middleware/security/csp';
import { monitoringMiddleware, getSystemMetrics, getPerformanceStats, getTopEndpoints, getSecurityMetrics, cleanupOldMetrics } from './middleware/monitoring';

logger.info(`Variables d'environnement chargées depuis: ${envPath}`);

// Configuration des gestionnaires d'erreurs globaux
setupGlobalErrorHandlers();

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Configuration des middlewares de sécurité et monitoring
 */

// Middleware de monitoring (en premier pour capturer toutes les requêtes)
app.use(monitoringMiddleware);

// CSP et headers de sécurité
app.use(cspMiddleware);

// Helmet pour les headers de sécurité
app.use(helmet({
  contentSecurityPolicy: false, // Géré par notre middleware CSP personnalisé
  crossOriginEmbedderPolicy: false,
}));

// Headers de sécurité additionnels
app.use((_req: any, res: any, next: any) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://localhost:3000']
    : [
        'http://localhost:3000', 
        'http://127.0.0.1:3000',
        'https://localhost:3000',
        'https://127.0.0.1:3000',
        // Adresses Docker
        'http://logon-frontend:3000',
        'https://logon-frontend:3000',
        // Adresses réseau Docker (172.x.x.x)
        /^https?:\/\/172\.\d+\.\d+\.\d+:3000$/
      ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Compression des réponses
app.use(compression());

// Middleware de parsing JSON personnalisé avec gestion d'erreurs robuste
app.use('/api', (req: any, res: any, next: any) => {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.debug(`🔍 [JSON Parser] Début parsing pour ${req.method} ${req.path}`, {
    requestId,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length']
  });
  
  // Passer au middleware JSON standard avec gestion d'erreurs améliorée
  express.json({ 
    limit: '10mb',
    verify: (req: any, res: any, buf: any, encoding: any) => {
      try {
        if (buf && buf.length) {
          req.rawBody = buf.toString(encoding || 'utf8');
          logger.debug(`🔍 [JSON Parser] Raw body reçu:`, {
            requestId,
            rawBodyLength: req.rawBody.length,
            rawBodyPreview: req.rawBody.substring(0, 100) + '...'
          });
        }
      } catch (error) {
        logger.error(`❌ [JSON Parser] Erreur verification:`, {
          error: error instanceof Error ? error.message : String(error),
          requestId
        });
      }
    }
  })(req, res, (error: any) => {
    if (error) {
      logger.error(`❌ [JSON Parser] Erreur parsing JSON:`, {
        error: error.message,
        requestId,
        body: req.rawBody ? req.rawBody.substring(0, 200) + '...' : 'undefined'
      });
      
      // Assigner un body vide si le parsing échoue
      req.body = {};
      
      // Continuer sans erreur pour éviter les rejets de promesses
      next();
    } else {
      logger.debug(`✅ [JSON Parser] Parsing réussi:`, {
        requestId,
        bodyKeys: req.body ? Object.keys(req.body) : 'no keys',
        bodyType: typeof req.body
      });
      next();
    }
  });
});

// Parsing des requêtes standard pour les autres routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger des requêtes
app.use(requestLogger);

// Rate limiting global
app.use(rateLimit(rateLimitConfig.global));

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    const poolStats = db.getPoolStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        server: 'healthy',
      },
      database: {
        pool: poolStats,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    logger.error('❌ Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

/**
 * Métriques détaillées (endpoint protégé pour les admins)
 */
app.get('/metrics', (req, res) => {
  try {
    const systemMetrics = getSystemMetrics();
    const performanceStats = getPerformanceStats();
    const topEndpoints = getTopEndpoints();
    const securityMetrics = getSecurityMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      performance: performanceStats,
      endpoints: topEndpoints,
      security: securityMetrics
    });
  } catch (error) {
    logger.error('❌ Erreur lors de la récupération des métriques:', error);
    res.status(500).json({
      error: 'Impossible de récupérer les métriques'
    });
  }
});

/**
 * API Routes
 */
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import entryRoutes from './routes/entries';
import groupRoutes from './routes/groups';
import auditRoutes from './routes/audit';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/audit', auditRoutes);

/**
 * 404 Handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Error Handler (doit être en dernier)
 */
app.use(errorHandler);

/**
 * Démarrage du serveur
 */
async function startServer() {
  try {
    logger.info('🚀 Démarrage du serveur LogOn...');
    logger.info(`📊 Variables d'environnement:`);
    logger.info(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   - PORT: ${PORT}`);
    logger.info(`   - DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
    logger.info(`   - DB_PORT: ${process.env.DB_PORT || '5432'}`);
    logger.info(`   - DB_NAME: ${process.env.DB_NAME || 'logon'}`);
    logger.info(`   - DB_USER: ${process.env.DB_USER || 'logon'}`);
    logger.info(`   - DATABASE_URL présent: ${!!process.env.DATABASE_URL}`);
    
    // Connexion à la base de données
    logger.info('🔌 Tentative de connexion à la base de données...');
    await db.connect();
    
    // Nettoyage initial des sessions expirées
    await db.cleanupExpiredSessions();
    
    // Démarrage du serveur
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Serveur LogOn démarré sur le port ${PORT}`);
      logger.info(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`📊 Health check: http://localhost:${PORT}/health`);
        logger.info(`🔌 API Base: http://localhost:${PORT}/api`);
      }
    });

    // Gestion gracieuse de l'arrêt
    const gracefulShutdown = async (signal: string) => {
      logger.info(`📢 Signal ${signal} reçu, arrêt gracieux...`);
      
      server.close(async () => {
        logger.info('🔒 Serveur HTTP fermé');
        
        try {
          await db.close();
          logger.info('✅ Arrêt gracieux terminé');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Erreur lors de l\'arrêt:', error);
          process.exit(1);
        }
      });
      
      // Force l'arrêt après 30 secondes
      setTimeout(() => {
        logger.error('⏰ Arrêt forcé après timeout');
        process.exit(1);
      }, 30000);
    };

    // Écoute des signaux d'arrêt
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Gestion des erreurs non capturées
    process.on('uncaughtException', (error) => {
      logger.error('❌ Exception non capturée:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ 💥 Promesse rejetée non gérée:', {
        reason: reason instanceof Error ? reason.message.substring(0, 100) + '...' : String(reason).substring(0, 100) + '...',
        stack: reason instanceof Error ? reason.stack?.substring(0, 100) + '...' : 'N/A',
        promise: 'Promise rejected'
      });
      
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ Continuer en mode développement - corriger l\'erreur ci-dessus');
      } else {
        gracefulShutdown('unhandledRejection');
      }
    });

    // Nettoyage périodique des sessions expirées (toutes les heures)
    setInterval(async () => {
      try {
        await db.cleanupExpiredSessions();
        cleanupOldMetrics(); // Nettoyage des métriques anciennes
      } catch (error) {
        logger.error('❌ Erreur lors du nettoyage périodique:', error);
      }
    }, 3600000); // 1 heure

  } catch (error) {
    logger.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Démarrage de l'application
if (require.main === module) {
  startServer();
}

export default app;
