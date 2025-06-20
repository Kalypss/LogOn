<!--
  Page d'affichage du code de récupération
  Architecture : Page critique pour la sauvegarde du code de récupération
-->
<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full space-y-8">
      <!-- Header -->
      <div class="text-center">
        <div class="mx-auto h-16 w-16 flex items-center justify-center bg-green-600 rounded-full mb-4">
          <CheckCircle class="h-8 w-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold">Compte créé avec succès!</h1>
        <p class="text-sm text-muted-foreground mt-2">
          Votre code de récupération est affiché ci-dessous
        </p>
      </div>

      <!-- Alerte importante -->
      <Alert class="border-orange-500 bg-orange-50 dark:bg-orange-950">
        <AlertTriangle class="h-4 w-4 text-orange-600" />
        <AlertTitle class="text-orange-800 dark:text-orange-200">Important !</AlertTitle>
        <AlertDescription class="text-orange-700 dark:text-orange-300">
          Ce code ne sera affiché qu'une seule fois. Sauvegardez-le en lieu sûr.
        </AlertDescription>
      </Alert>

      <!-- Code de récupération -->
      <div class="space-y-4">
        <Label>Votre code de récupération</Label>
        <div class="relative">
          <div class="bg-muted p-4 rounded-lg font-mono text-center text-lg tracking-wider border-2 border-dashed">
            {{ recoveryCode }}
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="absolute right-2 top-2"
            @click="copyToClipboard"
          >
            <Copy v-if="!copied" class="h-4 w-4" />
            <Check v-else class="h-4 w-4 text-green-600" />
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">
          Ce code vous permettra de récupérer l'accès à votre compte si vous oubliez votre mot de passe maître.
        </p>
      </div>

      <!-- Actions -->
      <div class="space-y-3">
        <Button @click="downloadCode" variant="outline" class="w-full">
          <Download class="mr-2 h-4 w-4" />
          Télécharger le code
        </Button>
        
        <Button @click="printCode" variant="outline" class="w-full">
          <Printer class="mr-2 h-4 w-4" />
          Imprimer le code
        </Button>
      </div>

      <!-- Checkbox de confirmation -->
      <div class="space-y-4">
        <div class="flex items-start space-x-3">
          <Checkbox id="saved" v-model:checked="confirmSaved" />
          <Label for="saved" class="text-sm leading-relaxed">
            J'ai sauvegardé mon code de récupération en lieu sûr et je comprends 
            qu'il ne sera plus jamais affiché.
          </Label>
        </div>

        <Button 
          @click="continueToApp" 
          class="w-full" 
          :disabled="!confirmSaved"
        >
          <ArrowRight class="mr-2 h-4 w-4" />
          Continuer vers l'application
        </Button>
      </div>

      <!-- Info de sécurité -->
      <div class="text-center text-xs text-muted-foreground space-y-2">
        <p>🔒 Architecture zéro-connaissance</p>
        <p>Vos données sont chiffrées et nous ne pouvons pas les récupérer sans ce code</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle, AlertTriangle, Copy, Check, Download, Printer, ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

// Métadonnées de la page
definePageMeta({
  layout: false,
  middleware: 'auth'
})

// Configuration SEO
useSeoMeta({
  title: 'Code de récupération - LogOn',
  description: 'Sauvegardez votre code de récupération'
})

// Récupération du code depuis la query
const route = useRoute()
const recoveryCode = computed(() => route.query.code as string || '')

// État
const copied = ref(false)
const confirmSaved = ref(false)

// Composables
const { showSuccess, showError } = useToast()

// Redirection si pas de code
if (!recoveryCode.value) {
  navigateTo('/dashboard')
}

// Copier dans le presse-papiers
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(recoveryCode.value)
    copied.value = true
    showSuccess('Code copié', 'Le code de récupération a été copié dans le presse-papiers')
    
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    showError('Erreur', 'Impossible de copier le code')
  }
}

// Télécharger le code
const downloadCode = () => {
  const blob = new Blob([
    `LogOn - Code de récupération\n\n`,
    `Code: ${recoveryCode.value}\n\n`,
    `Date: ${new Date().toLocaleDateString()}\n\n`,
    `IMPORTANT: Gardez ce code en lieu sûr. Il est nécessaire pour récupérer l'accès à votre compte si vous oubliez votre mot de passe maître.\n\n`,
    `LogOn utilise une architecture zéro-connaissance. Sans ce code, vos données seront définitivement perdues.`
  ], { type: 'text/plain' })
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logon-recovery-code-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  showSuccess('Code téléchargé', 'Le fichier de récupération a été téléchargé')
}

// Imprimer le code
const printCode = () => {
  const printContent = `
    <div style="font-family: Arial, sans-serif; padding: 40px;">
      <h1>LogOn - Code de récupération</h1>
      <div style="border: 2px dashed #ccc; padding: 20px; margin: 20px 0; text-align: center;">
        <div style="font-family: monospace; font-size: 24px; letter-spacing: 3px;">
          ${recoveryCode.value}
        </div>
      </div>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>IMPORTANT:</strong> Gardez ce code en lieu sûr. Il est nécessaire pour récupérer l'accès à votre compte si vous oubliez votre mot de passe maître.</p>
      <p>LogOn utilise une architecture zéro-connaissance. Sans ce code, vos données seront définitivement perdues.</p>
    </div>
  `
  
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }
}

// Continuer vers l'application
const continueToApp = () => {
  if (confirmSaved.value) {
    navigateTo('/dashboard')
  }
}
</script>
