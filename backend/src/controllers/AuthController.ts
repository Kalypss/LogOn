/**
 * Controller d'authentification pour LogOn
 * Gestion sécurisée de l'inscription, connexion et sessions utilisateur
 * 
 * Fonctionnalités principales :
 * - Inscription avec validation robuste
 * - Récupération sécurisée des sels utilisateur  
 * - Connexion avec support 2FA
 * - Gestion des sessions et tokens JWT
 * - Système de retry automatique pour la base de données
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { ValidationError, AuthError, ConflictError, AppError } from '../middleware/errorHandler';
import { JWTService } from '../services/JWTService';
import { TOTPService } from '../services/TOTPService';
import { getUserId } from '../middleware/auth';
import { fromBase64 } from '../utils/buffer';
import { 
  generateSecureSalt, 
  convertDatabaseSalt, 
  getSaltFromCache, 
  cacheSalt 
} from '../services/SaltService';

export class AuthController {
  
  /**
   * Exécute une requête de base de données avec retry automatique pour les erreurs transitoires
   */
  private static async queryWithRetry(text: string, params?: any[], maxRetries: number = 3): Promise<any> {
    let lastError: Error | null = null;
    const start = Date.now();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`🔄 [queryWithRetry] Tentative ${attempt}/${maxRetries} pour requête: ${text.substring(0, 50)}...`);
        
        const result = await db.query(text, params);
        const duration = Date.now() - start;
        
        if (attempt > 1) {
          logger.info(`✅ [queryWithRetry] Requête réussie après ${attempt} tentatives en ${duration}ms`);
        } else {
          logger.debug(`🔍 [queryWithRetry] Requête exécutée en ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        const isRetryableError = AuthController.isRetryableError(error);
        
        logger.warn(`⚠️ [queryWithRetry] Tentative ${attempt}/${maxRetries} échouée:`, {
          error: error instanceof Error ? error.message : String(error),
          code: (error as any)?.code,
          isRetryable: isRetryableError,
          query: text.substring(0, 50)
        });
        
        // Si ce n'est pas une erreur retryable ou si c'est la dernière tentative
        if (!isRetryableError || attempt === maxRetries) {
          logger.error('❌ [queryWithRetry] Erreur définitive lors de l\'exécution de la requête:', error);
          throw error;
        }
        
        // Attendre avant le retry (backoff exponentiel)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new AppError('Toutes les tentatives de requête ont échoué', 500);
  }

  /**
   * Détermine si une erreur est retryable (erreur transitoire)
   */
  private static isRetryableError(error: any): boolean {
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
      logger.debug(`🔄 [isRetryableError] Erreur retryable détectée (code): ${code}`);
      return true;
    }
    
    // Vérifier le message d'erreur
    if (retryableMessages.some(msg => message.includes(msg))) {
      logger.debug(`🔄 [isRetryableError] Erreur retryable détectée (message): ${message}`);
      return true;
    }
    
    return false;
  }

  /**
   * Valide les données d'inscription utilisateur
   */
  private static validateRegistrationData(data: any, requestId: string): void {
    const { email, username, authHash, salt, recoveryCodeHash, recoveryCodeSalt } = data;
    
    // Validation des données requises
    if (!email || !authHash || !salt || !recoveryCodeHash || !recoveryCodeSalt) {
      logger.warn(`⚠️ [validateRegistrationData] Données incomplètes:`, {
        email: !!email,
        authHash: !!authHash,
        salt: !!salt,
        recoveryCodeHash: !!recoveryCodeHash,
        recoveryCodeSalt: !!recoveryCodeSalt,
        requestId
      });
      throw new ValidationError('Données d\'inscription incomplètes');
    }
    
    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn(`⚠️ [validateRegistrationData] Format email invalide: ${email}`, { requestId });
      throw new ValidationError('Format d\'email invalide');
    }
    
    // Validation username (optionnel)
    if (username && (username.length < 3 || username.length > 50)) {
      logger.warn(`⚠️ [validateRegistrationData] Username invalide: ${username}`, { requestId });
      throw new ValidationError('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères');
    }
  }

  /**
   * Valide et convertit les buffers base64
   */
  private static validateAndConvertBuffers(salt: string, recoveryCodeSalt: string, requestId: string): { saltBuffer: Buffer, recoveryCodeSaltBuffer: Buffer } {
    try {
      // Vérification que les valeurs sont des strings valides
      if (typeof salt !== 'string' || typeof recoveryCodeSalt !== 'string') {
        logger.error(`❌ [validateAndConvertBuffers] Types invalides:`, {
          saltType: typeof salt,
          recoveryCodeSaltType: typeof recoveryCodeSalt,
          requestId
        });
        throw new ValidationError('Salt et recoveryCodeSalt doivent être des chaînes de caractères');
      }
      
      logger.debug(`🔍 [validateAndConvertBuffers] Conversion des buffers`, {
        saltLength: salt.length,
        recoveryCodeSaltLength: recoveryCodeSalt.length,
        requestId
      });
      
      const saltBuffer = fromBase64(salt);
      const recoveryCodeSaltBuffer = fromBase64(recoveryCodeSalt);
      
      if (saltBuffer.length === 0 || recoveryCodeSaltBuffer.length === 0) {
        logger.error(`❌ [validateAndConvertBuffers] Buffers vides:`, {
          saltBufferLength: saltBuffer.length,
          recoveryCodeSaltBufferLength: recoveryCodeSaltBuffer.length,
          requestId
        });
        throw new ValidationError('Salt ou recoveryCodeSalt ne peuvent pas être vides');
      }
      
      logger.debug(`✅ [validateAndConvertBuffers] Validation Buffer terminée avec succès`);
      return { saltBuffer, recoveryCodeSaltBuffer };
      
    } catch (bufferError) {
      logger.error('❌ [validateAndConvertBuffers] Erreur validation format base64:', {
        error: bufferError instanceof Error ? bufferError.message : String(bufferError),
        requestId
      });
      throw new ValidationError('Format base64 invalide pour salt ou recoveryCodeSalt');
    }
  }
  
  /**
   * Normalise le requestId depuis les headers
   */
  private static normalizeRequestId(requestId: string | string[] | undefined, prefix: string = 'req'): string {
    if (!requestId) {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return Array.isArray(requestId) ? requestId[0] || `${prefix}_fallback` : requestId;
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  static async register(req: Request, res: Response): Promise<void> {
    const requestId = AuthController.normalizeRequestId(req.headers['x-request-id'], 'reg');
    
    try {
      logger.info(`🔍 [register] Début traitement inscription ${requestId}`);
      
      const { email, username, authHash, salt, recoveryCodeHash, recoveryCodeSalt } = req.body;
      
      // Validation des données
      AuthController.validateRegistrationData(req.body, requestId);
      
      // Validation et conversion des buffers
      const { saltBuffer, recoveryCodeSaltBuffer } = AuthController.validateAndConvertBuffers(
        salt, recoveryCodeSalt, requestId
      );
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await AuthController.queryWithRetry(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()],
        3
      );
      
      if (existingUser.rows.length > 0) {
        throw new ConflictError('Un compte avec cet email existe déjà');
      }
      
      // Créer le nouvel utilisateur
      const result = await AuthController.queryWithRetry(`
        INSERT INTO users (
          email, username, auth_hash, salt, recovery_code_hash, recovery_code_salt,
          key_version, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 1, TRUE, NOW())
        RETURNING id, email, username, created_at
      `, [
        email.toLowerCase(),
        username || null,
        authHash,
        saltBuffer,
        recoveryCodeHash,
        recoveryCodeSaltBuffer
      ], 3);
      
      const newUser = result.rows[0];
      
      // Log d'audit
      await db.createAuditLog(
        newUser.id,
        'register',
        'user',
        newUser.id,
        req.ip,
        req.get('User-Agent'),
        { email: email.toLowerCase() }
      );
      
      logger.info('✅ [register] Nouvel utilisateur inscrit:', { 
        userId: newUser.id, 
        email: email.toLowerCase(),
        requestId
      });
      
      res.status(201).json({
        success: true,
        message: 'Compte créé avec succès',
        user: {
          id: newUser.id,
          email: newUser.email,
          createdAt: newUser.created_at
        }
      });
      
    } catch (error) {
      logger.error(`❌ [register] Erreur lors de l'inscription:`, {
        error: error instanceof Error ? error.message : String(error),
        requestId
      });
      throw error;
    }
  }
  
  /**
   * Récupération du sel pour un utilisateur
   */
  static async getSalt(req: Request, res: Response): Promise<void> {
    const requestId = AuthController.normalizeRequestId(req.headers['x-request-id'], 'salt');
    
    try {
      logger.info(`🔍 [getSalt] Début traitement requête ${requestId}`);
      logger.debug(`🔍 [getSalt] Détails de la requête:`, {
        method: req.method,
        path: req.path,
        headers: {
          'content-type': req.headers['content-type'],
          'x-request-id': req.headers['x-request-id']
        },
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        requestId
      });
      
      // Validation du body avec logs détaillés
      if (!req.body || typeof req.body !== 'object') {
        logger.error(`❌ [getSalt] Body invalide:`, {
          bodyType: typeof req.body,
          bodyValue: req.body,
          bodyString: String(req.body),
          isNull: req.body === null,
          isUndefined: req.body === undefined,
          requestId
        });
        throw new ValidationError('Corps de requête invalide');
      }
      
      const { email } = req.body;
      logger.debug(email)
      
      logger.debug(`🔍 [getSalt] Extraction email:`, {
        emailType: typeof email,
        emailValue: email,
        emailString: String(email),
        emailTrimmed: email ? String(email).trim() : null,
        emailLength: email ? String(email).length : 0,
        allBodyKeys: Object.keys(req.body || {}),
        bodyContent: req.body,
        requestId
      });
      
      // Validation de l'email avec protection contre les données malformées
      if (!email || typeof email !== 'string' || email.trim().length === 0) {
        logger.warn(`⚠️ [getSalt] Email invalide ou manquant:`, {
          emailType: typeof email,
          emailValue: email,
          hasEmail: !!email,
          emailTrimLength: email ? String(email).trim().length : 0,
          bodyKeys: Object.keys(req.body || {}),
          bodyContent: req.body,
          requestId
        });
        
        // Retourner une erreur claire au lieu de continuer le traitement
        res.status(400).json({
          error: 'Email requis',
          message: 'Le champ email est obligatoire et doit être une chaîne de caractères non vide',
          received: {
            type: typeof email,
            value: email,
            bodyKeys: Object.keys(req.body || {})
          }
        });
        return;
      }
      
      const emailNormalized = email.toLowerCase().trim();
      logger.debug(`🔍 [getSalt] Email normalisé: "${emailNormalized}"`, {
        originalEmail: email,
        normalizedEmail: emailNormalized,
        normalizedLength: emailNormalized.length,
        requestId
      });
      
      // Vérifier le cache d'abord avec logs détaillés
      logger.debug(`🔍 [getSalt] Vérification du cache...`, { requestId });
      const cachedSalt = getSaltFromCache(emailNormalized, requestId);
      if (cachedSalt) {
        logger.debug(`🎯 [getSalt] Sel trouvé en cache pour ${emailNormalized}`, { 
          cachedSaltType: typeof cachedSalt,
          cachedSaltLength: cachedSalt ? cachedSalt.length : 0,
          requestId 
        });
        res.json({
          salt: cachedSalt,
          exists: true
        });
        return;
      }
      
      logger.debug(`🔍 [getSalt] Cache miss - recherche en base de données...`, { requestId });
      
      // Rechercher l'utilisateur avec logs détaillés
      logger.debug(`🔍 [getSalt] Exécution requête DB...`, {
        query: 'SELECT salt FROM users WHERE email = $1',
        parameters: [emailNormalized],
        requestId
      });
      
      const result = await AuthController.queryWithRetry(
        'SELECT salt FROM users WHERE email = $1',
        [emailNormalized],
        3
      );
      
      logger.debug(`🔍 [getSalt] Résultat DB:`, {
        rowCount: result.rows.length,
        hasRows: result.rows.length > 0,
        resultType: typeof result,
        requestId
      });
      
      if (result.rows.length === 0) {
        // Utilisateur inexistant - générer un sel aléatoire
        logger.debug(`🔍 [getSalt] Utilisateur inexistant - génération sel aléatoire...`, { requestId });
        
        const randomSalt = await generateSecureSalt(requestId);
        
        logger.debug(`🔍 [getSalt] Sel aléatoire généré:`, {
          saltType: typeof randomSalt,
          saltLength: randomSalt ? randomSalt.length : 0,
          requestId
        });
        
        logger.warn('🔍 [getSalt] Tentative de récupération de sel pour email inexistant:', { 
          email: emailNormalized, 
          ip: req.ip,
          requestId
        });
        
        res.json({
          salt: randomSalt,
          exists: false
        });
        return;
      }
      
      // Utilisateur trouvé - convertir le sel
      const user = result.rows[0];
      
      logger.debug(`🔍 [getSalt] Utilisateur trouvé:`, {
        userSaltType: typeof user.salt,
        userSaltValue: user.salt,
        userSaltConstructor: user.salt ? user.salt.constructor.name : 'N/A',
        userSaltIsString: typeof user.salt === 'string',
        userSaltIsBuffer: Buffer.isBuffer(user.salt),
        requestId
      });
      
      logger.debug(`🔍 [getSalt] Appel convertDatabaseSalt...`, {
        saltInput: user.salt,
        emailInput: emailNormalized,
        requestId
      });
      
      const saltBase64 = convertDatabaseSalt(user.salt, emailNormalized, requestId);
      
      logger.debug(`🔍 [getSalt] Sel converti:`, {
        saltBase64Type: typeof saltBase64,
        saltBase64Length: saltBase64 ? saltBase64.length : 0,
        requestId
      });
      
      // Mettre en cache le sel
      logger.debug(`🔍 [getSalt] Mise en cache...`, { requestId });
      cacheSalt(emailNormalized, saltBase64, requestId);
      
      logger.info(`✅ [getSalt] Sel récupéré avec succès pour ${emailNormalized}`, {
        requestId
      });

      res.json({
        salt: saltBase64,
        exists: true
      });
      
    } catch (error) {
      logger.error(`❌ [getSalt] Erreur lors de la récupération du sel:`, {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorType: typeof error,
        errorConstructor: error ? error.constructor.name : 'N/A',
        errorStack: error instanceof Error ? error.stack : 'N/A',
        requestId
      });
      
      if (error instanceof ValidationError || error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Erreur lors de la récupération du sel', 500);
    }
  }
  
  /**
   * Connexion d'un utilisateur
   */
  static async login(req: Request, res: Response): Promise<void> {
    const requestId = AuthController.normalizeRequestId(req.headers['x-request-id'], 'login');
    
    try {
      logger.info(`🔍 [login] Début traitement connexion ${requestId}`);
      logger.debug(`🔍 [login] Body reçu:`, {
        hasIdentifier: !!req.body.identifier,
        hasEmail: !!req.body.email,
        hasAuthHash: !!req.body.authHash,
        hasTwoFactorCode: !!req.body.twoFactorCode,
        requestId
      });
      
      const { identifier, email, authHash, twoFactorCode } = req.body;
      
      // Support both identifier and email for backward compatibility
      const userIdentifier = identifier || email;
      
      logger.debug(`🔍 [login] Identifiant final: ${userIdentifier}`, { requestId });
      
      if (!userIdentifier || !authHash) {
        logger.warn(`⚠️ [login] Données manquantes:`, {
          hasUserIdentifier: !!userIdentifier,
          hasAuthHash: !!authHash,
          requestId
        });
        throw new ValidationError('Email et hash d\'authentification requis');
      }
      
      // Récupérer l'utilisateur avec retry automatique
      const result = await AuthController.queryWithRetry(`
        SELECT id, email, auth_hash, totp_enabled, totp_secret, 
               failed_login_attempts, locked_until, last_login_at
        FROM users 
        WHERE email = $1
      `, [userIdentifier.toLowerCase()], 3);
      
      if (result.rows.length === 0) {
        throw new AuthError('Identifiants invalides');
      }
      
      const user = result.rows[0];
      
      // Vérifier si le compte est verrouillé
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new AuthError('Compte temporairement verrouillé');
      }
      
      // Vérifier le hash d'authentification
      // TODO: Implémenter la vérification Argon2 quand disponible
      if (user.auth_hash !== authHash) {
        // Incrémenter les tentatives échouées avec retry
        await AuthController.queryWithRetry(`
          UPDATE users 
          SET failed_login_attempts = failed_login_attempts + 1,
              locked_until = CASE 
                WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
                ELSE locked_until
              END
          WHERE id = $1
        `, [user.id], 3);
        
        // Log de tentative de connexion échouée
        await db.createAuditLog(
          user.id,
          'login_failed',
          'user',
          user.id,
          req.ip,
          req.get('User-Agent'),
          { reason: 'invalid_credentials' },
          false
        );
        
        throw new AuthError('Identifiants invalides');
      }
      
      // Vérifier TOTP si activé
      if (user.totp_enabled) {
        if (!twoFactorCode) {
          // Retourner une réponse indiquant que la 2FA est requise
          res.json({
            success: false,
            requiresTwoFactor: true,
            message: 'Code d\'authentification à deux facteurs requis'
          });
          return;
        }
        
        // Vérifier le code TOTP
        const isValidTOTP = TOTPService.verifyTOTPCode(twoFactorCode, user.totp_secret);
        if (!isValidTOTP) {
          throw new AuthError('Code d\'authentification invalide');
        }
      }
      
      // Réinitialiser les tentatives échouées avec retry
      await AuthController.queryWithRetry(`
        UPDATE users 
        SET failed_login_attempts = 0, 
            locked_until = NULL,
            last_login_at = NOW()
        WHERE id = $1
      `, [user.id], 3);
      
      // Générer les tokens JWT
      const tokens = JWTService.generateTokens({
        userId: user.id,
        email: user.email
      });
      
      // Log de connexion réussie
      await db.createAuditLog(
        user.id,
        'login',
        'user',
        user.id,
        req.ip,
        req.get('User-Agent'),
        { loginTime: new Date().toISOString() }
      );
      
      logger.info('✅ Connexion réussie:', { 
        userId: user.id, 
        email: user.email 
      });
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          twoFactorEnabled: user.totp_enabled,
          lastLoginAt: user.last_login_at,
          isActive: true
        },
        tokens
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la connexion:', error);
      throw error;
    }
  }
  
  /**
   * Déconnexion d'un utilisateur
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserId(req);
      
      // Log de déconnexion
      await db.createAuditLog(
        userId,
        'logout',
        'user',
        userId,
        req.ip,
        req.get('User-Agent')
      );
      
      logger.info('✅ Déconnexion réussie:', { userId });
      
      res.json({
        success: true,
        message: 'Déconnexion réussie'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la déconnexion:', error);
      throw error;
    }
  }
  
  /**
   * Vérification de la validité d'une session
   */
  static async verify(req: Request, res: Response): Promise<void> {
    try {
      logger.debug('🔍 AuthController.verify appelé');
      
      const userId = getUserId(req);
      logger.debug('🔍 userId récupéré:', { userId });
      
      // Récupérer les infos utilisateur pour vérification
      const result = await db.query(
        'SELECT id, email, is_active, totp_enabled FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        throw new AuthError('Utilisateur non trouvé');
      }
      
      const user = result.rows[0];
      
      if (!user.is_active) {
        throw new AuthError('Compte désactivé');
      }
      
      logger.info('✅ Session valide:', { userId });
      
      res.json({
        success: true,
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          totpEnabled: user.totp_enabled
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur AuthController.verify:', {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
  
  /**
   * Refresh token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw new ValidationError('Refresh token requis');
      }
      
      // Vérifier le refresh token
      const decoded = JWTService.verifyRefreshToken(refreshToken);
      
      // Récupérer l'utilisateur
      const result = await db.query(
        'SELECT id, email, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (result.rows.length === 0 || !result.rows[0].is_active) {
        throw new AuthError('Utilisateur non trouvé ou désactivé');
      }
      
      const user = result.rows[0];
      
      // Générer nouveaux tokens
      const tokens = JWTService.generateTokens({
        userId: user.id,
        email: user.email
      });
      
      logger.info('🔄 Token refresh réussi:', { userId: user.id });
      
      res.json({
        success: true,
        tokens
      });
      
    } catch (error) {
      logger.error('❌ Erreur refresh token:', error);
      throw error;
    }
  }

  /**
   * Configuration initiale de la 2FA
   */
  static async setup2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserId(req);
      
      // Récupérer l'utilisateur
      const result = await db.query(
        'SELECT id, email, totp_enabled FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        throw new AuthError('Utilisateur non trouvé');
      }
      
      const user = result.rows[0];
      
      if (user.totp_enabled) {
        throw new ConflictError('2FA déjà activée');
      }
      
      // Générer les données de configuration TOTP
      const setupData = await TOTPService.generateTOTPSetup(user.email);
      
      // Stocker temporairement le secret (non activé)
      await db.query(
        'UPDATE users SET totp_secret = $1 WHERE id = $2',
        [setupData.secret, userId]
      );
      
      logger.info('🔐 Setup 2FA généré:', { userId });
      
      res.json({
        success: true,
        setup: {
          qrCode: setupData.qrCodeUrl,
          manualEntryKey: setupData.manualEntryKey,
          backupCodes: setupData.backupCodes
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur setup 2FA:', error);
      throw error;
    }
  }

  /**
   * Activation de la 2FA
   */
  static async enable2FA(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserId(req);
      const { code } = req.body;
      
      if (!code || !TOTPService.isValidTOTPFormat(code)) {
        throw new ValidationError('Code TOTP valide requis');
      }
      
      // Récupérer l'utilisateur
      const result = await db.query(
        'SELECT id, totp_secret, totp_enabled FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        throw new AuthError('Utilisateur non trouvé');
      }
      
      const user = result.rows[0];
      
      if (user.totp_enabled) {
        throw new ConflictError('2FA déjà activée');
      }
      
      if (!user.totp_secret) {
        throw new ValidationError('2FA non configurée');
      }
      
      // Vérifier le code TOTP
      const isValid = TOTPService.verifyTOTPCode(code, user.totp_secret);
      if (!isValid) {
        throw new AuthError('Code TOTP invalide');
      }
      
      // Activer la 2FA
      await db.query(
        'UPDATE users SET totp_enabled = true WHERE id = $1',
        [userId]
      );
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'enable_2fa',
        'user',
        userId,
        req.ip,
        req.get('User-Agent')
      );
      
      logger.info('✅ 2FA activée:', { userId });
      
      res.json({
        success: true,
        message: '2FA activée avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur activation 2FA:', error);
      throw error;
    }
  }

  /**
   * Vérification 2FA lors de la connexion
   */
  static async verify2FALogin(req: Request, res: Response): Promise<void> {
    try {
      const { email, twoFactorCode } = req.body;
      
      if (!email || !twoFactorCode) {
        throw new ValidationError('Email et code 2FA requis');
      }
      
      if (!TOTPService.isValidTOTPFormat(twoFactorCode)) {
        throw new ValidationError('Format de code invalide');
      }
      
      // Récupérer l'utilisateur
      const result = await db.query(
        'SELECT id, email, totp_secret, totp_enabled FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        throw new AuthError('Utilisateur non trouvé');
      }
      
      const user = result.rows[0];
      
      if (!user.totp_enabled) {
        throw new ValidationError('2FA non activée pour ce compte');
      }
      
      // Vérifier le code TOTP
      const isValid = TOTPService.verifyTOTPCode(twoFactorCode, user.totp_secret);
      if (!isValid) {
        throw new AuthError('Code d\'authentification invalide');
      }
      
      // Générer les tokens JWT
      const tokens = JWTService.generateTokens({
        userId: user.id,
        email: user.email
      });
      
      // Log de connexion réussie
      await db.createAuditLog(
        user.id,
        'login_2fa',
        'user',
        user.id,
        req.ip,
        req.get('User-Agent'),
        { loginTime: new Date().toISOString() }
      );
      
      logger.info('✅ Connexion 2FA réussie:', { userId: user.id });
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          twoFactorEnabled: true,
          isActive: true
        },
        tokens
      });
      
    } catch (error) {
      logger.error('❌ Erreur vérification 2FA:', error);
      throw error;
    }
  }
}
