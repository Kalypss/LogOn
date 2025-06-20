/**
 * Middleware d'authentification - Vérifie si l'utilisateur est connecté
 * Architecture : Middleware global pour protéger les routes authentifiées
 */
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, checkAuth } = useAuth()
  
  // Vérifier l'état d'authentification
  checkAuth()
  
  // Rediriger vers login si non authentifié
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
