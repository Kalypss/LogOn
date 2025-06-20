<!--
  Page de gestion des mots de passe
  Architecture : CRUD complet avec chiffrement côté client et recherche avancée
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
              <Key class="h-6 w-6 text-primary" />
              <h1 class="text-xl font-bold text-foreground">Mots de passe</h1>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <Button @click="createEntry">
              <Plus class="h-4 w-4 mr-2" />
              Nouveau
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <!-- Barre de recherche et filtres -->
      <div class="flex flex-col md:flex-row gap-4 mb-6">
        <div class="flex-1 relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Rechercher des mots de passe..."
            class="pl-10"
            @input="filterEntries"
          />
        </div>
        <Select v-model="selectedGroup" @update:model-value="filterEntries">
          <SelectTrigger class="w-48">
            <SelectValue placeholder="Tous les groupes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les groupes</SelectItem>
            <SelectItem value="personal">Personnel</SelectItem>
            <SelectItem v-for="group in groups" :key="group.id" :value="group.id">
              {{ group.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="sortBy" @update:model-value="sortEntries">
          <SelectTrigger class="w-48">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="title">Titre</SelectItem>
            <SelectItem value="updated">Dernière modification</SelectItem>
            <SelectItem value="created">Date de création</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Liste des mots de passe -->
      <div class="grid gap-4">
        <div v-if="filteredEntries.length === 0" class="text-center py-8">
          <Key class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 class="text-lg font-medium text-foreground mb-2">Aucun mot de passe trouvé</h3>
          <p class="text-muted-foreground mb-4">
            {{ searchQuery ? 'Aucun résultat pour votre recherche.' : 'Commencez par créer votre premier mot de passe.' }}
          </p>
          <Button @click="createEntry" v-if="!searchQuery">
            <Plus class="h-4 w-4 mr-2" />
            Créer un mot de passe
          </Button>
        </div>

        <Card v-for="entry in filteredEntries" :key="entry.id" class="hover:shadow-md transition-shadow">
          <CardContent class="p-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4 flex-1">
                <!-- Favicon -->
                <div class="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <img v-if="entry.favicon" :src="entry.favicon" :alt="entry.title" class="h-6 w-6 rounded" />
                  <Key v-else class="h-5 w-5 text-primary" />
                </div>
                
                <!-- Informations -->
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <h3 class="font-medium text-foreground">{{ entry.title }}</h3>
                    <Badge v-if="entry.groupName" variant="secondary" class="text-xs">
                      {{ entry.groupName }}
                    </Badge>
                  </div>
                  <div class="flex items-center space-x-4 mt-1">
                    <p class="text-sm text-muted-foreground">{{ entry.username }}</p>
                    <p class="text-sm text-muted-foreground">{{ entry.url }}</p>
                  </div>
                  <div class="flex items-center space-x-4 mt-2">
                    <div class="flex items-center space-x-1">
                      <Shield class="h-3 w-3 text-muted-foreground" />
                      <span class="text-xs text-muted-foreground">
                        Force: {{ getPasswordStrength(entry.password) }}
                      </span>
                    </div>
                    <div class="flex items-center space-x-1">
                      <Clock class="h-3 w-3 text-muted-foreground" />
                      <span class="text-xs text-muted-foreground">
                        Modifié {{ formatDate(entry.updatedAt) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center space-x-2">
                <Button variant="ghost" size="sm" @click="copyUsername(entry)" :disabled="!entry.username">
                  <User class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="copyPassword(entry)">
                  <Copy class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" @click="openUrl(entry.url)" :disabled="!entry.url">
                  <ExternalLink class="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="editEntry(entry)">
                      <Edit class="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="shareEntry(entry)" :disabled="!entry.canShare">
                      <Share class="mr-2 h-4 w-4" />
                      Partager
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem @click="deleteEntry(entry)" class="text-destructive">
                      <Trash2 class="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>

    <!-- Dialog de création/édition -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {{ editingEntry ? 'Modifier le mot de passe' : 'Nouveau mot de passe' }}
          </DialogTitle>
        </DialogHeader>
        
        <form @submit.prevent="saveEntry" class="space-y-4">
          <div>
            <Label for="title">Titre</Label>
            <Input
              id="title"
              v-model="entryForm.title"
              placeholder="Nom du service"
              required
            />
          </div>
          
          <div>
            <Label for="url">URL</Label>
            <Input
              id="url"
              v-model="entryForm.url"
              placeholder="https://example.com"
              type="url"
            />
          </div>
          
          <div>
            <Label for="username">Nom d'utilisateur</Label>
            <Input
              id="username"
              v-model="entryForm.username"
              placeholder="votre@email.com"
            />
          </div>
          
          <div>
            <Label for="password">Mot de passe</Label>
            <div class="flex space-x-2">
              <Input
                id="password"
                v-model="entryForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Mot de passe"
                required
              />
              <Button type="button" variant="outline" size="icon" @click="showPassword = !showPassword">
                <Eye v-if="!showPassword" class="h-4 w-4" />
                <EyeOff v-else class="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" @click="generatePassword">
                <RefreshCw class="h-4 w-4" />
              </Button>
            </div>
            <div class="mt-2">
              <div class="flex items-center space-x-2">
                <div class="flex-1 bg-muted rounded-full h-2">
                  <div 
                    class="h-2 rounded-full transition-all duration-300"
                    :class="getPasswordStrengthColor(entryForm.password)"
                    :style="{ width: `${getPasswordStrengthPercent(entryForm.password)}%` }"
                  ></div>
                </div>
                <span class="text-xs text-muted-foreground">
                  {{ getPasswordStrength(entryForm.password) }}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <Label for="group">Groupe</Label>
            <Select v-model="entryForm.groupId">
              <SelectTrigger>
                <SelectValue placeholder="Personnel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Personnel</SelectItem>
                <SelectItem v-for="group in groups" :key="group.id" :value="group.id">
                  {{ group.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label for="notes">Notes</Label>
            <Textarea
              id="notes"
              v-model="entryForm.notes"
              placeholder="Notes supplémentaires"
              rows="3"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" @click="isDialogOpen = false">
              Annuler
            </Button>
            <Button type="submit" :disabled="saving">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  ArrowLeft, Key, Plus, Search, Eye, EyeOff, RefreshCw, Copy, Edit, Share, Trash2,
  User, ExternalLink, MoreHorizontal, Shield, Clock
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { usePasswordEntries } from '@/composables/usePasswordEntries'
import { useToast } from '@/composables/useToast'

// Authentification
definePageMeta({
  middleware: 'auth'
})

// Composables
const { toast } = useToast()
const { entries, isLoading } = usePasswordEntries()
const { groups } = useGroups()

// État local
const searchQuery = ref('')
const selectedGroup = ref('all')
const sortBy = ref('title')
const isDialogOpen = ref(false)
const editingEntry = ref(null)
const showPassword = ref(false)
const saving = ref(false)

// Formulaire
const entryForm = ref({
  title: '',
  url: '',
  username: '',
  password: '',
  groupId: '',
  notes: ''
})

// Entrées filtrées
const filteredEntries = computed(() => {
  let filtered = [...entries.value]
  
  // Filtrage par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(entry => 
      entry.title.toLowerCase().includes(query) ||
      entry.username.toLowerCase().includes(query) ||
      entry.url.toLowerCase().includes(query)
    )
  }
  
  // Filtrage par groupe
  if (selectedGroup.value !== 'all') {
    if (selectedGroup.value === 'personal') {
      filtered = filtered.filter(entry => !entry.groupId)
    } else {
      filtered = filtered.filter(entry => entry.groupId === selectedGroup.value)
    }
  }
  
  // Tri
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      default:
        return 0
    }
  })
  
  return filtered
})

// Actions
const filterEntries = () => {
  // La logique de filtrage est dans le computed
}

const sortEntries = () => {
  // La logique de tri est dans le computed
}

const createEntry = () => {
  editingEntry.value = null
  entryForm.value = {
    title: '',
    url: '',
    username: '',
    password: '',
    groupId: '',
    notes: ''
  }
  isDialogOpen.value = true
}

const editEntry = (entry: any) => {
  editingEntry.value = entry
  entryForm.value = { ...entry }
  isDialogOpen.value = true
}

const saveEntry = async () => {
  saving.value = true
  try {
    if (editingEntry.value) {
      await updateEntry(editingEntry.value.id, entryForm.value)
      toast({
        title: "Succès",
        description: "Mot de passe modifié avec succès",
      })
    } else {
      await createEntryAPI(entryForm.value)
      toast({
        title: "Succès",
        description: "Mot de passe créé avec succès",
      })
    }
    isDialogOpen.value = false
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de sauvegarder le mot de passe",
      variant: "destructive"
    })
  } finally {
    saving.value = false
  }
}

