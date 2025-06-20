/**
 * Routes d'audit pour LogOn
 * Logs et monitoring des actions sensibles
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/audit/logs
 * Récupération des logs d'audit pour l'utilisateur
 */
router.get('/logs', asyncHandler(async (req, res) => {
  try {
    // TODO: Récupérer l'utilisateur depuis le token JWT
    const userId = 'user_id_placeholder';
    const { limit = 20, offset = 0, action } = req.query;
    
    let query = `
      SELECT id, action, resource_type, resource_id, 
             ip_address, created_at, success, details
      FROM audit_logs 
      WHERE user_id = $1
    `;
    const params = [userId];
    
    if (action) {
      query += ' AND action = $' + (params.length + 1);
      params.push(action as string);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit as string));
    params.push(parseInt(offset as string));
    
    const result = await db.query(query, params);
    
    logger.info('📋 Logs d\'audit récupérés:', { 
      userId, 
      count: result.rows.length 
    });
    
    res.json({
      success: true,
      logs: result.rows.map(log => ({
        id: log.id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        ipAddress: log.ip_address,
        createdAt: log.created_at,
        success: log.success,
        details: log.details
      })),
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: result.rows.length
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur lors de la récupération des logs d\'audit:', error);
    throw error;
  }
}));

/**
 * GET /api/audit/stats
 * Statistiques d'audit pour l'utilisateur
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    // TODO: Récupérer l'utilisateur depuis le token JWT
    const userId = 'user_id_placeholder';
    
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_actions,
        COUNT(CASE WHEN action = 'login' THEN 1 END) as login_count,
        COUNT(CASE WHEN action LIKE '%_entry' THEN 1 END) as entry_actions,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_actions,
        MAX(created_at) as last_action
      FROM audit_logs 
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
    `, [userId]);
    
    const stats = result.rows[0];
    
    logger.info('📊 Statistiques d\'audit récupérées:', { userId });
    
    res.json({
      success: true,
      stats: {
        totalActions: parseInt(stats.total_actions),
        loginCount: parseInt(stats.login_count),
        entryActions: parseInt(stats.entry_actions),
        failedActions: parseInt(stats.failed_actions),
        lastAction: stats.last_action
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur lors de la récupération des statistiques d\'audit:', error);
    throw error;
  }
}));

export default router;
