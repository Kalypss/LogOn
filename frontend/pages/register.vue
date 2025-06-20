<!--
  Page d'inscription avec design shadcn-vue
  Architecture : Formulaire de création de compte avec validation côté client
-->
<template>
  <div class="min-h-screen flex">


    <!-- Panneau droite avec formulaire -->
    <div class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
      <div class="mx-auto w-full max-w-sm lg:w-96">
        <!-- Header -->
        <div class="flex justify-between items-center mb-8">
          <div>
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-2xl font-bold tracking-tight">Créer un compte</h2>
              <ThemeToggle />
            </div>
            <p class="text-sm text-muted-foreground mt-2">
              Commencez à sécuriser vos mots de passe dès aujourd'hui
            </p>
          </div>
        </div>

        <!-- Tabs pour les étapes -->
        <Tabs v-model="activeTab" class="w-full">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="informations" :disabled="isLoading" class="active:ring-2 focus-within:ring-primary dark:border-white dark:border-1">
              <div class="flex items-center space-x-2">
                <div :class="[
                  'rounded-full w-5 h-5 flex items-center justify-center text-xs',
                  'bg-primary text-primary-foreground'
                ]">
                  1
                </div>
                <span>Informations</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="securite" :disabled="isLoading || !canGoToSecurityTab "class="active:ring-2 focus-within:ring-primary dark:border-white dark:border-1">
              <div class="flex items-center space-x-2">
                <div :class="[
                  'rounded-full w-5 h-5 flex items-center justify-center text-xs',
                  canGoToSecurityTab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                ]">
                  2
                </div>
                <span>Sécurité</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <!-- Contenu des tabs -->
          <form @submit.prevent="handleRegister" class="mt-6">
            <TabsContent value="informations" class="space-y-4">
              <!-- Nom complet -->
              <div class="space-y-2">
                <Label for="name">Nom complet</Label>
                <Input
                  id="name"
                  v-model="form.name"
                  type="text"
                  placeholder="John Doe"
                  required
                  :disabled="isLoading"
                />
              </div>

              <!-- Email -->
              <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input
                  id="email"
                  v-model="form.email"
                  type="email"
                  placeholder="nom@exemple.com"
                  required
                  :disabled="isLoading"
                  :class="[
                    form.email && !emailValidation.isValid ? 'border-destructive focus-visible:ring-destructive' : ''
                  ]"
                />
                <p v-if="form.email && !emailValidation.isValid" 
                   class="text-xs text-destructive">
                  {{ emailValidation.message }}
                </p>
              </div>

              <!-- Bouton suivant -->
              <Button 
                type="button" 
                @click="goToSecurityTab" 
                class="w-full"
                :disabled="!canGoToSecurityTab"
              >
                <ArrowRight class="mr-2 h-4 w-4" />
                Continuer vers la sécurité
              </Button>
            </TabsContent>

            <TabsContent value="securite" class="space-y-4">
              <!-- Mot de passe maître -->
              <div class="space-y-2">
                <Label for="password">Mot de passe maître</Label>
                <div class="relative">
                  <Input
                    id="password"
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    required
                    :disabled="isLoading"
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
                
                <!-- Indicateur de force du mot de passe -->
                <div class="space-y-2">
                  <div class="flex space-x-1">
                    <div
                      v-for="i in 4"
                      :key="i"
                      :class="[
                        'h-1 flex-1 rounded-full',
                        passwordStrength >= i ? getStrengthColor(passwordStrength) : 'bg-muted'
                      ]"
                    />
                  </div>
                  <p class="text-xs" :class="getStrengthTextColor(passwordStrength)">
                    {{ getStrengthText(passwordStrength) }}
                  </p>
                </div>
              </div>

              <!-- Confirmation du mot de passe -->
              <div class="space-y-2">
                <Label for="confirmPassword">Confirmer le mot de passe</Label>
                <div class="relative">
                  <Input
                    id="confirmPassword"
                    v-model="form.confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    required
                    :disabled="isLoading"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <Eye v-if="!showConfirmPassword" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                  </Button>
                </div>
                <p v-if="form.confirmPassword && form.password !== form.confirmPassword" 
                   class="text-xs text-destructive">
                  Les mots de passe ne correspondent pas
                </p>
              </div>

        

              <!-- Boutons -->
              <div class="flex space-x-3">
                <Button type="button" variant="outline" @click="goToInformationsTab" class="flex-1">
                  <ArrowLeft class="mr-2 h-4 w-4" />
                  Retour
                </Button>
                <Button type="submit" class="flex-1" :disabled="isLoading || !canSubmit">
                  <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                  <UserPlus v-else class="mr-2 h-4 w-4" />
                  Créer le compte
                </Button>
              </div>
            </TabsContent>
          </form>
        </Tabs>

        <!-- Lien vers connexion -->
        <div class="mt-6 text-center text-sm">
          <span class="text-muted-foreground">Déjà un compte ?</span>
          <NuxtLink to="/login" class="font-medium text-primary hover:underline ml-1">
            Se connecter
          </NuxtLink>
        </div>


      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Shield, Eye, EyeOff, ArrowRight, ArrowLeft, UserPlus, Loader2, Info } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ThemeToggle from '@/components/ThemeToggle.vue'

