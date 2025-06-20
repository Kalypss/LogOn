<!--
  Page de gestion des groupes
  Architecture : Gestion complète des groupes avec partage sécurisé et permissions
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
              <Users class="h-6 w-6 text-primary" />
              <h1 class="text-xl font-bold text-foreground">Groupes</h1>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <Button @click="openCreateGroup">
              <Plus class="h-4 w-4 mr-2" />
              Nouveau groupe
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <!-- Statistiques -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Groupes créés</CardTitle>
            <Crown class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ adminGroups.length }}</div>
            <p class="text-xs text-muted-foreground">
              Vous êtes administrateur
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Membre de</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ memberGroups.length }}</div>
            <p class="text-xs text-muted-foreground">
              Groupes où vous êtes membre
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Entrées partagées</CardTitle>
            <Share class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ totalSharedEntries }}</div>
            <p class="text-xs text-muted-foreground">
              Mots de passe dans tous les groupes
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Liste des groupes -->
      <div class="space-y-4">
        <div v-if="groups.length === 0" class="text-center py-8">
          <Users class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 class="text-lg font-medium text-foreground mb-2">Aucun groupe trouvé</h3>
          <p class="text-muted-foreground mb-4">
            Créez votre premier groupe pour commencer à partager des mots de passe en toute sécurité.
          </p>
          <Button @click="openCreateGroup">
            <Plus class="h-4 w-4 mr-2" />
            Créer un groupe
          </Button>
        </div>

        <Card v-for="group in groups" :key="group.id" class="hover:shadow-md transition-shadow">
          <CardContent class="p-6">
            <div class="flex items-start justify-between">
              <div class="flex items-start space-x-4 flex-1">
                <!-- Avatar du groupe -->
                <div class="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users class="h-6 w-6 text-primary" />
                </div>
                
                <!-- Informations du groupe -->
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <h3 class="font-medium text-foreground text-lg">{{ group.name }}</h3>
                    <Badge :variant="group.role === 'admin' ? 'default' : 'secondary'">
                      {{ group.role === 'admin' ? 'Administrateur' : 'Membre' }}
                    </Badge>
                    <Badge v-if="group.isPending" variant="outline">
                      En attente
                    </Badge>
                  </div>
                  
                  <p class="text-sm text-muted-foreground mt-1">{{ group.description }}</p>
                  
                  <div class="flex items-center space-x-6 mt-3">
                    <div class="flex items-center space-x-1">
                      <User class="h-4 w-4 text-muted-foreground" />
                      <span class="text-sm text-muted-foreground">
                        {{ group.memberCount }} membre{{ group.memberCount > 1 ? 's' : '' }}
                      </span>
                    </div>
                    <div class="flex items-center space-x-1">
                      <Key class="h-4 w-4 text-muted-foreground" />
                      <span class="text-sm text-muted-foreground">
                        {{ group.entryCount }} entrée{{ group.entryCount > 1 ? 's' : '' }}
                      </span>
                    </div>
                    <div class="flex items-center space-x-1">
                      <Clock class="h-4 w-4 text-muted-foreground" />
                      <span class="text-sm text-muted-foreground">
                        Créé {{ formatDate(group.createdAt) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center space-x-2">
                <Button variant="outline" size="sm" @click="viewGroup(group)">
                  <Eye class="h-4 w-4 mr-2" />
                  Voir
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="manageMembers(group)" :disabled="group.role !== 'admin'">
                      <UserPlus class="mr-2 h-4 w-4" />
                      Gérer les membres
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="editGroup(group)" :disabled="group.role !== 'admin'">
                      <Edit class="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="inviteToGroup(group)" :disabled="group.role !== 'admin'">
                      <Mail class="mr-2 h-4 w-4" />
                      Inviter
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem @click="handleLeaveGroup(group)" v-if="group.role !== 'admin'">
                      <LogOut class="mr-2 h-4 w-4" />
                      Quitter
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="handleDeleteGroup(group)" v-else class="text-destructive">
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

    <!-- Dialog de création/édition de groupe -->
    <Dialog v-model:open="isGroupDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {{ editingGroup ? 'Modifier le groupe' : 'Nouveau groupe' }}
          </DialogTitle>
        </DialogHeader>
        
        <form @submit.prevent="saveGroup" class="space-y-4">
          <div>
            <Label for="groupName">Nom du groupe</Label>
            <Input
              id="groupName"
              v-model="groupForm.name"
              placeholder="Équipe, Famille, Projet..."
              required
            />
          </div>
          
          <div>
            <Label for="groupDescription">Description</Label>
            <Textarea
              id="groupDescription"
              v-model="groupForm.description"
              placeholder="Description du groupe"
              rows="3"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" @click="isGroupDialogOpen = false">
              Annuler
            </Button>
            <Button type="submit" :disabled="saving">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog d'invitation -->
    <Dialog v-model:open="isInviteDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter au groupe</DialogTitle>
          <DialogDescription>
            Inviter un utilisateur à rejoindre {{ selectedGroup?.name }}
          </DialogDescription>
        </DialogHeader>
        
        <form @submit.prevent="sendInvite" class="space-y-4">
          <div>
            <Label for="inviteEmail">Email ou nom d'utilisateur</Label>
            <Input
              id="inviteEmail"
              v-model="inviteForm.email"
              placeholder="utilisateur@example.com"
              required
            />
          </div>
          
          <div>
            <Label for="inviteRole">Rôle</Label>
            <Select v-model="inviteForm.role">
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membre</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label for="inviteMessage">Message (optionnel)</Label>
            <Textarea
              id="inviteMessage"
              v-model="inviteForm.message"
              placeholder="Message d'invitation personnalisé"
              rows="3"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" @click="isInviteDialogOpen = false">
              Annuler
            </Button>
            <Button type="submit" :disabled="sending">
              {{ sending ? 'Envoi...' : 'Envoyer l\'invitation' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog de gestion des membres -->
    <Dialog v-model:open="isMembersDialogOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Membres de {{ selectedGroup?.name }}</DialogTitle>
        </DialogHeader>
        
        <div class="space-y-4 max-h-96 overflow-y-auto">
          <div v-for="member in groupMembers" :key="member.id" 
               class="flex items-center justify-between p-3 border border-border rounded-lg">
            <div class="flex items-center space-x-3">
              <div class="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User class="h-4 w-4 text-primary" />
              </div>
              <div>
                <p class="font-medium">{{ member.username }}</p>
                <p class="text-sm text-muted-foreground">{{ member.email }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <Badge :variant="member.role === 'admin' ? 'default' : 'secondary'">
                {{ member.role === 'admin' ? 'Admin' : 'Membre' }}
              </Badge>
              <DropdownMenu v-if="selectedGroup?.role === 'admin' && member.id !== currentUserId">
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click="changeRole(member)">
                    <Crown class="mr-2 h-4 w-4" />
                    {{ member.role === 'admin' ? 'Rétrograder' : 'Promouvoir' }}
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="handleRemoveMember(member)" class="text-destructive">
                    <UserMinus class="mr-2 h-4 w-4" />
                    Retirer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button @click="isMembersDialogOpen = false">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  ArrowLeft, Users, Plus, Eye, MoreHorizontal, UserPlus, Edit, Mail, LogOut, Trash2,
  Crown, Share, User, Key, Clock, UserMinus
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogDescription,
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
import { useToast } from '@/composables/useToast'

// Authentification
definePageMeta({
  middleware: 'auth'
})

// Composables
const { toast } = useToast()
const { groups, fetchGroups, createGroup, updateGroup, deleteGroup, getGroupMembers } = useGroups()

// État local
const groupMembers = ref([])
const currentUserId = ref('')
const isGroupDialogOpen = ref(false)
const isInviteDialogOpen = ref(false)
const isMembersDialogOpen = ref(false)
const editingGroup = ref(null)
const selectedGroup = ref(null)
const saving = ref(false)
const sending = ref(false)

// Formulaires
const groupForm = ref({
  name: '',
  description: ''
})

const inviteForm = ref({
  email: '',
  role: 'member',
  message: ''
})

// Données calculées
const adminGroups = computed(() => 
  groups.value.filter(group => group.role === 'admin')
)

const memberGroups = computed(() => 
  groups.value.filter(group => group.role === 'member')
)

const totalSharedEntries = computed(() => 
  groups.value.reduce((total, group) => total + group.entryCount, 0)
)

// Actions
const openCreateGroup = () => {
  editingGroup.value = null
  groupForm.value = {
    name: '',
    description: ''
  }
  isGroupDialogOpen.value = true
}

const editGroup = (group: any) => {
  editingGroup.value = group
  groupForm.value = {
    name: group.name,
    description: group.description
  }
  isGroupDialogOpen.value = true
}

const saveGroup = async () => {
  saving.value = true
  try {
    if (editingGroup.value) {
      // Modifier le groupe
      await $fetch(`/api/groups/${editingGroup.value.id}`, {
        method: 'PUT',
        body: groupForm.value,
        headers: {
          Authorization: `Bearer ${useCookie('auth-token').value}`
        }
      })
      toast({
        title: "Succès",
        description: "Groupe modifié avec succès",
      })
    } else {
      // Créer le groupe
      await $fetch('/api/groups', {
        method: 'POST',
        body: groupForm.value,
        headers: {
          Authorization: `Bearer ${useCookie('auth-token').value}`
        }
      })
      toast({
        title: "Succès",
        description: "Groupe créé avec succès",
      })
    }
    isGroupDialogOpen.value = false
    await loadGroups()
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de sauvegarder le groupe",
      variant: "destructive"
    })
  } finally {
    saving.value = false
  }
}

const viewGroup = (group: any) => {
  navigateTo(`/groups/${group.id}`)
}

const manageMembers = async (group: any) => {
  selectedGroup.value = group
  await loadGroupMembers(group.id)
  isMembersDialogOpen.value = true
}

const inviteToGroup = (group: any) => {
  selectedGroup.value = group
  inviteForm.value = {
    email: '',
    role: 'member',
    message: ''
  }
  isInviteDialogOpen.value = true
}

const sendInvite = async () => {
  sending.value = true
  try {
    await $fetch(`/api/groups/${selectedGroup.value.id}/invite`, {
      method: 'POST',
      body: inviteForm.value,
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    toast({
      title: "Succès",
      description: "Invitation envoyée avec succès",
    })
    isInviteDialogOpen.value = false
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible d'envoyer l'invitation",
      variant: "destructive"
    })
  } finally {
    sending.value = false
  }
}

const changeRole = async (member: any) => {
  try {
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    await $fetch(`/api/groups/${selectedGroup.value.id}/members/${member.id}/role`, {
      method: 'PUT',
      body: { role: newRole },
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    toast({
      title: "Succès",
      description: `Rôle de ${member.username} modifié avec succès`,
    })
    await loadGroupMembers(selectedGroup.value.id)
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible de modifier le rôle",
      variant: "destructive"
    })
  }
}

const handleRemoveMember = async (member: any) => {
  if (confirm(`Êtes-vous sûr de vouloir retirer ${member.username} du groupe ?`)) {
    try {
      await $fetch(`/api/groups/${selectedGroup.value.id}/members/${member.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${useCookie('auth-token').value}`
        }
      })
      toast({
        title: "Succès",
        description: `${member.username} a été retiré du groupe`,
      })
      await loadGroupMembers(selectedGroup.value.id)
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de retirer le membre",
        variant: "destructive"
      })
    }
  }
}

