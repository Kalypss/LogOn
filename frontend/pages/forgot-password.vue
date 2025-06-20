<!--
  Page de récupération de mot de passe - Utilise l'email et le code de récupération de 48 caractères
  Architecture : Processus de récupération sécurisé en deux étapes
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
    <main class="container mx-auto px-4 py-8">
      <div class="max-w-md mx-auto">
        <Card>
          <CardContent class="p-6">
            <!-- Logo et titre -->
            <div class="text-center mb-6">
              <div class="mx-auto h-12 w-12 flex items-center justify-center bg-primary rounded-full mb-4">
                <Key class="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 class="text-2xl font-bold text-foreground">
                Récupération de compte
              </h2>
              <p class="text-sm text-muted-foreground mt-2">
                Entrez votre email et votre code de récupération de 48 caractères
              </p>
            </div>

            <!-- Formulaire -->
            <form @submit.prevent="handleRecovery" class="space-y-4">
              <!-- Email -->
              <div>
                <Label for="email">Adresse email</Label>
                <Input
                  id="email"
                  v-model="recoveryForm.email"
                  type="email"
                  placeholder="votre@email.com"
                  required
                  class="btn-bordered"
                />
              </div>

              <!-- Code de récupération -->
              <div>
                <Label for="recoveryCode">Code de récupération (48 caractères)</Label>
                <Textarea
                  id="recoveryCode"
                  v-model="recoveryForm.recoveryCode"
                  placeholder="Collez votre code de récupération de 48 caractères ici..."
                  rows="3"
                  required
                  class="btn-bordered font-mono text-sm"
                />
                <p class="text-xs text-muted-foreground mt-1">
                  Ce code vous a été fourni lors de la création de votre compte
                </p>
              </div>

              <!-- Nouveau mot de passe -->
              <div v-if="showNewPassword">
                <Label for="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  v-model="recoveryForm.newPassword"
                  type="password"
                  placeholder="Nouveau mot de passe sécurisé"
                  required
                  class="btn-bordered"
                />
              </div>

              <!-- Confirmation mot de passe -->
              <div v-if="showNewPassword">
                <Label for="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  v-model="recoveryForm.confirmPassword"
                  type="password"
                  placeholder="Confirmez votre nouveau mot de passe"
                  required
                  class="btn-bordered"
                />
              </div>

              <!-- Bouton de soumission -->
              <Button
                type="submit"
                class="w-full btn-bordered"
                :disabled="isLoading"
              >
                <div v-if="isLoading" class="flex items-center">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  {{ showNewPassword ? 'Récupération...' : 'Vérification...' }}
                </div>
                <span v-else>
                  {{ showNewPassword ? 'Récupérer le compte' : 'Vérifier le code' }}
                </span>
              </Button>
            </form>

            <!-- Lien retour connexion -->
            <div class="text-center mt-6">
              <Button variant="ghost" @click="navigateTo('/login')" class="text-sm">
                <ArrowLeft class="h-4 w-4 mr-2" />
                Retour à la connexion
              </Button>
            </div>

            <!-- Informations de sécurité -->
            <div class="border-t border-border mt-6 pt-4">
              <div class="text-xs text-muted-foreground space-y-2">
                <p class="flex items-center">
                  <Shield class="h-3 w-3 mr-1" />
                  Le code de récupération est le seul moyen de récupérer votre compte
                </p>
                <p class="flex items-center">
                  <Lock class="h-3 w-3 mr-1" />
                  Vos données restent chiffrées pendant tout le processus
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Key, Lock, Shield } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ThemeToggle from '@/components/ThemeToggle.vue'

// Métadonnées de la page
definePageMeta({
  middleware: 'guest'
})

// Configuration SEO
useSeoMeta({
  title: 'Récupération de compte - LogOn',
  description: 'Récupérez votre compte LogOn avec votre code de récupération de 48 caractères.'
})

// État du formulaire
const recoveryForm = ref({
  email: '',
  recoveryCode: '',
  newPassword: '',
  confirmPassword: ''
})

const isLoading = ref(false)
const showNewPassword = ref(false)
const { toast } = useToast()

// Validation du code de récupération
const validateRecoveryCode = (code: string): boolean => {
  // Supprimer les espaces et caractères spéciaux
  const cleanCode = code.replace(/\s+/g, '')
  
  // Vérifier la longueur (48 caractères)
  if (cleanCode.length !== 48) {
    return false
  }
  
  // Vérifier que ce sont des caractères alphanumériques
  const alphanumericRegex = /^[a-zA-Z0-9]+$/
  return alphanumericRegex.test(cleanCode)
}

// Gestion de la récupération
const handleRecovery = async () => {
  if (!validateRecoveryCode(recoveryForm.value.recoveryCode)) {
    toast({
      title: 'Code invalide',
      description: 'Le code de récupération doit contenir exactement 48 caractères alphanumériques.',
      variant: 'destructive'
    })
    return
  }

  if (showNewPassword.value) {
    if (recoveryForm.value.newPassword !== recoveryForm.value.confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas.',
        variant: 'destructive'
      })
      return
    }
    
    if (recoveryForm.value.newPassword.length < 8) {
      toast({
        title: 'Mot de passe trop court',
        description: 'Le mot de passe doit contenir au moins 8 caractères.',
        variant: 'destructive'
      })
      return
    }
  }

  isLoading.value = true

  try {
    if (!showNewPassword.value) {
      // Première étape : vérifier le code de récupération
      const response = await $fetch('/api/auth/verify-recovery', {
        method: 'POST',
        body: {
          email: recoveryForm.value.email,
          recoveryCode: recoveryForm.value.recoveryCode.replace(/\s+/g, '')
        }
      })

      if (response.valid) {
        showNewPassword.value = true
        toast({
          title: 'Code vérifié',
          description: 'Code de récupération valide. Définissez votre nouveau mot de passe.',
        })
      }
    } else {
      // Deuxième étape : récupérer le compte avec le nouveau mot de passe
      const response = await $fetch('/api/auth/recover-account', {
        method: 'POST',
        body: {
          email: recoveryForm.value.email,
          recoveryCode: recoveryForm.value.recoveryCode.replace(/\s+/g, ''),
          newPassword: recoveryForm.value.newPassword
        }
      })

      if (response.success) {
        toast({
          title: 'Compte récupéré',
          description: 'Votre compte a été récupéré avec succès. Vous pouvez maintenant vous connecter.',
        })
        
        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          navigateTo('/login')
        }, 2000)
      }
    }
  } catch (error: any) {
    console.error('Recovery error:', error)
    toast({
      title: 'Erreur de récupération',
      description: error.data?.message || 'Une erreur est survenue lors de la récupération.',
      variant: 'destructive'
    })
  } finally {
    isLoading.value = false
  }
}

// Auto-focus sur le premier champ
onMounted(() => {
  const emailInput = document.getElementById('email')
  emailInput?.focus()
})
</script>
