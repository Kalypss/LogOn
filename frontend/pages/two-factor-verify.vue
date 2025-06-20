<!--
  Page de vérification 2FA lors de la connexion
  Architecture : Vérification du code TOTP avec pin input shadcn-vue
-->
<template>
  <div class="min-h-screen bg-background flex items-center justify-center">
    <div class="w-full max-w-md mx-auto px-4">
      <Card>
        <CardContent class="p-6">
          <!-- Header -->
          <div class="text-center mb-6">
            <div class="mx-auto h-12 w-12 flex items-center justify-center bg-primary rounded-full mb-4">
              <Shield class="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 class="text-2xl font-bold text-foreground">
              Authentification à deux facteurs
            </h2>
            <p class="text-sm text-muted-foreground mt-2">
              Entrez le code à 6 chiffres de votre application d'authentification
            </p>
          </div>

          <!-- Formulaire -->
          <form @submit.prevent="handleVerify" class="space-y-6">
            <!-- Pin Input -->
            <div class="space-y-2">
              <Label class="text-center block">Code de vérification</Label>
              <PinInput 
                v-model="verificationCode" 
                placeholder="0" 
                :length="6"
                :disabled="isLoading"
                class="flex justify-center gap-2"
                @complete="handleComplete"
              />
              <p class="text-xs text-muted-foreground text-center">
                Le code expire dans {{ timeRemaining }}s
              </p>
            </div>

            <!-- Message d'erreur -->
            <div v-if="errorMessage" class="text-center">
              <p class="text-sm text-destructive">{{ errorMessage }}</p>
            </div>

            <!-- Actions -->
            <div class="space-y-3">
              <!-- Bouton principal -->
              <Button 
                type="submit" 
                class="w-full" 
                :disabled="isLoading || verificationCode.length !== 6"
              >
                <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                <ShieldCheck v-else class="mr-2 h-4 w-4" />
                Vérifier le code
              </Button>

              <!-- Bouton retour -->
              <Button 
                type="button" 
                variant="outline" 
                class="w-full"
                @click="goBack"
                :disabled="isLoading"
              >
                <ArrowLeft class="mr-2 h-4 w-4" />
                Retour à la connexion
              </Button>
            </div>
          </form>

          <!-- Aide -->
          <div class="mt-6 text-center text-sm text-muted-foreground">
            <p>Vous n'arrivez pas à accéder à votre application ?</p>
            <NuxtLink 
              to="/recovery-code" 
              class="text-primary hover:underline mt-1 inline-block"
            >
              Utiliser un code de récupération
            </NuxtLink>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Shield, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { PinInput } from '@/components/ui/pin-input'

// Métadonnées de la page
definePageMeta({
  layout: false,
  middleware: 'guest'
})

// Configuration SEO
useSeoMeta({
  title: 'Vérification 2FA - LogOn',
  description: 'Vérifiez votre code d\'authentification à deux facteurs'
})

// Récupération de l'email depuis les query params
const route = useRoute()
const userEmail = route.query.email as string

// État du composant
const verificationCode = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const timeRemaining = ref(30)

// Composables
const { verifyTwoFactor } = useAuth()
const { showError, showSuccess } = useToast()

// Timer pour le code
let timer: NodeJS.Timeout

const startTimer = () => {
  timer = setInterval(() => {
    timeRemaining.value--
    if (timeRemaining.value <= 0) {
      timeRemaining.value = 30
      errorMessage.value = 'Le code a expiré, veuillez en générer un nouveau'
    }
  }, 1000)
}

// Démarrer le timer au montage
onMounted(() => {
  startTimer()
  
  // Redirection si pas d'email
  if (!userEmail) {
    navigateTo('/login')
  }
})

// Nettoyer le timer au démontage
onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

// Gestion de la complétion automatique
const handleComplete = (code: string) => {
  verificationCode.value = code
  if (code.length === 6) {
    handleVerify()
  }
}

// Gestion de la vérification
const handleVerify = async () => {
  if (verificationCode.value.length !== 6) {
    errorMessage.value = 'Veuillez saisir un code à 6 chiffres'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await verifyTwoFactor({
      email: userEmail,
      code: verificationCode.value
    })

    if (result.success) {
      showSuccess('Authentification réussie', 'Redirection vers votre tableau de bord...')
      
      // Nettoyer le timer
      if (timer) {
        clearInterval(timer)
      }
      
      setTimeout(() => {
        navigateTo('/dashboard')
      }, 1000)
    }

  } catch (error: any) {
    console.error('2FA verification error:', error)
    
    // Messages d'erreur spécifiques
    if (error.message?.includes('invalid')) {
      errorMessage.value = 'Code invalide, veuillez réessayer'
    } else if (error.message?.includes('expired')) {
      errorMessage.value = 'Code expiré, veuillez en générer un nouveau'
    } else {
      errorMessage.value = 'Erreur de vérification, veuillez réessayer'
    }
    
    // Vider le champ en cas d'erreur
    verificationCode.value = ''
    
  } finally {
    isLoading.value = false
  }
}

// Retour à la page de connexion
const goBack = () => {
  if (timer) {
    clearInterval(timer)
  }
  navigateTo('/login')
}

// Surveiller les changements du code pour effacer les erreurs
watch(verificationCode, () => {
  if (errorMessage.value) {
    errorMessage.value = ''
  }
})
</script>
