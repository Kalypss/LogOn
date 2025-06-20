/**
 * 🔐 LogOn Password Manager - Group Crypto Service
 * 
 * Service de chiffrement hybride pour les clés de groupe
 * Utilise RSA pour le chiffrement des clés AES de groupe
 */

import { logger } from '../utils/logger';

export class GroupCryptoService {
  
  /**
   * Génération d'une clé de groupe AES-256
   * Cette clé sera utilisée pour chiffrer les entrées du groupe
   */
  static generateGroupKey(): string {
    try {
      // Génération d'une clé AES-256 (32 bytes)
      const key = new Uint8Array(32);
      
      // Utilisation de crypto.getRandomValues pour sécurité
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(key);
      } else {
        // Fallback pour Node.js
        const cryptoNode = require('crypto');
        const buffer = cryptoNode.randomBytes(32);
        key.set(buffer);
      }
      
      // Conversion en base64 pour stockage
      return Buffer.from(key).toString('base64');
      
    } catch (error) {
      logger.error('❌ Erreur lors de la génération de clé de groupe:', error);
      throw new Error('Échec de la génération de clé de groupe');
    }
  }
  
  /**
   * Génération d'une paire de clés RSA pour un utilisateur
   * Utilisée pour le chiffrement hybride des clés de groupe
   */
  static async generateUserKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    try {
      // Génération de paire de clés RSA-2048
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      
      // Export des clés
      const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      
      return {
        publicKey: Buffer.from(publicKey).toString('base64'),
        privateKey: Buffer.from(privateKey).toString('base64')
      };
      
    } catch (error) {
      logger.error('❌ Erreur lors de la génération de paire de clés:', error);
      throw new Error('Échec de la génération de paire de clés');
    }
  }
  
  /**
   * Chiffrement d'une clé de groupe avec la clé publique d'un utilisateur
   */
  static async encryptGroupKeyForUser(
    groupKey: string, 
    userPublicKey: string
  ): Promise<string> {
    try {
      // Import de la clé publique
      const publicKeyBuffer = Buffer.from(userPublicKey, 'base64');
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );
      
      // Chiffrement de la clé de groupe
      const groupKeyBuffer = Buffer.from(groupKey, 'base64');
      const encryptedKey = await crypto.subtle.encrypt(
        'RSA-OAEP',
        publicKey,
        groupKeyBuffer
      );
      
      return Buffer.from(encryptedKey).toString('base64');
      
    } catch (error) {
      logger.error('❌ Erreur lors du chiffrement de clé de groupe:', error);
      throw new Error('Échec du chiffrement de clé de groupe');
    }
  }
  
  /**
   * Déchiffrement d'une clé de groupe avec la clé privée d'un utilisateur
   */
  static async decryptGroupKeyForUser(
    encryptedGroupKey: string, 
    userPrivateKey: string
  ): Promise<string> {
    try {
      // Import de la clé privée
      const privateKeyBuffer = Buffer.from(userPrivateKey, 'base64');
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['decrypt']
      );
      
      // Déchiffrement de la clé de groupe
      const encryptedKeyBuffer = Buffer.from(encryptedGroupKey, 'base64');
      const groupKey = await crypto.subtle.decrypt(
        'RSA-OAEP',
        privateKey,
        encryptedKeyBuffer
      );
      
      return Buffer.from(groupKey).toString('base64');
      
    } catch (error) {
      logger.error('❌ Erreur lors du déchiffrement de clé de groupe:', error);
      throw new Error('Échec du déchiffrement de clé de groupe');
    }
  }
  
  /**
   * Rotation d'une clé de groupe
   * Génère une nouvelle clé et la chiffre pour tous les membres actifs
   */
  static async rotateGroupKey(
    groupId: string,
    memberPublicKeys: Array<{ userId: string; publicKey: string }>
  ): Promise<{ newGroupKey: string; encryptedKeys: Array<{ userId: string; encryptedKey: string }> }> {
    try {
      // Génération de la nouvelle clé de groupe
      const newGroupKey = this.generateGroupKey();
      
      // Chiffrement pour chaque membre
      const encryptedKeys = [];
      for (const member of memberPublicKeys) {
        const encryptedKey = await this.encryptGroupKeyForUser(
          newGroupKey,
          member.publicKey
        );
        
        encryptedKeys.push({
          userId: member.userId,
          encryptedKey
        });
      }
      
      logger.info('🔄 Clé de groupe rotée:', { 
        groupId, 
        membersCount: memberPublicKeys.length 
      });
      
      return {
        newGroupKey,
        encryptedKeys
      };
      
    } catch (error) {
      logger.error('❌ Erreur lors de la rotation de clé de groupe:', error);
      throw new Error('Échec de la rotation de clé de groupe');
    }
  }
  
  /**
   * Validation d'une clé de groupe
   * Vérifie le format et la longueur
   */
  static validateGroupKey(groupKey: string): boolean {
    try {
      const keyBuffer = Buffer.from(groupKey, 'base64');
      return keyBuffer.length === 32; // 256 bits
    } catch {
      return false;
    }
  }
  
  /**
   * Validation d'une clé publique RSA
   */
  static validatePublicKey(publicKey: string): boolean {
    try {
      const keyBuffer = Buffer.from(publicKey, 'base64');
      return keyBuffer.length > 200; // Taille minimale approximative pour RSA-2048
    } catch {
      return false;
    }
  }
  
  /**
   * Génération d'un identifiant unique pour les versions de clés
   */
  static generateKeyVersion(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }
}

export default GroupCryptoService;
