<!--
  Page des paramètres utilisateur
  Architecture : Configuration complète du compte et de la sécurité
-->
<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b border-border bg-card">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <Button variant="ghost" size="icon" @click="navigateTo('/dashboard')">
              <ArrowLeft class="h-5 w-5" />
            </Button>
            <div class="flex items-center space-x-2">
              <Settings class="h-6 w-6 text-primary" />
              <h1 class="text-xl font-bold text-foreground">Paramètres</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8 max-w-4xl">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Menu de navigation -->
        <div class="lg:col-span-1">
          <nav class="space-y-2">
            <Button 
              variant="ghost" 
              class="w-full justify-start"
              :class="{ 'bg-accent': activeTab === 'profile' }"
              @click="activeTab = 'profile'"
            >
              <User class="mr-2 h-4 w-4" />
              Profil
            </Button>
            <Button 
              variant="ghost" 
              class="w-full justify-start"
              :class="{ 'bg-accent': activeTab === 'security' }"
              @click="activeTab = 'security'"
            >
              <Shield class="mr-2 h-4 w-4" />
              Sécurité
            </Button>
            <Button 
              variant="ghost" 
              class="w-full justify-start"
              :class="{ 'bg-accent': activeTab === 'privacy' }"
              @click="activeTab = 'privacy'"
            >
              <Lock class="mr-2 h-4 w-4" />
              Confidentialité
            </Button>
            <Button 
              variant="ghost" 
              class="w-full justify-start"
              :class="{ 'bg-accent': activeTab === 'preferences' }"
              @click="activeTab = 'preferences'"
            >
              <Palette class="mr-2 h-4 w-4" />
              Préférences
            </Button>
            <Button 
              variant="ghost" 
              class="w-full justify-start"
              :class="{ 'bg-accent': activeTab === 'export' }"
              @click="activeTab = 'export'"
            >
              <Download class="mr-2 h-4 w-4" />
              Export/Import
            </Button>
            <Button 
              variant="ghost" 
              class="w-full justify-start"
              :class="{ 'bg-accent': activeTab === 'advanced' }"
              @click="activeTab = 'advanced'"
            >
              <Wrench class="mr-2 h-4 w-4" />
              Avancé
            </Button>
          </nav>
        </div>

        <!-- Contenu principal -->
        <div class="lg:col-span-3">
          <!-- Onglet Profil -->
          <div v-if="activeTab === 'profile'" class="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations du profil</CardTitle>
                <CardDescription>
                  Gérez vos informations personnelles
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="flex items-center space-x-4">
                  <div class="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <User class="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 class="font-medium">{{ profile.username }}</h3>
                    <p class="text-sm text-muted-foreground">{{ profile.email }}</p>
                  </div>
                </div>
                
                <Separator />
                
                <form @submit.prevent="updateProfile" class="space-y-4">
                  <div>
                    <Label for="username">Nom d'utilisateur</Label>
                    <Input
                      id="username"
                      v-model="profileForm.username"
                      placeholder="Votre nom d'utilisateur"
                    />
                  </div>
                  
                  <div>
                    <Label for="email">Email</Label>
                    <Input
                      id="email"
                      v-model="profileForm.email"
                      type="email"
                      placeholder="votre@email.com"
                    />
                  </div>
                  
                  <Button type="submit" :disabled="savingProfile">
                    {{ savingProfile ? 'Enregistrement...' : 'Enregistrer' }}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <!-- Onglet Sécurité -->
          <div v-if="activeTab === 'security'" class="space-y-6">
            <!-- Changement de mot de passe -->
            <Card>
              <CardHeader>
                <CardTitle>Mot de passe principal</CardTitle>
                <CardDescription>
                  Changez votre mot de passe principal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form @submit.prevent="changePassword" class="space-y-4">
                  <div>
                    <Label for="currentPassword">Mot de passe actuel</Label>
                    <Input
                      id="currentPassword"
                      v-model="passwordForm.current"
                      type="password"
                      placeholder="Mot de passe actuel"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label for="newPassword">Nouveau mot de passe</Label>
                    <Input
                      id="newPassword"
                      v-model="passwordForm.new"
                      type="password"
                      placeholder="Nouveau mot de passe"
                      required
                    />
                    <div class="mt-2">
                      <div class="flex items-center space-x-2">
                        <div class="flex-1 bg-muted rounded-full h-2">
                          <div 
                            class="h-2 rounded-full transition-all duration-300"
                            :class="getPasswordStrengthColor(passwordForm.new)"
                            :style="{ width: `${getPasswordStrengthPercent(passwordForm.new)}%` }"
                          ></div>
                        </div>
                        <span class="text-xs text-muted-foreground">
                          {{ getPasswordStrength(passwordForm.new) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label for="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      v-model="passwordForm.confirm"
                      type="password"
                      placeholder="Confirmer le mot de passe"
                      required
                    />
                  </div>
                  
                  <Button type="submit" :disabled="changingPassword">
                    {{ changingPassword ? 'Modification...' : 'Changer le mot de passe' }}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <!-- Authentification à deux facteurs -->
            <Card>
              <CardHeader>
                <CardTitle>Authentification à deux facteurs (2FA)</CardTitle>
                <CardDescription>
                  Sécurisez votre compte avec l'authentification à deux facteurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">
                      2FA {{ security.twoFactorEnabled ? 'activé' : 'désactivé' }}
                    </p>
                    <p class="text-sm text-muted-foreground">
                      {{ security.twoFactorEnabled 
                        ? 'Votre compte est protégé par l\'authentification à deux facteurs' 
                        : 'Ajoutez une couche de sécurité supplémentaire à votre compte' 
                      }}
                    </p>
                  </div>
                  <Button 
                    @click="security.twoFactorEnabled ? disableTwoFactor() : enableTwoFactor()"
                    :variant="security.twoFactorEnabled ? 'destructive' : 'default'"
                  >
                    {{ security.twoFactorEnabled ? 'Désactiver' : 'Activer' }}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <!-- Sessions actives -->
            <Card>
              <CardHeader>
                <CardTitle>Sessions actives</CardTitle>
                <CardDescription>
                  Gérez vos sessions ouvertes sur différents appareils
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="space-y-3">
                  <div v-for="session in activeSessions" :key="session.id" 
                       class="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div class="flex items-center space-x-3">
                      <div class="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Monitor class="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p class="font-medium">{{ session.device }}</p>
                        <p class="text-sm text-muted-foreground">
                          {{ session.location }} • {{ formatDate(session.lastActive) }}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center space-x-2">
                      <Badge v-if="session.current" variant="default">Actuelle</Badge>
                      <Button 
                        v-else 
                        variant="outline" 
                        size="sm" 
                        @click="revokeSession(session.id)"
                      >
                        Révoquer
                      </Button>
                    </div>
                  </div>
                </div>
                <div class="mt-4">
                  <Button variant="destructive" @click="revokeAllSessions">
                    Révoquer toutes les sessions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Onglet Confidentialité -->
          <div v-if="activeTab === 'privacy'" class="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de confidentialité</CardTitle>
                <CardDescription>
                  Contrôlez vos données et votre vie privée
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <Label>Logs d'activité</Label>
                    <p class="text-sm text-muted-foreground">
                      Enregistrer les actions effectuées sur votre compte
                    </p>
                  </div>
                  <Switch v-model:checked="privacy.activityLogs" @update:checked="updatePrivacySetting('activityLogs', $event)" />
                </div>
                
                <Separator />
                
                <div class="flex items-center justify-between">
                  <div>
                    <Label>Partage de données d'usage</Label>
                    <p class="text-sm text-muted-foreground">
                      Aider à améliorer l'application en partageant des données anonymes
                    </p>
                  </div>
                  <Switch v-model:checked="privacy.usageData" @update:checked="updatePrivacySetting('usageData', $event)" />
                </div>
                
                <Separator />
                
                <div class="flex items-center justify-between">
                  <div>
                    <Label>Notifications par email</Label>
                    <p class="text-sm text-muted-foreground">
                      Recevoir des notifications importantes par email
                    </p>
                  </div>
                  <Switch v-model:checked="privacy.emailNotifications" @update:checked="updatePrivacySetting('emailNotifications', $event)" />
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Onglet Préférences -->
          <div v-if="activeTab === 'preferences'" class="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Préférences d'interface</CardTitle>
                <CardDescription>
                  Personnalisez votre expérience utilisateur
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div>
                  <Label>Thème</Label>
                  <Select v-model="preferences.theme" @update:model-value="updateTheme">
                    <SelectTrigger class="w-48">
                      <SelectValue placeholder="Sélectionner un thème" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Clair</SelectItem>
                      <SelectItem value="dark">Sombre</SelectItem>
                      <SelectItem value="system">Système</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Langue</Label>
                  <Select v-model="preferences.language">
                    <SelectTrigger class="w-48">
                      <SelectValue placeholder="Sélectionner une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <Label>Mode compact</Label>
                    <p class="text-sm text-muted-foreground">
                      Affichage plus dense des listes
                    </p>
                  </div>
                  <Switch v-model:checked="preferences.compactMode" />
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Onglet Export/Import -->
          <div v-if="activeTab === 'export'" class="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exporter vos données</CardTitle>
                <CardDescription>
                  Téléchargez une copie chiffrée de vos mots de passe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <div>
                    <Label>Format d'export</Label>
                    <Select v-model="exportFormat">
                      <SelectTrigger class="w-48">
                        <SelectValue placeholder="Sélectionner un format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON chiffré</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button @click="exportData" :disabled="exporting">
                    <Download class="mr-2 h-4 w-4" />
                    {{ exporting ? 'Export en cours...' : 'Exporter' }}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Importer des données</CardTitle>
                <CardDescription>
                  Importez des mots de passe depuis un autre gestionnaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <div>
                    <Label for="importFile">Fichier à importer</Label>
                    <Input
                      id="importFile"
                      type="file"
                      accept=".json,.csv"
                      @change="handleFileUpload"
                    />
                  </div>
                  
                  <Button @click="importData" :disabled="importing || !importFile">
                    <Upload class="mr-2 h-4 w-4" />
                    {{ importing ? 'Import en cours...' : 'Importer' }}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Onglet Avancé -->
          <div v-if="activeTab === 'advanced'" class="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Options avancées</CardTitle>
                <CardDescription>
                  Paramètres pour utilisateurs expérimentés
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <div>
                  <Label>Durée de verrouillage automatique</Label>
                  <Select v-model="advanced.autoLockTimeout">
                    <SelectTrigger class="w-48">
                      <SelectValue placeholder="Sélectionner une durée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="0">Jamais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <Label>Mode développeur</Label>
                    <p class="text-sm text-muted-foreground">
                      Afficher des informations de débogage supplémentaires
                    </p>
                  </div>
                  <Switch v-model:checked="advanced.developerMode" />
                </div>
              </CardContent>
            </Card>
            
            <Card class="border-destructive">
              <CardHeader>
                <CardTitle class="text-destructive">Zone de danger</CardTitle>
                <CardDescription>
                  Actions irréversibles qui affecteront définitivement votre compte
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-4">
                <Button variant="destructive" @click="confirmDeleteAccount">
                  <Trash2 class="mr-2 h-4 w-4" />
                  Supprimer mon compte
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>

    <!-- Dialog de confirmation -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer le compte</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Tous vos mots de passe et données seront définitivement supprimés.
          </DialogDescription>
        </DialogHeader>
        
        <div class="space-y-4">
          <div>
            <Label>Tapez "SUPPRIMER" pour confirmer</Label>
            <Input v-model="deleteConfirmation" placeholder="SUPPRIMER" />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" @click="showDeleteConfirm = false">
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            @click="deleteAccount"
            :disabled="deleteConfirmation !== 'SUPPRIMER' || deleting"
          >
            {{ deleting ? 'Suppression...' : 'Supprimer définitivement' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ArrowLeft, Settings, User, Shield, Lock, Palette, Download, Wrench, Upload,
  Monitor, Trash2, Eye, EyeOff
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useToast } from '@/composables/useToast'

// Authentification
definePageMeta({
  middleware: 'auth'
})

// Composables
const { toast } = useToast()
const colorMode = useColorMode()

// État local
const activeTab = ref('profile')
const showDeleteConfirm = ref(false)
const deleteConfirmation = ref('')

// États des formulaires
const savingProfile = ref(false)
const changingPassword = ref(false)
const exporting = ref(false)
const importing = ref(false)
const deleting = ref(false)

// Données
const profile = ref({
  username: '',
  email: ''
})

const security = ref({
  twoFactorEnabled: false
})

const privacy = ref({
  activityLogs: true,
  usageData: false,
  emailNotifications: true
})

const preferences = ref({
  theme: 'dark',
  language: 'fr',
  compactMode: false
})

const advanced = ref({
  autoLockTimeout: '15',
  developerMode: false
})

const activeSessions = ref([])

// Formulaires
const profileForm = ref({
  username: '',
  email: ''
})

const passwordForm = ref({
  current: '',
  new: '',
  confirm: ''
})

const exportFormat = ref('json')
const importFile = ref(null)

// Actions
const updateProfile = async () => {
  savingProfile.value = true
  try {
    await $fetch('/api/user/profile', {
      method: 'PUT',
      body: profileForm.value,
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    toast({
      title: "Succès",
      description: "Profil mis à jour avec succès",
    })
    profile.value = { ...profileForm.value }
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de mettre à jour le profil",
      variant: "destructive"
    })
  } finally {
    savingProfile.value = false
  }
}

const changePassword = async () => {
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    toast({
      title: "Erreur",
      description: "Les mots de passe ne correspondent pas",
      variant: "destructive"
    })
    return
  }

  changingPassword.value = true
  try {
    await $fetch('/api/user/change-password', {
      method: 'POST',
      body: {
        currentPassword: passwordForm.value.current,
        newPassword: passwordForm.value.new
      },
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    toast({
      title: "Succès",
      description: "Mot de passe modifié avec succès",
    })
    passwordForm.value = { current: '', new: '', confirm: '' }
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de modifier le mot de passe",
      variant: "destructive"
    })
  } finally {
    changingPassword.value = false
  }
}

const enableTwoFactor = () => {
  navigateTo('/two-factor')
}

const disableTwoFactor = async () => {
  try {
    await $fetch('/api/user/two-factor/disable', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    security.value.twoFactorEnabled = false
    toast({
      title: "Succès",
      description: "2FA désactivé avec succès",
    })
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de désactiver le 2FA",
      variant: "destructive"
    })
  }
}

const revokeSession = async (sessionId: string) => {
  try {
    await $fetch(`/api/user/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    await loadActiveSessions()
    toast({
      title: "Succès",
      description: "Session révoquée avec succès",
    })
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de révoquer la session",
      variant: "destructive"
    })
  }
}

const revokeAllSessions = async () => {
  if (confirm('Êtes-vous sûr de vouloir révoquer toutes les sessions ?')) {
    try {
      await $fetch('/api/user/sessions', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${useCookie('auth-token').value}`
        }
      })
      toast({
        title: "Succès",
        description: "Toutes les sessions ont été révoquées",
      })
      // Rediriger vers la page de connexion
      await navigateTo('/login')
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de révoquer les sessions",
        variant: "destructive"
      })
    }
  }
}

