/**
 * Routes entrées pour LogOn
 * Gestion CRUD des entrées de coffre
 */

import { Router } from 'express';
import { EntryController } from '../controllers/EntryController';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(requireAuth);

/**
 * GET /api/entries
 * Récupération de toutes les entrées de l'utilisateur
 */
router.get('/', 
  asyncHandler(EntryController.getEntries)
);

/**
 * POST /api/entries
 * Création d'une nouvelle entrée
 */
router.post('/', 
  asyncHandler(EntryController.createEntry)
);

/**
 * GET /api/entries/:id
 * Récupération d'une entrée spécifique
 */
router.get('/:id', 
  asyncHandler(EntryController.getEntry)
);

/**
 * PUT /api/entries/:id
 * Mise à jour d'une entrée
 */
router.put('/:id', 
  asyncHandler(EntryController.updateEntry)
);

/**
 * DELETE /api/entries/:id
 * Suppression d'une entrée
 */
router.delete('/:id', 
  asyncHandler(EntryController.deleteEntry)
);

/**
 * GET /api/entries/groups/:groupId
 * Récupération des entrées d'un groupe
 */
router.get('/groups/:groupId', 
  asyncHandler(EntryController.getGroupEntries)
);

/**
 * POST /api/entries/groups/:groupId
 * Création d'une entrée dans un groupe
 */
router.post('/groups/:groupId', 
  asyncHandler(EntryController.createGroupEntry)
);

/**
 * PUT /api/entries/:id/permissions
 * Gestion des permissions d'une entrée
 */
router.put('/:id/permissions', 
  asyncHandler(EntryController.updateEntryPermissions)
);

export default router;
