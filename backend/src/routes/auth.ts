/**
 * Routes d'authentification pour LogOn
 * Gestion de l'inscription, connexion et gestion des sessions
 */

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { asyncHandler } from '../middleware/errorHandler';
import { rateLimitConfig, saltRateLimiter } from '../middleware/security/rateLimit';
import { requireAuth } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', 
  rateLimit(rateLimitConfig.auth), 
  asyncHandler(AuthController.register)
);

/**
 * POST /api/auth/salt
 * Récupération du sel pour la dérivation de clés
 */
router.post('/salt', 
  saltRateLimiter,
  rateLimit(rateLimitConfig.salt), 
  asyncHandler(AuthController.getSalt)
);

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur existant
 */
router.post('/login', 
  rateLimit(rateLimitConfig.auth), 
  asyncHandler(AuthController.login)
);

/**
 * POST /api/auth/refresh
 * Refresh du token d'accès
 */
router.post('/refresh', 
  rateLimit(rateLimitConfig.auth), 
  asyncHandler(AuthController.refreshToken)
);

/**
 * POST /api/auth/2fa/login-verify
 * Vérification 2FA lors de la connexion
 */
router.post('/2fa/login-verify', 
  rateLimit(rateLimitConfig.auth), 
  asyncHandler(AuthController.verify2FALogin)
);

/**
 * POST /api/auth/2fa/setup
 * Configuration initiale de la 2FA
 */
router.post('/2fa/setup', 
  requireAuth,
  rateLimit(rateLimitConfig.auth), 
  asyncHandler(AuthController.setup2FA)
);

/**
 * POST /api/auth/2fa/enable
 * Activation de la 2FA
 */
router.post('/2fa/enable', 
  requireAuth,
  rateLimit(rateLimitConfig.auth), 
  asyncHandler(AuthController.enable2FA)
);

/**
 * POST /api/auth/logout
 * Déconnexion de l'utilisateur
 */
router.post('/logout', 
  asyncHandler(AuthController.logout)
);

/**
 * GET /api/auth/verify
 * Vérification de la validité d'une session
 */
router.get('/verify', 
  requireAuth,
  asyncHandler(AuthController.verify)
);

export default router;
