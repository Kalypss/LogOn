/**
 * Service de gestion sécurisée des sels pour LogOn
 * Gestion du cache, de la concurrence et de la robustesse
 */

import { logger } from '../utils/logger';
import { randomBuffer, toBase64, parseBuffer, fromHex, isBuffer } from '../utils/buffer';
import { AppError } from '../middleware/errorHandler';

/**
 * Interface pour un sel en cache
 */
interface CachedSalt {
  salt: string;
  timestamp: number;
  requestCount: number;
}

/**
 * Cache des sels pour éviter les requêtes multiples
 */
const saltCache = new Map<string, CachedSalt>();
const CACHE_TTL = 300000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Limite du cache
const MAX_REQUEST_COUNT = 10; // Max requêtes par email dans la TTL

/**
 * Nettoyage périodique du cache
 */
const cleanupCache = () => {
  const now = Date.now();
  const toDelete: string[] = [];
  
  for (const [email, cached] of saltCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      toDelete.push(email);
    }
  }
  
  for (const email of toDelete) {
    saltCache.delete(email);
  }
  
  // Si le cache est trop volumineux, supprimer les plus anciens
  if (saltCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(saltCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, saltCache.size - MAX_CACHE_SIZE);
    for (const [email] of toRemove) {
      saltCache.delete(email);
    }
  }
};

/**
 * Génère un sel sécurisé
 */
export const generateSecureSalt = async (requestId: string): Promise<string> => {
  try {
    logger.debug(`🔐 [SaltService] Génération sel sécurisé`, { requestId });
    
    const salt = randomBuffer(32); // 32 bytes pour un sel robuste
    const saltBase64 = toBase64(salt);
    
    logger.debug(`✅ [SaltService] Sel généré avec succès`, {
      saltLength: saltBase64.length,
      requestId
    });
    
    return saltBase64;
  } catch (error) {
    logger.error(`❌ [SaltService] Erreur génération sel:`, {
      error: error instanceof Error ? error.message : String(error),
      requestId
    });
    throw new AppError('Erreur lors de la génération du sel', 500);
  }
};

/**
 * Convertit un sel de base de données en format base64 - VERSION AVEC LOGS DETAILLES
 */
