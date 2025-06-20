<!--
  Page de connexion avec design shadcn-vue
  Architecture : Formulaire d'authentification avec validation côté client
-->
<style scoped>
.container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
<template>
  <div class="min-h-screen bg-background">

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8 justify-center">
      <div class="max-w-md mx-auto">

          <CardContent class="p-6">
            <!-- Logo et titre -->
            <div class="text-center mb-6">
              <div class="flex items-center justify-between mb-2">
              <h2 class="text-2xl font-bold text-foreground">
                Se connecter
              </h2>
              <ThemeToggle />
              </div>
              <p class="text-sm text-muted-foreground mt-2">
                Entrez vos identifiants pour accéder à votre coffre-fort
              </p>
            </div>

            <!-- Formulaire -->
            <form @submit.prevent="handleLogin" class="space-y-4">
              <!-- Email -->
              <div>
                <Label for="email">Email</Label>
                <Input
                  id="email"
                  v-model="form.email"
                  type="email"
                  placeholder="nom@exemple.com"
                  required
                  class="btn-bordered"
                />
              </div>

              <!-- Mot de passe -->
              <div>
                <div class="flex items-center justify-between">
                  <Label for="password">Mot de passe</Label>
                  <NuxtLink
                    to="/forgot-password"
                    class="text-sm text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </NuxtLink>
                </div>
                <div class="relative">
                  <Input
                    id="password"
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    required
                    :disabled="isLoading"
                    class="btn-bordered"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    @click="showPassword = !showPassword"
                  >
                    <Eye v-if="!showPassword" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <!-- Se souvenir de moi -->
              <div class="flex items-center space-x-2">
                <Checkbox id="remember" v-model:checked="form.rememberMe" />
                <Label for="remember" class="text-sm font-normal">
                  Se souvenir de moi
                </Label>
              </div>

              <!-- Bouton de connexion -->
              <Button type="submit" class="w-full btn-bordered" :disabled="isLoading">
                <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                <LogIn v-else class="mr-2 h-4 w-4" />
                Se connecter
              </Button>
            </form>

            <!-- Lien vers inscription -->
            <div class="mt-6 text-center text-sm">
              <span class="text-muted-foreground">Pas encore de compte ?</span>
              <NuxtLink to="/register" class="font-medium text-primary hover:underline ml-1">
                Créer un compte
              </NuxtLink>
            </div>
          </CardContent>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import ThemeToggle from '@/components/ThemeToggle.vue'

// Métadonnées de la page
definePageMeta({
  layout: false,
  middleware: 'guest'
})

// Configuration SEO
useSeoMeta({
  title: 'Connexion - LogOn',
  description: 'Connectez-vous à votre gestionnaire de mots de passe sécurisé'
})

// État du formulaire
const form = reactive({
  email: '',
  password: '',
  rememberMe: false
})

const showPassword = ref(false)
const isLoading = ref(false)

// Composables
const { login } = useAuth()
const { showError, showSuccess } = useToast()

// Gestion de la soumission
const handleLogin = async () => {
  isLoading.value = true
  
  try {
    const result = await login({
      email: form.email,
      password: form.password
    })
    
    if (result.requiresTwoFactor) {
      // Redirection vers la page 2FA
      navigateTo(`/two-factor-verify?email=${encodeURIComponent(form.email)}`)
    } else {
      showSuccess('Connexion réussie', 'Redirection vers votre tableau de bord...')
      
      setTimeout(() => {
        navigateTo('/dashboard')
      }, 1000)
    }
    
  } catch (error: any) {
    console.error('Login error:', error)
    showError(
      'Erreur de connexion', 
      error.message || 'Vérifiez vos identifiants et réessayez'
    )
  } finally {
    isLoading.value = false
  }
}
</script>
