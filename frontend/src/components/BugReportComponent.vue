
<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { BadgeAlert , Check} from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const email = ref('')
const title = ref('')
const description = ref('')
const submitted = ref(false)
const error = ref('')

function resetForm() {
  email.value = ''
  title.value = ''
  description.value = ''
  submitted.value = false
  error.value = ''
}

function submitBug() {
  error.value = ''
  if (!title.value || !description.value) {
    error.value = 'Titre et description obligatoires.'
    return
  }
  // Ici, tu pourrais envoyer le bug à une API ou Github
  submitted.value = true
}
</script>

<template>
<Dialog @close="resetForm">
  <DialogTrigger>
    <Button variant="destructive" class="w-full cursor-pointer active:scale-95 active:shadow-inner transition-transform group">
       <BadgeAlert class="mr-2" /> Signaler un bug
    </Button>
  </DialogTrigger>
  <DialogContent class="">
    <DialogHeader>
      <DialogTitle>Signaler un bug</DialogTitle>
      <DialogDescription>
        Merci de décrire le problème rencontré. Les champs marqués * sont obligatoires.
      </DialogDescription>
    </DialogHeader>
    <form @submit.prevent="submitBug" class="grid gap-4 py-4">
      <div class="grid gap-2">
        <Label for="bug-title">Titre *</Label>
        <Input id="bug-title" v-model="title" placeholder="Ex: Erreur lors de la connexion" required />
      </div>
      <div class="grid gap-2">
        <Label for="bug-desc">Description *</Label>
        <textarea id="bug-desc" v-model="description" rows="4" required class="border border-border rounded-md p-2 bg-background text-foreground resize-y" placeholder="Décris le bug, les étapes pour le reproduire, etc."></textarea>
      </div>
      <div class="grid gap-2">
        <Label for="bug-email">Email (optionnel)</Label>
        <Input id="bug-email" v-model="email" type="email" placeholder="ton@email.com" />
      </div>
      <div v-if="error" class="text-red-500 text-sm">{{ error }}</div>
      <div v-if="submitted" class="text-green-600 text-md flex items-center gap-2"><Check color="#8ff0a4" />Merci pour ton retour !</div>
      <DialogFooter>
        <Button type="submit" :disabled="submitted">
          Envoyer
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
</template>