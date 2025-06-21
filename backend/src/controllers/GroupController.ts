/**
 * 🔐 LogOn Password Manager - GroupController
 * 
 * Controller pour la gestion des groupes et du partage sécurisé
 * Architecture zero-knowledge avec chiffrement hybride
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { getUserId } from '../middleware/auth';

export class GroupController {
  
  /**
   * Récupération des groupes de l'utilisateur
   */
  static async getGroups(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      
      const result = await db.query(`
        SELECT 
          g.id, g.name, g.encrypted_description, g.created_by, 
          g.created_at, g.updated_at,
          gm.role, gm.encrypted_group_key, gm.joined_at,
          COUNT(DISTINCT e.id) as entries_count,
          COUNT(DISTINCT m.user_id) FILTER (WHERE m.is_active = true) as members_count
        FROM groups g
        INNER JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN entries e ON g.id = e.group_id
        LEFT JOIN group_members m ON g.id = m.group_id
        WHERE gm.user_id = $1 AND gm.is_active = true AND g.is_active = true
        GROUP BY g.id, g.name, g.encrypted_description, g.created_by, 
                 g.created_at, g.updated_at, gm.role, gm.encrypted_group_key, gm.joined_at
        ORDER BY g.updated_at DESC
      `, [userId]);
      
      logger.info('📋 Groupes récupérés:', { 
        userId, 
        count: result.rows.length 
      });
      
      res.json({
        success: true,
        groups: result.rows.map(group => ({
          id: group.id,
          name: group.name,
          encryptedDescription: group.encrypted_description,
          createdBy: group.created_by,
          role: group.role,
          encryptedGroupKey: group.encrypted_group_key,
          joinedAt: group.joined_at,
          createdAt: group.created_at,
          updatedAt: group.updated_at,
          entriesCount: parseInt(group.entries_count),
          membersCount: parseInt(group.members_count)
        }))
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération des groupes:', error);
      throw error;
    }
  }
  
  /**
   * Création d'un nouveau groupe
   */
  static async createGroup(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { name, encryptedDescription, encryptedGroupKey } = req.body;
      
      // Validation des données requises
      if (!name || !encryptedGroupKey) {
        throw new ValidationError('Nom du groupe et clé chiffrée requis');
      }
      
      // Validation du nom (longueur, caractères autorisés)
      if (name.length < 1 || name.length > 100) {
        throw new ValidationError('Le nom du groupe doit contenir entre 1 et 100 caractères');
      }
      
      // Créer le groupe
      const groupResult = await db.query(`
        INSERT INTO groups (name, encrypted_description, created_by, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, name, created_at
      `, [name, encryptedDescription || null, userId]);
      
      const newGroup = groupResult.rows[0];
      
      // Ajouter le créateur comme admin
      await db.query(`
        INSERT INTO group_members (
          group_id, user_id, role, encrypted_group_key, joined_at
        ) VALUES ($1, $2, 'admin', $3, NOW())
      `, [newGroup.id, userId, encryptedGroupKey]);
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'create_group',
        'group',
        newGroup.id,
        req.ip,
        req.get('User-Agent'),
        { name: newGroup.name }
      );
      
      logger.info('✅ Nouveau groupe créé:', { 
        userId, 
        groupId: newGroup.id, 
        name: newGroup.name 
      });
      
      res.status(201).json({
        success: true,
        message: 'Groupe créé avec succès',
        group: {
          id: newGroup.id,
          name: newGroup.name,
          role: 'admin',
          createdAt: newGroup.created_at,
          membersCount: 1,
          entriesCount: 0
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la création du groupe:', error);
      throw error;
    }
  }
  
  /**
   * Récupération des détails d'un groupe
   */
  static async getGroup(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Vérifier l'accès au groupe
      const memberResult = await db.query(`
        SELECT gm.role, gm.encrypted_group_key, gm.joined_at,
               g.id, g.name, g.encrypted_description, g.created_by, 
               g.created_at, g.updated_at
        FROM groups g
        INNER JOIN group_members gm ON g.id = gm.group_id
        WHERE g.id = $1 AND gm.user_id = $2 AND gm.is_active = true AND g.is_active = true
      `, [id, userId]);
      
      if (memberResult.rows.length === 0) {
        throw new NotFoundError('Groupe non trouvé ou accès refusé');
      }
      
      const groupData = memberResult.rows[0];
      
      // Récupérer les statistiques du groupe
      const statsResult = await db.query(`
        SELECT 
          COUNT(DISTINCT gm.user_id) FILTER (WHERE gm.is_active = true) as members_count,
          COUNT(DISTINCT e.id) as entries_count,
          MAX(e.updated_at) as last_entry_update
        FROM groups g
        LEFT JOIN group_members gm ON g.id = gm.group_id
        LEFT JOIN entries e ON g.id = e.group_id
        WHERE g.id = $1
      `, [id]);
      
      const stats = statsResult.rows[0];
      
      logger.info('🔍 Groupe consulté:', { userId, groupId: id });
      
      res.json({
        success: true,
        group: {
          id: groupData.id,
          name: groupData.name,
          encryptedDescription: groupData.encrypted_description,
          createdBy: groupData.created_by,
          role: groupData.role,
          encryptedGroupKey: groupData.encrypted_group_key,
          joinedAt: groupData.joined_at,
          createdAt: groupData.created_at,
          updatedAt: groupData.updated_at,
          membersCount: parseInt(stats.members_count),
          entriesCount: parseInt(stats.entries_count),
          lastEntryUpdate: stats.last_entry_update
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération du groupe:', error);
      throw error;
    }
  }
  
  /**
   * Récupération des membres d'un groupe
   */
  static async getGroupMembers(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Vérifier l'accès au groupe
      const accessCheck = await db.query(`
        SELECT role FROM group_members 
        WHERE group_id = $1 AND user_id = $2 AND is_active = true
      `, [id, userId]);
      
      if (accessCheck.rows.length === 0) {
        throw new ForbiddenError('Accès refusé au groupe');
      }
      
      // Récupérer les membres du groupe
      const membersResult = await db.query(`
        SELECT 
          u.id, u.email, gm.role, gm.joined_at, gm.last_access_at
        FROM group_members gm
        INNER JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = $1 AND gm.is_active = true
        ORDER BY 
          CASE WHEN gm.role = 'admin' THEN 0 ELSE 1 END,
          gm.joined_at ASC
      `, [id]);
      
      logger.info('👥 Membres du groupe récupérés:', { 
        userId, 
        groupId: id, 
        count: membersResult.rows.length 
      });
      
      res.json({
        success: true,
        members: membersResult.rows.map(member => ({
          id: member.id,
          email: member.email,
          role: member.role,
          joinedAt: member.joined_at,
          lastAccessAt: member.last_access_at
        }))
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération des membres:', error);
      throw error;
    }
  }
  
  /**
   * Invitation d'un membre au groupe
   */
  static async inviteMember(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { email, encryptedGroupKey } = req.body;
      
      if (!email || !encryptedGroupKey) {
        throw new ValidationError('Email et clé de groupe chiffrée requis');
      }
      
      // Vérifier que l'utilisateur est admin du groupe
      const adminCheck = await db.query(`
        SELECT id FROM group_members 
        WHERE group_id = $1 AND user_id = $2 AND role = 'admin' AND is_active = true
      `, [id, userId]);
      
      if (adminCheck.rows.length === 0) {
        throw new ForbiddenError('Seuls les administrateurs peuvent inviter des membres');
      }
      
      // Trouver l'utilisateur par email
      const userResult = await db.query(`
        SELECT id FROM users WHERE email = $1
      `, [email.toLowerCase()]);
      
      if (userResult.rows.length === 0) {
        throw new NotFoundError('Utilisateur non trouvé');
      }
      
      const invitedUserId = userResult.rows[0].id;
      
      // Vérifier si l'utilisateur n'est pas déjà membre
      const existingMember = await db.query(`
        SELECT id FROM group_members 
        WHERE group_id = $1 AND user_id = $2
      `, [id, invitedUserId]);
      
      if (existingMember.rows.length > 0) {
        throw new ValidationError('Cet utilisateur est déjà membre du groupe');
      }
      
      // Ajouter le nouveau membre
      await db.query(`
        INSERT INTO group_members (
          group_id, user_id, role, encrypted_group_key, joined_at
        ) VALUES ($1, $2, 'member', $3, NOW())
      `, [id, invitedUserId, encryptedGroupKey]);
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'invite_member',
        'group',
        id,
        req.ip,
        req.get('User-Agent'),
        { invitedUserId, email: email.toLowerCase() }
      );
      
      logger.info('👤 Membre invité au groupe:', { 
        userId, 
        groupId: id, 
        invitedUserId,
        email: email.toLowerCase() 
      });
      
      res.json({
        success: true,
        message: 'Membre invité avec succès',
        member: {
          id: invitedUserId,
          email: email.toLowerCase(),
          role: 'member',
          joinedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de l\'invitation du membre:', error);
      throw error;
    }
  }
  
  /**
   * Modification du rôle d'un membre
   */
  static async updateMemberRole(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id, memberId } = req.params;
      const { role } = req.body;
      
      if (!role || !['admin', 'member'].includes(role)) {
        throw new ValidationError('Rôle invalide (admin ou member requis)');
      }
      
      // Vérifier que l'utilisateur est admin du groupe
      const adminCheck = await db.query(`
        SELECT id FROM group_members 
        WHERE group_id = $1 AND user_id = $2 AND role = 'admin' AND is_active = true
      `, [id, userId]);
      
      if (adminCheck.rows.length === 0) {
        throw new ForbiddenError('Seuls les administrateurs peuvent modifier les rôles');
      }
      
      // Vérifier que le membre existe
      const memberCheck = await db.query(`
        SELECT role FROM group_members 
        WHERE group_id = $1 AND user_id = $2 AND is_active = true
      `, [id, memberId]);
      
      if (memberCheck.rows.length === 0) {
        throw new NotFoundError('Membre non trouvé dans ce groupe');
      }
      
      // Empêcher de se retirer les droits admin si c'est le seul admin
      if (memberCheck.rows[0].role === 'admin' && role === 'member') {
        const adminCount = await db.query(`
          SELECT COUNT(*) as count FROM group_members 
          WHERE group_id = $1 AND role = 'admin' AND is_active = true
        `, [id]);
        
        if (parseInt(adminCount.rows[0].count) <= 1) {
          throw new ValidationError('Impossible de retirer les droits admin au dernier administrateur');
        }
      }
      
      // Mettre à jour le rôle
      await db.query(`
        UPDATE group_members 
        SET role = $1 
        WHERE group_id = $2 AND user_id = $3
      `, [role, id, memberId]);
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'update_member_role',
        'group',
        id,
        req.ip,
        req.get('User-Agent'),
        { memberId, newRole: role, oldRole: memberCheck.rows[0].role }
      );
      
      logger.info('🔄 Rôle de membre mis à jour:', { 
        userId, 
        groupId: id, 
        memberId, 
        newRole: role 
      });
      
      res.json({
        success: true,
        message: 'Rôle mis à jour avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la mise à jour du rôle:', error);
      throw error;
    }
  }
  
  /**
   * Suppression d'un membre du groupe
   */
  static async removeMember(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id, memberId } = req.params;
      
      // Vérifier que l'utilisateur est admin du groupe OU se retire lui-même
      const memberCheck = await db.query(`
        SELECT role FROM group_members 
        WHERE group_id = $1 AND user_id = $2 AND is_active = true
      `, [id, userId]);
      
      if (memberCheck.rows.length === 0) {
        throw new ForbiddenError('Accès refusé au groupe');
      }
      
      const isAdmin = memberCheck.rows[0].role === 'admin';
      const isSelfRemoval = userId === memberId;
      
      if (!isAdmin && !isSelfRemoval) {
        throw new ForbiddenError('Seuls les administrateurs peuvent retirer des membres');
      }
      
      // Vérifier que le membre à retirer existe
      const targetMemberCheck = await db.query(`
        SELECT role FROM group_members 
        WHERE group_id = $1 AND user_id = $2 AND is_active = true
      `, [id, memberId]);
      
      if (targetMemberCheck.rows.length === 0) {
        throw new NotFoundError('Membre non trouvé dans ce groupe');
      }
      
      // Empêcher de retirer le dernier admin
      if (targetMemberCheck.rows[0].role === 'admin') {
        const adminCount = await db.query(`
          SELECT COUNT(*) as count FROM group_members 
          WHERE group_id = $1 AND role = 'admin' AND is_active = true
        `, [id]);
        
        if (parseInt(adminCount.rows[0].count) <= 1) {
          throw new ValidationError('Impossible de retirer le dernier administrateur du groupe');
        }
      }
      
      // Marquer le membre comme inactif au lieu de le supprimer
      await db.query(`
        UPDATE group_members 
        SET is_active = false 
        WHERE group_id = $1 AND user_id = $2
      `, [id, memberId]);
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'remove_member',
        'group',
        id,
        req.ip,
        req.get('User-Agent'),
        { memberId, isSelfRemoval }
      );
      
      logger.info('👤 Membre retiré du groupe:', { 
        userId, 
        groupId: id, 
        memberId, 
        isSelfRemoval 
      });
      
      res.json({
        success: true,
        message: isSelfRemoval ? 'Vous avez quitté le groupe' : 'Membre retiré avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la suppression du membre:', error);
      throw error;
    }
  }
  
  /**
   * Mise à jour d'un groupe
   */
  static async updateGroup(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { name, encryptedDescription } = req.body;
      
      // Vérifier que l'utilisateur est admin du groupe
      const adminCheck = await db.query(`
        SELECT id FROM group_members 
        WHERE group_id = $1 AND user_id = $2 AND role = 'admin' AND is_active = true
      `, [id, userId]);
      
      if (adminCheck.rows.length === 0) {
        throw new ForbiddenError('Seuls les administrateurs peuvent modifier le groupe');
      }
      
      // Validation du nom si fourni
      if (name && (name.length < 1 || name.length > 100)) {
        throw new ValidationError('Le nom du groupe doit contenir entre 1 et 100 caractères');
      }
      
      // Construire la requête de mise à jour
      let query = 'UPDATE groups SET updated_at = NOW()';
      const params = [];
      let paramIndex = 1;
      
      if (name) {
        query += `, name = $${paramIndex}`;
        params.push(name);
        paramIndex++;
      }
      
      if (encryptedDescription !== undefined) {
        query += `, encrypted_description = $${paramIndex}`;
        params.push(encryptedDescription || null);
        paramIndex++;
      }
      
      query += ` WHERE id = $${paramIndex}`;
      params.push(id);
      
      await db.query(query, params);
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'update_group',
        'group',
        id,
        req.ip,
        req.get('User-Agent'),
        { changes: { name, encryptedDescription: !!encryptedDescription } }
      );
      
      logger.info('✅ Groupe mis à jour:', { userId, groupId: id });
      
      res.json({
        success: true,
        message: 'Groupe mis à jour avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la mise à jour du groupe:', error);
      throw error;
    }
  }
  
  /**
   * Suppression d'un groupe
   */
  static async deleteGroup(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Vérifier que l'utilisateur est admin du groupe
      const adminCheck = await db.query(`
        SELECT id FROM group_members 
        WHERE group_id = $1 AND user_id = $2 AND role = 'admin' AND is_active = true
      `, [id, userId]);
      
      if (adminCheck.rows.length === 0) {
        throw new ForbiddenError('Seuls les administrateurs peuvent supprimer le groupe');
      }
      
      // Vérifier s'il y a des entrées dans le groupe
      const entriesCount = await db.query(`
        SELECT COUNT(*) as count FROM entries WHERE group_id = $1
      `, [id]);
      
      if (parseInt(entriesCount.rows[0].count) > 0) {
        throw new ValidationError('Impossible de supprimer un groupe contenant des entrées');
      }
      
      // Marquer le groupe comme inactif au lieu de le supprimer
      await db.query(`
        UPDATE groups SET is_active = false WHERE id = $1
      `, [id]);
      
      // Marquer tous les membres comme inactifs
      await db.query(`
        UPDATE group_members SET is_active = false WHERE group_id = $1
      `, [id]);
      
      // Log d'audit
      await db.createAuditLog(
        userId,
        'delete_group',
        'group',
        id,
        req.ip,
        req.get('User-Agent')
      );
      
      logger.info('🗑️ Groupe supprimé:', { userId, groupId: id });
      
      res.json({
        success: true,
        message: 'Groupe supprimé avec succès'
      });
      
    } catch (error) {
      logger.error('❌ Erreur lors de la suppression du groupe:', error);
      throw error;
    }
  }
}
