/**
 * Controller d'authentification pour LogOn
 * Gestion sécurisée de l'inscription, connexion et sessions
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { ValidationError, AuthError, ConflictError } from '../middleware/errorHandler';
import { JWTService } from '../services/JWTService';
import { TOTPService } from '../services/TOTPService';
import { getUserId } from '../middleware/auth';

export class AuthController {
  
  /**
   * Inscription d'un nouvel utilisateur
   */
  static async register(req: Request, res: Response) {
    try {
      const { email, username, authHash, salt, recoveryCodeHash, recoveryCodeSalt } = req.body;
      
      // Validation des données requises
      if (!email || !authHash || !salt || !recoveryCodeHash || !recoveryCodeSalt) {
        throw new ValidationError('Données d\'inscription incomplètes');
      }
      
      // Validation format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Format d\'email invalide');
      }
      
      // Validation username (optionnel)
      if (username && (username.length < 3 || username.length > 50)) {
        throw new ValidationError('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères');
      }
      
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (existingUser.rows.length > 0) {
        throw new ConflictError('Un compte avec cet email existe déjà');
      }
      
      // Créer le nouvel utilisateur
      const result = await db.query(`
        INSERT INTO users (
          email, username, auth_hash, salt, recovery_code_hash, recovery_code_salt,
          key_version, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 1, NOW())
        RETURNING id, email, username, created_at
      `, [
        email.toLowerCase(),
        username || null,
        authHash,
        Buffer.from(salt, 'base64'),
        recoveryCodeHash,
        Buffer.from(recoveryCodeSalt, 'base64')
      ]);
      
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
      
      logger.info('✅ Nouvel utilisateur inscrit:', { 
        userId: newUser.id, 
        email: email.toLowerCase() 
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
      logger.error('❌ Erreur lors de l\'inscription:', error);
      throw error;
    }
  }
  
  /**
   * Récupération du sel pour un utilisateur
   */
  static async getSalt(req: Request, res: Response) {
    try {
      const { email } = req.body;
      
      if (!email) {
        throw new ValidationError('Email requis');
      }
      
      // Rechercher l'utilisateur
      const result = await db.query(
        'SELECT salt FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        // Retourner un sel aléatoire pour éviter l'énumération des utilisateurs
        const randomSalt = Buffer.from(Array.from({ length: 32 }, () => 
          Math.floor(Math.random() * 256))).toString('base64');
        
        logger.warn('🔍 Tentative de récupération de sel pour email inexistant:', { 
          email: email.toLowerCase(), 
          ip: req.ip 
        });
        
        res.json({
          salt: randomSalt,
          exists: false
        });
        return;
      }
      
      const user = result.rows[0];
      
      logger.info('🔑 Sel récupéré pour utilisateur:', { 
        email: email.toLowerCase() 
      });
      
      res.json({
        salt: user.salt.toString('base64'),
        exists: true
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération du sel:', error);
      throw error;
    }
  }
  
  /**
   * Connexion d'un utilisateur
   */
  static async login(req: Request, res: Response) {
    try {
      const { identifier, authHash, twoFactorCode } = req.body;
      
      if (!identifier || !authHash) {
        throw new ValidationError('Email et hash d\'authentification requis');
      }
      
      // Récupérer l'utilisateur
      const result = await db.query(`
        SELECT id, email, auth_hash, totp_enabled, totp_secret, 
               failed_login_attempts, locked_until, last_login_at
        FROM users 
        WHERE email = $1
      `, [identifier.toLowerCase()]);
      
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
        // Incrémenter les tentatives échouées
        await db.query(`
          UPDATE users 
          SET failed_login_attempts = failed_login_attempts + 1,
              locked_until = CASE 
                WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
                ELSE locked_until
              END
          WHERE id = $1
        `, [user.id]);
        
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
          return res.json({
            success: false,
            requiresTwoFactor: true,
            message: 'Code d\'authentification à deux facteurs requis'
          });
        }
        
        // Vérifier le code TOTP
        const isValidTOTP = TOTPService.verifyTOTPCode(twoFactorCode, user.totp_secret);
        if (!isValidTOTP) {
          throw new AuthError('Code d\'authentification invalide');
        }
      }
      
      // Réinitialiser les tentatives échouées
      await db.query(`
        UPDATE users 
        SET failed_login_attempts = 0, 
            locked_until = NULL,
            last_login_at = NOW()
        WHERE id = $1
      `, [user.id]);
      
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
  static async logout(req: Request, res: Response) {
    try {
      // TODO: Récupérer l'utilisateur depuis le token JWT
      const userId = 'user_id_placeholder';
      
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
  static async verify(req: Request, res: Response) {
    try {
      // TODO: Vérifier le token JWT
      logger.info('🔍 Vérification de session à implémenter');
      
      res.json({
        success: true,
        valid: false,
        message: 'Vérification de session à implémenter'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la vérification:', error);
      throw error;
    }
  }
  
  /**
   * Refresh token
   */
  static async refreshToken(req: Request, res: Response) {
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
  static async setup2FA(req: Request, res: Response) {
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
  static async enable2FA(req: Request, res: Response) {
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
  static async verify2FALogin(req: Request, res: Response) {
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