const updatePrivacySetting = async (setting: string, value: boolean) => {
  try {
    await $fetch('/api/user/privacy', {
      method: 'PUT',
      body: { [setting]: value },
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de mettre à jour les paramètres",
      variant: "destructive"
    })
  }
}

const updateTheme = (theme: string) => {
  colorMode.preference = theme
  preferences.value.theme = theme
}

const exportData = async () => {
  exporting.value = true
  try {
    const response = await $fetch('/api/user/export', {
      method: 'POST',
      body: { format: exportFormat.value },
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    
    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logon-export-${new Date().toISOString().split('T')[0]}.${exportFormat.value}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Succès",
      description: "Données exportées avec succès",
    })
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible d'exporter les données",
      variant: "destructive"
    })
  } finally {
    exporting.value = false
  }
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  importFile.value = target.files?.[0] || null
}

const importData = async () => {
  if (!importFile.value) return
  
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    
    await $fetch('/api/user/import', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    
    toast({
      title: "Succès",
      description: "Données importées avec succès",
    })
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible d'importer les données",
      variant: "destructive"
    })
  } finally {
    importing.value = false
  }
}

const confirmDeleteAccount = () => {
  showDeleteConfirm.value = true
  deleteConfirmation.value = ''
}

const deleteAccount = async () => {
  if (deleteConfirmation.value !== 'SUPPRIMER') return
  
  deleting.value = true
  try {
    await $fetch('/api/user/delete', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    
    toast({
      title: "Compte supprimé",
      description: "Votre compte a été supprimé définitivement",
    })
    
    // Rediriger vers la page d'accueil
    await navigateTo('/')
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de supprimer le compte",
      variant: "destructive"
    })
  } finally {
    deleting.value = false
  }
}

