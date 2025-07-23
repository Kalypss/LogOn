/**
 * Service de sérialisation pour les opérations JWT critiques
 * Évite les race conditions lors de requêtes simultanées
 */

import { logger } from '../utils/logger';

class JWTSerializer {
  private static pendingOperations = new Map<string, Promise<any>>();
  private static operationQueue: Array<() => Promise<any>> = [];
  private static isProcessing = false;

  /**
   * Sérialise une opération JWT pour éviter les race conditions
   */
  static async serialize<T>(operationKey: string, operation: () => Promise<T>): Promise<T> {
    // Si l'opération est déjà en cours, attendre son résultat
    if (this.pendingOperations.has(operationKey)) {
      logger.debug('🔄 Opération JWT en attente:', { operationKey });
      return this.pendingOperations.get(operationKey);
    }

    // Créer et enregistrer la promise
    const promise = this.executeOperation(operation);
    this.pendingOperations.set(operationKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  /**
   * Exécute l'opération de manière sérialisée
   */
  private static async executeOperation<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Traite la queue de manière séquentielle
   */
  private static async processQueue() {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          logger.error('❌ Erreur dans queue JWT:', error);
        }
      }
    }

    this.isProcessing = false;
  }
}

export { JWTSerializer };
