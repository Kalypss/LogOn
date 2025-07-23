/**
 * 🔐 LogOn Password Manager - Group Crypto Service
 * 
 * Service de chiffrement hybride pour les clés de groupe
 * Utilise RSA pour le chiffrement des clés AES de groupe
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

export class GroupCryptoService {
  
  /**
   * Génération d'une clé de groupe AES-256
   * Cette clé sera utilisée pour chiffrer les entrées du groupe
   */
  static generateGroupKey(): string {
    try {
      // Génération d'une clé AES-256 (32 bytes) avec Node.js crypto
      const key = crypto.randomBytes(32);
      
      logger.debug('🔑 Clé de groupe générée avec succès');
      
      // Conversion en base64 pour stockage
      return key.toString('base64');
      
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
      // Génération de paire de clés RSA-2048 avec Node.js crypto
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'der'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'der'
        }
      });
      
      logger.debug('🔑 Paire de clés RSA générée avec succès');
      
      return {
        publicKey: publicKey.toString('base64'),
        privateKey: privateKey.toString('base64')
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
      // Conversion de la clé publique depuis base64
      const publicKeyBuffer = Buffer.from(userPublicKey, 'base64');
      const groupKeyBuffer = Buffer.from(groupKey, 'base64');
      
      // Chiffrement RSA avec Node.js crypto
      const encryptedKey = crypto.publicEncrypt(
        {
          key: publicKeyBuffer,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        groupKeyBuffer
      );
      
      logger.debug('🔒 Clé de groupe chiffrée avec succès pour utilisateur');
      
      return encryptedKey.toString('base64');
      
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
      // Conversion des clés depuis base64
      const privateKeyBuffer = Buffer.from(userPrivateKey, 'base64');
      const encryptedKeyBuffer = Buffer.from(encryptedGroupKey, 'base64');
      
      // Déchiffrement RSA avec Node.js crypto
      const groupKey = crypto.privateDecrypt(
        {
          key: privateKeyBuffer,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        encryptedKeyBuffer
      );
      
      logger.debug('🔓 Clé de groupe déchiffrée avec succès pour utilisateur');
      
      return groupKey.toString('base64');
      
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