export const convertDatabaseSalt = (dbSalt: any, email: string, requestId: string): string => {
  try {
    logger.debug(`🔄 [SaltService] Conversion sel base de données`, {
      saltType: typeof dbSalt,
      saltConstructor: dbSalt?.constructor?.name || 'unknown',
      saltValue: dbSalt,
      saltString: String(dbSalt),
      isNull: dbSalt === null,
      isUndefined: dbSalt === undefined,
      isBuffer: Buffer.isBuffer(dbSalt),
      hasData: dbSalt && typeof dbSalt === 'object' && 'data' in dbSalt,
      email,
      requestId
    });
    
    // PostgreSQL bytea peut être retourné sous différentes formes
    if (dbSalt === null || dbSalt === undefined) {
      logger.error('❌ [SaltService] Sel utilisateur null ou undefined', { 
        email,
        saltValue: dbSalt,
        requestId
      });
      throw new AppError('Sel utilisateur invalide', 500);
    }
    
    let saltBase64: string;
    
    if (isBuffer(dbSalt)) {
      logger.debug(`✅ [SaltService] Sel détecté comme Buffer`, {
        bufferLength: dbSalt.length,
        requestId
      });
      saltBase64 = dbSalt.toString('base64');
    } else if (typeof dbSalt === 'string') {
      logger.debug(`🔍 [SaltService] Sel détecté comme string: ${dbSalt.substring(0, 20)}...`, {
        stringLength: dbSalt.length,
        startsWithHex: dbSalt.startsWith('\\x'),
        requestId
      });
      
      if (dbSalt.startsWith('\\x')) {
        // Format hexadécimal PostgreSQL
        logger.debug(`🔍 [SaltService] Format hexadécimal PostgreSQL détecté`, { requestId });
        const hexData = dbSalt.slice(2);
        logger.debug(`🔍 [SaltService] Données hex extraites:`, {
          hexData: hexData.substring(0, 20) + '...',
          hexLength: hexData.length,
          requestId
        });
        
        const bufferFromHex = fromHex(hexData);
        logger.debug(`🔍 [SaltService] Buffer créé depuis hex:`, {
          bufferType: typeof bufferFromHex,
          isBuffer: Buffer.isBuffer(bufferFromHex),
          bufferLength: bufferFromHex ? bufferFromHex.length : 0,
          requestId
        });
        
        saltBase64 = toBase64(bufferFromHex);
      } else {
        // Supposer que c'est déjà en base64
        logger.debug(`🔍 [SaltService] Supposé être en base64 déjà`, { requestId });
        saltBase64 = dbSalt;
      }
    } else if (dbSalt instanceof Uint8Array) {
      logger.debug(`🔍 [SaltService] Sel détecté comme Uint8Array`, {
        arrayLength: dbSalt.length,
        requestId
      });
      const parsedBuffer = parseBuffer(dbSalt);
      logger.debug(`🔍 [SaltService] Buffer parsé depuis Uint8Array:`, {
        parsedType: typeof parsedBuffer,
        isBuffer: Buffer.isBuffer(parsedBuffer),
        parsedLength: parsedBuffer ? parsedBuffer.length : 0,
        requestId
      });
      saltBase64 = toBase64(parsedBuffer);
    } else if (dbSalt && typeof dbSalt === 'object' && dbSalt.data) {
      logger.debug(`🔍 [SaltService] Objet avec propriété data détecté`, {
        dataType: typeof dbSalt.data,
        dataLength: dbSalt.data ? dbSalt.data.length : 0,
        dataConstructor: dbSalt.data?.constructor?.name || 'unknown',
        requestId
      });
      const parsedBuffer = parseBuffer(dbSalt.data);
      logger.debug(`🔍 [SaltService] Buffer parsé depuis data:`, {
        parsedType: typeof parsedBuffer,
        isBuffer: Buffer.isBuffer(parsedBuffer),
        parsedLength: parsedBuffer ? parsedBuffer.length : 0,
        requestId
      });
      saltBase64 = toBase64(parsedBuffer);
    } else {
      // Dernière tentative
      logger.warn('⚠️ [SaltService] Type de sel inattendu, tentative de conversion:', {
        saltType: typeof dbSalt,
        saltConstructor: dbSalt?.constructor?.name || 'unknown',
        saltKeys: dbSalt && typeof dbSalt === 'object' ? Object.keys(dbSalt) : [],
        requestId
      });
      
      try {
        const parsedBuffer = parseBuffer(dbSalt);
        logger.debug(`🔍 [SaltService] Buffer parsé depuis type inattendu:`, {
          parsedType: typeof parsedBuffer,
          isBuffer: Buffer.isBuffer(parsedBuffer),
          parsedLength: parsedBuffer ? parsedBuffer.length : 0,
          requestId
        });
        saltBase64 = toBase64(parsedBuffer);
      } catch (parseError) {
        logger.error('❌ [SaltService] Impossible de parser le sel:', {
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          saltType: typeof dbSalt,
          saltValue: dbSalt,
          requestId
        });
        throw new AppError('Format de sel non supporté', 500);
      }
    }
    
    // Vérifier que la conversion a donné un résultat valide
    if (!saltBase64 || saltBase64.length === 0) {
      logger.error('❌ [SaltService] Conversion du sel vide', { 
        email, 
        requestId 
      });
      throw new Error('Conversion du sel a donné un résultat vide');
    }
    
    logger.debug(`✅ [SaltService] Conversion sel terminée avec succès:`, {
      saltBase64Length: saltBase64.length,
      email,
      requestId
    });
    
    return saltBase64;
    
  } catch (error) {
    logger.error('❌ [SaltService] Erreur conversion sel:', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'N/A',
      saltType: typeof dbSalt,
      email,
      requestId
    });
    throw new AppError('Erreur lors de la conversion du sel utilisateur', 500);
  }
};

/**
 * Gère le cache des sels pour éviter les requêtes répétées
 */
export const getSaltFromCache = (email: string, requestId: string): string | null => {
  cleanupCache();
  
  const cached = saltCache.get(email.toLowerCase());
  if (!cached) {
    return null;
  }
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    saltCache.delete(email.toLowerCase());
    return null;
  }
  
  // Vérifier si cette IP fait trop de requêtes
  if (cached.requestCount >= MAX_REQUEST_COUNT) {
    logger.warn(`⚠️ [SaltService] Trop de requêtes pour email en cache`, {
      email: email.toLowerCase(),
      requestCount: cached.requestCount,
      maxCount: MAX_REQUEST_COUNT,
      requestId
    });
    return null;
  }
  
  // Incrémenter le compteur
  cached.requestCount++;
  saltCache.set(email.toLowerCase(), cached);
  
  logger.debug(`🎯 [SaltService] Sel récupéré depuis le cache`, {
    email: email.toLowerCase(),
    requestCount: cached.requestCount,
    requestId
  });
  
  return cached.salt;
};

/**
 * Met en cache un sel pour éviter les requêtes répétées
 */
export const cacheSalt = (email: string, salt: string, requestId: string): void => {
  try {
    cleanupCache();
    
    const cached: CachedSalt = {
      salt,
      timestamp: Date.now(),
      requestCount: 1
    };
    
    saltCache.set(email.toLowerCase(), cached);
    
    logger.debug(`📦 [SaltService] Sel mis en cache`, {
      email: email.toLowerCase(),
      cacheSize: saltCache.size,
      requestId
    });
  } catch (error) {
    logger.warn(`⚠️ [SaltService] Erreur mise en cache sel:`, {
      error: error instanceof Error ? error.message : String(error),
      email: email.toLowerCase(),
      requestId
    });
  }
};
