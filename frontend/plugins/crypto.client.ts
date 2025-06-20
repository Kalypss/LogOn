/**
 * 🔐 LogOn Password Manager - Crypto Plugin
 * 
 * Plugin Nuxt.js pour initialiser les utilitaires cryptographiques
 * et les rendre disponibles globalement dans l'application
 */

import { Buffer } from 'buffer'

export default defineNuxtPlugin((nuxtApp) => {
  // Polyfill Buffer pour les browsers
  if (typeof window !== 'undefined') {
    window.Buffer = Buffer
  }

  // Vérifier la disponibilité de Web Crypto API
  if (typeof window !== 'undefined' && !window.crypto?.subtle) {
    console.error('❌ Web Crypto API non disponible dans ce navigateur')
    throw new Error('Ce navigateur ne supporte pas les fonctionnalités cryptographiques requises')
  }

  // Initialiser les utilitaires crypto
  nuxtApp.provide('crypto', {
    isSupported: typeof window !== 'undefined' && !!window.crypto?.subtle,
    getRandomBytes: (length: number) => {
      if (typeof window !== 'undefined' && window.crypto) {
        const bytes = new Uint8Array(length)
        window.crypto.getRandomValues(bytes)
        return bytes
      }
      throw new Error('Web Crypto API non disponible')
    }
  })

  // Log de l'initialisation
  if (process.client) {
    console.log('🔐 Plugin crypto initialisé avec succès')
  }
})
