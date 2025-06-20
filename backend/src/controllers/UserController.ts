/**
 * Controller des utilisateurs pour LogOn
 * Gestion des profils utilisateur et préférences
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';

export class UserController {
  
  /**
   * Récupération du profil utilisateur actuel
   */
  static async getProfile(req: Request, res: Response) {
    try {
      // TODO: Récupérer l'utilisateur depuis le token JWT
      const userId = 'user_id_placeholder';
      
      const result = await db.query(`
        SELECT id, email, totp_enabled, key_version, last_login_at, created_at
        FROM users 
        WHERE id = $1
      `, [userId]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Utilisateur non trouvé');
      }
      
      const user = result.rows[0];
      
      logger.info('👤 Profil récupéré:', { userId });
      
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          totpEnabled: user.totp_enabled,
          keyVersion: user.key_version,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération du profil:', error);
      throw error;
    }
  }
  
  /**
   * Mise à jour du profil utilisateur
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      // TODO: Récupérer l'utilisateur depuis le token JWT
      const userId = 'user_id_placeholder';
      const { email } = req.body;
      
      if (email) {
        // Validation format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new ValidationError('Format d\'email invalide');
        }
        
        // Vérifier si l'email n'est pas déjà utilisé
        const existingUser = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email.toLowerCase(), userId]
        );
        
        if (existingUser.rows.length > 0) {
          throw new ValidationError('Cet email est déjà utilisé');
        }
        
        await db.query(
          'UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2',
          [email.toLowerCase(), userId]
        );
      }
      
      // Log de mise à jour
      await db.createAuditLog(
        userId,
        'update_profile',
        'user',
        userId,
        req.ip,
        req.get('User-Agent')
      );
      
      logger.info('✅ Profil mis à jour:', { userId });
      
      res.json({
        success: true,
        message: 'Profil mis à jour avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  }
  
  /**
   * Suppression du compte utilisateur
   */
  static async deleteAccount(req: Request, res: Response) {
    try {
      // TODO: Récupérer l'utilisateur depuis le token JWT
      const userId = 'user_id_placeholder';
      
      // Marquer le compte comme supprimé en ajoutant un timestamp
      await db.query(
        'UPDATE users SET email = CONCAT(email, \'_deleted_\', EXTRACT(EPOCH FROM NOW())), updated_at = NOW() WHERE id = $1',
        [userId]
      );
      
      // Log de suppression
      await db.createAuditLog(
        userId,
        'delete_account',
        'user',
        userId,
        req.ip,
        req.get('User-Agent')
      );
      
      logger.info('🗑️ Compte supprimé:', { userId });
      
      res.json({
        success: true,
        message: 'Compte supprimé avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la suppression du compte:', error);
      throw error;
    }
  }
  
  /**
   * Récupération des statistiques utilisateur
   */
  static async getStats(req: Request, res: Response) {
    try {
      // TODO: Récupérer l'utilisateur depuis le token JWT
      const userId = 'user_id_placeholder';
      
      const statsResult = await db.query(`
        SELECT 
          COUNT(e.id) as total_entries,
          COUNT(CASE WHEN e.type = 'password' THEN 1 END) as password_entries,
          COUNT(CASE WHEN e.type = 'note' THEN 1 END) as note_entries,
          COUNT(DISTINCT gm.group_id) as group_memberships
        FROM users u
        LEFT JOIN entries e ON e.user_id = u.id
        LEFT JOIN group_members gm ON gm.user_id = u.id AND gm.is_active = true
        WHERE u.id = $1
        GROUP BY u.id
      `, [userId]);
      
      const stats = statsResult.rows[0] || {
        total_entries: 0,
        password_entries: 0,
        note_entries: 0,
        group_memberships: 0
      };
      
      logger.info('📊 Statistiques récupérées:', { userId });
      
      res.json({
        success: true,
        stats: {
          totalEntries: parseInt(stats.total_entries),
          passwordEntries: parseInt(stats.password_entries),
          noteEntries: parseInt(stats.note_entries),
          groupMemberships: parseInt(stats.group_memberships)
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }
}