const handleLeaveGroup = async (group: any) => {
  if (confirm(`Êtes-vous sûr de vouloir quitter le groupe "${group.name}" ?`)) {
    try {
      await $fetch(`/api/groups/${group.id}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${useCookie('auth-token').value}`
        }
      })
      toast({
        title: "Succès",
        description: "Vous avez quitté le groupe avec succès",
      })
      await loadGroups()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de quitter le groupe",
        variant: "destructive"
      })
    }
  }
}

const handleDeleteGroup = async (group: any) => {
  if (confirm(`Êtes-vous sûr de vouloir supprimer le groupe "${group.name}" ? Cette action est irréversible.`)) {
    try {
      await $fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${useCookie('auth-token').value}`
        }
      })
      toast({
        title: "Succès",
        description: "Groupe supprimé avec succès",
      })
      await loadGroups()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le groupe",
        variant: "destructive"
      })
    }
  }
}

// Chargement des données
const loadGroups = async () => {
  try {
    const response = await $fetch('/api/groups', {
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    groups.value = response.groups
  } catch (error) {
    console.error('Erreur lors du chargement des groupes:', error)
    toast({
      title: "Erreur",
      description: "Impossible de charger les groupes",
      variant: "destructive"
    })
  }
}

const loadGroupMembers = async (groupId: string) => {
  try {
    const response = await $fetch(`/api/groups/${groupId}/members`, {
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    groupMembers.value = response.members
  } catch (error) {
    console.error('Erreur lors du chargement des membres:', error)
    toast({
      title: "Erreur",
      description: "Impossible de charger les membres du groupe",
      variant: "destructive"
    })
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
onMounted(async () => {
  await loadGroups()
  // Charger l'ID de l'utilisateur actuel
  try {
    const response = await $fetch('/api/user/profile', {
      headers: {
        Authorization: `Bearer ${useCookie('auth-token').value}`
      }
    })
    currentUserId.value = response.user.id
  } catch (error) {
    console.error('Erreur lors du chargement du profil utilisateur:', error)
  }
})
</script>