// Utilitaires
const getPasswordStrength = (password: string): string => {
  if (!password) return 'Aucun'
  if (password.length < 8) return 'Faible'
  if (password.length < 12) return 'Moyen'
  if (password.length < 16) return 'Fort'
  return 'Très fort'
}

const getPasswordStrengthPercent = (password: string): number => {
  if (!password) return 0
  if (password.length < 8) return 25
  if (password.length < 12) return 50
  if (password.length < 16) return 75
  return 100
}

const getPasswordStrengthColor = (password: string): string => {
  const strength = getPasswordStrength(password)
  switch (strength) {
    case 'Faible': return 'bg-red-500'
    case 'Moyen': return 'bg-yellow-500'
    case 'Fort': return 'bg-green-500'
    case 'Très fort': return 'bg-green-600'
    default: return 'bg-muted'
  }
}

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Chargement des données
const loadProfile = async () => {
  try {
    const response = await $fetch('/api/user/profile', {
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    profile.value = response.user
    profileForm.value = { ...response.user }
  } catch (error) {
    console.error('Erreur lors du chargement du profil:', error)
  }
}

const loadSecuritySettings = async () => {
  try {
    const response = await $fetch('/api/user/security', {
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    security.value = response.security
  } catch (error) {
    console.error('Erreur lors du chargement des paramètres de sécurité:', error)
  }
}

const loadActiveSessions = async () => {
  try {
    const response = await $fetch('/api/user/sessions', {
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    activeSessions.value = response.sessions
  } catch (error) {
    console.error('Erreur lors du chargement des sessions:', error)
  }
}

// Chargement initial
onMounted(async () => {
  await Promise.all([
    loadProfile(),
    loadSecuritySettings(),
    loadActiveSessions()
  ])
})
</script>
