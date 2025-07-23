/**
 * Configuration de la base de données PostgreSQL
 * Gestion des connexions et des pools avec sécurité renforcée
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '@/utils/logger';
import { config } from 'dotenv';
import path from 'path';

// Chargement explicite des variables d'environnement depuis la racine du projet
const envPath = path.resolve(__dirname, '../../../.env');
config({ path: envPath });

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  propagateCreateError?: boolean;
}

class DatabaseManager {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    // Gestion de la configuration avec DATABASE_URL ou variables séparées
    let config: DatabaseConfig;
    
    if (process.env.DATABASE_URL) {
      // Parse de l'URL de connexion PostgreSQL
      const url = new URL(process.env.DATABASE_URL);
      
      if (!url.password) {
        logger.error('❌ ERREUR: Mot de passe manquant dans DATABASE_URL');
        throw new Error('Database password is required in DATABASE_URL');
      }
      
      config = {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.substring(1),
        user: url.username,
        password: String(url.password), // Garantir que c'est une chaîne
        ssl: process.env.NODE_ENV === 'production',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
      logger.info('🔗 Configuration DB via DATABASE_URL');
    } else {
      // Configuration via variables d'environnement séparées
      const dbPassword = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD;
      
      if (!dbPassword) {
        logger.error('❌ ERREUR: Aucun mot de passe de base de données configuré');
        logger.error('   Veuillez définir DB_PASSWORD ou POSTGRES_PASSWORD dans le fichier .env');
        throw new Error('Database password is required');
      }
      
      config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'logon',
        user: process.env.DB_USER || 'logon',
        password: String(dbPassword), // Garantir que c'est une chaîne
        ssl: process.env.NODE_ENV === 'production',
        // Configuration optimisée pour les requêtes concurrentes
        max: 30, // Augmenter le nombre max de connexions
        min: 5,  // Maintenir un minimum de connexions ouvertes
        idleTimeoutMillis: 60000, // Garder les connexions plus longtemps
        connectionTimeoutMillis: 5000, // Réduire le timeout de connexion
        acquireTimeoutMillis: 10000, // Timeout pour acquérir une connexion du pool
        createTimeoutMillis: 5000, // Timeout pour créer une nouvelle connexion
        destroyTimeoutMillis: 5000, // Timeout pour détruire une connexion
        reapIntervalMillis: 1000, // Vérifier les connexions plus fréquemment
        createRetryIntervalMillis: 200, // Retry plus rapidement
        propagateCreateError: false // Ne pas propager les erreurs de création
      };
      logger.info('🔗 Configuration DB via variables séparées');
    }
    
    logger.info(`📊 Configuration base de données:`);
    logger.info(`   - Host: ${config.host}`);
    logger.info(`   - Port: ${config.port}`);
    logger.info(`   - Database: ${config.database}`);
    logger.info(`   - User: ${config.user}`);
    logger.info(`   - Password: ${config.password ? '[CONFIGURÉ]' : '[MANQUANT]'}`);
    logger.info(`   - SSL: ${config.ssl}`);

    this.pool = new Pool(config);
    
    // Gestion des événements du pool
    this.pool.on('connect', () => {
      logger.debug('🔗 Nouvelle connexion établie à la base de données');
    });

    this.pool.on('error', (err: Error) => {
      logger.error('❌ Erreur inattendue du pool de connexions:', err);
    });

    this.pool.on('remove', () => {
      logger.debug('🔌 Connexion fermée du pool');
    });
  }

  /**
   * Initialise la connexion à la base de données avec retry automatique
   */
  async connect(): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 2000; // 2 secondes
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`🔌 Tentative de connexion à la base de données... (${attempt}/${maxRetries})`);
        
        // Test de connexion avec timeout
        const client = await Promise.race([
          this.pool.connect(),
          new Promise((_, reject) => 
            (global as any).setTimeout(() => reject(new Error('Timeout de connexion')), 10000)
          )
        ]) as PoolClient;
        
        logger.info('✅ Client de connexion obtenu, test de requête...');
        
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        logger.info('📊 Base de données connectée:', {
          timestamp: result.rows[0].current_time,
          version: result.rows[0].pg_version.split(' ')[0]
        });
        
        client.release();
        
        this.isConnected = true;
        logger.info('✅ Connexion à la base de données établie avec succès');
        return;
        
      } catch (error) {
        logger.warn(`⚠️ Tentative ${attempt}/${maxRetries} échouée:`, {
          message: error instanceof Error ? error.message : 'Erreur inconnue',
          code: (error as any)?.code,
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME
        });
        
        if (attempt === maxRetries) {
          logger.error('❌ Toutes les tentatives de connexion ont échoué');
          throw new Error(`Impossible de se connecter à la base de données après ${maxRetries} tentatives: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
        
        logger.info(`⏳ Attente de ${retryDelay}ms avant la prochaine tentative...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * Exécute une requête SQL
   */
  async query(text: string, params?: any[]): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug(`🔍 Requête exécutée en ${duration}ms: ${text.substring(0, 100)}...`);
      
      return result;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'exécution de la requête:', error);
      logger.error('📝 Requête:', text);
      logger.error('📋 Paramètres:', params);
      throw error;
    }
  }

  /**
   * Exécute une requête SQL avec retry automatique pour les erreurs transitoires
   * Utilisé pour les requêtes critiques qui peuvent échouer temporairement
   */
  async queryWithRetry(text: string, params?: any[], maxRetries: number = 3, retryDelay: number = 100): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    let lastError: Error | null = null;
    const start = Date.now();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`🔄 Tentative ${attempt}/${maxRetries} pour requête: ${text.substring(0, 100)}...`);
        
        const result = await this.pool.query(text, params);
        const duration = Date.now() - start;
        
        if (attempt > 1) {
          logger.info(`✅ Requête réussie après ${attempt} tentatives en ${duration}ms`);
        } else {
          logger.debug(`🔍 Requête exécutée en ${duration}ms: ${text.substring(0, 100)}...`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        const isRetryableError = this.isRetryableError(error);
        
        logger.warn(`⚠️ Tentative ${attempt}/${maxRetries} échouée:`, {
          error: error instanceof Error ? error.message : String(error),
          code: (error as any)?.code,
          isRetryable: isRetryableError,
          query: text.substring(0, 100)
        });
        
        // Si ce n'est pas une erreur retryable ou si c'est la dernière tentative
        if (!isRetryableError || attempt === maxRetries) {
          logger.error('❌ Erreur définitive lors de l\'exécution de la requête:', error);
          logger.error('📝 Requête:', text);
          logger.error('📋 Paramètres:', params);
          throw error;
        }
        
        // Attendre avant la prochaine tentative avec backoff exponentiel
        const delay = retryDelay * Math.pow(2, attempt - 1);
        logger.debug(`⏳ Attente de ${delay}ms avant la prochaine tentative...`);
        await new Promise<void>(resolve => {
          (global as any).setTimeout(() => resolve(), delay);
        });
      }
    }
    
    // Cette ligne ne devrait jamais être atteinte, mais au cas où
    throw lastError || new Error('Toutes les tentatives de requête ont échoué');
  }

  /**
   * Détermine si une erreur est retryable (erreur transitoire)
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const code = error.code;
    const message = error.message?.toLowerCase() || '';
    
    // Codes d'erreur PostgreSQL retryables
    const retryableCodes = [
      '53000', // insufficient_resources
      '53100', // disk_full
      '53200', // out_of_memory
      '53300', // too_many_connections
      '08000', // connection_exception
      '08003', // connection_does_not_exist
      '08006', // connection_failure
      '08001', // sqlclient_unable_to_establish_sqlconnection
      '08004', // sqlserver_rejected_establishment_of_sqlconnection
      '57P01', // admin_shutdown
      '57P02', // crash_shutdown
      '57P03', // cannot_connect_now
      '40001', // serialization_failure
      '40P01', // deadlock_detected
    ];
    
    // Messages d'erreur retryables
    const retryableMessages = [
      'connection terminated',
      'connection reset',
      'connection refused',
      'timeout',
      'pool is full',
      'too many clients',
      'server closed the connection',
      'network error',
      'etimedout',
      'econnreset',
      'econnrefused',
      'enotfound'
    ];
    
    // Vérifier le code d'erreur
    if (code && retryableCodes.includes(code)) {
      logger.debug(`🔄 Erreur retryable détectée (code): ${code}`);
      return true;
    }
    
    // Vérifier le message d'erreur
    if (retryableMessages.some(msg => message.includes(msg))) {
      logger.debug(`🔄 Erreur retryable détectée (message): ${message}`);
      return true;
    }
    
    logger.debug(`❌ Erreur non-retryable: ${code} - ${message}`);
    return false;
  }

  /**
   * Exécute une transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.isConnected) {
      await this.connect();
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      logger.debug('✅ Transaction terminée avec succès');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('❌ Transaction annulée:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Vérifie l'état de la connexion
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('❌ Vérification de santé de la base de données échouée:', error);
      return false;
    }
  }

  /**
   * Nettoie les sessions expirées
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.query('SELECT cleanup_expired_sessions()');
      const deletedCount = result.rows[0].cleanup_expired_sessions;
      
      if (deletedCount > 0) {
        logger.info(`🧹 ${deletedCount} sessions expirées supprimées`);
      }
      
      return deletedCount;
    } catch (error) {
      logger.error('❌ Erreur lors du nettoyage des sessions:', error);
      return 0;
    }
  }

  /**
   * Crée un log d'audit
   */
  async createAuditLog(
    userId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string,
    details?: any,
    success: boolean = true
  ): Promise<string> {
    try {
      // Prepare details as JSON string if it's an object
      let detailsJson = null;
      if (details) {
        detailsJson = typeof details === 'string' ? details : JSON.stringify(details);
      }
      
      const result = await this.query(
        'SELECT create_audit_log($1, $2, $3, $4, $5, $6, $7, $8) as log_id',
        [userId, action, resourceType, resourceId, ipAddress, userAgent, detailsJson, success]
      );
      
      return result.rows[0].log_id;
    } catch (error) {
      logger.error('❌ Erreur lors de la création du log d\'audit:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        action,
        resourceType,
        resourceId,
        details
      });
      throw error;
    }
  }

  /**
   * Ferme toutes les connexions
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('🔒 Connexions à la base de données fermées');
    } catch (error) {
      logger.error('❌ Erreur lors de la fermeture des connexions:', error);
    }
  }

  /**
   * Obtient les statistiques du pool de connexions
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Instance singleton
export const db = new DatabaseManager();

// Types pour les modèles
export interface User {
  id: string;
  email: string;
  auth_hash: string;
  salt: Buffer;
  recovery_code_hash: string;
  recovery_code_salt: Buffer;
  totp_secret?: string;
  totp_enabled: boolean;
  key_version: number;
  last_login_at?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Group {
  id: string;
  name: string;
  encrypted_description?: string;
  created_by: string;
  group_key_version: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Entry {
  id: string;
  user_id?: string;
  group_id?: string;
  title_encrypted: string;
  data_encrypted: string;
  iv: Buffer;
  auth_tag: Buffer;
  type: 'password' | 'note' | 'card' | 'identity';
  encryption_version: number;
  created_at: Date;
  updated_at: Date;
  last_accessed_at?: Date;
  access_count: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: any;
  success: boolean;
  created_at: Date;
}
