<!--
  Page de configuration de l'authentification à deux facteurs (2FA/TOTP)
  Architecture : Setup sécurisé du 2FA avec QR code et codes de récupération
-->
<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b border-border bg-card">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <Button variant="ghost" size="icon" @click="navigateTo('/settings')">
              <ArrowLeft class="h-5 w-5" />
            </Button>
            <div class="flex items-center space-x-2">
              <Shield class="h-6 w-6 text-primary" />
              <h1 class="text-xl font-bold text-foreground">Authentification à deux facteurs</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8 max-w-2xl">
      <div class="space-y-8">
        <!-- Étape 1: Information -->
        <Card v-if="step === 1">
          <CardHeader>
            <CardTitle class="flex items-center space-x-2">
              <Shield class="h-5 w-5 text-primary" />
              <span>Sécurisez votre compte</span>
            </CardTitle>
            <CardDescription>
              L'authentification à deux facteurs (2FA) ajoute une couche de sécurité supplémentaire à votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="bg-muted/50 p-4 rounded-lg">
              <h3 class="font-medium mb-2">Comment ça fonctionne :</h3>
              <ul class="space-y-2 text-sm text-muted-foreground">
                <li class="flex items-start space-x-2">
                  <div class="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Vous scannez un QR code avec votre application d'authentification</span>
                </li>
                <li class="flex items-start space-x-2">
                  <div class="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>L'application génère des codes à 6 chiffres qui changent toutes les 30 secondes</span>
                </li>
                <li class="flex items-start space-x-2">
                  <div class="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <span>Vous entrez ce code lors de la connexion pour prouver votre identité</span>
                </li>
              </ul>
            </div>
            
            <div class="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
              <div class="flex items-start space-x-2">
                <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 class="font-medium text-yellow-800 dark:text-yellow-200">Important</h4>
                  <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Assurez-vous d'avoir votre téléphone à portée de main avant de continuer.
                    Vous devrez scanner un QR code avec une application d'authentification.
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="font-medium mb-2">Applications recommandées :</h3>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex items-center space-x-2 p-2 border border-border rounded">
                  <Smartphone class="h-4 w-4 text-muted-foreground" />
                  <span class="text-sm">Google Authenticator</span>
                </div>
                <div class="flex items-center space-x-2 p-2 border border-border rounded">
                  <Smartphone class="h-4 w-4 text-muted-foreground" />
                  <span class="text-sm">Microsoft Authenticator</span>
                </div>
                <div class="flex items-center space-x-2 p-2 border border-border rounded">
                  <Smartphone class="h-4 w-4 text-muted-foreground" />
                  <span class="text-sm">Authy</span>
                </div>
                <div class="flex items-center space-x-2 p-2 border border-border rounded">
                  <Smartphone class="h-4 w-4 text-muted-foreground" />
                  <span class="text-sm">1Password</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button @click="startSetup" class="w-full">
              <Shield class="mr-2 h-4 w-4" />
              Commencer la configuration
            </Button>
          </CardFooter>
        </Card>

        <!-- Étape 2: QR Code -->
        <Card v-if="step === 2">
          <CardHeader>
            <CardTitle>Scanner le QR Code</CardTitle>
            <CardDescription>
              Utilisez votre application d'authentification pour scanner ce QR code
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="flex justify-center">
              <div class="bg-white p-4 rounded-lg border">
                <div ref="qrCodeRef" class="h-48 w-48 flex items-center justify-center">
                  <!-- QR Code sera généré ici -->
                  <div v-if="!qrCodeGenerated" class="text-center">
                    <Loader2 class="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p class="text-sm text-muted-foreground">Génération du QR code...</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="text-center">
              <p class="text-sm text-muted-foreground mb-2">Ou entrez manuellement ce code :</p>
              <div class="bg-muted p-3 rounded-lg font-mono text-sm break-all">
                {{ totpSecret }}
              </div>
              <Button variant="outline" size="sm" class="mt-2" @click="copySecret">
                <Copy class="mr-2 h-4 w-4" />
                Copier le code
              </Button>
            </div>
            
            <div class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <div class="flex items-start space-x-2">
                <Info class="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 class="font-medium text-blue-800 dark:text-blue-200">Instructions</h4>
                  <ol class="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                    <li>1. Ouvrez votre application d'authentification</li>
                    <li>2. Appuyez sur "Ajouter un compte" ou "+"</li>
                    <li>3. Scannez le QR code ou entrez le code manuellement</li>
                    <li>4. L'application affichera un code à 6 chiffres</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter class="flex space-x-3">
            <Button variant="outline" @click="step = 1">
              Retour
            </Button>
            <Button @click="step = 3" class="flex-1">
              J'ai scanné le QR code
            </Button>
          </CardFooter>
        </Card>

        <!-- Étape 3: Vérification -->
        <Card v-if="step === 3">
          <CardHeader>
            <CardTitle>Vérifier la configuration</CardTitle>
            <CardDescription>
              Entrez le code à 6 chiffres affiché dans votre application d'authentification
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <form @submit.prevent="verifyCode" class="space-y-4">
              <div>
                <Label for="verificationCode">Code de vérification</Label>
                <div class="flex space-x-2">
                  <Input
                    id="verificationCode"
                    v-model="verificationCode"
                    placeholder="000000"
                    maxlength="6"
                    class="text-center text-lg tracking-widest font-mono"
                    @input="formatCode"
                    required
                  />
                  <Button type="button" variant="outline" size="icon" @click="refreshCode">
                    <RefreshCw class="h-4 w-4" />
                  </Button>
                </div>
                <p class="text-xs text-muted-foreground mt-1">
                  Le code change toutes les 30 secondes
                </p>
              </div>
              
              <div v-if="verificationError" class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                <div class="flex items-center space-x-2">
                  <AlertCircle class="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span class="text-sm text-red-700 dark:text-red-300">{{ verificationError }}</span>
                </div>
              </div>
              
              <Button type="submit" :disabled="verifying || verificationCode.length !== 6" class="w-full">
                {{ verifying ? 'Vérification...' : 'Vérifier et activer' }}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <Button variant="outline" @click="step = 2" class="w-full">
              Retour au QR code
            </Button>
          </CardFooter>
        </Card>

        <!-- Étape 4: Codes de récupération -->
        <Card v-if="step === 4">
          <CardHeader>
            <CardTitle class="flex items-center space-x-2">
              <CheckCircle class="h-5 w-5 text-green-600" />
              <span>2FA activé avec succès !</span>
            </CardTitle>
            <CardDescription>
              Sauvegardez ces codes de récupération dans un endroit sûr
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
              <div class="flex items-start space-x-2">
                <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 class="font-medium text-yellow-800 dark:text-yellow-200">Codes de récupération</h4>
                  <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Ces codes ne seront affichés qu'une seule fois. Sauvegardez-les maintenant !
                    Vous pouvez les utiliser si vous perdez l'accès à votre téléphone.
                  </p>
                </div>
              </div>
            </div>
            
            <div class="bg-muted p-4 rounded-lg">
              <div class="grid grid-cols-2 gap-2 font-mono text-sm">
                <div v-for="(code, index) in recoveryCodes" :key="index" 
                     class="bg-background p-2 rounded text-center border">
                  {{ code }}
                </div>
              </div>
            </div>
            
            <div class="flex space-x-3">
              <Button variant="outline" @click="copyRecoveryCodes" class="flex-1">
                <Copy class="mr-2 h-4 w-4" />
                Copier les codes
              </Button>
              <Button variant="outline" @click="downloadRecoveryCodes" class="flex-1">
                <Download class="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </div>
            
            <div class="flex items-center space-x-2">
              <Checkbox id="confirmSaved" v-model:checked="confirmedSaved" />
              <Label for="confirmSaved" class="text-sm">
                J'ai sauvegardé ces codes de récupération dans un endroit sûr
              </Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button @click="finishSetup" :disabled="!confirmedSaved" class="w-full">
              Terminer la configuration
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import {
  ArrowLeft, Shield, AlertTriangle, Smartphone, Info, Copy, RefreshCw,
  AlertCircle, CheckCircle, Download, Loader2
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useToast } from '@/composables/useToast'