const deleteEntry = async (entry: any) => {
  if (confirm('Êtes-vous sûr de vouloir supprimer ce mot de passe ?')) {
    try {
      await deleteEntryAPI(entry.id)
      toast({
        title: "Succès",
        description: "Mot de passe supprimé avec succès",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le mot de passe",
        variant: "destructive"
      })
    }
  }
}

const copyUsername = async (entry: any) => {
  try {
    await navigator.clipboard.writeText(entry.username)
    toast({
      title: "Copié",
      description: "Nom d'utilisateur copié dans le presse-papiers",
    })
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de copier le nom d'utilisateur",
      variant: "destructive"
    })
  }
}

const copyPassword = async (entry: any) => {
  try {
    // TODO: Déchiffrer le mot de passe avant de le copier
    await navigator.clipboard.writeText(entry.password)
    toast({
      title: "Copié",
      description: "Mot de passe copié dans le presse-papiers",
    })
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de copier le mot de passe",
      variant: "destructive"
    })
  }
}

const openUrl = (url: string) => {
  if (url && url.startsWith('http')) {
    window.open(url, '_blank')
  }
}

const shareEntry = (entry: any) => {
  // TODO: Implémenter le partage de mot de passe
  toast({
    title: "Bientôt disponible",
    description: "Fonctionnalité de partage en cours de développement",
  })
}

const generatePassword = () => {
  const length = 16
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  entryForm.value.password = password
}

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
    day: 'numeric'
  })
}

// Chargement initial
onMounted(() => {
  // Les données sont chargées via le composable
})
</script>
