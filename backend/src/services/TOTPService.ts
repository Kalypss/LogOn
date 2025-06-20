/**
 * Service TOTP pour LogOn
 * Gestion de l'authentification à deux facteurs avec codes temporels
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { logger } from '../utils/logger';

export interface TOTPSetupData {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export class TOTPService {
  private static readonly SERVICE_NAME = 'LogOn Password Manager';
  private static readonly ISSUER = 'LogOn';
  private static readonly WINDOW = 2; // Fenêtre de tolérance pour les codes (±60 secondes)

  /**
   * Génère un nouveau secret TOTP et les données d'installation
   */
  static async generateTOTPSetup(userEmail: string): Promise<TOTPSetupData> {
    try {
      // Générer le secret
      const secret = speakeasy.generateSecret({
        name: `${this.SERVICE_NAME} (${userEmail})`,
        issuer: this.ISSUER,
        length: 32
      });

      if (!secret.otpauth_url) {
        throw new Error('Erreur lors de la génération du secret TOTP');
      }

      // Générer le QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // Générer des codes de récupération
      const backupCodes = this.generateBackupCodes();

      logger.info('🔐 Setup TOTP généré pour:', { email: userEmail });

      return {
        secret: secret.base32,
        qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes
      };
    } catch (error) {
      logger.error('❌ Erreur génération setup TOTP:', error);
      throw new Error('Erreur lors de la configuration TOTP');
    }
  }

  /**
   * Vérifie un code TOTP
   */
  static verifyTOTPCode(token: string, secret: string): boolean {
    try {
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: this.WINDOW
      });

      if (verified) {
        logger.info('✅ Code TOTP vérifié avec succès');
      } else {
        logger.warn('❌ Code TOTP invalide');
      }

      return verified;
    } catch (error) {
      logger.error('❌ Erreur vérification TOTP:', error);
      return false;
    }
  }

  /**
   * Génère le code TOTP actuel (pour les tests)
   */
  static generateTOTPCode(secret: string): string {
    try {
      return speakeasy.totp({
        secret,
        encoding: 'base32'
      });
    } catch (error) {
      logger.error('❌ Erreur génération code TOTP:', error);
      throw new Error('Erreur lors de la génération du code TOTP');
    }
  }

  /**
   * Vérifie un code de récupération
   */
  static verifyBackupCode(code: string, hashedBackupCodes: string[]): boolean {
    try {
      // TODO: Implémenter la vérification avec hash
      // Pour l'instant, comparaison directe (à sécuriser)
      const normalizedCode = code.replace(/-/g, '').toLowerCase();
      
      const isValid = hashedBackupCodes.some(hashedCode => {
        // TODO: Utiliser bcrypt ou argon2 pour comparer
        return hashedCode.replace(/-/g, '').toLowerCase() === normalizedCode;
      });

      if (isValid) {
        logger.info('✅ Code de récupération valide');
      } else {
        logger.warn('❌ Code de récupération invalide');
      }

      return isValid;
    } catch (error) {
      logger.error('❌ Erreur vérification code de récupération:', error);
      return false;
    }
  }

  /**
   * Génère des codes de récupération
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      // Générer un code de 8 caractères alphanumériques
      const code = Math.random().toString(36).substring(2, 6).toUpperCase() + 
                   Math.random().toString(36).substring(2, 6).toUpperCase();
      
      // Formater avec tiret pour la lisibilité
      const formattedCode = code.substring(0, 4) + '-' + code.substring(4);
      codes.push(formattedCode);
    }
    
    return codes;
  }

  /**
   * Valide le format d'un code TOTP
   */
  static isValidTOTPFormat(code: string): boolean {
    // Code TOTP : 6 chiffres
    return /^\d{6}$/.test(code);
  }

  /**
   * Valide le format d'un code de récupération
   */
  static isValidBackupCodeFormat(code: string): boolean {
    // Format: XXXX-XXXX (8 caractères alphanumériques avec tiret)
    return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code);
  }
}