// Authentification
definePageMeta({
  middleware: 'auth'
})

// Composables
const { toast } = useToast()

// État local
const step = ref(1)
const totpSecret = ref('')
const qrCodeGenerated = ref(false)
const verificationCode = ref('')
const verificationError = ref('')
const verifying = ref(false)
const recoveryCodes = ref([])
const confirmedSaved = ref(false)
const qrCodeRef = ref(null)

// Actions
const startSetup = async () => {
  try {
    const response = await $fetch('/api/user/two-factor/setup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    
    totpSecret.value = response.secret
    step.value = 2
    
    // Générer le QR code
    await nextTick()
    await generateQRCode(response.qrCodeUrl)
    
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de démarrer la configuration 2FA",
      variant: "destructive"
    })
  }
}

const generateQRCode = async (qrCodeUrl: string) => {
  try {
    // Utiliser une bibliothèque QR code (à installer : npm install qrcode)
    // Pour cette démo, on simule la génération
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (qrCodeRef.value) {
      qrCodeRef.value.innerHTML = `
        <div class="bg-black text-white p-8 text-xs text-center">
          QR Code<br/>
          ${qrCodeUrl.substring(0, 30)}...
        </div>
      `
    }
    qrCodeGenerated.value = true
    
  } catch (error) {
    console.error('Erreur lors de la génération du QR code:', error)
    toast({
      title: "Erreur",
      description: "Impossible de générer le QR code",
      variant: "destructive"
    })
  }
}

