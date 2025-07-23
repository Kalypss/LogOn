/**
 * Utilitaire Buffer pour LogOn
 * Gestion sécurisée des conversions Buffer/base64
 */

// @ts-ignore
const crypto = require('crypto');
// @ts-ignore  
const NodeBuffer = Buffer;

/**
 * Convertit une chaîne base64 en Buffer
 */
export function fromBase64(base64String: string): any {
  try {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('Base64 string invalide');
    }
    const buffer = NodeBuffer.from(base64String, 'base64');
    // Convertir en format compatible PostgreSQL
    return buffer;
  } catch (error) {
    throw new Error(`Erreur conversion base64: ${error}`);
  }
}

/**
 * Convertit une chaîne hex en Buffer
 */
export function fromHex(hexString: string): any {
  try {
    if (!hexString || typeof hexString !== 'string') {
      throw new Error('Hex string invalide');
    }
    const buffer = NodeBuffer.from(hexString, 'hex');
    return buffer;
  } catch (error) {
    throw new Error(`Erreur conversion hex: ${error}`);
  }
}

/**
 * Convertit un Buffer en chaîne base64 - SECURISE avec protection contre les erreurs de concurrence
 */
export function toBase64(buffer: any): string {
  try {
    // Vérifications strictes d'entrée
    if (!buffer) {
      throw new Error('Buffer vide ou null');
    }
    
    // Vérifier que c'est un Buffer valide avec plusieurs méthodes
    if (!NodeBuffer.isBuffer(buffer)) {
      throw new Error(`Type invalide: attendu Buffer, reçu ${typeof buffer} (constructor: ${buffer.constructor?.name || 'unknown'})`);
    }
    
    // Vérifier que le buffer a une taille raisonnable
    if (buffer.length === 0) {
      throw new Error('Buffer vide (longueur 0)');
    }
    
    if (buffer.length > 10240) { // 10KB max pour éviter les problèmes de mémoire
      throw new Error(`Buffer trop volumineux: ${buffer.length} bytes (max 10KB)`);
    }
    
    // Vérifications de méthodes avant utilisation
    if (typeof buffer.toString !== 'function') {
      throw new Error('Buffer ne possède pas de méthode toString');
    }
    
    // Protection contre les erreurs de concurrence lors de la conversion
    let result: string;
    let retryCount = 0;
    const maxRetries = 3;
    
    do {
      try {
        result = buffer.toString('base64');
        
        // Vérifications strictes du résultat
        if (!result) {
          throw new Error('Conversion base64 a retourné une valeur vide');
        }
        
        if (typeof result !== 'string') {
          throw new Error(`Conversion base64 a retourné un type inattendu: ${typeof result}`);
        }
        
        // Vérifier que le résultat est du base64 valide
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(result)) {
          throw new Error('Résultat de conversion base64 invalide');
        }
        
        return result;
        
      } catch (innerError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw innerError;
        }
        // Attente courte avant retry
        const startTime = Date.now();
        while (Date.now() - startTime < (5 * retryCount)) {
          // Busy wait très court
        }
      }
    } while (retryCount < maxRetries);
    
    throw new Error('Échec de conversion après tous les retries');
    
  } catch (error) {
    throw new Error(`Erreur conversion vers base64: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Vérifie si une valeur est un Buffer
 */
export function isBuffer(value: any): boolean {
  try {
    return NodeBuffer.isBuffer(value);
  } catch (error) {
    return false;
  }
}

/**
 * Génère un Buffer aléatoire - SECURISE avec protection contre les erreurs de concurrence
 */
export function randomBuffer(length: number): any {
  try {
    // Validation stricte des paramètres d'entrée
    if (!length || typeof length !== 'number' || length <= 0 || length > 1024) {
      throw new Error(`Longueur invalide: ${length} (doit être un nombre positif <= 1024)`);
    }
    
    // Protection contre les erreurs de concurrence Node.js
    let buffer: any;
    let retryCount = 0;
    const maxRetries = 3;
    
    do {
      try {
        // Utiliser crypto.randomBytes pour la sécurité
        buffer = crypto.randomBytes(length);
        
        // Vérifications multiples pour éviter les erreurs de concurrence
        if (!buffer) {
          throw new Error('Buffer null retourné par crypto.randomBytes');
        }
        
        if (!NodeBuffer.isBuffer(buffer)) {
          throw new Error(`Type inattendu retourné: ${typeof buffer} (attendu Buffer)`);
        }
        
        if (buffer.length !== length) {
          throw new Error(`Longueur incorrecte: ${buffer.length} (attendu ${length})`);
        }
        
        // Test de la méthode toString pour éviter les erreurs à l'utilisation
        if (typeof buffer.toString !== 'function') {
          throw new Error('Buffer sans méthode toString');
        }
        
        // Test de conversion pour détecter les problèmes potentiels
        const testBase64 = buffer.toString('base64');
        if (!testBase64 || typeof testBase64 !== 'string') {
          throw new Error('Test de conversion base64 échoué');
        }
        
        return buffer;
        
      } catch (innerError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw innerError;
        }
        // Attente courte synchrone avant retry pour éviter les problèmes de timing
        const startTime = Date.now();
        while (Date.now() - startTime < (10 * retryCount)) {
          // Busy wait très court
        }
      }
    } while (retryCount < maxRetries);
    
    throw new Error('Échec après tous les retries');
    
  } catch (error) {
    const errorMsg = `Erreur génération buffer aléatoire (length=${length}): ${error instanceof Error ? error.message : String(error)}`;
    // Log l'erreur sans utiliser console ou process pour éviter les problèmes de types
    throw new Error(errorMsg);
  }
}

/**
 * Convertit diverses données en Buffer
 */
export function parseBuffer(data: any): any {
  try {
    // Si c'est déjà un Buffer
    if (isBuffer(data)) {
      return data;
    }
    
    // Si c'est un objet avec propriété data (Postgres bytea)
    if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
      return NodeBuffer.from(data.data);
    }
    
    // Si c'est une string, essayer de la convertir
    if (typeof data === 'string') {
      return NodeBuffer.from(data, 'utf8');
    }
    
    throw new Error(`Type de données non supporté: ${typeof data}`);
  } catch (error) {
    throw new Error(`Erreur parsing buffer: ${error}`);
  }
}
