/**
 * Plugin pour intercepter les requêtes API et gérer les tokens
 * Ajoute automatiquement les headers d'authentification et gère le refresh
 */

export default defineNuxtPlugin(() => {
  // Plugin simple pour l'interception des erreurs 401
  // La gestion des tokens est maintenant dans les composables
  
  // Intercepter les erreurs globales pour les redirections
  const router = useRouter()
  
  // Handler global pour les erreurs 401
  const handle401 = () => {
    // Nettoyer les tokens stockés
    if (process.client && typeof window !== 'undefined') {
      localStorage.removeItem('logon_tokens')
    }
    
    // Rediriger vers la page de connexion
    router.push('/login')
  }

  // Exposer la fonction pour l'utiliser dans les composables
  return {
    provide: {
      handle401
    }
  }
})
