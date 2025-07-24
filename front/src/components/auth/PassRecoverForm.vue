<script setup lang="ts">
/**
 * Composant de récupération de mot de passe Logon
 * - Validation du champ username
 * - Animation bouton submit
 * - Redirection dynamique compatible Astro et Vue
 */
import { ref } from 'vue'
import { Fingerprint } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const username = ref('')
const error = ref('')
const inputError = ref(false)

/**
 * Gère la soumission du formulaire de récupération.
 * Affiche une erreur si le champ est vide, sinon redirige dynamiquement.
 */
function handleSubmit(e: Event) {
  e.preventDefault()
  if (!username.value.trim()) {
    error.value = 'Enter your username first'
    inputError.value = true
    return
  }
  error.value = ''
  inputError.value = false
  window.location.href = `/auth/recovery-code-enter/${encodeURIComponent(username.value)}`
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <form @submit="handleSubmit">
      <div class="flex flex-col gap-6">
        <div class="flex flex-col items-center gap-2">
          <a href="#" class="flex flex-col items-center gap-2 font-medium">
            <div class="flex justify-center flex-col items-center gap-1.5">
                <Fingerprint class="inline-block align-middle" />
                <h1 class="text-3xl tracking-tight items-center justify-center">Logon · Recover</h1>
            </div>
            <span class="sr-only">Logon.</span>
          </a>
          <h1 class="text-md font-bold">
            Recover your password
          </h1>
        </div>
        <div class="flex flex-col gap-6">
          <div class="grid gap-2">
            <Label html-for="username" class="ml-2">Username</Label>
            <Input
              id="username"
              v-model="username"
              :class="[
                'transition-all',
                inputError ? 'border-red-500 focus:border-red-500 ring-2 ring-red-300' : ''
              ]"
              type="text"
              placeholder="John Doe"
              @input="inputError = false"
            />
            <span v-if="error" class="text-red-500 text-sm mt-1">{{ error }}</span>
          </div>
          <Button
            type="submit"
            class="w-full cursor-pointer active:scale-95 active:shadow-inner transition-transform group"
          >
            Recover
          </Button>
        </div>
      </div>
    </form>
    <div class="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
      Don't forget to check the project on <a href="https://github.com/Kalypss/LogOn">Github</a>.<br>
      This project is open source and contributions are welcome!<br>
      This app may have some bugs, please report them on the <a href="https://github.com/Kalypss/LogOn/issues">issues page</a>.
    </div>
  </div>
</template>


<style>

@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');

*{
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.05px;
}

h1{
    font-family: 'Inter', sans-serif;
	font-weight: 600;
}

</style>