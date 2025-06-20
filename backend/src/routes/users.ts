/**
 * Routes utilisateurs pour LogOn
 * Gestion CRUD des utilisateurs
 */

import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/users/me
 * Récupération du profil utilisateur actuel
 */
router.get('/me', 
  asyncHandler(UserController.getProfile)
);

/**
 * PUT /api/users/me
 * Mise à jour du profil utilisateur
 */
router.put('/me', 
  asyncHandler(UserController.updateProfile)
);

/**
 * DELETE /api/users/me
 * Suppression du compte utilisateur
 */
router.delete('/me', 
  asyncHandler(UserController.deleteAccount)
);

/**
 * GET /api/users/stats
 * Récupération des statistiques utilisateur
 */
router.get('/stats', 
  asyncHandler(UserController.getStats)
);

export default router;
