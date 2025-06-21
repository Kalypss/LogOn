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
  const isCryptoSupported = typeof window !== 'undefined' && 
    (window.location.protocol === 'https:' || 
     window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1')

  if (typeof window !== 'undefined' && !window.crypto?.subtle) {
    if (!isCryptoSupported) {
      console.error('❌ Web Crypto API nécessite HTTPS ou localhost')
      console.info('💡 Accédez à l\'application via HTTPS pour utiliser les fonctionnalités cryptographiques')
      
      // Utiliser createError de Nuxt pour une meilleure gestion
      throw createError({
        statusCode: 500,
        statusMessage: 'Cette application nécessite HTTPS pour fonctionner correctement. Veuillez accéder à l\'application via HTTPS ou localhost.',
        data: {
          currentProtocol: window.location.protocol,
          currentHost: window.location.hostname,
          suggestedUrl: `https://${window.location.hostname}:3000`
        }
      })
    } else {
      console.error('❌ Web Crypto API non disponible dans ce navigateur')
      throw createError({
        statusCode: 500,
        statusMessage: 'Ce navigateur ne supporte pas les fonctionnalités cryptographiques requises',
        data: {
          userAgent: navigator.userAgent,
          supportedFeatures: {
            crypto: !!window.crypto,
            subtle: !!window.crypto?.subtle
          }
        }
      })
    }
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
    console.log('🔒 Protocole:', window.location.protocol)
    console.log('🌐 Hôte:', window.location.hostname)
  }
})