const formatCode = (event: Event) => {
  const target = event.target as HTMLInputElement
  // Garder uniquement les chiffres
  target.value = target.value.replace(/\D/g, '')
  verificationCode.value = target.value
  verificationError.value = ''
}

const refreshCode = () => {
  verificationCode.value = ''
  verificationError.value = ''
}

const verifyCode = async () => {
  if (verificationCode.value.length !== 6) {
    verificationError.value = 'Le code doit contenir 6 chiffres'
    return
  }
  
  verifying.value = true
  verificationError.value = ''
  
  try {
    const response = await $fetch('/api/user/two-factor/verify', {
      method: 'POST',
      body: {
        token: verificationCode.value
      },
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    
    if (response.success) {
      recoveryCodes.value = response.recoveryCodes
      step.value = 4
      toast({
        title: "Succès",
        description: "2FA configuré avec succès",
      })
    }
    
  } catch (error: any) {
    verificationError.value = error.data?.message || 'Code de vérification invalide'
  } finally {
    verifying.value = false
  }
}

const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(totpSecret.value)
    toast({
      title: "Copié",
      description: "Code secret copié dans le presse-papiers",
    })
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de copier le code secret",
      variant: "destructive"
    })
  }
}

const copyRecoveryCodes = async () => {
  try {
    const codesText = recoveryCodes.value.join('\n')
    await navigator.clipboard.writeText(codesText)
    toast({
      title: "Copié",
      description: "Codes de récupération copiés dans le presse-papiers",
    })
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de copier les codes de récupération",
      variant: "destructive"
    })
  }
}

const downloadRecoveryCodes = () => {
  const codesText = [
    '# Codes de récupération LogOn - 2FA',
    `# Générés le ${new Date().toLocaleDateString('fr-FR')}`,
    '# Gardez ces codes dans un endroit sûr !',
    '',
    ...recoveryCodes.value
  ].join('\n')
  
  const blob = new Blob([codesText], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logon-recovery-codes-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  toast({
    title: "Téléchargé",
    description: "Codes de récupération téléchargés",
  })
}

const finishSetup = () => {
  toast({
    title: "Configuration terminée",
    description: "L'authentification à deux facteurs est maintenant active",
  })
  navigateTo('/settings')
}

// Chargement initial
onMounted(() => {
  // Vérifier si 2FA est déjà activé
  // Si oui, rediriger vers les paramètres
})
</script>
