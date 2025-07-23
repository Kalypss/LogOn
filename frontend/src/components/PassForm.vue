<script setup lang="ts">
import { GalleryVerticalEnd } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
</script>

<template>
  <div class="flex flex-col gap-6">
    <form>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col items-center gap-2">
          <a
            href="#"
            class="flex flex-col items-center gap-2 font-medium"
          >
            <div class="flex h-8 w-8 items-center justify-center rounded-md">
              <GalleryVerticalEnd class="size-6" />
            </div>
            <span class="sr-only">Logon.</span>
          </a>
          <h1 class="text-xl font-bold">
            Welcome to Logon
          </h1>
          <div class="text-center text-sm">
            Don't have an account?
            <a href="#" class="underline underline-offset-4">
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
          <Button type="submit" class="w-full">
            Login
          </Button>
        </div>
        <div class="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span class="relative z-10 bg-background px-2 text-muted-foreground">
            Or
          </span>
        </div>
        <div class="">
          <Button variant="outline" class="w-full">
            I forgot my password ?
          </Button>
        </div>
      </div>
    </form>
    <div class="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
     Don't forget to check the project on <a href="https://github.com/Kalypss/LogOn">Github</a>.<br>This project is open source and contributions are welcome!<br>This app may have some bugs, please report them on the <a href="https://github.com/Kalypss/LogOn/issues">issues page</a>.
    </div>
  </div>
</template>
