/**
 * Routes groupes pour LogOn
 * Gestion des groupes et permissions avec chiffrement hybride
 */

import { Router } from 'express';
import { GroupController } from '../controllers/GroupController';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/groups
 * Récupération des groupes de l'utilisateur
 */
router.get('/', 
  authenticateToken,
  asyncHandler(GroupController.getGroups)
);

/**
 * POST /api/groups
 * Création d'un nouveau groupe
 */
router.post('/', 
  authenticateToken,
  asyncHandler(GroupController.createGroup)
);

/**
 * GET /api/groups/:id
 * Récupération des détails d'un groupe
 */
router.get('/:id', 
  authenticateToken,
  asyncHandler(GroupController.getGroup)
);

/**
 * PUT /api/groups/:id
 * Mise à jour des informations d'un groupe
 */
router.put('/:id', 
  authenticateToken,
  asyncHandler(GroupController.updateGroup)
);

/**
 * DELETE /api/groups/:id
 * Suppression d'un groupe
 */
router.delete('/:id', 
  authenticateToken,
  asyncHandler(GroupController.deleteGroup)
);

/**
 * GET /api/groups/:id/members
 * Récupération des membres d'un groupe
 */
router.get('/:id/members', 
  authenticateToken,
  asyncHandler(GroupController.getGroupMembers)
);

/**
 * POST /api/groups/:id/members
 * Invitation d'un membre au groupe
 */
router.post('/:id/members', 
  authenticateToken,
  asyncHandler(GroupController.inviteMember)
);

/**
 * PUT /api/groups/:id/members/:memberId
 * Modification du rôle d'un membre
 */
router.put('/:id/members/:memberId', 
  authenticateToken,
  asyncHandler(GroupController.updateMemberRole)
);

/**
 * DELETE /api/groups/:id/members/:memberId
 * Suppression d'un membre du groupe
 */
router.delete('/:id/members/:memberId', 
  authenticateToken,
  asyncHandler(GroupController.removeMember)
);

export default router;
