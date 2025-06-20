/**
 * Middleware pour les invités - Redirige vers dashboard si déjà connecté
 * Architecture : Middleware pour les pages publiques (login, register)
 */
export default defineNuxtRouteMiddleware((to) => {
  // Vérifier seulement côté client
  if (process.client && typeof window !== 'undefined') {
    const storedTokens = localStorage.getItem('logon_tokens')
    
    // Rediriger vers dashboard si des tokens existent
    if (storedTokens) {
      return navigateTo('/dashboard')
    }
  }
})
