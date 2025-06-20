<!--
  Dashboard principal - Vue d'ensemble des mots de passe et groupes
  Architecture : Page principale après authentification avec métriques et actions rapides
-->
<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b border-border bg-card">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <Lock class="h-6 w-6 text-primary" />
              <h1 class="text-xl font-bold text-foreground">LogOn</h1>
            </div>
            <nav class="hidden md:flex space-x-4">
              <NuxtLink to="/dashboard" class="text-sm font-medium text-primary">
                Tableau de bord
              </NuxtLink>
              <NuxtLink to="/entries" class="text-sm font-medium text-muted-foreground hover:text-foreground">
                Mots de passe
              </NuxtLink>
              <NuxtLink to="/groups" class="text-sm font-medium text-muted-foreground hover:text-foreground">
                Groupes
              </NuxtLink>
            </nav>
          </div>
          <div class="flex items-center space-x-4">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon">
                  <User class="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="navigateTo('/profile')">
                  <User class="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem @click="navigateTo('/settings')">
                  <Settings class="mr-2 h-4 w-4" />
                  Paramètres
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="logout" class="text-destructive">
                  <LogOut class="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <!-- Métriques -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Mots de passe</CardTitle>
            <Key class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.totalEntries }}</div>
            <p class="text-xs text-muted-foreground">
              +{{ stats.newEntriesThisMonth }} ce mois
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Groupes</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.totalGroups }}</div>
            <p class="text-xs text-muted-foreground">
              {{ stats.memberGroups }} en tant que membre
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Sécurité</CardTitle>
            <Shield class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.securityScore }}%</div>
            <p class="text-xs text-muted-foreground">
              Score de sécurité
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Dernière sync</CardTitle>
            <RefreshCw class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.lastSync }}</div>
            <p class="text-xs text-muted-foreground">
              il y a quelques instants
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Actions rapides -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Mots de passe récents -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle>Mots de passe récents</CardTitle>
              <Button variant="outline" size="sm" @click="navigateTo('/entries')">
                Voir tout
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div v-for="entry in recentEntries" :key="entry.id" 
                   class="flex items-center justify-between p-3 border border-border rounded-lg">
                <div class="flex items-center space-x-3">
                  <div class="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Key class="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p class="font-medium">{{ entry.title }}</p>
                    <p class="text-sm text-muted-foreground">{{ entry.url }}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" @click="copyPassword(entry.id)">
                    <Copy class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" @click="editEntry(entry.id)">
                    <Edit class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Groupes actifs -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle>Groupes actifs</CardTitle>
              <Button variant="outline" size="sm" @click="navigateTo('/groups')">
                Gérer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div v-for="group in activeGroups" :key="group.id" 
                   class="flex items-center justify-between p-3 border border-border rounded-lg">
                <div class="flex items-center space-x-3">
                  <div class="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users class="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p class="font-medium">{{ group.name }}</p>
                    <p class="text-sm text-muted-foreground">
                      {{ group.memberCount }} membres • {{ group.entryCount }} entrées
                    </p>
                  </div>
                </div>
                <Badge :variant="group.role === 'admin' ? 'default' : 'secondary'">
                  {{ group.role === 'admin' ? 'Admin' : 'Membre' }}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Bouton d'action rapide -->
      <div class="fixed bottom-6 right-6">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="lg" class="rounded-full shadow-lg">
              <Plus class="h-5 w-5 mr-2" />
              Créer
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="createNewEntry">
              <Key class="mr-2 h-4 w-4" />
              Nouveau mot de passe
            </DropdownMenuItem>
            <DropdownMenuItem @click="createNewGroup">
              <Users class="mr-2 h-4 w-4" />
              Nouveau groupe
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { 
  Lock, User, Settings, LogOut, Key, Users, Shield, RefreshCw, 
  Plus, Copy, Edit 
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

// Authentification
const { logout: authLogout } = useAuth()
const { toast } = useToast()

// Données du dashboard
const stats = ref({
  totalEntries: 0,
  newEntriesThisMonth: 0,
  totalGroups: 0,
  memberGroups: 0,
  securityScore: 0,
  lastSync: 'Maintenant'
})

const recentEntries = ref([])
const activeGroups = ref([])

// Actions
const logout = async () => {
  try {
    await authLogout()
    await navigateTo('/login')
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de se déconnecter",
      variant: "destructive"
    })
  }
}

const copyPassword = async (entryId: string) => {
  try {
    // Logique de copie du mot de passe
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

const editEntry = (entryId: string) => {
  navigateTo(`/entries/${entryId}`)
}

const createNewEntry = () => {
  navigateTo('/entries/new')
}

const createNewGroup = () => {
  navigateTo('/groups/new')
}

// Chargement des données
const loadDashboardData = async () => {
  try {
    // Chargement des statistiques
    const response = await $fetch('/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    
    stats.value = response.stats
    recentEntries.value = response.recentEntries
    activeGroups.value = response.activeGroups
    
  } catch (error) {
    console.error('Erreur lors du chargement du dashboard:', error)
    toast({
      title: "Erreur",
      description: "Impossible de charger les données du dashboard",
      variant: "destructive"
    })
  }
}

// Middleware d'authentification
definePageMeta({
  middleware: 'auth'
})

// Chargement initial
onMounted(() => {
  loadDashboardData()
})
</script>
