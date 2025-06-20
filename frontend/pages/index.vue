<!--
  Page d'accueil principale - Redirection vers le dashboard ou connexion
  Architecture : Page de routage principal pour gérer l'état d'authentification
-->
<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b border-border bg-card">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <Lock class="h-6 w-6 text-primary" />
            <h1 class="text-xl font-bold text-foreground">LogOn</h1>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <div class="max-w-md mx-auto space-y-8">
        <!-- Logo et titre -->
        <div class="text-center">
          <div class="mx-auto h-16 w-16 flex items-center justify-center bg-primary rounded-full mb-4">
            <Lock class="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 class="text-3xl font-bold text-foreground">
            LogOn
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Gestionnaire de mots de passe zéro-connaissance
          </p>
        </div>

        <!-- État de chargement -->
        <div v-if="pending" class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p class="text-sm text-muted-foreground mt-2">
            Vérification de l'authentification...
          </p>
        </div>

        <!-- Boutons d'action -->
        <div v-else class="space-y-4">
          <Button
            @click="navigateTo('/login')"
            class="w-full"
            size="lg"
          >
            Se connecter
          </Button>
          
          <Button
            @click="navigateTo('/register')"
            variant="outline"
            class="w-full"
            size="lg"
          >
            Créer un compte
          </Button>
        </div>

        <!-- Informations de sécurité -->
        <div class="text-center text-xs text-muted-foreground">
          <p>
            🔒 Chiffrement AES-256 • 🛡️ Architecture zéro-connaissance
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle.vue'

// Métadonnées de la page
definePageMeta({
  layout: false,
  middleware: 'guest'
})

// Configuration SEO
useSeoMeta({
  title: 'LogOn - Gestionnaire de mots de passe sécurisé',
  description: 'Gestionnaire de mots de passe open-source avec architecture zéro-connaissance et chiffrement de bout en bout.'
})

// Vérification de l'état d'authentification (côté client uniquement)
const { isAuthenticated } = useAuth()
const pending = ref(false)

// Redirection automatique si déjà connecté
onMounted(async () => {
  if (process.client) {
    pending.value = true
    const { checkAuth } = useAuth()
    await checkAuth()
    pending.value = false
    
    if (isAuthenticated.value) {
      navigateTo('/dashboard')
    }
  }
})
</script>