// Métadonnées de la page
definePageMeta({
  layout: false,
  middleware: 'guest'
})

// Configuration SEO
useSeoMeta({
  title: 'Inscription - LogOn',
  description: 'Créez votre compte LogOn pour commencer à sécuriser vos mots de passe'
})

// État du formulaire
const activeTab = ref('informations')
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)

// Composables
const { register } = useAuth()
const { showError, showSuccess } = useToast()

// Validation de l'email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const emailValidation = computed(() => {
  if (!form.email) return { isValid: true, message: '' }
  
  const isValid = isValidEmail(form.email)
  return {
    isValid,
    message: isValid ? '' : 'Veuillez saisir une adresse email valide'
  }
})

// Calcul de la force du mot de passe
const passwordStrength = computed(() => {
  const password = form.password
  if (!password) return 0
  
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  
  return score
})

const canSubmit = computed(() => {
  return form.password && 
         form.confirmPassword && 
         form.password === form.confirmPassword &&
         passwordStrength.value >= 2 &&
         emailValidation.value.isValid
})

// Validation pour pouvoir accéder à l'onglet sécurité
const canGoToSecurityTab = computed(() => {
  return form.name.trim() && form.email.trim() && emailValidation.value.isValid
})

// Fonctions utilitaires pour l'indicateur de force
const getStrengthColor = (strength: number) => {
  if (strength <= 1) return 'bg-red-500'
  if (strength <= 2) return 'bg-yellow-500'
  if (strength <= 3) return 'bg-blue-500'
  return 'bg-green-500'
}

const getStrengthTextColor = (strength: number) => {
  if (strength <= 1) return 'text-red-500'
  if (strength <= 2) return 'text-yellow-500'
  if (strength <= 3) return 'text-blue-500'
  return 'text-green-500'
}

const getStrengthText = (strength: number) => {
  if (strength <= 1) return 'Faible - Ajoutez des caractères spéciaux et des chiffres'
  if (strength <= 2) return 'Moyen - Ajoutez des caractères spéciaux'
  if (strength <= 3) return 'Bon - Votre mot de passe est sécurisé'
  return 'Excellent - Mot de passe très sécurisé'
}

// Navigation entre les tabs
const goToSecurityTab = () => {
  if (canGoToSecurityTab.value) {
    activeTab.value = 'securite'
  }
}

const goToInformationsTab = () => {
  activeTab.value = 'informations'
}

// Gestion de la soumission
const handleRegister = async () => {
  if (!canSubmit.value) return
  
  isLoading.value = true
  
  try {
    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password
    })
    
    if (result.success) {
      showSuccess(
        'Compte créé avec succès', 
        'Votre code de récupération vous sera affiché une seule fois'
      )
      
      // Redirection vers une page pour afficher le code de récupération
      navigateTo(`/recovery-code?code=${result.recoveryCode}`)
    }
    
  } catch (error: any) {
    console.error('Register error:', error)
    showError(
      'Erreur lors de la création du compte', 
      error.message || 'Veuillez réessayer plus tard'
    )
  } finally {
    isLoading.value = false
  }
}
</script>
