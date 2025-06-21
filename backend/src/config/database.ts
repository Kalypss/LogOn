/**
 * Configuration de la base de données PostgreSQL
 * Gestion des connexions et des pools avec sécurité renforcée
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '@/utils/logger';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
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
      config = {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.substring(1),
        user: url.username,
        password: url.password,
        ssl: process.env.NODE_ENV === 'production',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
      logger.info('🔗 Configuration DB via DATABASE_URL');
    } else {
      // Configuration via variables d'environnement séparées
      config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'logon',
        user: process.env.DB_USER || 'logon',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
      logger.info('🔗 Configuration DB via variables séparées');
    }
    
    logger.info(`📊 Configuration base de données:`);
    logger.info(`   - Host: ${config.host}`);
    logger.info(`   - Port: ${config.port}`);
    logger.info(`   - Database: ${config.database}`);
    logger.info(`   - User: ${config.user}`);
    logger.info(`   - SSL: ${config.ssl}`);

    this.pool = new Pool(config);
    
    // Gestion des événements du pool
    this.pool.on('connect', (client: PoolClient) => {
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
   * Initialise la connexion à la base de données
   */
  async connect(): Promise<void> {
    try {
      logger.info('🔌 Tentative de connexion à la base de données...');
      
      // Test de connexion avec timeout
      const client = await Promise.race([
        this.pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de connexion')), 10000)
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
    } catch (error) {
      logger.error('❌ Erreur de connexion à la base de données:', error);
      logger.error('🔍 Détails de l\'erreur:', {
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        code: (error as any)?.code,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME
      });
      throw new Error(`Impossible de se connecter à la base de données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
