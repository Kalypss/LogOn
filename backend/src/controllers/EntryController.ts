/**
 * Controller des entrées pour LogOn
 * Gestion des mots de passe, notes et autres données chiffrées
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { ValidationError, NotFoundError, ForbiddenError, AuthError } from '../middleware/errorHandler';
import { isValidUUID, isValidEntryType, validatePagination } from '../utils/validation';

// Fix pour Buffer dans l'environnement TypeScript
declare const Buffer: any;

export class EntryController {
  
  /**
   * Récupération de toutes les entrées de l'utilisateur
   */
  static async getEntries(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AuthError('Utilisateur non authentifié');
      }
      
      const { type, search, limit = 50, offset = 0 } = req.query;
      
      let query = `
        SELECT id, title_encrypted, type, encryption_version, 
               created_at, updated_at, last_accessed_at, access_count
        FROM entries 
        WHERE user_id = $1
      `;
      const params = [userId];
      
      // Filtrage par type si spécifié
      if (type) {
        query += ' AND type = $' + (params.length + 1);
        params.push(type as string);
      }
      
      // Tri et pagination
      query += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(parseInt(limit as string));
      params.push(parseInt(offset as string));
      
      const result = await db.query(query, params);
      
      logger.info('📋 Entrées récupérées:', { 
        userId, 
        count: result.rows.length,
        type: type || 'all'
      });
      
      res.json({
        success: true,
        entries: result.rows,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: result.rows.length
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération des entrées:', error);
      throw error;
    }
  }
  
  /**
   * Récupération d'une entrée spécifique
   */
  static async getEntry(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AuthError('Utilisateur non authentifié');
      }
      
      const { id } = req.params;
      
      // Validation de l'UUID
      if (!isValidUUID(id)) {
        throw new ValidationError('ID d\'entrée invalide');
      }
      
      const result = await db.query(`
        SELECT id, title_encrypted, data_encrypted, iv, auth_tag, 
               type, encryption_version, created_at, updated_at, 
               last_accessed_at, access_count
        FROM entries 
        WHERE id = $1 AND user_id = $2
      `, [id, userId]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Entrée non trouvée');
      }
      
      const entry = result.rows[0];
      
      // Mettre à jour les statistiques d'accès
      await db.query(`
        UPDATE entries 
        SET last_accessed_at = NOW(), access_count = access_count + 1
        WHERE id = $1
      `, [id]);
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'view_entry',
        'entry',
        id,
        req.ip,
        req.get('User-Agent')
      );
      
      logger.info('🔍 Entrée consultée:', { userId, entryId: id });
      
      res.json({
        success: true,
        entry: {
          id: entry.id,
          titleEncrypted: entry.title_encrypted,
          dataEncrypted: entry.data_encrypted,
          iv: entry.iv.toString('base64'),
          authTag: entry.auth_tag.toString('base64'),
          type: entry.type,
          encryptionVersion: entry.encryption_version,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
          lastAccessedAt: entry.last_accessed_at,
          accessCount: entry.access_count
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération de l\'entrée:', error);
      throw error;
    }
  }
  
  /**
   * Création d'une nouvelle entrée
   */
  static async createEntry(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AuthError('Utilisateur non authentifié');
      }
      
      const { titleEncrypted, dataEncrypted, iv, authTag, type = 'password' } = req.body;
      
      // Validation des données requises
      if (!titleEncrypted || !dataEncrypted || !iv || !authTag) {
        throw new ValidationError('Données chiffrées incomplètes');
      }
      
      // Validation du type
      const validTypes = ['password', 'note', 'card', 'identity'];
      if (!validTypes.includes(type)) {
        throw new ValidationError('Type d\'entrée invalide');
      }
      
      const result = await db.query(`
        INSERT INTO entries (
          user_id, title_encrypted, data_encrypted, iv, auth_tag, 
          type, encryption_version, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 1, NOW())
        RETURNING id, created_at
      `, [
        userId,
        titleEncrypted,
        dataEncrypted,
        Buffer.from(iv, 'base64'),
        Buffer.from(authTag, 'base64'),
        type
      ]);
      
      const newEntry = result.rows[0];
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'create_entry',
        'entry',
        newEntry.id,
        req.ip,
        req.get('User-Agent'),
        { type }
      );
      
      logger.info('✅ Nouvelle entrée créée:', { 
        userId, 
        entryId: newEntry.id, 
        type 
      });
      
      res.status(201).json({
        success: true,
        message: 'Entrée créée avec succès',
        entry: {
          id: newEntry.id,
          type,
          createdAt: newEntry.created_at
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la création de l\'entrée:', error);
      throw error;
    }
  }
  
  /**
   * Mise à jour d'une entrée
   */
  static async updateEntry(req: Request, res: Response) {
    try {
      // TODO: Récupérer l'utilisateur depuis le token JWT
      const userId = 'user_id_placeholder';
      const { id } = req.params;
      const { titleEncrypted, dataEncrypted, iv, authTag } = req.body;
      
      // Vérifier que l'entrée appartient à l'utilisateur
      const existingEntry = await db.query(
        'SELECT id FROM entries WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (existingEntry.rows.length === 0) {
        throw new NotFoundError('Entrée non trouvée');
      }
      
      // Validation des données si fournies
      if (titleEncrypted || dataEncrypted || iv || authTag) {
        if (!titleEncrypted || !dataEncrypted || !iv || !authTag) {
          throw new ValidationError('Toutes les données chiffrées sont requises pour la mise à jour');
        }
      }
      
      await db.query(`
        UPDATE entries 
        SET title_encrypted = COALESCE($3, title_encrypted),
            data_encrypted = COALESCE($4, data_encrypted),
            iv = COALESCE($5, iv),
            auth_tag = COALESCE($6, auth_tag),
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [
        id,
        userId,
        titleEncrypted,
        dataEncrypted,
        iv ? Buffer.from(iv, 'base64') : null,
        authTag ? Buffer.from(authTag, 'base64') : null
      ]);
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'update_entry',
        'entry',
        id,
        req.ip,
        req.get('User-Agent')
      );
      
      logger.info('✅ Entrée mise à jour:', { userId, entryId: id });
      
      res.json({
        success: true,
        message: 'Entrée mise à jour avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la mise à jour de l\'entrée:', error);
      throw error;
    }
  }
  
  /**
   * Suppression d'une entrée
   */
  static async deleteEntry(req: Request, res: Response) {
    try {
      // TODO: Récupérer l'utilisateur depuis le token JWT
      const userId = 'user_id_placeholder';
      const { id } = req.params;
      
      const result = await db.query(
        'DELETE FROM entries WHERE id = $1 AND user_id = $2 RETURNING id, type',
        [id, userId]
      );
      
      if (result.rows.length === 0) {
        throw new NotFoundError('Entrée non trouvée');
      }
      
      const deletedEntry = result.rows[0];
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'delete_entry',
        'entry',
        id,
        req.ip,
        req.get('User-Agent'),
        { type: deletedEntry.type }
      );
      
      logger.info('🗑️ Entrée supprimée:', { userId, entryId: id });
      
      res.json({
        success: true,
        message: 'Entrée supprimée avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la suppression de l\'entrée:', error);
      throw error;
    }
  }
  
  /**
   * Récupération des entrées d'un groupe
   */
  static async getGroupEntries(req: Request, res: Response) {
    try {
      // TODO: Récupérer l'utilisateur depuis le token JWT
      const userId = 'user_id_placeholder';
      const { groupId } = req.params;
      const { type, search, limit = 50, offset = 0 } = req.query;
      
      // Vérifier l'accès au groupe
      const memberCheck = await db.query(`
        SELECT role FROM group_members 
        WHERE group_id = $1 AND user_id = $2 AND is_active = true
      `, [groupId, userId]);
      
      if (memberCheck.rows.length === 0) {
        throw new ForbiddenError('Accès refusé au groupe');
      }
      
      let query = `
        SELECT e.id, e.title_encrypted, e.type, e.encryption_version, 
               e.created_at, e.updated_at, e.last_accessed_at, e.access_count,
               ep.can_view, ep.can_edit, ep.can_delete
        FROM entries e
        LEFT JOIN entry_permissions ep ON e.id = ep.entry_id AND ep.user_id = $2
        WHERE e.group_id = $1
      `;
      const params = [groupId, userId];
      
      // Filtrage par type si spécifié
      if (type) {
        query += ' AND e.type = $' + (params.length + 1);
        params.push(type as string);
      }
      
      // Filtrer les entrées selon les permissions
      query += ` AND (ep.can_view = true OR ep.can_view IS NULL)`;
      
      // Tri et pagination
      query += ' ORDER BY e.updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(parseInt(limit as string));
      params.push(parseInt(offset as string));
      
      const result = await db.query(query, params);
      
      logger.info('📋 Entrées de groupe récupérées:', { 
        userId, 
        groupId,
        count: result.rows.length,
        type: type || 'all'
      });
      
      res.json({
        success: true,
        entries: result.rows.map((entry: any) => ({
          id: entry.id,
          titleEncrypted: entry.title_encrypted,
          type: entry.type,
          encryptionVersion: entry.encryption_version,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
          lastAccessedAt: entry.last_accessed_at,
          accessCount: entry.access_count,
          permissions: {
            canView: entry.can_view !== false,
            canEdit: entry.can_edit === true,
            canDelete: entry.can_delete === true
          }
        })),
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: result.rows.length
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération des entrées du groupe:', error);
      throw error;
    }
  }
  
  /**
   * Création d'une entrée dans un groupe
   */
  static async createGroupEntry(req: Request, res: Response) {
    try {
      // TODO: Récupérer l'utilisateur depuis le token JWT
      const userId = 'user_id_placeholder';
      const { groupId } = req.params;
      const { titleEncrypted, dataEncrypted, iv, authTag, type = 'password', permissions } = req.body;
      
      // Validation des données requises
      if (!titleEncrypted || !dataEncrypted || !iv || !authTag) {
        throw new ValidationError('Données chiffrées incomplètes');
      }
      
      // Vérifier l'accès au groupe
      const memberCheck = await db.query(`
        SELECT role FROM group_members 
        WHERE group_id = $1 AND user_id = $2 AND is_active = true
      `, [groupId, userId]);
      
      if (memberCheck.rows.length === 0) {
        throw new ForbiddenError('Accès refusé au groupe');
      }
      
      // Validation du type
      const validTypes = ['password', 'note', 'card', 'identity'];
      if (!validTypes.includes(type)) {
        throw new ValidationError('Type d\'entrée invalide');
      }
      
      const result = await db.query(`
        INSERT INTO entries (
          group_id, title_encrypted, data_encrypted, iv, auth_tag, 
          type, encryption_version, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 1, NOW())
        RETURNING id, created_at
      `, [
        groupId,
        titleEncrypted,
        dataEncrypted,
        Buffer.from(iv, 'base64'),
        Buffer.from(authTag, 'base64'),
        type
      ]);
      
      const newEntry = result.rows[0];
      
      // Gérer les permissions spécifiques si fournies
      if (permissions && Array.isArray(permissions)) {
        for (const perm of permissions) {
          if (perm.userId && typeof perm.canView === 'boolean') {
            await db.query(`
              INSERT INTO entry_permissions (
                entry_id, user_id, can_view, can_edit, can_delete, granted_by
              ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
              newEntry.id,
              perm.userId,
              perm.canView,
              perm.canEdit || false,
              perm.canDelete || false,
              userId
            ]);
          }
        }
      }
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'create_group_entry',
        'entry',
        newEntry.id,
        req.ip,
        req.get('User-Agent'),
        { type, groupId }
      );
      
      logger.info('✅ Nouvelle entrée de groupe créée:', { 
        userId, 
        groupId,
        entryId: newEntry.id, 
        type 
      });
      
      res.status(201).json({
        success: true,
        message: 'Entrée de groupe créée avec succès',
        entry: {
          id: newEntry.id,
          type,
          groupId,
          createdAt: newEntry.created_at
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la création de l\'entrée de groupe:', error);
      throw error;
    }
  }
  
  /**
   * Gestion des permissions d'une entrée
   */
  static async updateEntryPermissions(req: Request, res: Response) {
    try {
      // TODO: Récupérer l'utilisateur depuis le token JWT
      const userId = 'user_id_placeholder';
      const { id } = req.params;
      const { permissions } = req.body;
      
      if (!permissions || !Array.isArray(permissions)) {
        throw new ValidationError('Permissions requises sous forme de tableau');
      }
      
      // Vérifier que l'entrée existe et appartient à un groupe
      const entryCheck = await db.query(`
        SELECT e.group_id, gm.role
        FROM entries e
        INNER JOIN group_members gm ON e.group_id = gm.group_id
        WHERE e.id = $1 AND gm.user_id = $2 AND gm.is_active = true
      `, [id, userId]);
      
      if (entryCheck.rows.length === 0) {
        throw new NotFoundError('Entrée non trouvée ou accès refusé');
      }
      
      const { role } = entryCheck.rows[0];
      
      // Seuls les admins peuvent modifier les permissions
      if (role !== 'admin') {
        throw new ForbiddenError('Seuls les administrateurs peuvent modifier les permissions');
      }
      
      // Supprimer les anciennes permissions
      await db.query(`
        DELETE FROM entry_permissions WHERE entry_id = $1
      `, [id]);
      
      // Ajouter les nouvelles permissions
      for (const perm of permissions) {
        if (perm.userId && typeof perm.canView === 'boolean') {
          await db.query(`
            INSERT INTO entry_permissions (
              entry_id, user_id, can_view, can_edit, can_delete, granted_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            id,
            perm.userId,
            perm.canView,
            perm.canEdit || false,
            perm.canDelete || false,
            userId
          ]);
        }
      }
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'update_entry_permissions',
        'entry',
        id,
        req.ip,
        req.get('User-Agent'),
        { permissionsCount: permissions.length }
      );
      
      logger.info('🔐 Permissions d\'entrée mises à jour:', { 
        userId, 
        entryId: id,
        permissionsCount: permissions.length
      });
      
      res.json({
        success: true,
        message: 'Permissions mises à jour avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la mise à jour des permissions:', error);
      throw error;
    }
  }
}
