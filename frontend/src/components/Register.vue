<script lang="ts">
export const description
  = 'A sign up form with first name, last name, email and password inside a card. There\'s an option to sign up with GitHub and a link to login if you already have an account'
export const iframeHeight = '600px'
export const containerClass = 'w-full h-screen flex items-center justify-center px-4'
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { EyeClosed, Eye } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

const showPassword = ref(false)
const password = ref('')
const confirmPassword = ref('')

const passwordStrength = computed(() => {
  const val = password.value
  let score = 0
  if (val.length >= 8) score++
  if (/[A-Z]/.test(val)) score++
  if (/[0-9]/.test(val)) score++
  if (/[^A-Za-z0-9]/.test(val)) score++
  if (val.length >= 12) score++
  if (score <= 1) return { label: 'Faible', color: 'bg-red-500' }
  if (score === 2) return { label: 'Moyen', color: 'bg-yellow-400' }
  if (score === 3 || score === 4) return { label: 'Fort', color: 'bg-green-500' }
  return { label: 'Très fort', color: 'bg-blue-600' }
})

const strengthIndex = computed(() => {
  switch (passwordStrength.value.label) {
    case 'Faible': return 1
    case 'Moyen': return 2
    case 'Fort': return 3
    case 'Très fort': return 4
    default: return 0
  }
})

const passwordMatch = computed(() => {
  if (!confirmPassword.value) return null
  return confirmPassword.value === password.value
})
</script>

<template>
  <Card class="max-w-sm">
    <CardHeader>
      <CardTitle class="text-xl">
        Sign Up
      </CardTitle>
      <CardDescription>
        Enter your information to create an account
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid gap-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="first-name">First name</Label>
            <Input id="first-name" placeholder="John" required />
          </div>
          <div class="grid gap-2">
            <Label for="last-name">Last name</Label>
            <Input id="last-name" placeholder="Doe" required />
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="johndoe"
            required
          />
        </div>
        <div class="grid gap-2">
          <Label html-for="password" class="ml-2 flex items-center gap-2">Password
            <Badge v-if="password.length" :class="[passwordStrength.color, 'text-white text-sm ']">
              {{ passwordStrength.label }}
            </Badge>
          </Label>
          <div class="relative">
            <Input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
              class="pr-10"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition duration-200 active:scale-110 focus:scale-110"
              @click="showPassword = !showPassword"
              aria-label="Afficher/Masquer le mot de passe"
              tabindex="0"
            >
              <component :is="showPassword ? Eye : EyeClosed" class="w-5 h-5 transition-transform duration-200 cursor-pointer" :class="showPassword ? 'scale-110' : 'scale-100 rotate-0'" />
            </button>
          </div>
          <div class="flex flex-row gap-1 mt-1 w-full">
            <div v-for="i in 4" :key="i"
              :class="[
                'h-2 rounded transition-all flex-1',
                password.length > 0 && i <= strengthIndex ? passwordStrength.color : 'bg-gray-200'
              ]"
            ></div>
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="confirm-password" class="ml-2 flex items-center gap-2">Confirm password
            <Badge v-if="confirmPassword.length" :class="[passwordMatch === null ? 'bg-gray-300' : passwordMatch ? 'bg-green-500' : 'bg-red-500', 'text-white']">
              {{ passwordMatch === null ? '' : passwordMatch ? 'Same' : 'Not the same' }}
            </Badge>
          </Label>
          <div class="relative">
            <Input
              id="confirm-password"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
              class="pr-10"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition duration-200 active:scale-110 focus:scale-110"
              @click="showPassword = !showPassword"
              aria-label="Afficher/Masquer le mot de passe"
              tabindex="0"
            >
              <component :is="showPassword ? Eye : EyeClosed" class="w-5 h-5 transition-transform duration-200 cursor-pointer" :class="showPassword ? 'scale-110' : 'scale-100 rotate-0'" />
            </button>
          </div>
        </div>
        <Button type="submit" class="w-full cursor-pointer active:scale-95 active:shadow-inner transition-transform group">
          Create an account
        </Button>
      </div>
      <div class="mt-4 text-center text-sm">
        Already have an account?
        <a href="#" class="underline">
          Sign in
        </a>
      </div>
    </CardContent>
  </Card>
</template>
