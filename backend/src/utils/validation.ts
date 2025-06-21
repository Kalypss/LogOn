/**
 * Utilitaires de validation pour LogOn
 * Fonctions communes de validation des données
 */

// Fix pour Buffer dans l'environnement TypeScript
declare const Buffer: any;

/**
 * Valide qu'une chaîne est un UUID valide
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valide qu'un email a un format correct
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide qu'une chaîne est une donnée Base64 valide
 */
export function isValidBase64(data: string): boolean {
  try {
    // Vérification basique du format Base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(data)) {
      return false;
    }
    
    // Tentative de décodage pour vérifier la validité
    Buffer.from(data, 'base64');
    return true;
  } catch {
    return false;
  }
}

/**
 * Valide les paramètres de pagination
 */
export function validatePagination(limit?: any, offset?: any): { limit: number; offset: number } {
  const validLimit = parseInt(limit) || 50;
  const validOffset = parseInt(offset) || 0;
  
  return {
    limit: Math.min(Math.max(validLimit, 1), 100), // Entre 1 et 100
    offset: Math.max(validOffset, 0) // Minimum 0
  };
}

/**
 * Types d'entrées autorisés
 */
export const VALID_ENTRY_TYPES = ['password', 'note', 'card', 'identity'] as const;
export type EntryType = typeof VALID_ENTRY_TYPES[number];

/**
 * Valide le type d'entrée
 */
export function isValidEntryType(type: string): type is EntryType {
  return VALID_ENTRY_TYPES.includes(type as EntryType);
}
