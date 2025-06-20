/**
 * 🔐 LogOn Password Manager - Modèle de layout principal
 * 
 * Layout de base avec navigation et thème sombre sécurisé
 */
<template>
  <div class="min-h-screen bg-gray-950 text-gray-100">
    <!-- Navigation principale -->
    <nav class="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo et titre -->
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Icon name="lucide:shield-check" class="h-5 w-5 text-white" />
              </div>
              <h1 class="text-xl font-bold text-white">LogOn</h1>
            </div>
          </div>

          <!-- Menu navigation -->
          <div class="hidden md:block" v-if="isAuthenticated">
            <div class="ml-10 flex items-baseline space-x-4">
              <NuxtLink to="/dashboard" 
                class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                :class="{ 'bg-gray-800 text-white': $route.path === '/dashboard', 'text-gray-300 hover:text-white': $route.path !== '/dashboard' }">
                <Icon name="lucide:layout-dashboard" class="inline h-4 w-4 mr-2" />
                Tableau de bord
              </NuxtLink>
              <NuxtLink to="/passwords" 
                class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                :class="{ 'bg-gray-800 text-white': $route.path === '/passwords', 'text-gray-300 hover:text-white': $route.path !== '/passwords' }">
                <Icon name="lucide:key" class="inline h-4 w-4 mr-2" />
                Mots de passe
              </NuxtLink>
              <NuxtLink to="/groups" 
                class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
                :class="{ 'bg-gray-800 text-white': $route.path === '/groups', 'text-gray-300 hover:text-white': $route.path !== '/groups' }">
                <Icon name="lucide:users" class="inline h-4 w-4 mr-2" />
                Groupes
              </NuxtLink>
            </div>
          </div>

          <!-- Menu utilisateur -->
          <div class="flex items-center space-x-4" v-if="isAuthenticated">
            <Button variant="ghost" size="sm" @click="logout" class="text-gray-300 hover:text-white">
              <Icon name="lucide:log-out" class="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Contenu principal -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 border-t border-gray-800 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex justify-between items-center text-sm text-gray-400">
          <div>
            <p>&copy; 2025 LogOn Password Manager - Gestionnaire de mots de passe sécurisé</p>
          </div>
          <div class="flex space-x-4">
            <span>Version {{ version }}</span>
            <span class="text-green-400">✅ Chiffrement actif</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
/**
 * Layout principal avec navigation et authentification
 */
const { $config } = useNuxtApp()
const { isAuthenticated, logout } = useAuth()

// Configuration depuis le runtime config
const version = $config.public.version || '1.0.0'

// Meta pour SEO et sécurité
useHead({
  titleTemplate: '%s - LogOn Password Manager',
  meta: [
    { name: 'description', content: 'Gestionnaire de mots de passe sécurisé avec architecture zero-knowledge' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
    { name: 'robots', content: 'noindex, nofollow' }, // Pas d'indexation pour un password manager
  ]
})
</script>
