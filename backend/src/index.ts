/**
 * Point d'entrée principal du serveur LogOn
 * Configuration Express avec middlewares de sécurité
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { db } from './config/database';
import { logger, requestLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitConfig } from './middleware/security/rateLimit';

// Chargement des variables d'environnement
config();

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Configuration des middlewares de sécurité
 */

// Helmet pour les headers de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://localhost:3000']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Compression des réponses
app.use(compression());

// Parsing des requêtes
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
 * API Routes
 */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/entries', require('./routes/entries'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/audit', require('./routes/audit'));

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
    // Connexion à la base de données
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
      logger.error('❌ Rejection non gérée:', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });

    // Nettoyage périodique des sessions expirées (toutes les heures)
    setInterval(async () => {
      try {
        await db.cleanupExpiredSessions();
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
