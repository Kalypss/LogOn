<script setup lang="ts">
import { ref } from 'vue'
import { Fingerprint, EyeClosed, Eye } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const showPassword = ref(false)
</script>

<template>
  <div class="flex flex-col gap-6">
    <form method="post">
      <div class="flex flex-col gap-6">
        <div class="flex flex-col items-center gap-2">

          <div class="flex h-8 w-8 items-center justify-center rounded-md">
            <Fingerprint class="size-6" />
          </div>
          <span class="sr-only">Logon.</span>

          <h1 class="text-xl font-bold">
            Welcome to Logon
          </h1>
          <div class="text-center text-sm">
            Don't have an account?
            <a href="/auth/register" class="underline underline-offset-4">
              Sign up
            </a>
          </div>
        </div>
        <div class="flex flex-col gap-6">
          <div class="grid gap-2">
            <Label html-for="username" class="ml-2">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="John Doe"
              required
            />
          </div>
          <div class="grid gap-2">
            <Label html-for="password" class="ml-2">Password</Label>
            <div class="relative">
              <Input
                id="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                required
                class="pr-10"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition duration-200"
                @click="showPassword = !showPassword"
                aria-label="Afficher/Masquer le mot de passe"
                tabindex="0"
              >
                <component :is="showPassword ? Eye : EyeClosed" class="w-5 h-5 transition-transform duration-200 cursor-pointer" :class="showPassword ? 'scale-110' : 'scale-100 rotate-0'" />
              </button>
            </div>
          </div>
          <Button type="submit" class="w-full">
            Login
          </Button>
        </div>
        <div class="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span class="relative z-10 bg-background px-2 text-muted-foreground">
            Or
          </span>
        </div>
         

      </div>
    </form>
    <Button variant="outline" class="w-full cursor-pointer">
      <a href="/auth/forgot-password">I forgot my password ?</a>
    </Button>
    <div class="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4">
     Don't forget to check the project on <a href="https://github.com/Kalypss/LogOn">Github</a>.<br>This project is open source and contributions are welcome!<br>This app may have some bugs, please report them on the <a href="https://github.com/Kalypss/LogOn/issues">issues page</a>.
    </div>
  </div>
</template>
